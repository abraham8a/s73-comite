(function () {
  const cfg = window.APP_CONFIG;
  // persistSession:false -> the public form never uses a committee login stored in this browser
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const $ = (id) => document.getElementById(id);
  const form = $('form');
  const gate = $('pin-gate'), pinForm = $('pin-form'), pinInput = $('pin-code'), pinMsg = $('pin-msg'); const ACCESS_PIN = '1946'; if (sessionStorage.getItem('s73-applicant-access') === 'granted') { gate.hidden = true; form.hidden = false; } pinForm.addEventListener('submit', (e) => { e.preventDefault(); if (pinInput.value === ACCESS_PIN) { sessionStorage.setItem('s73-applicant-access', 'granted'); gate.hidden = true; form.hidden = false; $('apellidos').focus(); } else { pinMsg.textContent = 'Código incorrecto. Inténtelo de nuevo.'; pinMsg.hidden = false; pinInput.select(); } }); const msg = $('msg');
  const DIAS = [['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'], ['jueves', 'Jueves'], ['viernes', 'Viernes']];
  const CODES = [['M', 'M – Mañana'], ['T', 'T – Tarde'], ['N', 'N – Noche'], ['MD', 'MD – Medio día'], ['TD', 'TD – Todo el día'], ['NP', 'NP – No puedo']];

  // availability selects
  $('diasGrid').innerHTML = DIAS.map(([k, l]) =>
    `<div><label for="disp_${k}">${l}</label>
       <select id="disp_${k}" name="disp_${k}" required>
         <option value="">—</option>
         ${CODES.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
       </select></div>`).join('');

  // dates as "día de mes del año" so day and month can't be confused
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  document.querySelectorAll('[data-fecha]').forEach((box) => {
    const id = box.dataset.fecha, hidden = $(id);
    box.insertAdjacentHTML('afterbegin',
      `<select id="${id}_d" aria-label="Día" required><option value="">Día</option>${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select>
       <span>de</span>
       <select id="${id}_m" aria-label="Mes" required><option value="">Mes</option>${MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
       <span>del</span>
       <input type="number" id="${id}_y" aria-label="Año" placeholder="Año" inputmode="numeric" min="1900" max="${hoy.getFullYear()}" required>`);
    const dd = $(id + '_d'), mm = $(id + '_m'), yy = $(id + '_y');
    const sync = () => {
      const d = +dd.value, m = +mm.value, y = +yy.value;
      dd.setCustomValidity('');
      yy.setCustomValidity(yy.value && !/^\d{4}$/.test(yy.value) ? 'Escriba el año con cuatro dígitos.' : '');
      if (!d || !m || !y || !yy.validity.valid) { hidden.value = ''; return; }
      const f = new Date(y, m - 1, d);
      if (f.getMonth() !== m - 1) { hidden.value = ''; dd.setCustomValidity('Esa fecha no existe.'); return; }
      hidden.value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };
    [dd, mm, yy].forEach((el) => el.addEventListener('input', sync));
    if (id === 'firma_fecha') { dd.value = hoy.getDate(); mm.value = hoy.getMonth() + 1; yy.value = hoy.getFullYear(); sync(); }
  });

  // languages: dropdown, with free text when "Otro"
  const idiomaSel = $('idiomas_sel'), idiomaOtro = $('idiomas_otro');
  idiomaSel.addEventListener('change', () => {
    const otro = idiomaSel.value === '__otro';
    $('idiomasOtroBox').hidden = !otro;
    idiomaOtro.required = otro;
    if (!otro) idiomaOtro.value = '';
    else idiomaOtro.focus();
  });

  // conditional fields
  const radio = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value;
  form.addEventListener('change', () => {
    const casado = radio('estado_civil') === 'casado';
    $('conyugeBox').hidden = !casado;
    $('conyuge').required = casado;
    if (!casado) $('conyuge').value = '';

    const si = radio('participo_antes') === 'si';
    $('lugaresBox').hidden = !si;
    $('lugares').required = si;
    if (!si) $('lugares').value = '';

    const otro = $('otroChk').checked;
    $('sirve_otro').hidden = !otro;
    $('sirve_otro').required = otro;
    if (!otro) $('sirve_otro').value = '';
  });

  function showError(text) {
    msg.textContent = text;
    msg.hidden = false;
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;

    if (cfg.SUPABASE_URL.includes('TU-PROYECTO')) {
      return showError('El sitio aún no está configurado (falta config.js).');
    }

    const fd = new FormData(form);

    // bots fill hidden fields: pretend success, send nothing
    if ((fd.get('website') || '').trim()) {
      form.hidden = true; $('done').hidden = false; return;
    }

    const sirve = fd.getAll('sirve_como');
    const otro = (fd.get('sirve_otro') || '').trim();
    if (!sirve.length && !otro) {
      return showError('Marque al menos una opción en la pregunta 7 (Sirve como).');
    }

    const idiomas = idiomaSel.value === '__otro' ? idiomaOtro.value.trim() : idiomaSel.value;
    if (!idiomas) return showError('Indique los idiomas que habla con fluidez.');

    const v = (k) => (fd.get(k) || '').toString().trim() || null;
    const disponibilidad = {};
    DIAS.forEach(([k]) => { disponibilidad[k] = fd.get('disp_' + k); });

    const row = {
      apellidos: v('apellidos'), primer_nombre: v('primer_nombre'), segundo_nombre: v('segundo_nombre'),
      direccion: v('direccion'), ciudad: v('ciudad'), estado: v('estado'), codigo_postal: v('codigo_postal'),
      email: v('email'), tel_fijo: v('tel_fijo'), celular: v('celular'),
      cong_nombre: v('cong_nombre'), cong_ciudad: v('cong_ciudad'), cong_estado: v('cong_estado'),
      idiomas,
      fecha_nacimiento: v('fecha_nacimiento'), fecha_bautismo: v('fecha_bautismo'), sexo: v('sexo'),
      estado_civil: v('estado_civil'), conyuge: v('conyuge'),
      sirve_como: sirve, sirve_otro: otro || null,
      desea_capacidad: v('desea_capacidad'), participo_antes: v('participo_antes'), lugares: v('lugares'),
      disponibilidad,
      fines_semana: { sabado: Number(fd.get('sabado')), domingo: Number(fd.get('domingo')) },
      firma: v('firma'), firma_fecha: v('firma_fecha')
    };

    const btn = $('send');
    btn.disabled = true; btn.textContent = 'Enviando…';
    const { error } = await sb.from('applications').insert(row);   // no .select(): public form cannot read
    if (error) {
      btn.disabled = false; btn.textContent = 'Enviar solicitud';
      return showError('No se pudo enviar. Intente de nuevo. (' + error.message + ')');
    }
    form.hidden = true;
    $('done').hidden = false;
    window.scrollTo(0, 0);
  });
})();
