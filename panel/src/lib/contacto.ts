/**
 * Teléfonos y correos con forma, en vez de texto libre.
 *
 * **Por qué importa:** un teléfono guardado como `+56 9 1234 5678`, como
 * `912345678` y como `9 1234-5678` son el mismo número y tres cadenas
 * distintas. Mientras sean texto libre, nada se puede automatizar encima:
 * mandar el link personal por WhatsApp, avisarle a alguien que entra el
 * sábado, cruzar una reserva con su cliente. Todo eso necesita **un número
 * que el panel sepa leer**, y la única forma de tenerlo es guardarlo
 * siempre igual.
 *
 * **La regla, que es lo que se le pide a quien escribe:** el celular va
 * **con el 9 adelante y sin el +56** — `9 1234 5678`. El código de país lo
 * pone el panel. Se eligió así porque es lo que la gente tiene en la cabeza
 * y en la agenda del teléfono; pedir el `+56` es pedir que lo escriba dos
 * de cada tres veces mal.
 *
 * **Se guarda normalizado y NO se rechaza lo que no calce.** Un número que
 * no parece celular chileno —un fijo, un extranjero, un "pregunta por
 * Juan"— se guarda tal cual y la pantalla lo marca en ámbar. El panel no
 * está para discutirle a nadie el teléfono de su primo; está para que lo
 * que **sí** tiene forma de celular quede parejo. Mismo criterio que
 * `rutLimpio()`.
 */

/** Lo que se muestra bajo cada campo, para que la regla se vea. */
export const FORMATO_TELEFONO = '9 1234 5678';

const soloDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

/**
 * Los nueve dígitos de un celular chileno (`9XXXXXXXX`), o `''`.
 *
 * Acepta las formas en que la gente lo escribe de verdad: con `+56`, con
 * `56`, con espacios, guiones o paréntesis. **Lo que no hace es inventar el
 * 9**: ocho dígitos sueltos no son un celular al que le falte el nueve,
 * son un número que no sabemos leer, y completarlo mandaría un WhatsApp a
 * un desconocido.
 */
export function celularChileno(v: unknown): string {
  let d = soloDigitos(v);
  if (d.startsWith('56')) d = d.slice(2);
  // Un 0 adelante es la marca de larga distancia de toda la vida.
  if (d.startsWith('0')) d = d.slice(1);
  return /^9\d{8}$/.test(d) ? d : '';
}

export const esCelularChileno = (v: unknown) => celularChileno(v) !== '';

/**
 * Cómo se guarda y se muestra: `+56 9 1234 5678`.
 *
 * Lo que no es un celular chileno se devuelve recortado y tal cual, sin
 * tocarle nada.
 */
export function telefonoNormal(v: unknown): string {
  const c = celularChileno(v);
  if (!c) return String(v ?? '').trim();
  return `+56 ${c[0]} ${c.slice(1, 5)} ${c.slice(5)}`;
}

/**
 * El número como lo quiere WhatsApp y cualquier API: `56912345678`, sin
 * signos. Vacío si no es un celular chileno — **y ese vacío es la señal de
 * que no se puede automatizar nada con ese contacto**, no un error.
 */
export const telefonoParaEnlace = (v: unknown) => {
  const c = celularChileno(v);
  return c ? `56${c}` : '';
};

/**
 * El link de WhatsApp, con mensaje opcional ya codificado. `''` si no hay
 * un número utilizable, para que quien llame pueda decidir si muestra el
 * botón o no en vez de ofrecer uno que no lleva a ninguna parte.
 */
export function enlaceWhatsApp(telefono: unknown, mensaje = ''): string {
  const n = telefonoParaEnlace(telefono);
  if (!n) return '';
  return `https://wa.me/${n}` + (mensaje ? `?text=${encodeURIComponent(mensaje)}` : '');
}

/* ---------- Correos ---------- */

/**
 * Minúsculas y sin espacios de los bordes. **No valida acá**: normalizar y
 * juzgar son dos cosas, y mezclarlas haría que un correo mal escrito se
 * perdiera al guardar en vez de quedar a la vista para corregirlo.
 */
export const correoNormal = (v: unknown) => String(v ?? '').trim().toLowerCase();

/**
 * Si tiene forma de correo. **Deliberadamente simple**: algo, una arroba,
 * algo con un punto y al menos dos letras al final, sin espacios.
 *
 * La expresión "completa" del estándar es ilegible, acepta cosas que
 * ningún proveedor entrega, y aun así no dice si la casilla existe. Lo
 * único que cualquier validación puede atrapar es un error de tipeo
 * evidente, y para eso esto alcanza.
 */
export function correoValido(v: unknown): boolean {
  const c = correoNormal(v);
  return /^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/.test(c);
}

/**
 * Qué avisarle a quien escribe, o `''` si no hay nada que decir.
 *
 * Un campo vacío no reclama: dejarlo para después es normal y un aviso en
 * cada ficha a medio llenar es ruido que se aprende a ignorar.
 */
export function avisoTelefono(v: unknown): string {
  const t = String(v ?? '').trim();
  if (!t) return '';
  if (esCelularChileno(t)) return '';
  if (/^\+?\d{6,}$/.test(soloDigitos(t)) && soloDigitos(t).length === 8) {
    return `Parece que le falta el 9 adelante (${FORMATO_TELEFONO}).`;
  }
  return 'No parece un celular chileno. Se guarda igual, pero no sirve para WhatsApp.';
}

export function avisoCorreo(v: unknown): string {
  const c = String(v ?? '').trim();
  if (!c) return '';
  return correoValido(c) ? '' : 'No parece un correo.';
}
