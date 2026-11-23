const config = window.APP_CONFIG;
const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
const byId = id => document.getElementById(id);
const status = byId('status');
const login = byId('login');
const inbox = byId('inbox');
const detail = byId('detail');
const roleNames = {
  coordinador: 'Coordinador', secretario: 'Secretario',
  superintendente_servicio: 'Superintendente de servicio'
};
const monthFormat = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateFormat = new Intl.DateTimeFormat('es-US', { dateStyle: 'medium', timeZone: 'America/Chicago' });
let applications = [];
let member;
let activeId;

function element(tag, text) {
  const item = document.createElement(tag);
  item.textContent = text;
  return item;
}

function selectedMonths(item) {
  return item.meses.map(month => monthFormat.format(new Date(month))).join(', ');
}

function servicePeriod(item) {
  const months = selectedMonths(item);
  return item.continuo ? 'De continuo hasta nuevo aviso desde ' + months : months;
}

function approvalStatus(item) {
  const count = item.aux_approvals.length;
  return count === 3 ? 'Aprobada · 3 de 3' : `Pendiente · ${count} de 3`;
}

function filteredApplications() {
  const filter = byId('search').value.trim().toLocaleLowerCase('es');
  return applications.filter(item => item.nombre.toLocaleLowerCase('es').includes(filter));
}

function showList() {
  activeId = null;
  detail.hidden = true;
  detail.replaceChildren();
  byId('print-application').hidden = true;
  inbox.hidden = false;
  const matches = filteredApplications();
  byId('applications').replaceChildren(...matches.map(item => {
    const button = element('button', item.nombre);
    button.className = 'secondary';
    const complete = item.aux_approvals.length === 3;
    const estado = element('small', approvalStatus(item));
    estado.className = complete ? 'status Completo' : 'status En-revision';
    button.append(estado);
    button.onclick = () => showDetail(item);
    const row = element('div', '');
    row.className = 'toolbar aux-print-row';
    row.append(button);
    if (complete) {
      const menu = element('select', '');
      menu.style.width = 'auto';
      menu.setAttribute('aria-label', 'Imprimir ' + item.nombre);
      for (const [value, label] of [['', 'Imprimir'], ['formulario', 'Formulario S-205b-S'], ['carta', 'Carta de aprobación']]) {
        const option = element('option', label);
        option.value = value;
        menu.append(option);
      }
      menu.onchange = () => {
        const tipo = menu.value;
        menu.value = '';
        if (tipo === 'carta') imprimirCarta(item);
        if (tipo === 'formulario') {
          showDetail(item);
          window.print();
        }
      };
      row.append(menu);
    }
    return row;
  }));
  byId('print-list').disabled = matches.length === 0;
  if (!matches.length) byId('applications').append(element('p', 'No hay solicitudes.'));
}

async function imprimirCarta(item) {
  const vista = window.open('', '_blank');
  if (!vista) {
    window.alert('Permita las ventanas emergentes para imprimir la carta.');
    return;
  }
  vista.opener = null;
  const doc = vista.document;
  doc.documentElement.lang = 'es';
  doc.title = 'Carta de aprobación · Precursor auxiliar';
  doc.body.textContent = 'Preparando impresión…';
  try {
    const { data, error } = await db.from('profiles').select('user_id,nombre')
      .in('user_id', item.aux_approvals.map(approval => approval.user_id));
    if (vista.closed) return;
    if (error) throw new Error('No se pudieron cargar los nombres del comité.');
    const nombres = new Map((data || []).map(perfil => [perfil.user_id, perfil.nombre]));
    const cargos = ['Coordinador del Cuerpo de Ancianos', 'Secretario', 'Superintendente de Servicio'];
    const firmas = Object.keys(roleNames).map((rol, i) => ({
      nombre: nombres.get(item.aux_approvals.find(approval => approval.rol === rol)?.user_id),
      cargo: cargos[i]
    }));
    const contenido = doc.createElement('main');
    doc.body.replaceChildren(contenido);
    await mensajesSolicitud.prepararCarta(contenido, item.id, item.nombre, null, firmas,
      'de precursor auxiliar (S-205b-S)');
    if (!vista.closed) vista.print();
  } catch (error) {
    if (!vista.closed) doc.body.textContent = error.message;
  }
}

function preparePrint() {
  if (!member || inbox.hidden) return;
  const table = byId('print-table');
  const matches = filteredApplications();
  table.querySelector('caption').textContent = 'Total de solicitudes: ' + matches.length;
  table.querySelector('tbody').replaceChildren(...matches.map(item => {
    const row = document.createElement('tr');
    row.append(element('td', item.nombre), element('td', dateFormat.format(new Date(item.created_at))),
      element('td', servicePeriod(item)), element('td', approvalStatus(item)));
    return row;
  }));
}

function renderPrintApplication(item) {
  byId('print-period-label').textContent = item.continuo ? 'Mes de inicio:' : 'El (los) mes(es) de';
  byId('print-months').textContent = selectedMonths(item);
  byId('print-ongoing').textContent = item.continuo ? '✓' : '';
  byId('print-date').textContent = dateFormat.format(new Date(item.created_at));
  byId('print-signature').textContent = item.firma;
  byId('print-name').textContent = item.nombre;
  byId('print-approval-heading').textContent = item.aux_approvals.length === 3
    ? 'Aprobado por los miembros del comité de servicio:'
    : 'Aprobaciones del comité de servicio: ' + approvalStatus(item);
  byId('print-approvals').replaceChildren(...Object.entries(roleNames).map(([role, label]) => {
    const approval = item.aux_approvals.find(entry => entry.rol === role);
    const entry = element('li', label);
    const signed = approval
      ? approval.iniciales + ' · ' + dateFormat.format(new Date(approval.approved_at))
      : 'Pendiente';
    const line = element('span', signed);
    line.className = 'print-line';
    entry.append(line);
    return entry;
  }));
  byId('print-application').hidden = false;
}

function showDetail(item) {
  renderPrintApplication(item);
  activeId = item.id;
  inbox.hidden = true;
  detail.hidden = false;
  const back = element('button', 'Volver a solicitudes');
  back.className = 'secondary no-print';
  back.onclick = showList;
  detail.replaceChildren(
    back, element('h2', item.nombre),
    element('p', servicePeriod(item)), element('p', 'Firma del solicitante: ' + item.firma),
    element('p', 'Recibida: ' + dateFormat.format(new Date(item.created_at))),
    element('p', 'El solicitante confirmó la declaración del formulario.'),
    element('h3', approvalStatus(item))
  );
  const roles = document.createElement('ul');
  for (const [role, label] of Object.entries(roleNames)) {
    const approval = item.aux_approvals.find(entry => entry.rol === role);
    roles.append(element('li', `${label}: ${approval ? approval.iniciales + ' · ' +
      dateFormat.format(new Date(approval.approved_at)) : 'Pendiente'}`));
  }
  detail.append(roles);
  const print = element('button', 'Imprimir solicitud o guardar PDF');
  print.className = 'secondary no-print';
  print.onclick = () => window.print();
  detail.append(print);
  if (!item.aux_approvals.some(entry => entry.rol === member.rol)) {
    const approvalForm = document.createElement('form');
    approvalForm.className = 'no-print';
    const label = element('label', 'Sus iniciales ');
    const initials = document.createElement('input');
    initials.maxLength = 12;
    initials.required = true;
    label.append(initials);
    const submit = element('button', 'Aprobar');
    approvalForm.append(element('p', 'Antes de aprobar, confirme los requisitos del formulario y la consulta con el superintendente de grupo.'), label, submit);
    approvalForm.onsubmit = async event => {
      event.preventDefault();
      if (!initials.value.trim()) return;
      submit.disabled = true;
      const { error } = await db.rpc('approve_aux_application', { application: item.id, initials: initials.value });
      status.textContent = error ? 'No se pudo registrar la aprobación.' : 'Aprobación registrada.';
      if (error) submit.disabled = false;
      else await loadApplications();
    };
    detail.append(approvalForm);
  }
}

async function loadApplications() {
  const { data, error } = await db.from('aux_applications')
    .select('*,aux_approvals(rol,iniciales,approved_at,user_id)').order('created_at', { ascending: false });
  if (error) {
    status.textContent = 'No se pudieron cargar las solicitudes.';
    return;
  }
  applications = data;
  const selected = applications.find(item => item.id === activeId);
  if (selected) showDetail(selected);
  else showList();
}

async function boot() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    login.hidden = false;
    status.textContent = '';
    return;
  }
  const { data, error } = await db.from('aux_committee').select('rol').eq('user_id', session.user.id).maybeSingle();
  byId('logout').hidden = false;
  login.hidden = true;
  if (error || !data) {
    status.textContent = 'Esta cuenta no tiene acceso al comité de precursor auxiliar.';
    return;
  }
  member = data;
  byId('who').textContent = roleNames[member.rol];
  byId('portal-switch').hidden = false;
  status.textContent = '';
  await loadApplications();
}
window.addEventListener('beforeprint', preparePrint);
byId('print-list').onclick = () => window.print();
byId('search').oninput = showList;
byId('logout').onclick = async () => {
  await db.auth.signOut();
  location.reload();
};
login.onsubmit = async event => {
  event.preventDefault();
  const credentials = new FormData(login);
  const { error } = await db.auth.signInWithPassword({
    email: credentials.get('email').trim(), password: credentials.get('password')
  });
  if (error) status.textContent = 'No se pudo iniciar sesión.';
  else { login.reset(); await boot(); }
};
boot();
