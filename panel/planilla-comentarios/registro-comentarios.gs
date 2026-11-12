/**
 * Registro de comentarios del Gran Testeo — Brasas de Lo Pirque
 *
 * Se pega en una planilla de Google de la cuenta que recibe los comentarios:
 *   Extensiones → Apps Script → borrar lo que haya → pegar esto → Guardar.
 * Luego: Implementar → Nueva implementación → tipo "Aplicación web"
 *   · Ejecutar como: Yo
 *   · Quién tiene acceso: Cualquier usuario
 * y copiar la URL que termina en /exec.
 *
 * Cada comentario que alguien envía desde su página del testeo llega como
 * una fila nueva en la hoja "Comentarios". La hoja "Panel" se arma sola con
 * los conteos. Para trabajarlos: cambia Estado, Prioridad y la columna
 * "Respuesta / qué se hizo". Al pasar un comentario a "Listo" se anota la
 * fecha sola.
 */

const HOJA = 'Comentarios';
const PANEL = 'Panel';
const ENCABEZADO = ['Fecha', 'Rol', 'Nombre', 'Tipo', 'Dónde', 'Qué pasó / qué necesita',
  'Para qué lo necesita', 'Estado', 'Prioridad', 'Respuesta / qué se hizo', 'Fecha resuelto'];
const ESTADOS = ['Nuevo', 'Revisando', 'En arreglo', 'Listo', 'Descartado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
// Los roles se cuentan con lo que llega: el panel manda sus nombres nuevos
// (Encargado de turno, Gerencia general…) y las páginas del testeo los viejos.
const TIPOS = ['🧩 Me falta', '🐞 Algo falla', '🤔 No se entiende', '💡 Idea'];

/** Recibe un comentario. Lo llama el botón "Enviar al registro". */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const corto = (v, n) => String(v || '').replace(/^[=+\-@]/, "'$&").trim().slice(0, n);
  const texto = corto(p.texto, 2000);
  if (!texto) return pagina('Falta el comentario', 'Vuelve a la página del testeo, escribe qué pasó o qué necesitas y apreta de nuevo "Enviar al registro".');
  const rol = corto(p.rol, 60) || 'Sin rol';

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const hoja = preparar();
    hoja.appendRow([new Date(), rol, corto(p.nombre, 80), corto(p.tipo, 40), corto(p.donde, 80),
      texto, corto(p.para, 1000), 'Nuevo', '', '', '']);
    actualizarPanel();
  } finally {
    lock.releaseLock();
  }
  return pagina('¡Gracias! Quedó anotado', 'Tu comentario ya está en el registro del testeo. Puedes cerrar esta pestaña y seguir probando.');
}

function pagina(titulo, texto) {
  const html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<body style="margin:0;font-family:system-ui,sans-serif;background:#0B0B0A;color:#F4F0E6;display:grid;place-items:center;min-height:100vh">'
    + '<div style="max-width:420px;padding:32px 24px;text-align:center">'
    + '<div style="font-size:44px">🔥</div>'
    + '<h1 style="color:#C9A227;font-size:24px">' + titulo + '</h1>'
    + '<p style="line-height:1.5;color:#B9B1A0">' + texto + '</p></div></body>';
  return HtmlService.createHtmlOutput(html).setTitle(titulo);
}

/** Crea las hojas la primera vez. Se puede correr a mano desde el editor. */
function preparar() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (hoja) return hoja;

  hoja = libro.insertSheet(HOJA, 0);
  hoja.getRange(1, 1, 1, ENCABEZADO.length).setValues([ENCABEZADO])
    .setFontWeight('bold').setBackground('#1A1713').setFontColor('#F4F0E6');
  hoja.setFrozenRows(1);
  hoja.getRange('A2:A').setNumberFormat('dd/MM HH:mm');
  hoja.getRange('K2:K').setNumberFormat('dd/MM HH:mm');
  [110, 110, 110, 140, 130, 380, 260, 110, 90, 300, 110].forEach((w, i) => hoja.setColumnWidth(i + 1, w));
  hoja.getRange('F2:G').setWrap(true);
  hoja.getRange('J2:J').setWrap(true);

  const lista = (valores) => SpreadsheetApp.newDataValidation().requireValueInList(valores, true).build();
  hoja.getRange('H2:H').setDataValidation(lista(ESTADOS));
  hoja.getRange('I2:I').setDataValidation(lista(PRIORIDADES));

  const color = (texto, fondo) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$H2="' + texto + '"').setBackground(fondo).setRanges([hoja.getRange('A2:K')]).build();
  hoja.setConditionalFormatRules([
    color('Nuevo', '#FFF4D6'), color('Revisando', '#E3F0FF'), color('En arreglo', '#FDE7DA'),
    color('Listo', '#DDF3E4'), color('Descartado', '#EEEEEE')
  ]);
  hoja.getRange(1, 1, 1, ENCABEZADO.length).createFilter();

  actualizarPanel(libro);
  const sobra = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (sobra && sobra.getLastRow() === 0) libro.deleteSheet(sobra);
  return hoja;
}

/**
 * Rewrites the Panel sheet with plain values, no formulas: formulas depend on the
 * spreadsheet's language (Spanish uses ";" between arguments) and broke there.
 * Runs after every new comment and every edit in Comentarios.
 */
function actualizarPanel(libro) {
  libro = libro || SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(HOJA);
  if (!hoja) return;
  let p = libro.getSheetByName(PANEL);
  if (!p) p = libro.insertSheet(PANEL, 1);

  const n = Math.max(hoja.getLastRow() - 1, 0);
  // Each row keeps its sheet row number at the end, so the Panel can write back to it.
  const filas = n ? hoja.getRange(2, 1, n, ENCABEZADO.length).getValues()
    .map((f, k) => f.concat([k + 2])).filter((f) => String(f[5]).trim()) : [];
  const cuenta = (col, v) => filas.filter((f) => String(f[col]).trim() === v).length;
  const abiertas = filas.filter((f) => !['Listo', 'Descartado'].includes(String(f[7]).trim()));

  const izq = [
    ['GRAN TESTEO · PANEL', ''],
    ['Total de comentarios', filas.length],
    ['Pendientes (sin Listo ni Descartado)', abiertas.length],
    ['Prioridad alta pendientes', abiertas.filter((f) => f[8] === 'Alta').length],
    ['', ''],
    ['POR ESTADO', '']
  ].concat(ESTADOS.map((s) => [s, cuenta(7, s)]))
   .concat([['Sin estado', filas.filter((f) => !String(f[7]).trim()).length], ['', ''], ['POR TIPO', '']])
   .concat(TIPOS.map((t) => [t, cuenta(3, t)]))
   .concat([['', ''], ['POR ROL', '']])
   .concat([...new Set(filas.map((f) => String(f[1]).trim()).filter(Boolean))].sort()
     .map((r) => [r, cuenta(1, r)]));

  const orden = { Alta: 1, Media: 2, Baja: 3 };
  const lista = abiertas.slice().sort((a, b) => (orden[a[8]] || 4) - (orden[b[8]] || 4) || (a[0] - b[0]))
    .map((f) => [f[8] || '', f[1], f[2], f[3], f[4], f[5], f[7] || 'Nuevo', f[ENCABEZADO.length]]);
  const der = [['PENDIENTES · cambia Prioridad o Estado aquí mismo: se guarda solo', '', '', '', '', '', '', ''],
    ['Prioridad', 'Rol', 'Nombre', 'Tipo', 'Dónde', 'Comentario', 'Estado', 'Fila']]
    .concat(lista.length ? lista : [['Nada pendiente 🎉', '', '', '', '', '', '', '']]);

  p.clear();
  p.getRange(1, 1, Math.max(p.getMaxRows(), 1), Math.max(p.getMaxColumns(), 11)).clearDataValidations();
  p.getRange(1, 1, izq.length, 2).setValues(izq);
  p.getRange(1, 4, der.length, 8).setValues(der);
  if (lista.length) {
    const lst = (v) => SpreadsheetApp.newDataValidation().requireValueInList(v, true).build();
    p.getRange(3, 4, lista.length, 1).setDataValidation(lst(PRIORIDADES));
    p.getRange(3, 10, lista.length, 1).setDataValidation(lst(ESTADOS));
    p.getRange(3, 11, lista.length, 1).setFontColor('#999999');
  }
  const pinta = (texto, fondo, col) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(texto)
    .setBackground(fondo).setRanges([p.getRange(3, col, 500, 1)]).build();
  p.setConditionalFormatRules([
    pinta('Nuevo', '#FFF4D6', 10), pinta('Revisando', '#E3F0FF', 10), pinta('En arreglo', '#FDE7DA', 10),
    pinta('Alta', '#F8D7D3', 4), pinta('Media', '#FFF4D6', 4), pinta('Baja', '#EEEEEE', 4)
  ]);
  p.getRange('A1').setFontSize(14).setFontWeight('bold');
  p.getRange('B2:B4').setFontWeight('bold');
  izq.forEach((f, k) => { if (/^POR /.test(f[0])) p.getRange(k + 1, 1).setFontWeight('bold').setFontColor('#8A6B12'); });
  p.getRange('D1').setFontWeight('bold').setFontColor('#8A6B12');
  p.getRange(2, 4, 1, 8).setFontWeight('bold');
  p.getRange(3, 9, Math.max(lista.length, 1), 1).setWrap(true);
  [280, 70, 20, 90, 100, 110, 130, 120, 380, 110, 45].forEach((w, k) => p.setColumnWidth(k + 1, w));
}

/**
 * Al abrir la planilla: el menú, y el Panel al día. Los comentarios que manda
 * el panel (botón 💬 Comentar) llegan por la API de Google, que no dispara
 * onEdit; así el Panel los cuenta apenas se abre la planilla.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Testeo').addItem('Actualizar panel', 'actualizarPanel').addToUi();
  actualizarPanel();
}

/** Anota la fecha al pasar un comentario a "Listo". */
function onEdit(e) {
  const r = e.range;
  // From the Panel: Prioridad (column D) or Estado (column J) of a pending item goes back to Comentarios.
  if (r.getSheet().getName() === PANEL && r.getRow() >= 3 && r.getNumRows() === 1 && [4, 10].includes(r.getColumn())) {
    const fila = Number(r.getSheet().getRange(r.getRow(), 11).getValue());
    const hoja = e.source.getSheetByName(HOJA);
    if (fila >= 2 && hoja) {
      const valor = r.getValue();
      if (r.getColumn() === 4) hoja.getRange(fila, 9).setValue(valor);
      else {
        hoja.getRange(fila, 8).setValue(valor);
        const celda = hoja.getRange(fila, 11);
        if (valor === 'Listo' && !celda.getValue()) celda.setValue(new Date());
      }
      actualizarPanel(e.source);
    }
    return;
  }
  if (r.getSheet().getName() !== HOJA || r.getRow() < 2) return;
  if (r.getColumn() === 8) {
    const celda = r.getSheet().getRange(r.getRow(), 11);
    if (e.value === 'Listo' && !celda.getValue()) celda.setValue(new Date());
  }
  actualizarPanel(e.source);
}
