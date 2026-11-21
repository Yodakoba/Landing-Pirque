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

/** Un dato con su nombre al lado, en una fila. */
export function CampoAlLado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className={ROTULO_LADO}>{rotulo}</span>
      {children}
    </label>
  );
}

/**
 * **Los ajustes de una persona en un día.** El rótulo y los dos botones van
 * en una fila, y cada ajuste es una tarjeta de su color: arriba qué es, el
 * monto y la ✕; debajo el motivo y cómo se pagó con botones, y una nota.
 */
export function AjustesDelDia({ ajustes, quien, onCambio }: {
  ajustes: Ajuste[];
  /** El nombre, para los rótulos que lee un lector de pantalla. */
  quien: string;
  onCambio: (ajustes: Ajuste[]) => void;
}) {
  // El recién agregado se trae el cursor una vez.
  const [recien, setRecien] = useState<number | null>(null);
  const copia = () => ajustes.map((a) => ({ ...a }));
  const agregar = (tipo: TipoAjuste) => {
    setRecien(ajustes.length);
    onCambio([...copia(), { monto: 0, motivo: '', tipo }]);
  };
  const quitar = (k: number) => onCambio(ajustes.filter((_, x) => x !== k));
  // El monto se escribe sin signo: lo pone el tipo (`montoConSigno()`).
  const cambiarMonto = (k: number, valor: string) => {
    const c = copia();
    const n = Number(String(valor).replace(/[^\d]/g, ''));
    c[k].tipo = tipoDeAjuste(c[k]);
    c[k].monto = montoConSigno(Number.isFinite(n) ? n : 0, c[k].tipo);
    onCambio(c);
  };
  const cambiarPartes = (k: number, cambio: Partial<PartesAjuste>) => {
    const c = copia();
    c[k].tipo = tipoDeAjuste(c[k]);
    c[k].motivo = motivoDePartes({ ...partesDeMotivo(c[k].motivo), ...cambio });
    onCambio(c);
  };
  const total = totalAjustes(ajustes);

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className={`${ROTULO_LADO} mr-auto`}>Ajustes</span>
        {ajustes.length > 1 && (
          /* El signo va adelante y aparte: "$-18.000" se lee como un error. */
          <span className="text-[13px] tabular-nums text-hueso/65">
            suman {total < 0 ? '−' : '+'}{enPesos(Math.abs(total))}
          </span>
        )}
        <button type="button" onClick={() => agregar('resta')}
          className="boton min-h-[36px] !border-rojo-fuerte/60 !px-2.5 !font-semibold text-rojo-texto">
          − Descontar
        </button>
        <button type="button" onClick={() => agregar('suma')}
          className="boton min-h-[36px] !border-verde-fuerte/60 !px-2.5 !font-semibold text-verde-texto">
          + Sumar
        </button>
      </div>
      {ajustes.map((a, k) => {
        const tipo = tipoDeAjuste(a);
        const resta = tipo === 'resta';
        const partes = partesDeMotivo(a.motivo);
        return (
          <div key={k} className={`mb-1.5 rounded-lg border-2 p-2 ${resta
            ? 'border-rojo-fuerte/50 bg-rojo/[0.04]' : 'border-verde-fuerte/50 bg-verde/[0.04]'}`}>
            {/* Qué es, cuánto y la ✕, en una fila. El signo va adelante,
                grande y de su color: se distingue por forma, no solo por color. */}
            <div className="flex items-center gap-1.5">
              <span aria-hidden className={`w-4 shrink-0 text-center text-[22px] font-bold leading-none ${resta
                ? 'text-rojo-texto' : 'text-verde-texto'}`}>{resta ? '−' : '+'}</span>
              <span className={`text-[14px] font-bold ${resta ? 'text-rojo-texto' : 'text-verde-texto'}`}>
                {resta ? 'Descuento' : 'Suma'}
              </span>
              <span className="ml-1 shrink-0 text-[15px] font-bold">$</span>
              <input type="number" min={0} step={1000} inputMode="numeric"
                className={`${ENTRADA_DIA} w-28 min-w-0`}
                value={Math.abs(a.monto) || ''} placeholder="4000"
                aria-label={`${resta ? 'Descuento' : 'Suma'} ${k + 1} de ${quien}`}
                ref={(el) => { if (el && recien === k) { setRecien(null); el.focus(); } }}
                onChange={(e) => cambiarMonto(k, e.target.value)} />
              <span className="flex-1" />
              <button type="button" onClick={() => quitar(k)}
                className="boton shrink-0 !px-2.5 hover:border-rojo/60 hover:text-rojo-texto"
                aria-label={`Quitar el ajuste ${k + 1} de ${quien}`} title="Quitar este ajuste">✕</button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Por qué">
              {MOTIVOS_AJUSTE[tipo].map((m) => (
                <button key={m} type="button" aria-pressed={partes.razon === m}
                  onClick={() => cambiarPartes(k, { razon: partes.razon === m ? '' : m })}
                  className={`${OPCION} ${partes.razon === m ? ELEGIDO : ''}`}>
                  {partes.razon === m && '✓ '}{m}
                </button>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1" role="group" aria-label="Cómo">
              <span className="mr-0.5 text-[13px] font-semibold text-hueso/65">Cómo:</span>
              {MEDIOS_AJUSTE.map((m) => (
                <button key={m} type="button" aria-pressed={partes.medio === m}
                  onClick={() => cambiarPartes(k, { medio: partes.medio === m ? '' : m })}
                  className={`${OPCION} ${partes.medio === m ? ELEGIDO : ''}`}>
                  {partes.medio === m && '✓ '}{m}
                </button>
              ))}
            </div>
            <input type="text" className={`${ENTRADA_DIA} mt-1 w-full !text-[14px]`}
              value={partes.nota}
              placeholder={partes.razon === 'Otro' ? 'qué fue' : 'nota (opcional)'}
              aria-label={`Nota del ajuste ${k + 1} de ${quien}`}
              onChange={(e) => cambiarPartes(k, { nota: e.target.value })} />
          </div>
        );
      })}
    </div>
  );
}

/** La propina (si la hay) y el total del día, en una línea. */
export function TotalDelDia({ propina, total }: { propina?: ReactNode; total: ReactNode }) {
  return (
    <dl className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg
                   bg-hueso/[0.04] px-2.5 py-1.5 text-[14px] tabular-nums">
      {propina !== undefined && (
        <div className="flex items-baseline gap-1.5">
          <dt className={ROTULO_LADO}>Propina</dt>
          <dd>{propina}</dd>
        </div>
      )}
      <div className="ml-auto flex items-baseline gap-1.5">
        <dt className={ROTULO_LADO}>Total del día</dt>
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
