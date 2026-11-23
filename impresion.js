// Plantilla de impresión S-73-S 9/19. Las coordenadas se expresan en puntos de una hoja carta.
function hojasSolicitud(a, evaluaciones, { ROLES, QUESTIONS, CRITERIA, DIAS, YN, esc, fmtDate }) {
  const hojas = [];
  const lapiz = document.createElement('canvas').getContext('2d');
  let dibujo = '';
  const fuente = 'Times New Roman';
  const fecha = valor => valor ? fmtDate(valor) : '';

  function ancho(texto, tam, negrita = false) {
    lapiz.font = (negrita ? 'bold ' : '') + tam + 'px "' + fuente + '"';
    return lapiz.measureText(texto).width;
  }
  function texto(x, y, valor, tam = 9, centro = false, negrita = false, limite = null) {
    const longitud = limite && ancho(valor, tam, negrita) > limite
      ? ` textLength="${limite}" lengthAdjust="spacingAndGlyphs"` : '';
    dibujo += `<text x="${x}" y="${y}" font-size="${tam}"${longitud} text-anchor="${centro ? 'middle' : 'start'}" font-weight="${negrita ? 'bold' : 'normal'}">${esc(valor)}</text>`;
  }
  function linea(x, y, fin, hasta = y, puntos = false) {
    dibujo += `<line x1="${x}" y1="${y}" x2="${fin}" y2="${hasta}" stroke="black" stroke-width=".65" ${puntos ? 'stroke-dasharray="1 1.4"' : ''}/>`;
  }
  function caja(x, y, w, h) {
    dibujo += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="black" stroke-width=".8"/>`;
  }
  function ajustar(x, y, w, valor, etiqueta, tam = 10) {
    const s = String(valor ?? '').trim().replace(/\s+/g, ' ');
    while (tam > 7 && ancho(s, tam) > w - 4) tam -= .5;
    texto(x + w / 2, y, s, tam, true, false, w - 4);
  }
  function campo(x, y, w, valor, etiqueta, pie = '') {
    ajustar(x, y - 2, w, valor, etiqueta);
    linea(x, y, x + w, y, true);
    if (pie) texto(x + w / 2, y + 8, pie, 7, true);
  }
  function cerrarHoja() {
    const n = hojas.length + 1;
    caja(22, 18, 568, 755);
    texto(52, 752, 'S-73-S   9/19', 9);
    if (n > 1) texto(306, 752, n, 9, true);
    hojas.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 792" font-family="Times New Roman, serif" role="img" aria-label="S-73-S, página ${n}">${dibujo}</svg>`);
    dibujo = '';
  }
  function renglones(s, w, tam, negrita = false) {
    const filas = [];
    for (const parrafo of String(s).split(/\r?\n/)) {
      let fila = '';
      for (const palabra of parrafo.split(/\s+/)) {
        if (fila && ancho(fila + ' ' + palabra, tam, negrita) > w) {
          filas.push(fila);
          fila = '';
        }
        if (fila) fila += ' ';
        for (const letra of palabra) {
          if (ancho(fila + letra, tam, negrita) > w) {
            filas.push(fila);
            fila = '';
          }
          fila += letra;
        }
      }
      filas.push(fila);
    }
    return filas;
  }
  function opciones(y, x, items, marcado) {
    items.forEach(([etiqueta, valor]) => {
      const s = etiqueta + (marcado(valor) ? ' ( X )' : ' (    )');
      texto(x, y, s);
      x += ancho(s, 9) + 13;
    });
  }
  function horario(y, titulo, nombres, valores, leyenda = false) {
    const cabecera = leyenda ? 74 : 24;
    const w = 508 / nombres.length;
    caja(52, y, 508, cabecera + 44);
    texto(306, y + 15, titulo, 10, true, true);
    linea(52, y + 21, 560);
    if (leyenda) {
      texto(62, y + 37, 'Utilice los siguientes símbolos en los recuadros abajo:');
      texto(306, y + 51, 'M = Mañana                         T = Tarde                         N = Noche', 9, true);
      texto(306, y + 65, 'MD = Medio día                   TD = Todo el día                 NP = No puedo', 9, true);
      linea(52, y + cabecera, 560);
    }
    linea(52, y + cabecera + 18, 560);
    nombres.forEach((nombre, i) => {
      const x = 52 + i * w;
      if (i) linea(x, y + cabecera, x, y + cabecera + 44);
      texto(x + w / 2, y + cabecera + 12, nombre, 9, true);
      ajustar(x, y + cabecera + 35, w, valores[i], nombre);
    });
  }

  texto(306, 62, 'SOLICITUD PARA LA PREDICACIÓN PÚBLICA', 15, true, true);
  texto(306, 79, 'ESPECIAL EN ÁREAS METROPOLITANAS', 15, true, true);
  texto(52, 108, '1.   Nombre legal:');
  campo(120, 109, 156, a.apellidos, 'Apellidos', '(Apellidos)');
  campo(276, 109, 142, a.primer_nombre, 'Primer nombre', '(Primer nombre)');
  campo(418, 109, 142, a.segundo_nombre, 'Segundo nombre', '(Segundo nombre)');
  texto(52, 135, '2.   Dirección:');
  campo(113, 136, 257, a.direccion, 'Dirección', '(Calle, número, carretera o apartado postal)');
  campo(370, 136, 190, a.email, 'Correo', '(Dirección electrónica)');
  let x = 66;
  for (const [pie, valor, w] of [['Ciudad', a.ciudad, 110], ['Provincia o estado', a.estado, 108], ['Código postal', a.codigo_postal, 75], ['Teléfono fijo', a.tel_fijo, 100], ['Celular', a.celular, 101]]) {
    campo(x, 162, w, valor, pie, '(' + pie + ')'); x += w;
  }
  texto(52, 192, '3.   Congregación:');
  campo(127, 193, 175, a.cong_nombre, 'Congregación', '(Nombre)');
  campo(302, 193, 139, a.cong_ciudad, 'Ciudad de la congregación', '(Ciudad)');
  campo(441, 193, 119, a.cong_estado, 'Estado de la congregación', '(Provincia o estado)');
  texto(52, 224, '4.   ¿Qué idiomas habla con fluidez?');
  campo(196, 225, 364, a.idiomas, 'Idiomas');
  texto(52, 254, '5.   Nacimiento:');
  campo(117, 254, 83, fecha(a.fecha_nacimiento), 'Nacimiento', '(Día / Mes / Año)');
  texto(212, 254, 'Bautismo:');
  campo(255, 254, 84, fecha(a.fecha_bautismo), 'Bautismo', '(Día / Mes / Año)');
  texto(350, 254, 'Sexo:');
  opciones(254, 377, [['Masculino','masculino'],['Femenino','femenino']], v => a.sexo === v);
  texto(52, 282, '6. a)   Estado civil:');
  opciones(282, 134, ['Casado','Soltero','Divorciado','Separado','Viudo'].map(s => [s,s.toLowerCase()]), v => a.estado_civil === v);
  texto(64, 302, 'b)   Si está casado, indique el nombre de su cónyuge:');
  campo(268, 303, 292, a.conyuge, 'Cónyuge');
  texto(52, 323, '7.   Sirve como:');
  const servicios = lista => lista.map(s => [s,s]);
  const sirve = v => (a.sirve_como || []).includes(v);
  opciones(323, 121, servicios(['Misionero que sirve en el campo','Precursor especial','Miembro de la familia Betel']), sirve);
  opciones(341, 66, servicios(['Precursor regular','Publicador','Anciano','Siervo ministerial']), sirve);
  texto(409, 341, 'Otro');
  campo(432, 342, 128, a.sirve_otro, 'Otro servicio');
  texto(52, 362, '8.   ¿Tiene el deseo y la capacidad de seguir la dirección teocrática en la predicación pública?');
  campo(437, 363, 123, YN[a.desea_capacidad], 'Deseo y capacidad');
  texto(52, 382, '9. a)   ¿Ha participado en la predicación pública en áreas metropolitanas antes?');
  opciones(382, 426, [['Sí','si'],['No','no']], v => a.participo_antes === v);
  texto(64, 400, 'b)   En caso afirmativo, ¿en qué lugares?');
  campo(229, 401, 331, a.lugares, 'Lugares');
  horario(415, 'Indique qué días entre semana está disponible:', DIAS.map(d => d[1]), DIAS.map(d => a.disponibilidad?.[d[0]]), true);
  horario(548, 'Indique cuántos días de fin de semana al mes puede servir:', ['Sábado','Domingo'], [a.fines_semana?.sabado, a.fines_semana?.domingo]);
  const aviso = 'La presentación de esta solicitud no es garantía de que se le invite a participar en la predicación pública especial en áreas metropolitanas.';
  renglones(aviso, 495, 10, true).forEach((s,i) => texto(306, 635 + i*11, s, 10, true, true));
  const consentimiento = 'Entiendo que si no lleno completamente este formulario los ancianos no podrán determinar si califico para este privilegio de servicio. Estoy de acuerdo en proporcionar mis datos personales incluidos en este formulario para ayudar a los ancianos de mi congregación a valorar mis capacidades para esta labor. También doy mi consentimiento a la sucursal de los testigos de Jehová que supervisa las actividades de los testigos de Jehová en mi zona geográfica, o a cualquiera de sus representantes, para que procesen y retengan para su uso la información de este formulario.';
  renglones(consentimiento, 508, 8).forEach((s,i) => texto(52, 662+i*9, s, 8));
  texto(52, 728, 'Firma:');
  campo(84, 728, 268, a.firma, 'Firma del solicitante', '(Escriba su nombre para indicar la firma)');
  campo(390, 728, 170, fecha(a.firma_fecha), 'Fecha', '(Fecha)');
  cerrarHoja();

  texto(306, 61, 'LA SIGUIENTE SECCIÓN ES PARA USO EXCLUSIVO', 13, true, true);
  texto(306, 77, 'DEL COMITÉ DE SERVICIO DE LA CONGREGACIÓN', 13, true, true);
  linea(52, 86, 560);
  const siglas = ['Coord.', 'Secr.', 'Sup. serv.'];
  siglas.forEach((s,i) => texto(465+i*38, 102, s, 7, true, true));
  QUESTIONS.forEach(([clave, pregunta], i) => {
    const y = 120 + i*21;
    const filas = renglones(pregunta, 391, 8.4);
    filas.forEach((s,j) => texto(52, y+j*9, s, 8.4));
    ROLES.forEach((r,j) => {
      const x = 450+j*38;
      ajustar(x, y, 31, YN[evaluaciones[r.key]?.respuestas?.[clave]], pregunta);
      linea(x,y+2,x+31,y+2,true);
    });
  });
  caja(52, 309, 508, 222);
  texto(306, 328, 'SU CALIFICACIÓN PERSONAL DEL SOLICITANTE', 11, true, true);
  linea(52, 337, 560);
  texto(60, 353, 'Símbolos de calificación que se deben utilizar en los recuadros abajo:');
  texto(306, 370, 'A = Excelente      B = Bueno      C = Satisfactorio (apto)      D = Regular (pudiera no ser apto)      E = Deficiente (no apto)', 8, true);
  linea(52, 380, 560);
  const bordes = [52,158,214,264,322,381,560];
  bordes.slice(1,-1).forEach(x => linea(x,380,x,531));
  const titulos = [[],['Coordinador','del cuerpo','de ancianos'],['Secretario'],['Superintendente','de servicio'],['Superintendente','de circuito'],['Comentarios']];
  titulos.forEach((filas,i) => filas.forEach((s,j) => texto((bordes[i]+bordes[i+1])/2, 396+(j-(filas.length-1)/2)*8, s, 7.4, true)));
  CRITERIA.forEach(([k,nombre], i) => {
    const y = 411+30*i;
    linea(52,y,560);
    texto(56,y+18,nombre,8.6);
    let notas = [];
    ROLES.forEach((r,j) => {
      const dato = evaluaciones[r.key]?.calificaciones?.[k];
      ajustar(bordes[j+1],y+18,bordes[j+2]-bordes[j+1],dato?.g,nombre);
      if (dato?.n) notas.push(siglas[j]+' '+dato.n);
    });
    const comentario = notas.join(' · ').replace(/\s+/g, ' ');
    if (comentario) {
      let tam = 7.6;
      let filas = renglones(comentario, 169, tam);
      while (filas.length * tam * 1.15 > 25) {
        tam *= .9;
        filas = renglones(comentario, 169, tam);
      }
      filas.forEach((s,j) => texto(386, y + 2 + tam + j * tam * 1.15, s, tam));
    }
  });
  const revision = 'El comité de servicio debe repasar este formulario. Se tomarán en cuenta las observaciones del superintendente de grupo correspondiente. El solicitante no debe haber sido censurado o readmitido en el último año y debe estar libre de cualquier restricción.';
  renglones(revision,508,9).forEach((s,i) => texto(52,552+i*11,s));
  ROLES.forEach((r,i) => {
    const y = 612+i*45;
    const v = evaluaciones[r.key];
    texto(52,y,'Firma:');
    campo(82,y,222,v?.firma,r.label,r.label);
    if (v?.firma && v.firma_fecha) texto(193,y+18,fecha(v.firma_fecha),7,true);
  });
  campo(326,612,234,'','Superintendente de circuito','Superintendente de circuito (escriba su nombre para indicar la firma)');
  campo(326,657,234,'','Fecha de circuito','Fecha');
  renglones('Si el superintendente de circuito aprueba al solicitante, debe enviarle este formulario al anciano coordinador. Se guardará una copia en el archivo del superintendente de circuito.',232,9,true).forEach((s,i) => texto(326,695+i*11,s,9,false,true));
  cerrarHoja();

  return '<div class="hojas-s73">' + hojas.join('') + '</div>';
}
