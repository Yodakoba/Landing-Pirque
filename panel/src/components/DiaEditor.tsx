'use client';

/**
 * Abrir, cerrar o cambiarle el cupo a un día, desde el propio calendario.
 *
 * Antes esto era una página aparte, "Fechas hábiles", que mostraba la misma
 * lista de días con otra cara. Se unió al calendario el 2026-10-21: dos
 * pantallas con los mismos días obligaban a saber de antemano cuál abrir, y
 * la decisión de cambiar un cupo se toma mirando la ocupación, que es
 * justamente lo que muestra el calendario.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import type { Ocupacion } from '@/lib/tipos';
import { ESTADO_DIA, estaCerrado, esPrivada } from '@/lib/columnas';
import { enPalabras } from '@/lib/fechas';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function DiaEditor({
  dia, cupoNormal, apertura, onListo, onCancelar
}: {
  dia: Ocupacion;
  cupoNormal: number;
  apertura: string;
  onListo: () => void;
  onCancelar: () => void;
}) {
  // Un día que todavía no está en la hoja viene con capacidad 0: se propone
  // el cupo normal, que es lo que se va a querer casi siempre.
  const sinDefinir = dia.capacidad === 0 && !dia.bloqueada;
  const [f, setF] = useState({
    capacidad: String(sinDefinir ? cupoNormal : dia.capacidad),
    apertura: apertura,
    estado: dia.bloqueada ? ESTADO_DIA.cerrada
          : dia.privada ? ESTADO_DIA.privada
          : ESTADO_DIA.abierta,
    notas: dia.notas ?? ''
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');


  async function guardar(cambios?: Partial<typeof f>) {
    setGuardando(true);
    setError('');
    const cuerpo = { fecha: dia.fecha, ...f, ...cambios, capacidad: Number((cambios ?? f).capacidad ?? f.capacidad) };
    try {
      const r = await fetch('/api/fechas', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const d = await r.json();
      if (d.error) setError(d.error); else onListo();
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={enPalabras(dia.fecha)} onCerrar={onCancelar}>
      <>
        <p className="mt-2 text-sm text-hueso/60">
          {dia.tomadas > 0
            ? `${dia.tomadas} personas ya reservaron este día.`
            : 'Todavía no hay reservas este día.'}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-hueso/60">
              Cupo
            </span>
            <input type="number" min={0} step={1} className={ENTRADA}
              value={f.capacidad}
              onChange={(e) => setF({ ...f, capacidad: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-hueso/60">
              Hora de apertura
            </span>
            <input type="text" className={ENTRADA} value={f.apertura}
              onChange={(e) => setF({ ...f, apertura: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs uppercase tracking-wide text-hueso/60">
              Nota
            </span>
            <input type="text" className={ENTRADA} value={f.notas} placeholder="—"
              onChange={(e) => setF({ ...f, notas: e.target.value })} />
            <span className="mt-1 block text-xs text-hueso/50">
              Se ve en el calendario del panel. El visitante no la ve.
            </span>
          </label>
        </div>

        {Number(f.capacidad) > 0 && Number(f.capacidad) < dia.tomadas && (
          <p className="mt-3 rounded border border-amber-500/50 bg-amber-500/5 p-3 text-sm text-amber-200">
            Ese cupo es menor que las {dia.tomadas} personas que ya reservaron.
            Se puede guardar igual, pero el día va a quedar sobrevendido.
          </p>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

        {/* Tres estados y no un interruptor, porque son tres cosas
            distintas: abierta al público, abierta solo para nosotros, y
            cerrada. Antes el botón solo alternaba entre la primera y la
            tercera, y no había forma de tener la del medio. */}
        <fieldset className="mt-5">
          <legend className="mb-2 text-xs uppercase tracking-wide text-hueso/60">
            Quién puede reservar
          </legend>
          <div className="space-y-2">
            {([
              [ESTADO_DIA.abierta, 'Abierta al público',
               'Aparece en el calendario del sitio y cualquiera puede reservar.'],
              [ESTADO_DIA.privada, 'Solo nosotros',
               'No aparece en el sitio. Para un evento privado o algo vendido aparte: ' +
               'se ve acá con su cupo y sus reservas, y nadie puede comprar un lugar.'],
              [ESTADO_DIA.cerrada, 'Cerrada',
               'No se ofrece ni se atiende. Las reservas que ya hubiera no se borran.']
            ] as const).map(([valor, titulo, ayuda]) => (
              <label key={valor} className="flex cursor-pointer gap-3">
                <input type="radio" name="estado" value={valor} className="mt-1"
                  checked={f.estado === valor}
                  onChange={() => setF({ ...f, estado: valor })} />
                <span>
                  <span className="block text-sm">{titulo}</span>
                  <span className="block text-xs text-hueso/50">{ayuda}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => guardar()} disabled={guardando}
            className="rounded bg-oro px-4 py-2 text-sm font-semibold text-tinta disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <span className="flex-1" />
          <button onClick={onCancelar}
            className="rounded border border-hueso/20 px-4 py-2 text-sm">Cancelar</button>
        </div>
      </>
    </Dialogo>
  );
}
