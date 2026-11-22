const config = window.APP_CONFIG;
const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const form = document.querySelector('#application');
const months = document.querySelector('#months');
const addMonth = document.querySelector('#add-month');
const status = document.querySelector('#status');

function updateMonths() {
  const ongoing = form.elements.continuo.checked;
  if (ongoing) [...months.children].slice(1).forEach(row => row.remove());
  months.firstElementChild.firstElementChild.textContent = ongoing ? 'Mes de inicio' : 'Mes de servicio';
  addMonth.hidden = ongoing || months.children.length >= 24;
}

function appendMonth() {
  const row = document.createElement('p');
  const label = document.createElement('label');
  const caption = document.createElement('span');
  caption.textContent = 'Mes de servicio';
  const input = document.createElement('input');
  input.type = 'month';
  input.name = 'mes';
  input.required = true;
  input.pattern = '[0-9]{4}-(0[1-9]|1[0-2])';
  input.placeholder = 'AAAA-MM';
  label.append(caption, input);
  row.append(label);
  if (months.children.length) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Quitar mes';
    remove.onclick = () => { row.remove(); updateMonths(); };
    row.append(remove);
  }
  months.append(row);
  updateMonths();
}
appendMonth();
addMonth.onclick = appendMonth;
form.elements.continuo.onchange = updateMonths;

form.onsubmit = async event => {
  event.preventDefault();
  const entries = new FormData(form);
  const dates = entries.getAll('mes').map(month => month + '-01');
  if (dates.length !== new Set(dates).size) {
    status.textContent = 'Seleccione cada mes una sola vez.';
    return;
  }
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  status.textContent = 'Enviando…';
  try {
    const { error } = await db.rpc('submit_aux_application', {
      applicant: entries.get('nombre'), congregation: entries.get('congregacion'),
      months: dates.sort(), ongoing: entries.has('continuo'), attested: entries.has('declaracion'),
      signature: entries.get('firma')
    });
    if (error) throw error;
    form.hidden = true;
    status.textContent = 'Su solicitud fue recibida por el comité de servicio de Las Brisas Spanish.';
  } catch {
    status.textContent = 'No se pudo confirmar el envío. Consulte al secretario si el problema continúa.';
    button.disabled = false;
  }
};
