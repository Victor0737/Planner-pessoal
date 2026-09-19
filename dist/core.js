// Datas civis locais. Não converter datas de calendário com toISOString().
export const DEFAULT_WEIGHTS = [1, 1, 1, 1, 1, 2.5, 2.5];
export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const uid = () => globalThis.crypto.randomUUID?.() || Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(key, days) { const d = parseDate(key); d.setDate(d.getDate() + days); return dateKey(d); }
export function weekStart(key = dateKey()) { const d = parseDate(key); return addDays(key, -(d.getDay() + 6) % 7); }
export function weekDates(key = dateKey()) { const start = weekStart(key); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
export function secondsOn(data, id, date) { return data.entries.reduce((n, e) => n + (e.taskId === id && e.date === date ? e.seconds : 0), 0); }
export function stats(data, task, today = dateKey()) {
  const dates = weekDates(today);
  const actual = dates.map(d => secondsOn(data, task.id, d));
  const done = actual.reduce((a, b) => a + b, 0);
  const historical = task.initialSeconds + data.entries.reduce((n, e) => n + (e.taskId === task.id ? e.seconds : 0), 0);
  const index = dates.indexOf(today);
  const goal = task.weeklySeconds;
  const before = actual.slice(0, index).reduce((a, b) => a + b, 0);
  let targets;
  if (task.mode === 'fixed') targets = [...task.fixedSeconds];
  else {
    const budget = Math.max(0, goal - before);
    const weights = task.weights.slice(index);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    targets = actual.map((v, i) => i < index ? v : (weightSum ? budget * task.weights[i] / weightSum : 0));
    // A meta de hoje usa o saldo no início do dia. Só o excesso de hoje reduz os dias futuros.
    const excess = Math.max(0, actual[index] - targets[index]);
    const futureWeight = task.weights.slice(index + 1).reduce((a, b) => a + b, 0);
    if (excess && futureWeight) for (let i = index + 1; i < 7; i++) targets[i] = Math.max(0, targets[i] - excess * task.weights[i] / futureWeight);
  }
  const remaining = Math.max(0, goal - done);
  const dailyRemaining = Math.min(remaining, Math.max(0, targets[index] - actual[index]));
  const unscheduled = task.mode === 'auto' && task.weights.slice(index).every(w => !w) ? remaining : 0;
  return { dates, actual, done, historical, goal, remaining, targets, dailyRemaining, todayDone: actual[index], unscheduled };
}
export function duration(seconds, precise = false) {
  const n = Math.max(0, Math.round(seconds));
  if (precise) return [Math.floor(n / 3600), Math.floor(n % 3600 / 60), n % 60].map(x => String(x).padStart(2, '0')).join(':');
  if (n > 0 && n < 60) return '< 1 min';
  const minutes = Math.round(n / 60);
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}h${m ? ` ${String(m).padStart(2, '0')}min` : ''}` : `${m} min`;
}
export function splitInterval(start, end) {
  const result = [];
  let cursor = start;
  while (cursor < end) {
    const d = new Date(cursor);
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const stop = Math.min(next, end);
    result.push({ date: dateKey(d), seconds: (stop - cursor) / 1000 });
    cursor = stop;
  }
  return result;
}
export function activeSegments(session, now = Date.now()) {
  if (!session) return [];
  return [...session.segments, ...(session.startedAt !== null ? splitInterval(session.startedAt, Math.max(now, session.startedAt)) : [])];
}
export function sessionSeconds(session, now) { return activeSegments(session, now).reduce((n, x) => n + x.seconds, 0); }
export function emptyData() { return { version: 1, tasks: [], entries: [], session: null }; }
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDate(s)) === s; }
export function validateData(value) {
  const fail = () => { throw new Error('Arquivo inválido. Use um backup JSON exportado pelo Compasso.'); };
  const number = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e12;
  const id = s => typeof s === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(s);
  if (!value || value.version !== 1 || !Array.isArray(value.tasks) || !Array.isArray(value.entries)) fail();
  const ids = new Set();
  for (const t of value.tasks) {
    if (!id(t.id) || ids.has(t.id) || typeof t.name !== 'string' || !t.name.trim() || t.name.length > 120 || !/^#[0-9a-f]{6}$/i.test(t.color) || !number(t.weeklySeconds) || !number(t.initialSeconds) || !['auto', 'fixed'].includes(t.mode) || typeof t.archived !== 'boolean') fail();
    if (!Array.isArray(t.weights) || t.weights.length !== 7 || !t.weights.every(number) || !t.weights.some(x => x > 0)) fail();
    if (!Array.isArray(t.fixedSeconds) || t.fixedSeconds.length !== 7 || !t.fixedSeconds.every(number)) fail();
    if (t.mode === 'fixed' && Math.abs(t.fixedSeconds.reduce((a, b) => a + b, 0) - t.weeklySeconds) > 1) fail();
    ids.add(t.id);
  }
  const entryIds = new Set();
  for (const e of value.entries) {
    if (!id(e.id) || entryIds.has(e.id) || !ids.has(e.taskId) || !validDate(e.date) || !number(e.seconds) || (e.note !== undefined && (typeof e.note !== 'string' || e.note.length > 500))) fail();
    entryIds.add(e.id);
  }
  if (value.session !== null) {
    const s = value.session;
    if (!s || !id(s.id) || !ids.has(s.taskId) || !Array.isArray(s.segments) || !(s.startedAt === null || (Number.isFinite(s.startedAt) && s.startedAt >= 0 && s.startedAt <= 8.64e15))) fail();
    if (!s.segments.every(e => validDate(e.date) && number(e.seconds))) fail();
  }
  return value;
}
