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

function showList() {
  activeId = null;
  detail.hidden = true;
  detail.replaceChildren();
  inbox.hidden = false;
  const filter = byId('search').value.trim().toLocaleLowerCase('es');
  const matches = applications.filter(item => item.nombre.toLocaleLowerCase('es').includes(filter));
  byId('applications').replaceChildren(...matches.map(item => {
    const button = element('button', item.nombre);
    const count = item.aux_approvals.length;
    button.className = 'secondary';
    button.append(element('small', count === 3 ? 'Aprobada · 3 de 3' : `Pendiente · ${count} de 3`));
    button.onclick = () => showDetail(item);
    return button;
  }));
  if (!matches.length) byId('applications').append(element('p', 'No hay solicitudes.'));
}

function showDetail(item) {
  activeId = item.id;
  inbox.hidden = true;
  detail.hidden = false;
  const back = element('button', 'Volver a solicitudes');
  back.className = 'secondary no-print';
  back.onclick = showList;
  const months = item.meses.map(month => monthFormat.format(new Date(month))).join(', ');
  const period = item.continuo ? `De continuo hasta nuevo aviso desde ${months}` : months;
  const count = item.aux_approvals.length;
  detail.replaceChildren(
    back, element('h2', item.nombre),
    element('p', period), element('p', 'Firma del solicitante: ' + item.firma),
    element('p', 'Recibida: ' + dateFormat.format(new Date(item.created_at))),
    element('p', 'El solicitante confirmó la declaración del formulario.'),
    element('h3', count === 3 ? 'Aprobada · 3 de 3' : `Pendiente · ${count} de 3`)
  );
  const roles = document.createElement('ul');
  for (const [role, label] of Object.entries(roleNames)) {
    const approval = item.aux_approvals.find(entry => entry.rol === role);
    roles.append(element('li', `${label}: ${approval ? approval.iniciales + ' · ' +
      dateFormat.format(new Date(approval.approved_at)) : 'Pendiente'}`));
  }
  detail.append(roles);
  if (count === 3) {
    const print = element('button', 'Imprimir o guardar PDF');
    print.className = 'secondary no-print';
    print.onclick = () => window.print();
    detail.append(print);
  } else if (!item.aux_approvals.some(entry => entry.rol === member.rol)) {
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
    .select('*,aux_approvals(rol,iniciales,approved_at)').order('created_at', { ascending: false });
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
