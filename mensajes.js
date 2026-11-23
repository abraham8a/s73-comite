const mensajesSolicitud = (() => {
  const baseRecursos = document.currentScript.src;
  const confirmacion = [
    ['Hebreos 6:10', 'Dios no es injusto como para olvidarse de la obra de ustedes'],
    ['Isaías 6:8', 'Aquí estoy yo. ¡Envíame a mí!'],
    ['Salmo 110:3', 'Tu pueblo se ofrecerá voluntariamente'],
    ['1 Tesalonicenses 1:2', 'Siempre damos gracias a Dios por todos ustedes'],
    ['1 Corintios 15:58', 'Siempre tengan mucho que hacer en la obra del Señor'],
    ['Mateo 9:37, 38', 'La cosecha es abundante, pero los obreros son pocos'],
    ['Colosenses 3:23', 'Trabajen de buena gana, como para Jehová'],
    ['Filipenses 1:3', 'Doy gracias a mi Dios cada vez que me acuerdo de ustedes'],
    ['Mateo 28:19', 'Vayan, pues, y hagan discípulos'],
    ['2 Corintios 9:7', 'Dios ama al dador alegre'],
    ['Hechos 20:35', 'Hay más felicidad en dar que en recibir'],
    ['Gálatas 6:9', 'No nos cansemos de hacer lo que es excelente'],
    ['Salmo 40:8', 'Me deleito en hacer tu voluntad, oh Dios mío']
  ];
  const aprobacion = [
    ['Proverbios 10:22', 'La bendición de Jehová es lo que enriquece'],
    ['Filipenses 4:13', 'Para todo tengo fuerzas gracias a aquel que me da poder'],
    ['Isaías 40:31', 'Los que esperan en Jehová recobrarán las fuerzas'],
    ['Josué 1:9', 'Sé valiente y fuerte, porque Jehová tu Dios está contigo'],
    ['Salmo 37:5', 'Encomienda tu camino a Jehová, y él actuará'],
    ['Proverbios 16:3', 'Encomienda a Jehová tus obras, y tus planes se realizarán'],
    ['Isaías 41:10', 'No tengas miedo, porque estoy contigo'],
    ['2 Timoteo 4:2', 'Predica la palabra'],
    ['Mateo 24:14', 'Estas buenas noticias del Reino se predicarán'],
    ['Santiago 4:8', 'Acérquense a Dios, y él se acercará a ustedes'],
    ['Salmo 121:2', 'Mi ayuda viene de Jehová'],
    ['1 Corintios 3:9', 'Somos colaboradores de Dios'],
    ['Hechos 4:20', 'No podemos dejar de hablar de lo que hemos visto y oído'],
    ['Nehemías 8:10', 'El gozo de Jehová es su fortaleza'],
    ['Hebreos 6:10', 'Dios no es injusto como para olvidarse de la obra de ustedes']
  ];

  function saludo(nombre, sexo) {
    const partes = nombre.split(',').map(parte => parte.trim()).filter(Boolean);
    const nombreCompleto = partes.length === 2 ? partes.reverse().join(' ') : nombre.trim();
    const saludos = { masculino: 'Estimado hermano', femenino: 'Estimada hermana' };
    return (saludos[sexo?.toLowerCase()] || 'Estimado(a) hermano(a)') + ' ' + nombreCompleto + ':';
  }

  function agregar(destino, etiqueta, texto) {
    const nodo = destino.ownerDocument.createElement(etiqueta);
    nodo.textContent = texto;
    destino.append(nodo);
    return nodo;
  }

  function confirmar(destino, nombre, sexo) {
    const [referencia, cita] = confirmacion[Math.floor(Math.random() * confirmacion.length)];
    destino.replaceChildren();
    const titulo = agregar(destino, 'h1', '¡Su solicitud fue enviada!');
    agregar(destino, 'p', saludo(nombre, sexo));
    agregar(destino, 'p', 'Hemos recibido su solicitud, y le agradecemos de corazón su deseo de hacer más en la obra del Reino y en la predicación. Su espíritu de sacrificio y su disposición alegre son un ejemplo para todos nosotros.');
    agregar(destino, 'p', `Nos recuerda ${referencia}: "${cita}". Estamos seguros de que Jehová valora cada esfuerzo que usted hace y el amor que lo motiva.`);
    agregar(destino, 'p', 'El Comité de Servicio revisará su solicitud con oración y se comunicará con usted pronto. Que Jehová siga bendiciendo abundantemente su servicio.');
    agregar(destino, 'p', 'Con aprecio fraternal,\nComité de Servicio\nCongregación Las Brisas').style.whiteSpace = 'pre-line';
    destino.hidden = false;
    titulo.tabIndex = -1;
    titulo.focus();
  }

  function carta(destino, id, nombre, sexo, firmas, programa = 'S-73-S') {
    let hash = 0;
    for (const letra of id) hash = (Math.imul(hash, 31) + letra.charCodeAt(0)) >>> 0;
    const [referencia, cita] = aprobacion[hash % aprobacion.length];
    const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'America/Chicago' }).format(new Date());
    const encabezado = agregar(destino, 'header', '');
    encabezado.className = 'membrete-carta';
    const logo = destino.ownerDocument.createElement('img');
    logo.src = new URL('logo-las-brisas.jpg', baseRecursos).href;
    logo.alt = '';
    encabezado.append(logo);
    const direccion = agregar(encabezado, 'div', '');
    agregar(direccion, 'h1', 'LAS BRISAS SPANISH (916171)');
    agregar(direccion, 'div', '1946 Old Port Isabel Rd.');
    agregar(direccion, 'div', 'Brownsville, Texas 78521');
    const titulo = agregar(destino, 'h2', 'Carta de aprobación');
    titulo.className = 'titulo-carta';
    agregar(destino, 'p', fecha).className = 'fecha-carta';
    agregar(destino, 'p', saludo(nombre, sexo));
    agregar(destino, 'p', 'Reciba un cordial y afectuoso saludo fraternal.');
    agregar(destino, 'p', `Con mucha alegría le informamos que el Comité de Servicio ha revisado con oración su solicitud ${programa} y que ha sido aprobada. Nos alegra ver su deseo sincero de ampliar su servicio a Jehová y de hacer más en la predicación del Reino.`);
    agregar(destino, 'p', `Su actitud nos recuerda ${referencia}: "${cita}". Estamos convencidos de que Jehová bendecirá sus esfuerzos y de que su ejemplo animará a muchos en la congregación.`);
    agregar(destino, 'p', 'Quedamos a su disposición para apoyarlo(a) en lo que necesite. Si tiene alguna pregunta, no dude en acercarse a cualquiera de los hermanos del comité.');
    agregar(destino, 'p', 'Gracias de nuevo por su dedicación y por su amor a Jehová y al prójimo.');
    agregar(destino, 'p', 'Con cariño y aprecio fraternal,');
    const cierre = agregar(destino, 'div', '');
    cierre.className = 'firmas-carta';
    const firmantes = agregar(cierre, 'div', '');
    firmantes.className = 'firmantes-carta';
    for (const { nombre, cargo } of firmas) {
      const linea = agregar(firmantes, 'div', '');
      linea.className = 'firmante-carta';
      const firma = agregar(linea, 'span', nombre?.trim() || '________________________');
      if (nombre?.trim()) firma.className = 'nombre-firma';
      agregar(linea, 'span', cargo).className = 'cargo-firma';
    }
    agregar(cierre, 'p', 'Comité de Servicio, Congregación Las Brisas').className = 'pie-carta';
    return logo;
  }

  async function prepararCarta(destino, id, nombre, sexo, firmas, programa) {
    const doc = destino.ownerDocument;
    const estilos = doc.createElement('style');
    const fuente = new URL('precursor-auxiliar/fonts/Allura-Regular.woff', baseRecursos);
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
    const logo = carta(destino, id, nombre, sexo, firmas, programa);
    await Promise.all([logo.decode(), doc.fonts.ready]);
  }

  return { confirmar, prepararCarta };
})();
