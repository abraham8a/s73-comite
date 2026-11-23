(function () {
  const cfg = window.APP_CONFIG;
  const authParamsAtStart = new URLSearchParams(location.hash.slice(1));
  const initialAuthType = authParamsAtStart.get('type');
  const initialAuthError = authParamsAtStart.get('error_code');
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let recoveryEvent = false;
  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryEvent = true;
      showPasswordSetup();
    }
  });

  const ROLES = [
    { key: 'coordinador', label: 'Coordinador del cuerpo de ancianos', short: 'Coordinador' },
    { key: 'secretario', label: 'Secretario', short: 'Secretario' },
    { key: 'superintendente_servicio', label: 'Superintendente de servicio', short: 'Sup. de servicio' }
  ];
  const QUESTIONS = [
    ['q1', '1. ¿Es el solicitante un entusiasta publicador del Reino?'],
    ['q2', '2. ¿Atiende bien sus deberes?'],
    ['q3', '3. ¿Mantiene y fomenta buenas relaciones con los demás?'],
    ['q4', '4. ¿Demuestra una actitud correcta hacia las personas de otras culturas?'],
    ['q5', '5. ¿Colabora con el cuerpo de ancianos?'],
    ['q6a', '6a. ¿Se muestra dispuesto a abordar a la gente en diferentes lugares públicos para comunicarle las buenas nuevas?'],
    ['q6b', '6b. ¿Demuestra buen juicio al hacerlo?'],
    ['q7', '7. ¿Goza ahora de buena reputación moral y tiene buenos hábitos?'],
    ['q8', '8. ¿Lo recomiendan para que reciba preparación en la predicación pública especial en áreas metropolitanas?']
  ];
  const CRITERIA = [
    ['apariencia', 'Apariencia digna'],
    ['confiable', 'Confiable y organizado'],
    ['equilibrado', 'Equilibrado y sensato'],
    ['resistencia', 'Resistencia física']
  ];
  const GRADES = [
    ['A', 'A = Excelente'], ['B', 'B = Bueno'], ['C', 'C = Satisfactorio (apto)'],
    ['D', 'D = Regular (pudiera no ser apto)'], ['E', 'E = Deficiente (no apto)']
  ];
  const DIAS = [['lunes', 'Lunes'], ['martes', 'Martes'], ['miercoles', 'Miércoles'], ['jueves', 'Jueves'], ['viernes', 'Viernes']];
  const AVAIL = { M: 'Mañana', T: 'Tarde', N: 'Noche', MD: 'Medio día', TD: 'Todo el día', NP: 'No puedo' };
  const YN = { si: 'Sí', no: 'No' };

  const $app = document.getElementById('app');
  const $who = document.getElementById('who');
  const $logout = document.getElementById('logout');
  let me = null;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const role = (k) => ROLES.find((r) => r.key === k);
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fmtDate = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${+d} de ${MESES_ES[+m - 1]} del ${y}`; };
  const fmtDT = (s) => new Date(s).toLocaleString('es-US', { dateStyle: 'short', timeStyle: 'short' });
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fullName = (a) => [a.primer_nombre, a.segundo_nombre, a.apellidos].filter(Boolean).join(' ');
  const errBox = (e) => `<div class="msg err">Error: ${esc(e.message || e)}</div>`;
  const signed = (r) => !!(r && r.firma && r.firma.trim());

  function statusOf(reviews) {
    const n = reviews.filter(signed).length;
    if (n >= ROLES.length) return 'Completo';
    if (reviews.length) return 'En revisión';
    return 'Nuevo';
  }
  const statusClass = (s) => s.replace(' ', '-').replace('ó', 'o');

  // ---------- login ----------
    function showPasswordSetup() {
    $who.textContent = ''; $logout.hidden = true; me = null;
    $app.innerHTML =
      '<section class="paper narrow"><h2>Configura tu contraseña</h2>' +
      '<p>Crea una contraseña para futuros accesos.</p>' +
      '<form id="set-password">' +
      '<div class="q"><label for="new-pw">Nueva contraseña</label><input type="password" id="new-pw" required minlength="8" autocomplete="new-password"></div>' +
      '<div class="q"><label for="confirm-pw">Confirma la contraseña</label><input type="password" id="confirm-pw" required minlength="8" autocomplete="new-password"></div>' +
      '<div id="pmsg"></div><button type="submit">Guardar contraseña</button></form></section>';
    document.getElementById('set-password').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('new-pw').value;
      const confirmation = document.getElementById('confirm-pw').value;
      const $message = document.getElementById('pmsg');
      if (password !== confirmation) {
        $message.innerHTML = '<div class="msg err">Las contraseñas no coinciden.</div>';
        return;
      }
      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        $message.innerHTML = '<div class="msg err">No se pudo guardar la contraseña: ' + esc(error.message) + '</div>';
        return;
      }
      history.replaceState(null, '', location.pathname + location.search);
      await boot();
    });
  }

function showLogin(message) {
    const authParams = new URLSearchParams(location.hash.slice(1));
    if (!message && initialAuthError === 'otp_expired') {
      message = 'El enlace venció o ya se usó. Solicita que te envíen uno nuevo.';
      history.replaceState(null, '', location.pathname + location.search);
    }
    $who.textContent = ''; $logout.hidden = true; me = null;
    $app.innerHTML = `
      <section class="paper narrow">
        <h2>Acceso del comité</h2>
        ${message ? `<div class="msg err">${esc(message)}</div>` : ''}
        <form id="login">
          <div class="q"><label for="em">Correo</label><input type="email" id="em" required autocomplete="username"></div>
          <div class="q"><label for="pw">Contraseña</label><input type="password" id="pw" required autocomplete="current-password"></div>
          <div id="lmsg"></div>
<button type="submit">Entrar</button><p><a href="#" id="forgot-password">¿Olvidaste tu contraseña?</a></p>
        </form>
      </section>`;
    document.getElementById('forgot-password').addEventListener('click', async (e) => { e.preventDefault(); const email = document.getElementById('em').value.trim(); const $status = document.getElementById('lmsg'); if (!email) { $status.innerHTML = '<div class="msg err">Escribe tu correo para enviarte un enlace.</div>'; document.getElementById('em').focus(); return; } const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); $status.innerHTML = error ? '<div class="msg err">No se pudo enviar el enlace. Inténtalo más tarde.</div>' : '<div class="msg ok">Si el correo corresponde a una cuenta, recibirás un enlace para restablecer la contraseña.</div>'; }); document.getElementById('login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await sb.auth.signInWithPassword({
        email: document.getElementById('em').value.trim(),
        password: document.getElementById('pw').value
      });
      if (error) { document.getElementById('lmsg').innerHTML = `<div class="msg err">Correo o contraseña incorrectos.</div>`; return; }
      boot();
    });
  }

  $logout.addEventListener('click', async () => { await sb.auth.signOut(); document.getElementById('portal-switch').hidden = true; showLogin(); });

  async function boot() {
    if (cfg.SUPABASE_URL.includes('TU-PROYECTO')) { $app.innerHTML = '<div class="msg err">Falta configurar config.js</div>'; return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return showLogin();
    const authParams = new URLSearchParams(location.hash.slice(1));
    if (recoveryEvent || ['invite', 'recovery'].includes(initialAuthType)) return showPasswordSetup();
    const { data: prof, error } = await sb.from('profiles').select('nombre,rol').eq('user_id', session.user.id).maybeSingle();
    if (error) { $app.innerHTML = errBox(error); return; }
    if (!prof) { await sb.auth.signOut(); return showLogin('Tu cuenta aún no tiene un rol asignado. Avisa al administrador.'); }
    me = { id: session.user.id, nombre: prof.nombre, rol: prof.rol };
    $who.textContent = `${me.nombre} · ${role(me.rol).label}`;
    $logout.hidden = false;
    const { data: auxMember } = await sb.from('aux_committee')
      .select('user_id').eq('user_id', session.user.id).maybeSingle();
    document.getElementById('portal-switch').hidden = !auxMember;
    route();
  }

  window.addEventListener('hashchange', () => { if (me) route(); });
  function route() {
    const m = location.hash.match(/^#\/s\/([0-9a-fA-F-]+)$/);
    if (m) renderDetail(m[1]); else renderList();
  }

  // ---------- list ----------
  async function renderList() {
    $app.innerHTML = '<p class="muted">Cargando…</p>';
    const [a, r] = await Promise.all([
      sb.from('applications').select('id,created_at,apellidos,primer_nombre,segundo_nombre,cong_nombre,cong_ciudad,cong_estado').order('created_at', { ascending: false }),
      sb.from('reviews').select('application_id,rol,firma')
    ]);
    if (a.error || r.error) { $app.innerHTML = errBox(a.error || r.error); return; }

    const byApp = {};
    (r.data || []).forEach((x) => { (byApp[x.application_id] = byApp[x.application_id] || []).push(x); });

    const rows = (a.data || []).map((p) => {
      const revs = byApp[p.id] || [];
      const st = statusOf(revs);
      const chips = ROLES.map((ro) => {
        const rv = revs.find((x) => x.rol === ro.key);
        const cls = signed(rv) ? 'ok' : rv ? 'warn' : '';
        return `<span class="chip ${cls}">${esc(ro.short)}${signed(rv) ? ' ✓' : ''}</span>`;
      }).join('');
      const txt = `${fullName(p)} ${p.cong_nombre || ''} ${p.cong_ciudad || ''}`.toLowerCase();
      return `<tr class="click" data-id="${esc(p.id)}" data-q="${esc(txt)}">
        <td>${esc(fmtDT(p.created_at))}</td>
        <td><strong>${esc(p.apellidos)}, ${esc(p.primer_nombre)}</strong></td>
        <td>${esc(p.cong_nombre || '')} <span class="muted small">${esc(p.cong_ciudad || '')}</span></td>
        <td>${chips}</td>
        <td class="status ${statusClass(st)}">${esc(st)}${st === 'Completo' ? `
          <select class="no-print" data-print aria-label="Imprimir solicitud">
            <option value="">Imprimir</option>
            <option value="formulario">Formulario S-73</option>
            <option value="carta">Carta de aprobación</option>
          </select>` : ''}</td></tr>`;
    }).join('');

    $app.innerHTML = `
      <section class="paper s73-list">
        <div class="toolbar"><h2 style="margin:0;border:0;padding:0">Solicitudes (${(a.data || []).length})</h2>
          <input class="no-print" type="search" id="search" placeholder="Buscar nombre o congregación" style="max-width:280px"></div>
        <p class="no-print"><button type="button" class="secondary" id="print-list">Imprimir lista o guardar PDF</button></p>
        <div class="tablewrap"><table>
          <thead><tr><th>Recibida</th><th>Solicitante</th><th>Congregación</th><th>Firmas del comité</th><th>Estado</th></tr></thead>
          <tbody id="rows">${rows || '<tr><td colspan="5" class="muted">Aún no hay solicitudes.</td></tr>'}</tbody>
        </table></div>
      </section>`;
    const count = document.querySelector('.s73-list h2');
    const listRows = [...document.querySelectorAll('#rows tr[data-q]')];
    const printList = document.getElementById('print-list');
    printList.disabled = listRows.length === 0;
    printList.addEventListener('click', () => window.print());
    document.getElementById('rows').addEventListener('click', (e) => {
      if (e.target.closest('[data-print]')) return;
      const tr = e.target.closest('tr[data-id]'); if (tr) location.hash = '#/s/' + tr.dataset.id;
    });
    document.getElementById('rows').addEventListener('change', (e) => {
      const menu = e.target.closest('[data-print]');
      if (!menu || !menu.value) return;
      const tipo = menu.value;
      menu.value = '';
      imprimirSolicitud(menu.closest('tr').dataset.id, tipo);
    });
    document.getElementById('search').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      listRows.forEach(tr => { tr.hidden = !tr.dataset.q.includes(q); });
      const visible = listRows.filter(tr => !tr.hidden).length;
      count.textContent = `Solicitudes (${visible})`;
      printList.disabled = visible === 0;
    });
  }

  async function imprimirSolicitud(id, tipo) {
    const vista = window.open('', '_blank');
    if (!vista) {
      window.alert('Permita las ventanas emergentes para imprimir la solicitud.');
      return;
    }
    vista.opener = null;
    const doc = vista.document;
    doc.documentElement.lang = 'es';
    doc.title = tipo === 'carta' ? 'Carta de aprobación · S-73-S' : 'Formulario S-73';
    doc.body.textContent = 'Preparando impresión…';
    try {
      const [solicitud, revisiones, perfiles] = await Promise.all([
        sb.from('applications').select('*').eq('id', id).maybeSingle(),
        sb.from('reviews').select('*').eq('application_id', id),
        tipo === 'carta' ? sb.from('profiles').select('nombre,rol') : { data: [] }
      ]);
      if (vista.closed) return;
      if (solicitud.error || revisiones.error || perfiles.error || !solicitud.data) {
        throw new Error('No se pudieron cargar los datos para imprimir.');
      }
      if (statusOf(revisiones.data || []) !== 'Completo') {
        throw new Error('La solicitud debe estar completa para imprimir desde la lista.');
      }

      const app = solicitud.data;
      const contenido = doc.createElement('main');
      contenido.id = 'app';
      doc.body.replaceChildren(contenido);
      if (tipo === 'carta') {
        const estilos = doc.createElement('style');
        const fuente = new URL('precursor-auxiliar/fonts/Allura-Regular.woff', document.baseURI);
        estilos.textContent = `
          @font-face { font-family: Allura; src: url("${fuente.href}") format("woff"); }
          @page { size: letter portrait; margin: .72in .92in; }
          body { margin: 0; color: #26313a; font: 11.5pt/1.55 Georgia, "Times New Roman", serif; }
          main { max-width: 6.66in; margin: auto; overflow-wrap: break-word; }
          main > p { margin: 0 0 12pt; }
          .membrete-carta {
            display: flex; align-items: center; gap: 13pt;
            padding-bottom: 14pt; margin-bottom: 25pt;
            border-bottom: 1px solid #c2ab7d;
            font: 9.5pt/1.35 Arial, sans-serif; color: #52616a;
          }
          .membrete-carta img { width: .68in; height: auto; flex: none; }
          .membrete-carta h1 {
            margin: 0 0 4pt; font: 600 12pt/1.3 Arial, sans-serif;
            letter-spacing: .065em; color: #173e49;
          }
          .titulo-carta {
            margin: 0 0 3pt; color: #173e49;
            font: normal 27pt/1.15 Georgia, "Times New Roman", serif;
          }
          main > .fecha-carta { margin-bottom: 22pt; color: #52616a; font: 10pt/1.35 Arial, sans-serif; }
          .firmas-carta { margin-top: 20pt; break-inside: avoid; }
          .firmantes-carta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12pt; }
          .firmante-carta { display: flex; flex-direction: column; justify-content: flex-end; gap: 4pt; }
          .nombre-firma { font: 21pt/1.05 Allura, "Segoe Script", cursive; color: #173e49; }
          .cargo-firma { display: block; border-top: 1px solid #c2ab7d; padding-top: 5pt; min-height: 27pt; font: 9pt/1.3 Arial, sans-serif; }
          .pie-carta { margin: 14pt 0 0; color: #52616a; font: 9pt/1.35 Arial, sans-serif; }
          @media screen {
            body { background: #eef1f2; padding: 24px 12px; }
            main { background: white; padding: clamp(20px, 5vw, 54px); box-shadow: 0 3px 18px #26313a20; }
          }
          @media screen and (max-width: 500px) { .firmantes-carta { grid-template-columns: 1fr; } }
        `;
        doc.head.append(estilos);
        const nombres = new Map((perfiles.data || []).map(perfil => [perfil.rol, perfil.nombre]));
        const cargos = ['Coordinador del Cuerpo de Ancianos', 'Secretario', 'Superintendente de Servicio'];
        const logo = mensajesSolicitud.carta(contenido, id, fullName(app), app.sexo,
          ROLES.map(({ key }, i) => ({ nombre: nombres.get(key), cargo: cargos[i] })));
        await Promise.all([logo.decode(), doc.fonts.ready]);
      } else {
        const porRol = Object.fromEntries(revisiones.data.map(revision => [revision.rol, revision]));
        const plantilla = new DOMParser().parseFromString(
          hojasSolicitud(app, porRol, { ROLES, QUESTIONS, CRITERIA, DIAS, YN, esc, fmtDate }), 'text/html');
        contenido.append(doc.importNode(plantilla.body.firstElementChild, true));
        const estilos = doc.createElement('style');
        estilos.textContent = '@media screen { .hojas-s73 svg { display: block; width: 100%; max-width: 8.5in; margin: auto; } }';
        doc.head.append(estilos);
        const hoja = doc.createElement('link');
        hoja.rel = 'stylesheet';
        hoja.href = document.querySelector('link[rel="stylesheet"]').href;
        await new Promise((resolve, reject) => {
          hoja.onload = resolve;
          hoja.onerror = () => reject(new Error('No se pudo cargar el formato de impresión.'));
          doc.head.append(hoja);
        });
        // The original form hides its print sheets on screen. Show them in the dedicated preview.
        estilos.textContent += '@media screen { .hojas-s73 { display: block; } }';
      }
      if (!vista.closed) vista.print();
    } catch (error) {
      if (!vista.closed) doc.body.textContent = error.message;
    }
  }

  // ---------- detail ----------
  function applicantHtml(a) {
    const sirve = [...(a.sirve_como || []), a.sirve_otro ? `Otro: ${a.sirve_otro}` : ''].filter(Boolean).join(', ');
    const disp = a.disponibilidad || {}; const fin = a.fines_semana || {};
    const row = (t, v) => `<dt>${t}</dt><dd>${v || '—'}</dd>`;
    return `<dl class="info">
      ${row('Nombre legal', esc(fullName(a)))}
      ${row('Dirección', esc([a.direccion, a.ciudad, [a.estado, a.codigo_postal].filter(Boolean).join(' ')].filter(Boolean).join(', ')))}
      ${row('Correo', esc(a.email))}
      ${row('Teléfonos', esc([a.celular ? 'Cel: ' + a.celular : '', a.tel_fijo ? 'Fijo: ' + a.tel_fijo : ''].filter(Boolean).join(' · ')))}
      ${row('Congregación', esc([a.cong_nombre, a.cong_ciudad, a.cong_estado].filter(Boolean).join(', ')))}
      ${row('Idiomas con fluidez', esc(a.idiomas))}
      ${row('Nacimiento', esc(fmtDate(a.fecha_nacimiento)))}
      ${row('Bautismo', esc(fmtDate(a.fecha_bautismo)))}
      ${row('Sexo', esc(cap(a.sexo)))}
      ${row('Estado civil', esc(cap(a.estado_civil)) + (a.conyuge ? ` (cónyuge: ${esc(a.conyuge)})` : ''))}
      ${row('Sirve como', esc(sirve))}
      ${row('Deseo y capacidad de seguir la dirección teocrática', esc(YN[a.desea_capacidad]))}
      ${row('Predicación en áreas metropolitanas antes', esc(YN[a.participo_antes]) + (a.lugares ? ` — ${esc(a.lugares)}` : ''))}
      ${row('Disponibilidad entre semana', DIAS.map(([k, l]) => `${l}: <strong>${esc(disp[k] || '—')}</strong>${disp[k] ? ' <span class="muted small">(' + esc(AVAIL[disp[k]] || '') + ')</span>' : ''}`).join('<br>'))}
      ${row('Fines de semana al mes', `Sábado: <strong>${esc(fin.sabado ?? '—')}</strong> · Domingo: <strong>${esc(fin.domingo ?? '—')}</strong>`)}
      ${row('Firma del solicitante', esc(a.firma) + (a.firma_fecha ? ` · ${esc(fmtDate(a.firma_fecha))}` : ''))}
    </dl>`;
  }

  function gridHtml(byRole) {
    return `<h3>Su calificación personal del solicitante</h3>
      <div class="legend">${GRADES.map((g) => esc(g[1])).join(' · ')}</div>
      <div class="tablewrap"><table>
        <thead><tr><th></th>${ROLES.map((r) => `<th>${esc(r.short)}</th>`).join('')}<th>Comentarios</th></tr></thead>
        <tbody>${CRITERIA.map(([k, l]) => `<tr><th>${esc(l)}</th>
          ${ROLES.map((r) => `<td class="c">${esc(byRole[r.key]?.calificaciones?.[k]?.g || '')}</td>`).join('')}
          <td>${ROLES.map((r) => { const n = byRole[r.key]?.calificaciones?.[k]?.n; return n ? `<div><strong>${esc(r.short)}:</strong> ${esc(n)}</div>` : ''; }).join('')}</td></tr>`).join('')}
        </tbody></table></div>`;
  }

  function questionsHtml(byRole) {
    return `<h3>Preguntas del comité</h3><div class="tablewrap"><table>
      <thead><tr><th>Pregunta</th>${ROLES.map((r) => `<th>${esc(r.short)}</th>`).join('')}</tr></thead>
      <tbody>${QUESTIONS.map(([k, t]) => `<tr><td>${esc(t)}</td>
        ${ROLES.map((r) => `<td class="c">${esc(YN[byRole[r.key]?.respuestas?.[k]] || '—')}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>`;
  }

  function signaturesHtml(byRole) {
    return `<h3>Firmas</h3><div class="tablewrap"><table>
      <thead><tr><th>Cargo</th><th>Firma (nombre)</th><th>Fecha</th></tr></thead>
      <tbody>${ROLES.map((r) => { const v = byRole[r.key]; return `<tr><td>${esc(r.label)}</td>
        <td>${signed(v) ? esc(v.firma) : '<span class="muted">Pendiente</span>'}</td><td>${signed(v) ? esc(fmtDate(v.firma_fecha)) : ''}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }

  function myFormHtml(mine) {
    mine = mine || {};
    const resp = mine.respuestas || {}; const cal = mine.calificaciones || {};
    return `<form id="myform">
      <h3>Preguntas (Sí / No)</h3>
      ${QUESTIONS.map(([k, t]) => `<div class="q"><div class="qt">${esc(t)}</div><div class="opts">
        <label><input type="radio" name="q_${k}" value="si" ${resp[k] === 'si' ? 'checked' : ''}> Sí</label>
        <label><input type="radio" name="q_${k}" value="no" ${resp[k] === 'no' ? 'checked' : ''}> No</label></div></div>`).join('')}
      <h3>Calificación personal</h3>
      ${CRITERIA.map(([k, l]) => `<div class="grid"><div><label>${esc(l)}</label>
          <select name="g_${k}"><option value="">—</option>${GRADES.map(([v, t]) => `<option value="${v}" ${cal[k]?.g === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        <div style="grid-column:span 2"><label>Comentario</label><input type="text" name="n_${k}" maxlength="500" value="${esc(cal[k]?.n || '')}"></div></div>`).join('')}
      <h3>Firma</h3>
      <div class="grid">
        <div><label>Escriba su nombre para indicar la firma (déjelo vacío si aún no termina)</label><input type="text" name="firma" maxlength="200" value="${esc(mine.firma || '')}"></div>
        <div><label>Fecha</label><input type="date" name="firma_fecha" value="${esc(mine.firma_fecha || todayISO())}"></div>
      </div>
      <div id="savemsg"></div>
      <button type="submit">Guardar mi evaluación</button>
    </form>`;
  }

  function commentsHtml(list) {
    if (!list.length) return '<p class="muted">Sin comentarios todavía.</p>';
    return list.map((c) => `<div class="comment"><div class="meta"><strong>${esc(c.author_name)}</strong> · ${esc(role(c.rol)?.short || c.rol)} · ${esc(fmtDT(c.created_at))}</div><div class="body">${esc(c.body)}</div></div>`).join('');
  }

  async function renderDetail(id, flash, keep) {
    const y = (flash || keep) ? window.scrollY : 0;
    if (!flash && !keep) $app.innerHTML = '<p class="muted">Cargando…</p>';
    const [a, r, c] = await Promise.all([
      sb.from('applications').select('*').eq('id', id).maybeSingle(),
      sb.from('reviews').select('*').eq('application_id', id),
      sb.from('comments').select('*').eq('application_id', id).order('created_at', { ascending: true })
    ]);
    if (a.error || r.error || c.error) { $app.innerHTML = errBox(a.error || r.error || c.error); return; }
    if (!a.data) { $app.innerHTML = '<p>Solicitud no encontrada. <a href="#/">Volver</a></p>'; return; }

    const app = a.data;
    const byRole = Object.fromEntries((r.data || []).map((x) => [x.rol, x]));

    $app.innerHTML = `
      <div class="toolbar no-print"><a href="#/">← Todas las solicitudes</a><button class="secondary" id="print">Imprimir / PDF</button></div>
      <section class="paper"><h2>Solicitud · ${esc(fullName(app))}</h2>${applicantHtml(app)}</section>
      <section class="paper"><h2>Sección del comité de servicio</h2>${questionsHtml(byRole)}${gridHtml(byRole)}${signaturesHtml(byRole)}</section>
      <section class="paper no-print" id="mine"><h2>Mi evaluación · ${esc(role(me.rol).label)}</h2>
        ${flash ? `<div class="msg ok">${esc(flash)}</div>` : ''}${myFormHtml(byRole[me.rol])}</section>
      <section class="paper"><h2>Comentarios</h2><div id="clist">${commentsHtml(c.data || [])}</div>
        <form id="cform" class="no-print"><label for="cbody">Agregar comentario</label><textarea id="cbody" required maxlength="2000"></textarea>
          <div id="cmsg"></div><button type="submit">Publicar comentario</button></form></section>
      ${hojasSolicitud(app, byRole, { ROLES, QUESTIONS, CRITERIA, DIAS, YN, esc, fmtDate })}`;
    window.scrollTo(0, y);

    document.getElementById('print').addEventListener('click', () => window.print());

    document.getElementById('myform').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target; const el = f.elements;
      const respuestas = {};
      QUESTIONS.forEach(([k]) => { const v = f.querySelector(`input[name="q_${k}"]:checked`); if (v) respuestas[k] = v.value; });
      const calificaciones = {};
      CRITERIA.forEach(([k]) => { calificaciones[k] = { g: el['g_' + k].value, n: el['n_' + k].value.trim() }; });
      const row = {
        application_id: id, rol: me.rol, user_id: me.id, respuestas, calificaciones,
        firma: el.firma.value.trim() || null, firma_fecha: el.firma_fecha.value || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await sb.from('reviews').upsert(row, { onConflict: 'application_id,rol' });
      if (error) { document.getElementById('savemsg').innerHTML = errBox(error); return; }
      renderDetail(id, 'Guardado ✓');
    });

    document.getElementById('cform').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = document.getElementById('cbody').value.trim();
      if (!body) return;
      const { error } = await sb.from('comments').insert({ application_id: id, user_id: me.id, author_name: me.nombre, rol: me.rol, body });
      if (error) { document.getElementById('cmsg').innerHTML = errBox(error); return; }
      renderDetail(id, null, true);   // refresh in place, keep scroll position
    });
  }

  boot();
})();
