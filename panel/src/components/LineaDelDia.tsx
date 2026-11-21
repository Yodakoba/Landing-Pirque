'use client';

/**
 * **Lo de adentro de la línea de una persona en un día**, la misma pieza en
 * la ventana del equipo y en la de las actividades extras (2026-11-21, lo
 * pidió el cliente: *"la tarjeta adentro del extra… tiene completamente otro
 * diseño y distribución que las tarjetas de los trabajadores… donde
 * mostramos cosas parecidas usamos diseños parecidos, que los campos se ven
 * de una forma parecida, la distribución, los números, el tamaño"*).
 *
 * Compacta, porque el mismo día lo pidió así para el equipo: cada dato con
 * su nombre al lado, el ajuste en pocas filas, el total en una línea y
 * botones del tamaño secundario donde no son lo principal.
 *
 * - `CampoAlLado`: un dato con su nombre a la izquierda.
 * - `AjustesDelDia`: *− Descontar / + Sumar* y una tarjeta por ajuste, con
 *   el monto sin signo, el motivo y cómo se pagó con botones, y una nota.
 *   Guarda lo mismo que siempre (`Ajuste[]`): el signo del monto y el motivo
 *   armado con `motivoDePartes()`.
 * - `TotalDelDia`: propina (si la hay) y total, en una línea.
 * - `BotonesDeLaLinea`: *Ficha* y *Sacar del día*.
 * - `BotonNuevaPersona`: el *+ Nuevo …* cortado del pie de un grupo.
 */
import { useState, type ReactNode } from 'react';
import {
  MOTIVOS_AJUSTE, MEDIOS_AJUSTE, partesDeMotivo, motivoDePartes, tipoDeAjuste, montoConSigno,
  totalAjustes, type Ajuste, type PartesAjuste, type TipoAjuste
} from '@/lib/equipo';
import { enPesos } from '@/lib/ocupacion';

/** El nombre de un dato, a la izquierda de su campo. */
export const ROTULO_LADO = 'shrink-0 text-[13px] font-semibold text-hueso/65';
/** Los campos de plata y de texto de la línea: 36px, con la cifra a 15px. */
export const ENTRADA_DIA =
  'rounded-lg border-2 border-hueso/20 bg-tinta px-2.5 py-1 text-[15px] ' +
  'tabular-nums focus:border-oro focus:outline-none';
/**
 * Los botones de motivo y medio de un ajuste: 36px, el tamaño secundario, y
 * letra de 13px para que los cuatro motivos quepan en una fila de la tarjeta.
 */
const OPCION = 'boton boton-angosto min-h-[36px] !px-2 !py-0.5 !text-[13px]';
const ELEGIDO = 'border-oro bg-oro/15 font-semibold';

/**
 * **La columna de los nombres** (2026-11-21, regla del cliente: *los
 * formularios van alineados*). Lo vio en la línea de un extra: *Actividad*
 * con su campo, debajo *Monto* —más corto— con el campo pegado al nombre, y
 * *Ajustes* con sus botones al otro lado: *"se podría alinear los campos para
 * que los títulos estén en un orden vertical y los valores también, o los
 * botones"*. Cada nombre medía lo que su palabra, y cada valor partía donde
 * terminaba su nombre.
 *
 * Ahora todos los nombres de la línea —Actividad, Monto, Jornada, Ajustes,
 * Propina, Total del día— ocupan esta misma columna, así que **los valores y
 * los botones parten en la misma vertical**. 6rem: es lo que pide *Total del
 * día* a 13px.
 */
export const COLUMNA_ROTULO = 'w-[6rem]';

/**
 * Un dato con su nombre al lado, en una fila. El nombre va en la columna de
 * los nombres. `segundo` es para el dato que en el computador comparte la
 * fila con otro (las horas extra, al lado de la jornada): ahí va pegado a su
 * campo; cuando la pantalla es angosta y baja a su propia fila, vuelve a la
 * columna.
 */
export function CampoAlLado({ rotulo, children, segundo = false }: {
  rotulo: string; children: ReactNode; segundo?: boolean;
}) {
  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className={`${ROTULO_LADO} ${COLUMNA_ROTULO} ${segundo ? 'lg:w-auto' : ''}`}>{rotulo}</span>
      {children}
    </label>
  );
}

/** Lo que dice un ajuste guardado, en una línea: el motivo, cómo y la nota. */
const resumenDe = (a: Ajuste) => {
  const p = partesDeMotivo(a.motivo);
  return [p.razon, p.medio, p.nota].filter(Boolean).join(' · ');
};

/** Si un ajuste se puede guardar: con monto y motivo, y con *Otro*, qué fue. */
export const ajusteListo = (a: Ajuste) => {
  const p = partesDeMotivo(a.motivo);
  return Math.abs(a.monto) > 0 && !!p.razon && (p.razon !== 'Otro' || !!p.nota.trim());
};

/**
 * **Los ajustes de una persona en un día.** El rótulo y los dos botones van
 * en una fila.
 *
 * **Se anota y se guarda con un botón** (2026-11-21, lo pidió el cliente:
 * *"ingresar el número, luego que ponga la razón y luego guardar… uno espera
 * un botón guardar… después lo dejas colapsar y solo muestras descuento,
 * monto"*). Es plata, y quien descuenta espera confirmarlo:
 * - **Abierto**, el ajuste es una tarjeta de su color con el monto, el
 *   motivo y cómo con botones, la nota, y **✓ Guardar** (se apaga hasta que
 *   tenga monto y motivo), *Cancelar* y, si ya existía, *Quitar*.
 * - **Guardado**, se pliega a una fila: el signo, la palabra, el monto y el
 *   motivo. Tocarla lo vuelve a abrir.
 *
 * Lo que se escribe vive en un borrador hasta apretar *Guardar*: recién ahí
 * pasa al día, que la ventana guarda sola como siempre.
 */
export function AjustesDelDia({ ajustes, quien, onCambio }: {
  ajustes: Ajuste[];
  /** El nombre, para los rótulos que lee un lector de pantalla. */
  quien: string;
  onCambio: (ajustes: Ajuste[]) => void;
}) {
  /** Cuál se edita: el número de uno guardado, o `nuevo`. */
  const [editando, setEditando] = useState<number | 'nuevo' | null>(null);
  const [borrador, setBorrador] = useState<Ajuste | null>(null);
  const abrir = (k: number | 'nuevo', a: Ajuste) => { setEditando(k); setBorrador({ ...a, tipo: tipoDeAjuste(a) }); };
  const cerrar = () => { setEditando(null); setBorrador(null); };
  const guardar = () => {
    if (!borrador || !ajusteListo(borrador)) return;
    onCambio(editando === 'nuevo' ? [...ajustes, borrador]
      : ajustes.map((a, k) => (k === editando ? borrador : a)));
    cerrar();
  };
  const quitar = (k: number) => { onCambio(ajustes.filter((_, x) => x !== k)); cerrar(); };
  // El monto se escribe sin signo: lo pone el tipo (`montoConSigno()`).
  const cambiarMonto = (valor: string) => {
    if (!borrador) return;
    const n = Number(String(valor).replace(/[^\d]/g, ''));
    const tipo = tipoDeAjuste(borrador);
    setBorrador({ ...borrador, tipo, monto: montoConSigno(Number.isFinite(n) ? n : 0, tipo) });
  };
  const cambiarPartes = (cambio: Partial<PartesAjuste>) => {
    if (!borrador) return;
    setBorrador({ ...borrador, motivo: motivoDePartes({ ...partesDeMotivo(borrador.motivo), ...cambio }) });
  };
  const total = totalAjustes(ajustes);

  /** La tarjeta abierta de un ajuste: el borrador. */
  const editor = (a: Ajuste, k: number | 'nuevo') => {
    const tipo = tipoDeAjuste(a);
    const resta = tipo === 'resta';
    const partes = partesDeMotivo(a.motivo);
    const n = k === 'nuevo' ? ajustes.length + 1 : k + 1;
    const listo = ajusteListo(a);
    return (
      <div key={`editor-${k}`} className={`mb-1.5 rounded-lg border-2 p-2 ${resta
        ? 'border-rojo-fuerte/60 bg-rojo/[0.04]' : 'border-verde-fuerte/60 bg-verde/[0.04]'}`}>
        {/* Qué es y cuánto, en una fila. El signo va adelante, grande y de su
            color: se distingue por forma, no solo por color. */}
        <div className="flex items-center gap-1.5">
          <span aria-hidden className={`w-4 shrink-0 text-center text-[22px] font-bold leading-none ${resta
            ? 'text-rojo-texto' : 'text-verde-texto'}`}>{resta ? '−' : '+'}</span>
          <span className={`text-[14px] font-bold ${resta ? 'text-rojo-texto' : 'text-verde-texto'}`}>
            {resta ? 'Descuento' : 'Suma'}
          </span>
          <span className="ml-1 shrink-0 text-[15px] font-bold">$</span>
          <input type="number" min={0} step={1000} inputMode="numeric" autoFocus
            className={`${ENTRADA_DIA} w-28 min-w-0`}
            value={Math.abs(a.monto) || ''} placeholder="4000"
            aria-label={`${resta ? 'Descuento' : 'Suma'} ${n} de ${quien}`}
            onChange={(e) => cambiarMonto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') guardar(); }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Por qué">
          {MOTIVOS_AJUSTE[tipo].map((m) => (
            <button key={m} type="button" aria-pressed={partes.razon === m}
              onClick={() => cambiarPartes({ razon: partes.razon === m ? '' : m })}
              className={`${OPCION} ${partes.razon === m ? ELEGIDO : ''}`}>
              {partes.razon === m && '✓ '}{m}
            </button>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1" role="group" aria-label="Cómo">
          <span className="mr-0.5 text-[13px] font-semibold text-hueso/65">Cómo:</span>
          {MEDIOS_AJUSTE.map((m) => (
            <button key={m} type="button" aria-pressed={partes.medio === m}
              onClick={() => cambiarPartes({ medio: partes.medio === m ? '' : m })}
              className={`${OPCION} ${partes.medio === m ? ELEGIDO : ''}`}>
              {partes.medio === m && '✓ '}{m}
            </button>
          ))}
        </div>
        <input type="text" className={`${ENTRADA_DIA} mt-1 w-full !text-[14px]`}
          value={partes.nota}
          placeholder={partes.razon === 'Otro' ? 'qué fue' : 'nota (opcional)'}
          aria-label={`Nota del ajuste ${n} de ${quien}`}
          onChange={(e) => cambiarPartes({ nota: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') guardar(); }} />
        {/* Guardar, verde y con el monto: lo que pasa al apretarlo. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <button type="button" disabled={!listo} onClick={guardar}
            className="tecla flex min-h-[40px] items-center gap-1.5 rounded-lg border-2 border-verde-fuerte
                       bg-verde/15 px-3 text-[14px] font-bold text-verde-texto disabled:opacity-40">
            ✓ Guardar{listo ? ` ${resta ? '−' : '+'}${enPesos(Math.abs(a.monto))}` : ''}
          </button>
          <button type="button" onClick={cerrar} className="boton min-h-[36px] !px-2.5">Cancelar</button>
          {k !== 'nuevo' && (
            <button type="button" onClick={() => quitar(k)}
              className="boton min-h-[36px] !px-2.5 hover:border-rojo/60 hover:text-rojo-texto"
              aria-label={`Quitar el ajuste ${n} de ${quien}`}>✕ Quitar</button>
          )}
          {!listo && (
            <span className="text-[13px] text-hueso/60">
              {Math.abs(a.monto) > 0 ? 'Elige el motivo' : 'Escribe el monto'}
              {Math.abs(a.monto) > 0 && partes.razon === 'Otro' ? ' y qué fue' : ''}.
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        {/* El nombre en su columna y los dos botones donde parten los campos
            de arriba (regla *los formularios van alineados*). Lo que suman
            va al final de la fila. */}
        <span className={`${ROTULO_LADO} ${COLUMNA_ROTULO}`}>Ajustes</span>
        {/* Mientras se anota uno, no se abre otro: uno a la vez. */}
        <button type="button" disabled={editando !== null} onClick={() => abrir('nuevo', { monto: 0, motivo: '', tipo: 'resta' })}
          className="boton min-h-[36px] !border-rojo-fuerte/60 !px-2.5 !font-semibold text-rojo-texto disabled:opacity-40">
          − Descontar
        </button>
        <button type="button" disabled={editando !== null} onClick={() => abrir('nuevo', { monto: 0, motivo: '', tipo: 'suma' })}
          className="boton min-h-[36px] !border-verde-fuerte/60 !px-2.5 !font-semibold text-verde-texto disabled:opacity-40">
          + Sumar
        </button>
        {ajustes.length > 1 && (
          /* El signo va adelante y aparte: "$-18.000" se lee como un error. */
          <span className="ml-auto text-[13px] tabular-nums text-hueso/65">
            suman {total < 0 ? '−' : '+'}{enPesos(Math.abs(total))}
          </span>
        )}
      </div>
      {ajustes.map((a, k) => {
        if (editando === k && borrador) return editor(borrador, k);
        const resta = tipoDeAjuste(a) === 'resta';
        const texto = resumenDe(a);
        return (
          // **Guardado, una fila**: tocarla lo vuelve a abrir.
          <button key={k} type="button" disabled={editando !== null} onClick={() => abrir(k, a)}
            aria-label={`Editar el ajuste ${k + 1} de ${quien}`}
            className={`tecla mb-1.5 flex min-h-[40px] w-full items-center gap-1.5 rounded-lg border-2 px-2
                        text-left disabled:opacity-60 ${resta
              ? 'border-rojo-fuerte/50 bg-rojo/[0.04] hover:border-rojo-fuerte'
              : 'border-verde-fuerte/50 bg-verde/[0.04] hover:border-verde-fuerte'}`}>
            <span aria-hidden className={`w-4 shrink-0 text-center text-[20px] font-bold leading-none ${resta
              ? 'text-rojo-texto' : 'text-verde-texto'}`}>{resta ? '−' : '+'}</span>
            <span className={`shrink-0 text-[14px] font-bold ${resta ? 'text-rojo-texto' : 'text-verde-texto'}`}>
              {resta ? 'Descuento' : 'Suma'}
            </span>
            <span className="shrink-0 text-[15px] font-bold tabular-nums">{enPesos(Math.abs(a.monto))}</span>
            {/* En el computador la tarjeta es más angosta (tres columnas): el
                motivo se dobla en vez de cortarse. */}
            <span className="min-w-0 flex-1 truncate text-[13px] text-hueso/70 lg:whitespace-normal lg:leading-tight">{texto && `· ${texto}`}</span>
            <span aria-hidden className="shrink-0 text-[13px] font-semibold text-hueso/55">✎</span>
          </button>
        );
      })}
      {editando === 'nuevo' && borrador && editor(borrador, 'nuevo')}
    </div>
  );
}

/**
 * La propina (si la hay) y el total del día, en una línea, bajo una raya
 * —como el total de una cuenta—. **Alineado con los campos de arriba**
 * (2026-11-21): el primer nombre va en la columna de los nombres y su valor
 * donde parten los campos. Con propina, el total es el segundo dato de la
 * fila y va a la derecha, como las horas extra. Antes era una franja con
 * fondo y relleno propios, que corría los nombres 10px.
 */
export function TotalDelDia({ propina, total }: { propina?: ReactNode; total: ReactNode }) {
  const conPropina = propina !== undefined;
  return (
    <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t-2 border-hueso/10 pt-1.5
                   text-[14px] tabular-nums">
      {conPropina && (
        <div className="flex items-baseline gap-1.5">
          <dt className={`${ROTULO_LADO} ${COLUMNA_ROTULO}`}>Propina</dt>
          <dd>{propina}</dd>
        </div>
      )}
      <div className={`flex items-baseline gap-1.5 ${conPropina ? 'ml-auto' : ''}`}>
        <dt className={`${ROTULO_LADO} ${conPropina ? '' : COLUMNA_ROTULO}`}>Total del día</dt>
        <dd>{total}</dd>
      </div>
    </dl>
  );
}

/** *Ficha* y *Sacar del día*: la ficha desde acá, y sacar pregunta antes. */
export function BotonesDeLaLinea({ quien, que, onFicha, onSacar }: {
  quien: string;
  /** Qué tiene su ficha, para el título del botón. */
  que: string;
  onFicha: () => void;
  onSacar: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onFicha} className="boton flex-1 justify-center"
        title={`${que} de ${quien}`}>
        Ficha
      </button>
      <button type="button" onClick={onSacar}
        className="boton flex-1 justify-center hover:border-rojo/60 hover:text-rojo-texto"
        title={`Sacar a ${quien} de este día`}>
        Sacar del día
      </button>
    </div>
  );
}

/** El *+ Nuevo …* del pie de un grupo: cortado, a todo el ancho. */
export function BotonNuevaPersona({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="tecla mt-2 min-h-[40px] w-full rounded-lg border-2 border-dashed border-hueso/25
                 px-2 text-[14px] font-semibold text-hueso/70 hover:border-oro hover:text-oro">
      {texto}
    </button>
  );
}
