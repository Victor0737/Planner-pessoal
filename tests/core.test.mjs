import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WEIGHTS, dateKey, parseDate, weekStart, weekDates, stats, splitInterval, sessionSeconds, activeSegments, emptyData, validateData } from '../dist/core.js';

const task = (patch = {}) => ({ id: 'task-1', name: 'Pesquisa', color: '#397660', weeklySeconds: 36000, initialSeconds: 7200, mode: 'auto', weights: [...DEFAULT_WEIGHTS], fixedSeconds: DEFAULT_WEIGHTS.map(x => x * 3600), archived: false, ...patch });
const fixture = (entries = [], patch = {}) => ({ ...emptyData(), tasks: [task(patch)], entries: entries.map(([date, seconds], i) => ({ id: `entry-${i}`, taskId: 'task-1', date, seconds })) });
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.001, `${a} != ${b}`);

test('semana é segunda a domingo, inclusive em viradas de ano', () => {
  assert.equal(weekStart('2026-09-20'), '2026-09-14');
  assert.deepEqual(weekDates('2026-01-01'), ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
});
test('10 horas = 1 hora por dia útil e 2h30 por dia no fim de semana', () => {
  const data = fixture(); const s = stats(data, data.tasks[0], '2026-09-14');
  assert.deepEqual(s.targets, [3600, 3600, 3600, 3600, 3600, 9000, 9000]);
  assert.equal(s.dailyRemaining, 3600);
});
test('sessão concluída diminui a meta de hoje sem criar meta móvel', () => {
  const data = fixture([['2026-09-14', 1800]]); const s = stats(data, data.tasks[0], '2026-09-14');
  assert.equal(s.targets[0], 3600); assert.equal(s.dailyRemaining, 1800);
  assert.equal(s.remaining, 34200); assert.equal(s.historical, 9000);
  near(s.dailyRemaining + s.targets.slice(1).reduce((a, b) => a + b), s.remaining);
});
test('dia perdido redistribui saldo somente pelos dias restantes', () => {
  const data = fixture(); const s = stats(data, data.tasks[0], '2026-09-15');
  assert.equal(s.targets[0], 0); near(s.targets[1], 36000 / 9); near(s.targets[5], 36000 / 9 * 2.5);
  near(s.targets.reduce((a, b) => a + b), 36000);
});
test('excesso hoje alivia próximos dias e saldo nunca é negativo', () => {
  const data = fixture([['2026-09-14', 7200]]); const s = stats(data, data.tasks[0], '2026-09-14');
  assert.equal(s.dailyRemaining, 0); near(s.targets.slice(1).reduce((a, b) => a + b), 28800);
  const over = fixture([['2026-09-14', 72000]]); const overStats = stats(over, over.tasks[0], '2026-09-14');
  assert.equal(overStats.remaining, 0); assert.equal(overStats.dailyRemaining, 0); assert.ok(overStats.targets.slice(1).every(x => x === 0));
});
test('sábado e domingo dividem saldo igualmente; domingo recebe todo saldo', () => {
  const data = fixture([['2026-09-14', 3600]]);
  const sat = stats(data, data.tasks[0], '2026-09-19'); near(sat.dailyRemaining, 16200);
  const sun = stats(data, data.tasks[0], '2026-09-20'); near(sun.dailyRemaining, 32400);
});
test('segunda seguinte renova meta e preserva histórico', () => {
  const data = fixture([['2026-09-20', 10000]]); const s = stats(data, data.tasks[0], '2026-09-21');
  assert.equal(s.remaining, 36000); assert.equal(s.historical, 17200); assert.equal(s.dailyRemaining, 3600);
});
test('pesos zero liberam dias e apontam saldo sem dias disponíveis', () => {
  const data = fixture([], { weights: [1, 0, 0, 0, 0, 0, 0] });
  assert.equal(stats(data, data.tasks[0], '2026-09-14').dailyRemaining, 36000);
  const t = stats(data, data.tasks[0], '2026-09-15'); assert.equal(t.unscheduled, 36000); assert.equal(t.dailyRemaining, 0);
});
test('horas fixas não redistribuem dia perdido', () => {
  const data = fixture([], { mode: 'fixed' }); const s = stats(data, data.tasks[0], '2026-09-15');
  assert.equal(s.dailyRemaining, 3600); assert.equal(s.remaining, 36000);
});
test('sessão atravessando domingo divide tempo por data e por semana', () => {
  const start = new Date(2026, 8, 20, 23, 30).getTime();
  const end = new Date(2026, 8, 21, 0, 30).getTime();
  assert.deepEqual(splitInterval(start, end), [{ date: '2026-09-20', seconds: 1800 }, { date: '2026-09-21', seconds: 1800 }]);
  const data = fixture(splitInterval(start, end).map(e => [e.date, e.seconds]));
  assert.equal(stats(data, data.tasks[0], '2026-09-21').done, 1800);
});
test('pausa congela; retomada conta apenas o intervalo ativo; reload mantém relógio', () => {
  const start = new Date(2026, 8, 18, 9).getTime();
  const s = { id: 'session-1', taskId: 'task-1', startedAt: start, segments: [] };
  assert.doesNotThrow(() => validateData({ ...fixture(), session: s }));
  const reloaded = JSON.parse(JSON.stringify(s)); assert.equal(sessionSeconds(reloaded, start + 60000), 60);
  s.segments = activeSegments(s, start + 60000); s.startedAt = null;
  assert.equal(sessionSeconds(s, start + 3600000), 60);
  s.startedAt = start + 3600000; assert.equal(sessionSeconds(s, start + 3660000), 120);
});
test('horário local permanece estável; validação rejeita dados inconsistentes', () => {
  assert.equal(dateKey(parseDate('2026-09-18')), '2026-09-18');
  assert.doesNotThrow(() => validateData(fixture()));
  assert.throws(() => validateData(fixture([['2026-02-30', 30]])));
  assert.throws(() => validateData(fixture([['2026-09-18', -1]])));
  assert.throws(() => validateData(fixture([], { color: 'red;display:none' })));
  assert.throws(() => validateData(fixture([], { mode: 'fixed', weeklySeconds: 7 })));
  assert.throws(() => validateData(fixture([], { id: 'x\" onclick=\"alert(1)' })));
  const orphan = fixture([['2026-09-18', 30]]); orphan.entries[0].taskId = 'missing'; assert.throws(() => validateData(orphan));
});
test('invariante: saldo futuro + saldo de hoje = saldo semanal no modo automático', () => {
  for (let day = 0; day < 7; day++) for (const todaySeconds of [0, 100, 3600, 14000, 40000]) {
    const date = weekDates('2026-09-14')[day];
    const data = fixture([[date, todaySeconds], ...weekDates(date).slice(0, day).map(d => [d, 1700])]);
    const s = stats(data, data.tasks[0], date);
    near(s.dailyRemaining + s.targets.slice(day + 1).reduce((a, b) => a + b, 0), s.remaining);
  }
});
