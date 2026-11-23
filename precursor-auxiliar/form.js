const config = window.APP_CONFIG;
const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const form = document.querySelector('#application');
const months = document.querySelector('#months');
const options = document.querySelector('#month-options');
const summary = document.querySelector('#month-summary');
const monthError = document.querySelector('#month-error');
const status = document.querySelector('#status');

const accessCode = '1946';
const accessKey = 'auxiliar-applicant-access';
const gate = document.querySelector('#pin-gate');
const panel = document.querySelector('#application-panel');
const codeInput = document.querySelector('#pin-code');
const codeMessage = document.querySelector('#pin-msg');

function showApplication() {
  gate.hidden = true;
  panel.hidden = false;
}

if (sessionStorage.getItem(accessKey) === 'granted') showApplication();
document.querySelector('#pin-form').addEventListener('submit', event => {
  event.preventDefault();
  if (codeInput.value !== accessCode) {
    codeMessage.hidden = false;
    codeMessage.textContent = 'Código incorrecto. Inténtelo de nuevo.';
    codeInput.select();
    return;
  }
  sessionStorage.setItem(accessKey, 'granted');
  showApplication();
  months.querySelector('summary').focus();
});

const localDate = new Intl.DateTimeFormat('es', {
  dateStyle: 'long', timeZone: 'America/Chicago'
});
const today = new Date();
document.querySelector('#application-date').textContent = localDate.format(today);
let year = Number(new Intl.DateTimeFormat('en', {
  year: 'numeric', timeZone: 'America/Chicago'
}).format(today));
const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2000, index, 1)))
);
const selected = new Set();
let startMonth = '';

function activeMonths() {
  return form.elements.continuo.checked ? (startMonth ? [startMonth] : []) : [...selected].sort();
}

function updateSummary() {
  const values = activeMonths();
  summary.textContent = values.length ? values.map(value => {
    const [y, m] = value.split('-');
    return monthNames[Number(m) - 1] + ' ' + y;
  }).join(', ') : (form.elements.continuo.checked ? 'Seleccione el mes de inicio' : 'Seleccione los meses');
}

function renderOptions() {
  const ongoing = form.elements.continuo.checked;
  document.querySelector('#year').textContent = year;
  document.querySelector('#previous-year').disabled = year <= 1;
  document.querySelector('#next-year').disabled = year >= 9999;
  options.replaceChildren(...monthNames.map((name, index) => {
    const value = String(year).padStart(4, '0') + '-' + String(index + 1).padStart(2, '0');
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = ongoing ? 'radio' : 'checkbox';
    input.name = 'month-choice';
    input.value = value;
    input.checked = ongoing ? startMonth === value : selected.has(value);
    label.append(input, name);
    return label;
  }));
}

options.addEventListener('change', event => {
  const input = event.target;
  if (form.elements.continuo.checked) {
    startMonth = input.value;
  } else if (!input.checked) {
    selected.delete(input.value);
  } else if (selected.size < 24) {
    selected.add(input.value);
  } else {
    input.checked = false;
    monthError.textContent = 'Puede seleccionar hasta 24 meses.';
    monthError.hidden = false;
    return;
  }
  monthError.hidden = true;
  updateSummary();
});

form.elements.continuo.addEventListener('change', () => {
  if (form.elements.continuo.checked) {
    startMonth = [...selected].sort()[0] || startMonth;
  } else if (!selected.size && startMonth) {
    selected.add(startMonth);
  }
  const first = activeMonths()[0];
  if (first) year = Number(first.slice(0, 4));
  document.querySelector('#period-label').textContent = form.elements.continuo.checked
    ? 'Mes de inicio' : 'El (los) mes(es) de';
  monthError.hidden = true;
  renderOptions();
  updateSummary();
});

document.querySelector('#previous-year').onclick = () => { year--; renderOptions(); };
document.querySelector('#next-year').onclick = () => { year++; renderOptions(); };
function closeMonths() {
  months.open = false;
  months.querySelector('summary').focus();
}
document.querySelector('#months-done').onclick = closeMonths;
months.addEventListener('keydown', event => {
  if (event.key === 'Escape' && months.open) closeMonths();
});
renderOptions();
updateSummary();

form.onsubmit = async event => {
  event.preventDefault();
  const entries = new FormData(form);
  const signedName = entries.get('firma').trim();
  if (!signedName) {
    status.textContent = 'Escriba su nombre completo en la firma.';
    form.elements.firma.focus();
    return;
  }
  const dates = activeMonths().map(month => month + '-01');
  if (!dates.length) {
    monthError.textContent = form.elements.continuo.checked
      ? 'Seleccione el mes de inicio.' : 'Seleccione al menos un mes.';
    monthError.hidden = false;
    months.open = true;
    options.querySelector('input').focus();
    return;
  }
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  status.textContent = 'Enviando…';
  try {
    const { error } = await db.rpc('submit_aux_application', {
      applicant: signedName, congregation: entries.get('congregacion'),
      months: dates, ongoing: entries.has('continuo'), attested: entries.has('declaracion'),
      signature: signedName
    });
    if (error) throw error;
    form.hidden = true;
    status.textContent = '';
    mensajesSolicitud.confirmar(document.querySelector('#done'), signedName);
    window.scrollTo(0, 0);
  } catch {
    status.textContent = 'No se pudo confirmar el envío. Consulte al secretario si el problema continúa.';
    button.disabled = false;
  }
};
