import { DEFAULT_WEIGHTS, DAYS, uid, dateKey, parseDate, addDays, weekDates, secondsOn, stats, duration, activeSegments, sessionSeconds, emptyData, validateData, validDate } from './core.js';

const KEY = 'compasso-data-v1';
const THEME_KEY = 'compasso-theme';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  left: '<path d="m14 5-7 7 7 7"/>',
  right: '<path d="m10 5 7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  archive: '<path d="M4 9h16v12H4zM3 3h18v6H3zM9 13h6"/>',
  moon: '<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.clock}</svg>`;
let storageError = '', corruptRaw = '';
function readData() {
  try { const raw = localStorage.getItem(KEY); return raw ? validateData(JSON.parse(raw)) : emptyData(); }
  catch (error) { throw new Error('Não foi possível ler os dados salvos. Exporte uma cópia antes de restaurar um backup.'); }
}
let data;
try { data = readData(); }
catch (e) { data = emptyData(); storageError = e.message; try { corruptRaw = localStorage.getItem(KEY) || ''; } catch {} }
let view = 'dashboard', editing = false, month = dateKey().slice(0, 7), showArchived = false, focusOpen = !!data.session;
let currentDate = dateKey(), toastTimeout;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
function commit(change) {
  if (storageError) { toast(storageError); return false; }
  try {
    const next = structuredClone(readData());
    change(next);
    validateData(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    data = next;
    render();
    return true;
  } catch (e) { toast(e.message || 'Não foi possível salvar. Exporte um backup.'); return false; }
}
const shortDate = key => parseDate(key).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const longDate = key => parseDate(key).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const progress = (done, goal) => goal > 0 ? Math.min(100, done / goal * 100) : 0;
const getTask = id => data.tasks.find(t => t.id === id);
const colorDot = color => `<span class="dot" style="--task:${color}"></span>`;
const button = (action, label, cls = '', attr = '') => `<button type="button" class="${cls}" data-action="${action}" ${attr}>${label}</button>`;
function themeButtonContent() {
  return `${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')} Tema escuro`;
}
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const control = $('[data-action="toggle-theme"]');
  if (control) { control.innerHTML = themeButtonContent(); control.setAttribute('aria-pressed', String(dark)); }
}
function render() {
  const today = dateKey(), dates = weekDates(today);
  const tasks = data.tasks.filter(t => !t.archived);
  const values = tasks.map(t => stats(data, t, today));
  const done = values.reduce((n, s) => n + s.done, 0), goal = values.reduce((n, s) => n + s.goal, 0);
  $('#app').innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#" data-action="dashboard"><span class="brandmark"><i></i><i></i><i></i></span>compasso<span class="brand-period">.</span></a>
    <div class="workspace-label">SEU ESPAÇO</div>
    <nav aria-label="Navegação principal">
      ${button('dashboard', `${icon('grid')} Visão geral`, `nav-item ${view === 'dashboard' ? 'selected' : ''}`, view === 'dashboard' ? 'aria-current="page"' : '')}
      ${button('calendar', `${icon('calendar')} Calendário`, `nav-item ${view === 'calendar' ? 'selected' : ''}`, view === 'calendar' ? 'aria-current="page"' : '')}
    </nav>
    <div class="sidebar-week"><span>Esta semana</span><strong>${duration(done)} <small>/ ${duration(goal)}</small></strong><div class="progress"><span style="width:${progress(done, goal)}%"></span></div><p>Segunda a domingo</p></div>
    <div class="sidebar-bottom">
      ${button('toggle-theme', themeButtonContent(), 'nav-item', `aria-label="Tema escuro" title="Ativar ou desativar tema escuro" aria-pressed="${document.documentElement.dataset.theme === 'dark'}"`)}
      ${button('export', `${icon('download')} Exportar backup`, 'nav-item')}
      ${button('import', `${icon('upload')} Restaurar backup`, 'nav-item')}
      ${button('help', `${icon('clock')} Como funciona`, 'nav-item')}
      <div class="local-note"><span class="local-dot"></span> Salvo neste navegador</div>
    </div>
  </aside>
  <main id="main" tabindex="-1">
    <div class="topbar"><span>Planejamento pessoal <span class="slash">/</span> ${view === 'dashboard' ? 'Visão geral' : 'Calendário'}</span>${button('edit-mode', `${icon(editing ? 'check' : 'edit')} ${editing ? 'Concluir edição' : 'Editar dados'}`, editing ? 'button edit-active' : 'button subtle', `aria-pressed="${editing}"`)}</div>
    ${storageError ? `<div class="error-banner" role="alert">${esc(storageError)} ${button('export', 'Baixar dados originais', 'button')}</div>` : ''}
    ${editing ? `<div class="edit-banner">${icon('edit')}<span><strong>Modo de edição ativo.</strong> Ajuste metas, distribuição e histórico nas tarefas. Clique em um dia para corrigir os registros.</span></div>` : ''}
    <div class="content">${view === 'dashboard' ? dashboard(tasks, values, today, dates) : calendar(today)}</div>
    <footer>Um dia de cada vez.<span>COMPASSO / PLANEJADOR PESSOAL</span></footer>
  </main>
  ${data.session && !focusOpen ? `<button class="active-session" data-action="open-focus">${icon('clock')}<span>${esc(getTask(data.session.taskId)?.name || '')}</span><strong id="mini-timer">${duration(sessionSeconds(data.session), true)}</strong> Retomar sessão</button>` : ''}
  ${focusOpen && data.session ? focusScreen() : ''}`;
  updateClock();
}
function dashboard(tasks, values, today, dates) {
  const remainingToday = values.reduce((n, s) => n + s.dailyRemaining, 0);
  const done = values.reduce((n, s) => n + s.done, 0);
  const remaining = values.reduce((n, s) => n + s.remaining, 0);
  const totalGoal = values.reduce((n, s) => n + s.goal, 0);
  const weekActual = dates.map((d, i) => values.reduce((n, s) => n + s.actual[i], 0));
  const weekPlanned = dates.map((d, i) => d < today ? 0 : values.reduce((n, s) => n + s.targets[i], 0));
  const max = Math.max(3600, ...weekPlanned, ...weekActual);
  return `<header class="page-heading"><div><div class="eyebrow">${esc(longDate(today))}</div><h1>Visão da semana<span>.</span></h1></div>${button('new-task', `${icon('plus')} Nova tarefa`, 'button primary')}</header>
  <section class="summary" aria-label="Resumo da semana">
    <div class="metric"><span>Para hoje</span><strong>${duration(remainingToday)}</strong><small>de dedicação restante</small></div>
    <div class="metric"><span>Feito na semana</span><strong>${duration(done)}<em>/ ${duration(totalGoal)}</em></strong><small>${totalGoal ? `${Math.round(done / totalGoal * 100)}% da meta semanal` : 'Suas sessões aparecem aqui'}</small></div>
    <div class="metric"><span>Restante na semana</span><strong>${duration(remaining)}</strong><small>até domingo, ${shortDate(dates[6])}</small></div>
  </section>
  <section class="week-panel" aria-labelledby="week-title"><div class="section-top"><div><h2 id="week-title">Seu ritmo</h2><p>${shortDate(dates[0])} — ${shortDate(dates[6])}</p></div><div class="chart-legend"><span><i class="legend-plan"></i>Planejado</span><span><i class="legend-done"></i>Feito</span></div></div>
    <div class="week-chart">${dates.map((d, i) => {
      const past = d < today;
      const summary = `${longDate(d)}: ${past ? 'planejamento passado não armazenado' : `planejado ${duration(weekPlanned[i])}`}, feito ${duration(weekActual[i])}`;
      const breakdown = tasks.map((t, j) => `${t.name}: ${past ? '' : `planejado ${duration(values[j].targets[i])}, `}feito ${duration(values[j].actual[i])}`).join('; ');
      const stack = (kind, total) => `<span class="bar-stack ${kind}" style="height:${total / max * 100}%">${tasks.map((t, j) => {
        const seconds = kind === 'planned' ? values[j].targets[i] : values[j].actual[i];
        return seconds > 0 && total > 0 ? `<span class="bar-segment" style="--task:${t.color};height:${seconds / total * 100}%"></span>` : '';
      }).join('')}</span>`;
      return `<button class="week-day ${d === today ? 'is-today' : ''}" data-action="rhythm-day" data-date="${d}" aria-label="${esc(`${summary}. ${breakdown}. Ver detalhes`)}" title="${esc(`${summary}\n${breakdown}`)}"><span class="chart-value" aria-hidden="true">${duration(past ? weekActual[i] : weekPlanned[i])}</span><span class="bar-track" aria-hidden="true">${past ? '' : stack('planned', weekPlanned[i])}${stack('actual', weekActual[i])}</span><span class="bar-labels" aria-hidden="true">${past ? '<span>F</span>' : '<span>P</span><span>F</span>'}</span><span class="day-label">${DAYS[i]} <small>${parseDate(d).getDate()}</small></span><span class="today-caption">${d === today ? 'Hoje' : '&nbsp;'}</span></button>`;
    }).join('')}</div>
    ${tasks.length ? `<ul class="rhythm-tasks" aria-label="Cores das tarefas">${tasks.map(t => `<li>${colorDot(t.color)}<span>${esc(t.name)}</span></li>`).join('')}</ul>` : ''}
    <p class="chart-help">P: planejado · F: feito. O valor acima indica o planejado; nos dias passados, apenas o feito. Toque ou clique em um dia para comparar por tarefa.</p>
  </section>
  <section aria-labelledby="tasks-title"><div class="section-top task-heading"><div class="heading-inline"><h2 id="tasks-title">Suas tarefas</h2><span class="count">${tasks.length}</span></div><div class="task-heading-actions">${data.tasks.some(t => t.archived) ? button('toggle-archive', showArchived ? 'Ocultar arquivadas' : 'Ver arquivadas', 'text-button') : ''}<span class="muted">O longo prazo começa aqui.</span></div></div>
    ${tasks.length ? `<div class="task-grid">${tasks.map((t, i) => taskCard(t, values[i])).join('')}</div>` : `<div class="empty-state"><span class="empty-mark">${icon('plus')}</span><h3>Abra espaço para o que importa.</h3><p>Adicione uma tarefa de longo prazo e escolha quantas horas quer dedicar a ela por semana.</p>${button('new-task', `${icon('plus')} Criar minha primeira tarefa`, 'button primary')}</div>`}
    ${showArchived ? `<div class="archived-list"><h3>Arquivadas</h3>${data.tasks.filter(t => t.archived).map(t => `<div>${colorDot(t.color)}<span>${esc(t.name)}</span><small>${duration(stats(data, t).historical)} no histórico</small>${editing ? button('restore-task', 'Reativar', 'button subtle', `data-id="${t.id}"`) : ''}</div>`).join('')}</div>` : ''}
  </section>`;
}
function taskCard(t, s) {
  const met = s.remaining === 0;
  return `<article class="task-card" style="--task:${t.color}"><div class="task-card-top"><span class="task-category">${colorDot(t.color)}${t.mode === 'auto' ? 'Distribuição automática' : 'Distribuição fixa'}</span>${button('task-settings', icon('edit'), 'icon-button', `data-id="${t.id}" aria-label="${editing ? 'Editar' : 'Ver detalhes de'} ${esc(t.name)}"`)}</div><h3>${esc(t.name)}</h3>
    <div class="task-progress-label"><span>${duration(s.done)} <span class="muted">de ${duration(s.goal)} na semana</span></span><strong>${met ? 'Concluída ✓' : `${Math.round(progress(s.done, s.goal))}%`}</strong></div><div class="progress task-progress" role="progressbar" aria-label="Meta semanal de ${esc(t.name)}" aria-valuenow="${Math.round(progress(s.done, s.goal))}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress(s.done, s.goal)}%"></span></div>
    <div class="task-stats"><div><span>Falta hoje</span><strong>${duration(s.dailyRemaining)}</strong></div><div><span>Falta na semana</span><strong>${duration(s.remaining)}</strong></div><div><span>Total histórico</span><strong>${duration(s.historical)}</strong></div></div>
    ${s.unscheduled ? '<p class="inline-warning">Sem dias disponíveis: ajuste os pesos para distribuir o saldo.</p>' : ''}
    <div class="task-card-bottom"><span>${s.dailyRemaining > 0 ? `${duration(s.todayDone)} feitos hoje` : met ? 'Meta semanal alcançada' : s.todayDone ? 'Por hoje, tudo certo' : 'Hoje está livre'}</span>${button('start-focus', `${icon('play')} Focar`, 'button focus-button', `data-id="${t.id}"`)}</div></article>`;
}
function calendar(today) {
  const first = month + '-01';
  const offset = (parseDate(first).getDay() + 6) % 7;
  const firstCell = addDays(first, -offset);
  const end = new Date(parseDate(first).getFullYear(), parseDate(first).getMonth() + 1, 0).getDate();
  const cells = Math.ceil((offset + end) / 7) * 7;
  const monthEntries = data.entries.filter(e => e.date.startsWith(month));
  const totals = data.tasks.map(t => ({ task: t, seconds: monthEntries.filter(e => e.taskId === t.id).reduce((n, e) => n + e.seconds, 0) })).filter(x => x.seconds > 0);
  const entriesByDay = Array.from({ length: cells }, (_, i) => {
    const date = addDays(firstCell, i);
    return { date, items: data.tasks.map(t => ({ task: t, seconds: secondsOn(data, t.id, date) })).filter(x => x.seconds > 0) };
  });
  const maxSeconds = Math.max(3600, ...entriesByDay.flatMap(d => d.items.map(x => x.seconds)));
  // A mesma escala em todo o mês: diâmetro ∝ raiz do tempo, portanto área ∝ tempo.
  const diameter = seconds => 32 * Math.sqrt(seconds / maxSeconds);
  return `<header class="page-heading"><div><div class="eyebrow">SEU TEMPO, VISÍVEL</div><h1>Calendário<span>.</span></h1></div><span class="month-total">${duration(monthEntries.reduce((n, e) => n + e.seconds, 0))} <small>neste mês</small></span></header>
  <section class="calendar-panel"><div class="section-top"><h2 class="month-title">${parseDate(first).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><div class="calendar-nav">${button('prev-month', icon('left'), 'icon-button', 'aria-label="Mês anterior"')}${button('this-month', 'Hoje', 'button subtle')}${button('next-month', icon('right'), 'icon-button', 'aria-label="Próximo mês"')}</div></div>
    <div class="calendar-weekdays">${DAYS.map(d => `<span>${d}</span>`).join('')}</div>
    <div class="calendar-grid">${entriesByDay.map(({ date, items }) => { const total = items.reduce((n, x) => n + x.seconds, 0); return `<button class="calendar-day ${date.startsWith(month) ? '' : 'outside'} ${date === today ? 'current-day' : ''}" data-action="day" data-date="${date}" aria-label="${esc(longDate(date))}, ${duration(total)}${items.map(x => `, ${esc(x.task.name)}: ${duration(x.seconds)}`).join('')}"><span class="calendar-number">${parseDate(date).getDate()}</span><span class="bubbles">${items.map(x => `<span class="bubble" title="${esc(x.task.name)}: ${duration(x.seconds)}" style="width:${diameter(x.seconds)}px;height:${diameter(x.seconds)}px;background:${x.task.color}"></span>`).join('')}</span><span class="calendar-total">${total ? duration(total) : ''}</span></button>`; }).join('')}</div>
    <div class="calendar-key"><span>Área do círculo = tempo dedicado</span><span class="bubble-example"><i style="width:${diameter(900)}px;height:${diameter(900)}px"></i>15 min<i style="width:${diameter(3600)}px;height:${diameter(3600)}px"></i>1 hora</span></div>
  </section>
  <section class="month-breakdown"><div class="section-top"><h2>O mês em cores</h2><span class="muted">Clique em um dia para ver os detalhes</span></div>${totals.length ? `<div class="month-tasks">${totals.map(x => `<div>${colorDot(x.task.color)}<span>${esc(x.task.name)}${x.task.archived ? ' (arquivada)' : ''}</span><strong>${duration(x.seconds)}</strong></div>`).join('')}</div>` : '<p class="empty-calendar">Suas sessões concluídas vão preencher este calendário, um dia de cada vez.</p>'}</section>`;
}
function focusScreen() {
  const t = getTask(data.session.taskId), s = stats(data, t);
  return `<section class="focus-screen" role="dialog" aria-modal="true" aria-labelledby="focus-title"><header><span class="brand small-brand">compasso.</span>${button('minimize-focus', 'Voltar ao painel', 'button subtle')}</header><div class="focus-center"><span class="focus-kicker">UMA COISA DE CADA VEZ</span><h1 id="focus-title">${colorDot(t.color)}${esc(t.name)}</h1><div class="timer" id="timer" role="timer" aria-live="off">${duration(sessionSeconds(data.session), true)}</div><p class="timer-state" id="timer-state">${data.session.startedAt === null ? 'Sessão pausada' : 'Seu tempo está contando'}</p><div class="focus-progress"><span>Restante para hoje</span><strong id="focus-remaining">${duration(Math.max(0, s.dailyRemaining - sessionSeconds(data.session)))}</strong></div><div class="timer-controls">${button('pause-focus', `${icon(data.session.startedAt === null ? 'play' : 'pause')} ${data.session.startedAt === null ? 'Continuar' : 'Pausar'}`, 'button timer-secondary')}${button('finish-focus', `${icon('check')} Terminar sessão`, 'button primary')}</div><div class="timer-options">${button('restart-focus', `${icon('reset')} Reiniciar`, 'text-button')}${button('discard-focus', 'Descartar sessão', 'text-button')}</div><p class="focus-note">O tempo entra no histórico quando você termina a sessão.<br>O cronômetro continua ao trocar de aba ou fechar esta tela.</p></div><div class="focus-foot">SEM PRESSA. COM CONSTÂNCIA.</div></section>`;
}
function updateClock() {
  if (!data.session) return;
  const elapsed = sessionSeconds(data.session);
  if ($('#timer')) $('#timer').textContent = duration(elapsed, true);
  if ($('#mini-timer')) $('#mini-timer').textContent = duration(elapsed, true);
  if ($('#focus-remaining')) {
    const t = getTask(data.session.taskId);
    const todayElapsed = activeSegments(data.session).filter(x => x.date === dateKey()).reduce((n, x) => n + x.seconds, 0);
    $('#focus-remaining').textContent = duration(Math.max(0, stats(data, t).dailyRemaining - todayElapsed));
  }
}
function showModal(title, body, wide = false) {
  const modal = $('#modal');
  modal.className = wide ? 'wide-modal' : '';
  modal.innerHTML = `<div class="modal-heading"><h2 id="modal-title">${title}</h2>${button('close-modal', icon('close'), 'icon-button', 'aria-label="Fechar"')}</div>${body}`;
  if (!modal.open) modal.showModal();
}
function closeModal() { $('#modal').close(); }
function confirmAction(title, description, action, label = 'Confirmar') {
  showModal(title, `<p class="dialog-copy">${esc(description)}</p><div class="modal-actions">${button('close-modal', 'Cancelar', 'button subtle')}${button('confirm-action', label, 'button primary')}</div>`);
  $('[data-action="confirm-action"]').onclick = () => { closeModal(); action(); };
}
function timeInput(label, name, seconds = 0, extra = '') {
  return `<label class="field">${label}<input name="${name}" value="${duration(seconds, true)}" placeholder="00:00:00" pattern="[0-9]+:[0-5][0-9](:[0-5][0-9])?" required ${extra}><small>Horas:minutos:segundos</small></label>`;
}
function readTime(value) {
  const match = /^(\d+):([0-5]\d)(?::([0-5]\d))?$/.exec(value.trim());
  if (!match) throw new Error('Informe o tempo como horas:minutos:segundos, por exemplo 01:30:00.');
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
  if (seconds > 1e12) throw new Error('Esse valor de tempo é muito grande.');
  return seconds;
}
function formError(form, error) { form.querySelector('.form-error').textContent = error.message; }
const colors = ['#397660', '#5679b9', '#ad7148', '#8a65ab', '#b65060', '#4b8996', '#b58c2d'];
function taskSettings(id) {
  const old = id ? getTask(id) : null;
  if (old && !editing) { taskDetails(old); return; }
  const t = old || { name: '', color: colors[data.tasks.length % colors.length], weeklySeconds: 10 * 3600, mode: 'auto', weights: [...DEFAULT_WEIGHTS], fixedSeconds: DEFAULT_WEIGHTS.map(x => x * 3600), initialSeconds: 0 };
  const datedTotal = old ? data.entries.filter(e => e.taskId === old.id).reduce((n, e) => n + e.seconds, 0) : 0;
  showModal(old ? 'Editar tarefa' : 'Uma nova tarefa', `<form id="task-form"><label class="field">Nome da tarefa<input name="name" maxlength="120" required value="${esc(t.name)}" placeholder="Ex.: Pesquisa de iniciação científica" autofocus></label><div class="form-row"><label class="field">Meta semanal (horas)<input name="hours" type="number" step="any" min="0" max="168" required value="${t.weeklySeconds / 3600}"></label><label class="field color-field">Cor da tarefa<input type="color" name="color" value="${t.color}"></label></div><fieldset><legend>Distribuição da semana</legend><div class="segmented"><label><input type="radio" name="mode" value="auto" ${t.mode === 'auto' ? 'checked' : ''}> Automática</label><label><input type="radio" name="mode" value="fixed" ${t.mode === 'fixed' ? 'checked' : ''}> Horas fixas</label></div><div id="auto-options" ${t.mode !== 'auto' ? 'hidden' : ''}><p class="field-help">O saldo se adapta aos dias restantes. O padrão reserva 2,5 vezes mais tempo para cada dia do fim de semana.</p><div class="day-inputs">${DAYS.map((d, i) => `<label>${d}<input aria-label="Peso de ${d}" name="weight-${i}" type="number" min="0" max="1000" step="any" value="${t.weights[i]}" required></label>`).join('')}</div><div class="distribution-footer"><span>Pesos relativos · 0 deixa o dia livre</span>${button('reset-weights', 'Restaurar 1 : 2,5', 'text-button')}</div></div><div id="fixed-options" ${t.mode !== 'fixed' ? 'hidden' : ''}><p class="field-help">Horas por dia, sem redistribuição automática. A soma precisa ser igual à meta semanal.</p><div class="day-inputs">${DAYS.map((d, i) => `<label>${d}<input aria-label="Horas de ${d}" name="fixed-${i}" type="number" min="0" max="168" step="any" value="${t.fixedSeconds[i] / 3600}"></label>`).join('')}</div></div><p id="distribution-preview" class="distribution-preview"></p></fieldset>${timeInput('Saldo histórico anterior', 'initial', t.initialSeconds)}<p class="field-help">Tempo anterior ao uso do Compasso, sem data. ${old ? `${duration(datedTotal)} adicionais vêm dos registros do calendário. Para corrigir esses valores, edite os registros em cada dia.` : 'As novas sessões serão somadas a esse saldo.'}</p><p class="form-error" role="alert"></p><div class="modal-actions">${old ? button('archive-task', `${icon('archive')} Arquivar`, 'button subtle', `data-id="${old.id}"`) : button('close-modal', 'Cancelar', 'button subtle')}<button class="button primary" type="submit">${old ? 'Salvar alterações' : 'Criar tarefa'}</button></div></form>`, true);
  const form = $('#task-form');
  function preview() {
    const auto = form.elements.mode.value === 'auto';
    $('#auto-options').hidden = !auto; $('#fixed-options').hidden = auto;
    DAYS.forEach((_, i) => { form.elements[`weight-${i}`].disabled = !auto; form.elements[`fixed-${i}`].disabled = auto; });
    const hours = Number(form.elements.hours.value);
    const weights = DAYS.map((_, i) => Number(form.elements[`weight-${i}`].value));
    const sum = weights.reduce((a, b) => a + b, 0);
    $('#distribution-preview').textContent = auto ? (sum > 0 ? `Semana completa: ${weights.map((w, i) => `${DAYS[i]} ${duration(hours * 3600 * w / sum)}`).join(' · ')}` : 'Escolha pelo menos um dia com peso maior que zero.') : `Total distribuído: ${duration(DAYS.reduce((n, _, i) => n + Number(form.elements[`fixed-${i}`].value) * 3600, 0))}`;
  }
  form.addEventListener('input', preview); preview();
  $('[data-action="reset-weights"]').onclick = () => { DEFAULT_WEIGHTS.forEach((w, i) => form.elements[`weight-${i}`].value = w); preview(); };
  form.onsubmit = event => {
    event.preventDefault();
    try {
      if (old && !editing) throw new Error('Ative o modo de edição para alterar os dados.');
      const f = new FormData(form);
      const weights = f.get('mode') === 'auto' ? DAYS.map((_, i) => Number(f.get(`weight-${i}`))) : [...(old?.weights || DEFAULT_WEIGHTS)];
      const goal = Number(f.get('hours')) * 3600;
      const weightSum = weights.reduce((a, b) => a + b, 0);
      const fixed = f.get('mode') === 'fixed' ? DAYS.map((_, i) => Number(f.get(`fixed-${i}`)) * 3600) : weights.map(w => weightSum ? goal * w / weightSum : 0);
      if (!String(f.get('name')).trim()) throw new Error('Dê um nome à tarefa.');
      if (weights.every(w => w === 0)) throw new Error('Pelo menos um dia precisa ter peso maior que zero.');
      if (f.get('mode') === 'fixed' && Math.abs(fixed.reduce((a, b) => a + b, 0) - goal) > 1) throw new Error('A soma das horas diárias precisa ser igual à meta semanal.');
      const task = { id: old?.id || uid(), name: String(f.get('name')).trim(), color: f.get('color'), weeklySeconds: goal, weights, fixedSeconds: fixed, mode: f.get('mode'), initialSeconds: readTime(f.get('initial')), archived: old?.archived || false };
      if (commit(next => { if (old) { const index = next.tasks.findIndex(x => x.id === old.id); if (index < 0) throw new Error('Essa tarefa não existe mais.'); next.tasks[index] = task; } else next.tasks.push(task); })) { closeModal(); toast(old ? 'Tarefa atualizada.' : 'Tarefa criada. Seu tempo já está distribuído.'); }
    } catch (e) { formError(form, e); }
  };
}
function taskDetails(t) {
  const s = stats(data, t), today = dateKey();
  showModal(esc(t.name), `<div class="detail-summary">${colorDot(t.color)}${duration(s.goal)} por semana · ${t.mode === 'auto' ? 'Distribuição automática' : 'Horas fixas'}</div><div class="day-table"><div class="table-head"><span>Dia</span><span>Feito</span><span>Falta</span></div>${s.dates.map((d, i) => `<div class="${d === today ? 'table-today' : ''}"><span>${DAYS[i]} ${shortDate(d)}${d === today ? ' · hoje' : ''}</span><span>${duration(s.actual[i])}</span><span>${d < today ? '—' : duration(Math.min(s.remaining, Math.max(0, s.targets[i] - s.actual[i])))}</span></div>`).join('')}</div><p class="field-help">Histórico: ${duration(s.historical)}. ${t.mode === 'auto' ? 'O saldo é redistribuído a cada novo dia. A meta de hoje diminui conforme você conclui sessões.' : 'As metas diárias permanecem fixas, mesmo se você não cumprir um dia.'}</p><div class="modal-actions">${button('enable-task-edit', `${icon('edit')} Entrar no modo de edição`, 'button subtle', `data-id="${t.id}"`)}${button('start-focus', `${icon('play')} Focar`, 'button primary', `data-id="${t.id}"`)}</div>`);
}
function rhythmDetails(date) {
  const today = dateKey(), index = weekDates(today).indexOf(date);
  if (index < 0) { dayDetails(date); return; }
  const past = date < today;
  const rows = data.tasks.filter(t => !t.archived).map(t => ({ task: t, value: stats(data, t, today) }));
  showModal(esc(longDate(date)), `<p class="field-help">${past ? 'Dias passados mostram apenas o tempo feito. As metas anteriores não ficam armazenadas.' : 'Planejado é a meta do dia. Feito inclui todo o tempo registrado, mesmo acima da meta.'}</p><div class="day-table rhythm-table"><div class="table-head"><span>Tarefa</span><span>Planejado</span><span>Feito</span></div>${rows.map(({ task, value }) => `<div><span>${colorDot(task.color)}${esc(task.name)}</span><span>${past ? '—' : duration(value.targets[index], true)}</span><span>${duration(value.actual[index], true)}</span></div>`).join('')}</div>${rows.length ? '' : '<p class="empty-day">Adicione uma tarefa para planejar sua semana.</p>'}<p class="field-help">Tarefas ativas · tempos em horas:minutos:segundos.</p><div class="modal-actions">${button('day', 'Ver registros do dia', 'button subtle', `data-date="${date}"`)}</div>`, true);
}
function dayDetails(date) {
  const entries = data.entries.filter(e => e.date === date);
  const total = entries.reduce((n, e) => n + e.seconds, 0);
  showModal(esc(longDate(date)), `<div class="day-total">${duration(total)}<span>de dedicação registrada</span></div>${entries.length ? `<div class="entry-list">${entries.map(e => { const t = getTask(e.taskId); return `<div class="entry-row">${colorDot(t.color)}<div><strong>${esc(t.name)}</strong><small>${esc(e.note || 'Sessão de foco')}</small></div><span>${duration(e.seconds, true)}</span>${editing ? button('edit-entry', icon('edit'), 'icon-button', `data-id="${e.id}" aria-label="Editar registro de ${esc(t.name)}"`) : ''}</div>`; }).join('')}</div>` : '<p class="empty-day">Nenhum tempo registrado neste dia.</p>'}<div class="modal-actions">${editing ? button('add-entry', `${icon('plus')} Adicionar registro`, 'button primary', `data-date="${date}" ${!data.tasks.length || date > dateKey() ? 'disabled' : ''}`) : button('enable-day-edit', `${icon('edit')} Editar registros`, 'button subtle', `data-date="${date}"`)}</div>${date > dateKey() ? '<p class="field-help">Registros de dedicação só podem ser adicionados até hoje.</p>' : ''}`);
}
function entryEditor(id, date = dateKey()) {
  if (!editing) return;
  const old = id ? data.entries.find(e => e.id === id) : null;
  if (!data.tasks.length) { toast('Crie uma tarefa primeiro.'); return; }
  showModal(old ? 'Corrigir registro' : 'Adicionar tempo', `<form id="entry-form"><label class="field">Tarefa<select name="taskId">${data.tasks.map(t => `<option value="${t.id}" ${t.id === old?.taskId ? 'selected' : ''}>${esc(t.name)}${t.archived ? ' (arquivada)' : ''}</option>`).join('')}</select></label><label class="field">Data<input type="date" name="date" value="${old?.date || date}" max="${dateKey()}" required></label>${timeInput('Tempo dedicado', 'seconds', old?.seconds || 0)}<label class="field">Observação (opcional)<input name="note" value="${esc(old?.note || '')}" maxlength="500" placeholder="Ex.: sessão registrada manualmente"></label><p class="field-help">Essa alteração atualiza o dia, a semana e o histórico da tarefa.</p><p class="form-error" role="alert"></p><div class="modal-actions">${old ? button('delete-entry', 'Excluir registro', 'button danger-text', `data-id="${old.id}"`) : button('day', 'Cancelar', 'button subtle', `data-date="${date}"`)}<button class="button primary" type="submit">Salvar registro</button></div></form>`);
  $('#entry-form').onsubmit = event => {
    event.preventDefault(); const form = event.currentTarget;
    try {
      const f = new FormData(form), d = f.get('date');
      if (!validDate(d) || d > dateKey()) throw new Error('Escolha uma data válida até hoje.');
      const entry = { id: old?.id || uid(), taskId: f.get('taskId'), date: d, seconds: readTime(f.get('seconds')), note: f.get('note') || 'Registro manual' };
      if (commit(next => { if (old) { const i = next.entries.findIndex(e => e.id === old.id); if (i < 0) throw new Error('Esse registro não existe mais.'); next.entries[i] = entry; } else next.entries.push(entry); })) { dayDetails(d); toast('Registro salvo. Os totais foram recalculados.'); }
    } catch (e) { formError(form, e); }
  };
}
function startFocus(id) {
  closeModal();
  if (data.session) { focusOpen = true; render(); toast('Você já tem uma sessão aberta. Termine ou descarte antes de iniciar outra.'); return; }
  focusOpen = true;
  if (commit(next => { if (next.session) throw new Error('Já existe uma sessão aberta em outra aba.'); const task = next.tasks.find(t => t.id === id); if (!task || task.archived) throw new Error('Essa tarefa não está ativa.'); next.session = { id: uid(), taskId: id, startedAt: Date.now(), segments: [] }; })) $('.focus-screen [data-action="pause-focus"]')?.focus();
}
function finishFocus() {
  let saved = 0;
  const ok = commit(next => {
    if (!next.session) throw new Error('A sessão já foi concluída em outra aba.');
    const s = next.session;
    const grouped = new Map();
    activeSegments(s).forEach(x => grouped.set(x.date, (grouped.get(x.date) || 0) + x.seconds));
    grouped.forEach((seconds, date) => { if (seconds > 0) { next.entries.push({ id: uid(), taskId: s.taskId, date, seconds, note: 'Sessão de foco' }); saved += seconds; } });
    next.session = null;
  });
  if (ok) { focusOpen = false; render(); toast(`${duration(saved, true)} registrados. Mais um passo dado.`); }
}
function download(content, name) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportBackup() {
  let current = data; try { current = readData(); } catch {}
  current = structuredClone(current);
  if (current.session) { current.session.segments = activeSegments(current.session); current.session.startedAt = null; }
  download(corruptRaw || JSON.stringify(current, null, 2), `compasso-backup-${dateKey()}.json`);
  toast('Backup exportado. Guarde-o em um local seguro.');
}
function help() {
  showModal('Um ritmo que cabe na sua semana', `<div class="help-copy"><h3>1. Defina a dedicação semanal</h3><p>No padrão, 10 horas por semana se tornam 1 hora por dia útil e 2h30 em cada dia do fim de semana. Você pode mudar os pesos ou escolher horas fixas.</p><h3>2. Trabalhe um pouco por dia</h3><p>A distribuição automática usa o saldo no início de cada dia e os dias restantes, incluindo hoje. Ao terminar uma sessão, o tempo diminui do saldo diário e semanal e entra no histórico. Se exceder a meta de hoje, os próximos dias ficam mais leves.</p><h3>3. A semana recomeça na segunda</h3><p>A meta se renova sem acumular dívida. Todo o tempo registrado continua no histórico e no calendário. Semanas seguem o fuso horário do seu dispositivo.</p><h3>Seu cronômetro e seus dados</h3><p>Há uma sessão por vez. O cronômetro usa o relógio do dispositivo e continua ao fechar a página ou suspender o computador; pause antes de sair. Sessões que atravessam a meia-noite são divididas entre os dias. Reiniciar e descartar não alteram o histórico.</p><p>Os dados ficam apenas neste navegador e endereço. Exporte backups para trocar de dispositivo ou endereço. Navegação privada e limpeza dos dados do navegador podem apagar os registros. Não há sincronização com Trello ou Google Calendar.</p><h3>Correções sem inconsistências</h3><p>Ative “Editar dados” para ajustar a meta, distribuição, cor e saldo histórico anterior. No calendário, adicione, edite ou exclua registros em qualquer dia passado. Os totais diário, semanal e histórico são calculados a partir desses registros.</p><p>Círculos usam a mesma escala dentro do mês: o dobro do tempo produz o dobro da área. O saldo anterior, sem data, aparece apenas no histórico da tarefa.</p></div>`);
}
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]'); if (!target || target.disabled) return;
  const action = target.dataset.action, id = target.dataset.id, date = target.dataset.date;
  if (target.tagName === 'A') event.preventDefault();
  switch (action) {
    case 'toggle-theme': {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch { toast('Tema aplicado. Não foi possível salvar a preferência neste navegador.'); }
      break;
    }
    case 'rhythm-day': rhythmDetails(date); break;
    case 'dashboard': case 'calendar': view = action; render(); break;
    case 'edit-mode': editing = !editing; render(); break;
    case 'new-task': taskSettings(); break;
    case 'task-settings': taskSettings(id); break;
    case 'enable-task-edit': editing = true; render(); taskSettings(id); break;
    case 'enable-day-edit': editing = true; render(); dayDetails(date); break;
    case 'day': dayDetails(date); break;
    case 'add-entry': entryEditor(null, date); break;
    case 'edit-entry': entryEditor(id); break;
    case 'close-modal': closeModal(); break;
    case 'toggle-archive': showArchived = !showArchived; render(); break;
    case 'restore-task': if (editing) commit(next => { next.tasks.find(t => t.id === id).archived = false; }); break;
    case 'archive-task': if (editing) { if (data.session?.taskId === id) { toast('Termine ou descarte a sessão antes de arquivar a tarefa.'); break; } confirmAction('Arquivar tarefa?', 'O histórico será mantido. A tarefa deixará de participar do planejamento semanal e poderá ser reativada no modo de edição.', () => { commit(next => { if (next.session?.taskId === id) throw new Error('Há uma sessão ativa nessa tarefa.'); next.tasks.find(t => t.id === id).archived = true; }); }, 'Arquivar'); } break;
    case 'delete-entry': if (editing) { const d = data.entries.find(e => e.id === id)?.date; confirmAction('Excluir registro?', 'Esse tempo será removido do dia, da semana e do histórico.', () => { commit(next => { next.entries = next.entries.filter(e => e.id !== id); }); dayDetails(d); }, 'Excluir registro'); } break;
    case 'start-focus': startFocus(id); break;
    case 'open-focus': focusOpen = true; render(); break;
    case 'minimize-focus': focusOpen = false; render(); break;
    case 'pause-focus': commit(next => { if (!next.session) return; if (next.session.startedAt === null) next.session.startedAt = Date.now(); else { next.session.segments = activeSegments(next.session); next.session.startedAt = null; } }); $('.focus-screen [data-action="pause-focus"]')?.focus(); break;
    case 'finish-focus': finishFocus(); break;
    case 'restart-focus': confirmAction('Reiniciar o cronômetro?', 'O tempo desta sessão será zerado. Nenhum tempo será adicionado ao histórico.', () => commit(next => { if (next.session) { next.session.segments = []; next.session.startedAt = Date.now(); } }), 'Reiniciar'); break;
    case 'discard-focus': confirmAction('Descartar esta sessão?', 'O tempo desta sessão não será salvo. Os registros anteriores serão mantidos.', () => { focusOpen = false; commit(next => { next.session = null; }); }, 'Descartar'); break;
    case 'prev-month': case 'next-month': { const d = parseDate(month + '-01'); d.setMonth(d.getMonth() + (action === 'prev-month' ? -1 : 1)); month = dateKey(d).slice(0, 7); render(); break; }
    case 'this-month': month = dateKey().slice(0, 7); render(); break;
    case 'export': exportBackup(); break;
    case 'import': $('#import-file').click(); break;
    case 'help': help(); break;
  }
});
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('O backup deve ter até 10 MB.');
    const imported = validateData(JSON.parse(await file.text()));
    // Um backup com sessão aberta é retomado pausado, sem contar o período desde a exportação.
    if (imported.session) imported.session.startedAt = null;
    confirmAction('Restaurar este backup?', `${imported.tasks.length} tarefas e ${imported.entries.length} registros substituirão os dados atuais. Um backup dos dados atuais será baixado antes da troca. Sessões importadas ficam pausadas.`, () => {
      exportBackup();
      try { localStorage.setItem(KEY, JSON.stringify(imported)); data = imported; storageError = ''; corruptRaw = ''; focusOpen = false; render(); toast('Backup restaurado.'); }
      catch { toast('Não foi possível salvar o backup neste navegador.'); }
    }, 'Restaurar backup');
  } catch (e) { toast(e instanceof SyntaxError ? 'O arquivo não contém um JSON válido.' : e.message); }
});
$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const r = $('#modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
document.addEventListener('keydown', event => {
  if (!focusOpen || !data.session || $('#modal').open) return;
  if (event.key === 'Escape') { focusOpen = false; render(); return; }
  if (event.key === 'Tab') {
    const controls = [...document.querySelectorAll('.focus-screen button')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || !document.activeElement.closest('.focus-screen'))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !document.activeElement.closest('.focus-screen'))) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener('storage', event => {
  if (event.key === THEME_KEY || event.key === null) applyTheme(event.key === THEME_KEY ? event.newValue : 'light');
  if (event.key !== KEY) return;
  try { data = readData(); storageError = ''; if (!data.session) focusOpen = false; if ($('#modal').open) { closeModal(); toast('Dados atualizados em outra aba. Abra a edição novamente.'); } render(); }
  catch (e) { storageError = e.message; render(); }
});
setInterval(() => { if (dateKey() !== currentDate) { currentDate = dateKey(); render(); } else updateClock(); }, 250);
render();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({ name: 'read_weekly_plan', title: 'Consultar planejamento semanal', description: 'Lê as tarefas ativas e os saldos diário, semanal e histórico, em segundos. Não modifica dados.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute(input) { if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Esta consulta não aceita parâmetros.'); return { date: dateKey(), tasks: data.tasks.filter(t => !t.archived).map(t => { const s = stats(data, t); return { name: t.name, weeklyGoal: s.goal, weeklyRemaining: s.remaining, dailyRemaining: s.dailyRemaining, historical: s.historical }; }) }; } }, { signal: lifecycle.signal })).catch(() => {});
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  } catch { /* O planejador não depende da API experimental. */ }
}
