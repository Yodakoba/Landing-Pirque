/**
 * Los datos de una transferencia bancaria, que es lo que de verdad hace
 * falta para pagarle a alguien.
 *
 * **Hasta el 2026-10-22 esto era una sola columna de texto libre**, donde
 * cada quien escribía "Banco Estado, cta rut 11.111.111-1" a su manera. Eso
 * sirve para que una persona lo lea, y **no sirve para generar una
 * transferencia**: quien paga tiene que volver a separarlo a mano, banco por
 * banco, y un dígito mal copiado manda la plata a otra cuenta.
 *
 * Por eso ahora son campos. Son **los que pide cualquier banco en Chile**:
 * titular, RUT, banco, tipo de cuenta, número y un correo para mandar el
 * comprobante. Con eso, la planilla del informe se pega en la carga masiva
 * del banco sin tocar nada.
 *
 * Dos decisiones que conviene tener escritas:
 *
 * - **El titular en blanco es la propia persona.** Lo normal es que la
 *   cuenta sea suya; el campo existe para cuando no lo es —la cuenta de la
 *   señora, la del hermano— y obligar a repetir el nombre en cada ficha
 *   sería pedir trabajo para decir lo que ya se sabe.
 * - **El tipo de cuenta es una lista cerrada** y el banco no. Los tipos son
 *   cuatro y se acabó; los bancos cambian de nombre, se fusionan y aparecen
 *   cooperativas, así que ahí hay texto libre con sugerencias.
 */

import { correoNormal } from './contacto.ts';

/** Los cuatro que existen en Chile. La lista es cerrada a propósito. */
export const TIPOS_CUENTA = [
  'Cuenta corriente',
  'Cuenta vista',
  'Cuenta RUT',
  'Cuenta de ahorro'
] as const;

/**
 * Sugerencias para el campo banco, **no una lista cerrada**: se ofrecen en
 * un `datalist` y se puede escribir cualquier cosa. Están los que mueven
 * sueldos en Chile; si falta alguno, se escribe y listo.
 */
export const BANCOS = [
  'BancoEstado', 'Banco de Chile', 'Banco Santander', 'Banco BCI',
  'Banco Itaú', 'Scotiabank', 'Banco Falabella', 'Banco Security',
  'Banco BICE', 'Banco Internacional', 'Banco Consorcio', 'Banco Ripley',
  'Coopeuch', 'Tenpo', 'Mercado Pago', 'Tapp Caja Los Andes'
];

export interface Banco {
  /** Quién recibe. **En blanco significa la propia persona.** */
  titular: string;
  /** RUT del titular, como se escriba. Ver `rutLimpio()`. */
  rut: string;
  banco: string;
  /** Uno de `TIPOS_CUENTA`, o vacío. */
  tipo: string;
  numero: string;
  /** Para el comprobante. Opcional: hay quien no lo quiere por correo. */
  correo: string;
  /**
   * Lo que no cabe en los campos: "transferir los lunes", "avisar por
   * WhatsApp". **Es la columna que antes era toda la cuenta bancaria**, así
   * que lo que alguien haya escrito ahí sigue estando — no se perdió, se
   * quedó donde estaba y ahora se llama por su nombre.
   */
  nota: string;
}

/** Los encabezados, en el orden en que se escriben en la planilla. */
export const COL_BANCO = {
  titular: 'Titular',
  rut: 'RUT',
  banco: 'Banco',
  tipo: 'Tipo de cuenta',
  numero: 'N° de cuenta',
  correo: 'Correo para el comprobante'
} as const;

export const bancoVacio = (): Banco => ({
  titular: '', rut: '', banco: '', tipo: '', numero: '', correo: '', nota: ''
});

const texto = (v: unknown) => String(v ?? '').trim();

/**
 * Lee los campos desde una fila, empezando en `desde`, **más la nota, que
 * va en su propia posición** porque es la columna vieja y se quedó donde
 * estaba. Lo que no exista se lee en blanco: una planilla escrita antes de
 * que estos campos existieran se abre igual.
 */
export function leerBanco(fila: unknown[], desde: number, nota: number): Banco {
  return {
    titular: texto(fila[desde]),
    rut: texto(fila[desde + 1]),
    banco: texto(fila[desde + 2]),
    tipo: texto(fila[desde + 3]),
    numero: texto(fila[desde + 4]),
    correo: texto(fila[desde + 5]),
    nota: texto(fila[nota])
  };
}

/** Las seis celdas, en el orden de `COL_BANCO`. La nota va aparte. */
export const filaBanco = (b: Banco): string[] => [
  b.titular, b.rut, b.banco, b.tipo, b.numero, b.correo
];

/** Normaliza lo que venga del navegador, sin inventar nada. */
export function limpiarBanco(v: unknown): Banco {
  const o = (v ?? {}) as Record<string, unknown>;
  const tipo = texto(o.tipo);
  return {
    titular: texto(o.titular),
    rut: texto(o.rut),
    banco: texto(o.banco),
    // Un tipo que no está en la lista se descarta: la lista es cerrada y un
    // valor inventado llegaría hasta la planilla del banco.
    tipo: (TIPOS_CUENTA as readonly string[]).includes(tipo) ? tipo : '',
    numero: texto(o.numero),
    correo: correoNormal(o.correo),
    nota: texto(o.nota)
  };
}

/**
 * Qué le falta a esta ficha para poder transferirle, en palabras.
 *
 * **El titular no entra en la lista**: en blanco significa la propia
 * persona, que es el caso normal. El correo tampoco: es para el comprobante
 * y la transferencia se hace igual sin él.
 */
export function faltaParaTransferir(b: Banco | undefined): string[] {
  const f: string[] = [];
  if (!b?.banco) f.push('banco');
  if (!b?.tipo) f.push('tipo de cuenta');
  if (!b?.numero) f.push('número');
  if (!b?.rut) f.push('RUT');
  return f;
}

/** Si se le puede transferir con lo que hay anotado. */
export const sePuedeTransferir = (b: Banco | undefined) =>
  faltaParaTransferir(b).length === 0;

/** El nombre de quien recibe: el titular si lo hay, si no la persona. */
export const titularDe = (b: Banco | undefined, nombre: string) =>
  b?.titular?.trim() || nombre;

/**
 * El RUT sin puntos y con guion antes del dígito verificador.
 *
 * **No valida**: si lo que hay no parece un RUT, se devuelve tal cual. El
 * panel no está para decirle a nadie que su RUT está mal escrito, está para
 * que la planilla salga pareja — y un formato pareja es lo que las cargas
 * masivas de los bancos aceptan.
 */
export function rutLimpio(rut: string): string {
  const crudo = String(rut ?? '').replace(/[.\s]/g, '').toUpperCase();
  const m = crudo.match(/^(\d{7,8})-?([\dK])$/);
  return m ? `${m[1]}-${m[2]}` : String(rut ?? '').trim();
}
