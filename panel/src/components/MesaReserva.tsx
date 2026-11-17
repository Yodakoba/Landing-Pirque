'use client';

/**
 * **La mesa de una reserva** (2026-11-17, lo pidió el cliente; lógica en
 * `lib/mesa.ts`). La misma pieza en la Recepción y en la página del día:
 *
 * - **Lo agregado**: la gente que se sumó, cada uno con su menú o *a la
 *   carta*, con − y + por opción (`ElegirAgregados`).
 * - **El valor final**: el total de la cuenta de la mesa en Fudo, con lo ya
 *   pagado incluido, y quién lo anotó.
 *
 * Los dos se guardan con un botón que dice lo que pasa —toman cupo y son
 * plata—, no solos. Sin permiso o fuera de hora, se leen y no se tocan.
 */
import { useState } from 'react';
import { avisar } from './AvisoFlotante';
import {
  A_LA_CARTA, leerAgregados, escribirAgregados, limpiarValorFinal, partesMarcaMesa,
  pesosCL, type Agregado
} from '@/lib/mesa';

export interface DatosMesa {
  fila: number;
  nombre: string;
  agregados?: string;
  valorFinal?: number | null;
  mesaCerrada?: string;
}

const etiqueta = (m: string) => (m === A_LA_CARTA ? '🍽 A la carta' : m);

/**
 * **Elegir qué comen**: un renglón por opción, con − y +. Las opciones las
 * arma `opcionesParaAgregar()`: los menús de la reserva, los del sitio y *a
 * la carta* al final.
 */
export function ElegirAgregados({ opciones, valor, onCambio }: {
  opciones: string[];
  valor: Agregado[];
  onCambio: (v: Agregado[]) => void;
}) {
  const de = (m: string) => valor.find((a) => a.menu === m)?.cantidad ?? 0;
  const poner = (m: string, n: number) => onCambio(
    [...valor.filter((a) => a.menu !== m), ...(n > 0 ? [{ menu: m, cantidad: n }] : [])]);
  return (
    <ul className="space-y-1.5">
      {opciones.map((m) => {
        const n = de(m);
        return (
          <li key={m} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1 ${n > 0
            ? 'border-cielo-fuerte/60 bg-cielo/10' : 'border-hueso/15'}`}>
            <span className={`min-w-0 flex-1 text-[16px] leading-tight ${n > 0 ? 'font-bold' : ''}`}>{etiqueta(m)}</span>
            <button type="button" aria-label={`Una menos de ${m}`} disabled={n === 0}
              className="boton h-11 w-11 shrink-0 !text-[22px] !font-bold disabled:opacity-30"
              onClick={() => poner(m, n - 1)}>−</button>
            <span className="w-8 shrink-0 text-center text-[20px] font-bold tabular-nums">{n}</span>
            <button type="button" aria-label={`Una más de ${m}`}
              className="boton h-11 w-11 shrink-0 !text-[22px] !font-bold"
              onClick={() => poner(m, n + 1)}>+</button>
          </li>
        );
      })}
    </ul>
  );
}

export default function MesaReserva({ r, opciones, editable, onGuardado, compacta = false }: {
  r: DatosMesa;
  opciones: string[];
  /** Si esta cuenta, a esta hora, puede anotar la mesa. */
  editable: boolean;
  /** Después de guardar: recargar lo que corresponda. */
  onGuardado: () => void;
  /** Sin el título, cuando lo que la rodea ya dice que es la mesa. */
  compacta?: boolean;
}) {
  const [modo, setModo] = useState<'' | 'agregar' | 'valor'>('');
  const [borrador, setBorrador] = useState<Agregado[]>([]);
  const [valorTexto, setValorTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const lista = leerAgregados(r.agregados);
  const marca = partesMarcaMesa(r.mesaCerrada);

  async function guardar(cambios: { agregados?: string; valorFinal?: number | null }, aviso: string) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/reservas/${r.fila}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cambios)
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(aviso);
      setModo('');
      onGuardado();
    } catch (e) {
      avisar(String(e), 'atencion');
    } finally {
      setGuardando(false);
    }
  }

  const nBorrador = borrador.reduce((s, a) => s + a.cantidad, 0);
  const valor = limpiarValorFinal(valorTexto);

  return (
    <section aria-label="La mesa" className="rounded-xl border-2 border-cielo-fuerte/40 bg-cielo/[0.05] p-3">
      {!compacta && <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">🍽 La mesa</p>}

      {/* Lo que ya tiene: lo agregado y el valor final, siempre a la vista. */}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {lista.length ? lista.map((a) => (
          <span key={a.menu} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2
                                        border-cielo-fuerte/60 bg-cielo/10 px-2.5 py-0.5 text-[14px] font-bold text-cielo-texto">
            +{a.cantidad} {a.menu === A_LA_CARTA ? 'a la carta' : a.menu}
          </span>
        )) : <span className="text-[14px] text-hueso/65">Nadie agregado.</span>}
      </div>
      <p className={`mt-1.5 text-[15px] ${r.valorFinal != null ? 'font-bold' : 'text-hueso/65'}`}>
        🧾 {r.valorFinal != null
          ? <>Valor final {pesosCL(r.valorFinal)}{marca && <span className="font-normal text-hueso/65">
              {' '}· lo anotó {marca.quien}{marca.cuando ? ` a las ${marca.cuando.slice(11) || marca.cuando}` : ''}</span>}</>
          : 'Sin valor final todavía'}
      </p>

      {editable && modo === '' && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="boton min-h-[44px] !border-cielo-fuerte/70 !font-semibold text-cielo-texto"
            onClick={() => { setBorrador(lista); setModo('agregar'); }}>
            {lista.length ? '✎ Cambiar lo agregado' : '➕ Agregar a la mesa'}
          </button>
          <button type="button" className="boton min-h-[44px] !font-semibold"
            onClick={() => { setValorTexto(r.valorFinal != null ? String(r.valorFinal) : ''); setModo('valor'); }}>
            🧾 {r.valorFinal != null ? 'Cambiar el valor final' : 'Anotar el valor final'}
          </button>
        </div>
      )}

      {editable && modo === 'agregar' && (
        <div className="mt-2 space-y-2 rounded-xl border-2 border-cielo-fuerte/60 bg-panel p-3">
          <p className="text-[16px] font-semibold">¿Quién se sumó a la mesa, y qué come?</p>
          <ElegirAgregados opciones={opciones} valor={borrador} onCambio={setBorrador} />
          <p className="text-[14px] text-hueso/75">
            Se suman a la gente del día. Un menú agregado se cobra a precio del local; a la carta, lo que consuman.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={guardando || escribirAgregados(borrador) === escribirAgregados(lista)}
              className="boton min-h-[48px] flex-1 !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta disabled:opacity-40"
              onClick={() => void guardar({ agregados: escribirAgregados(borrador) },
                nBorrador ? `${r.nombre}: ${nBorrador} en la mesa` : `${r.nombre}: sin agregados`)}>
              {guardando ? 'Guardando…' : nBorrador ? `✓ Guardar · ${nBorrador} ${nBorrador === 1 ? 'agregado' : 'agregados'}`
                : '✓ Guardar · sin agregados'}
            </button>
            <button type="button" className="boton min-h-[48px]" onClick={() => setModo('')}>Volver</button>
          </div>
        </div>
      )}

      {editable && modo === 'valor' && (
        <div className="mt-2 space-y-2 rounded-xl border-2 border-oro/60 bg-panel p-3">
          <label className="block text-[16px] font-semibold" htmlFor={`valor-${r.fila}`}>
            ¿Cuánto fue la cuenta de la mesa?
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold">$</span>
            <input id={`valor-${r.fila}`} inputMode="numeric" autoFocus value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="264.000"
              className="min-h-[52px] w-full rounded-xl border-2 border-hueso/25 bg-tinta px-3 text-[22px] font-bold tabular-nums" />
          </div>
          <p className="text-[14px] text-hueso/75">
            Es el total de la cuenta de esta mesa en Fudo, con lo ya pagado incluido.
          </p>
          <div className="flex flex-wrap gap-2">
            {valorTexto.trim() ? (
              <button type="button" disabled={guardando || valor == null || valor === r.valorFinal}
                className="boton min-h-[48px] flex-1 !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta disabled:opacity-40"
                onClick={() => valor != null && void guardar({ valorFinal: valor }, `${r.nombre}: valor final ${pesosCL(valor)}`)}>
                {guardando ? 'Guardando…' : valor == null ? 'Escribe un monto' : `✓ Guardar ${pesosCL(valor)}`}
              </button>
            ) : r.valorFinal != null ? (
              <button type="button" disabled={guardando}
                className="boton min-h-[48px] flex-1 !border-rojo-fuerte/60 !font-semibold text-rojo-texto"
                onClick={() => void guardar({ valorFinal: null }, `${r.nombre}: sin valor final`)}>
                Quitar el valor final
              </button>
            ) : null}
            <button type="button" className="boton min-h-[48px]" onClick={() => setModo('')}>Volver</button>
          </div>
        </div>
      )}
    </section>
  );
}
