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
  dia, cupoNormal, apertura, fechasExistentes = [], onListo, onCancelar
}: {
  /** El día a editar, o `null` para agregar uno que todavía no existe. */
  dia: Ocupacion | null;
  cupoNormal: number;
  apertura: string;
  /** Las fechas que ya están en la hoja, solo para avisar si se repite una. */
  fechasExistentes?: string[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  // Agregar una fecha y editar una existente son la misma ventana a
  // propósito: los campos son los mismos y la validación también. Lo único
  // que cambia es si la fecha se elige o viene dada.
  const nueva = dia === null;

  // Un día que todavía no está en la hoja viene con capacidad 0: se propone
  // el cupo normal, que es lo que se va a querer casi siempre.
  const sinDefinir = !dia || (dia.capacidad === 0 && !dia.bloqueada);
  const [f, setF] = useState({
    fecha: dia?.fecha ?? '',
    capacidad: String(sinDefinir ? cupoNormal : dia!.capacidad),
    apertura: apertura,
    estado: dia?.bloqueada ? ESTADO_DIA.cerrada
          : dia?.privada ? ESTADO_DIA.privada
          : ESTADO_DIA.abierta,
    notas: dia?.notas ?? ''
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Guardar una fecha que ya está en la hoja la REEMPLAZA, no la duplica.
  // Es lo correcto, pero conviene decirlo antes y no después.
  const yaEstaba = nueva && f.fecha !== '' && fechasExistentes.includes(f.fecha);


  async function guardar(cambios?: Partial<typeof f>) {
    if (nueva && !f.fecha) return setError('Elige una fecha.');
    setGuardando(true);
    setError('');
    const cuerpo = {
      ...f, ...cambios,
      fecha: dia?.fecha ?? f.fecha,
      capacidad: Number((cambios ?? f).capacidad ?? f.capacidad)
    };
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
    <Dialogo
      titulo={nueva ? 'Agregar fecha' : enPalabras(dia!.fecha)}
      onCerrar={onCancelar}>
      <>
        {nueva ? (
          <p className="mt-2 text-sm text-hueso/60">
            Para abrir un día que no cae en el horario de siempre: un feriado,
            una fecha especial, o un evento privado.
          </p>
        ) : (
          <p className="mt-2 text-sm text-hueso/60">
            {dia!.tomadas > 0
              ? `${dia!.tomadas} personas ya reservaron este día.`
              : 'Todavía no hay reservas este día.'}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {nueva && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs uppercase tracking-wide text-hueso/60">
                Fecha
              </span>
              <input type="date" className={ENTRADA} value={f.fecha} autoFocus
                onChange={(e) => setF({ ...f, fecha: e.target.value })} />
              {f.fecha && (
                <span className="mt-1 block text-xs capitalize text-hueso/50">
                  {enPalabras(f.fecha)}
                </span>
              )}
            </label>
          )}
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

        {yaEstaba && (
          <p className="mt-3 rounded border border-amber-500/50 bg-amber-500/5 p-3 text-sm text-amber-200">
            Esa fecha ya está en la lista. Guardar va a reemplazar su cupo,
            su hora y su estado por lo que pongas acá.
          </p>
        )}

        {!nueva && Number(f.capacidad) > 0 && Number(f.capacidad) < dia!.tomadas && (
          <p className="mt-3 rounded border border-amber-500/50 bg-amber-500/5 p-3 text-sm text-amber-200">
            Ese cupo es menor que las {dia!.tomadas} personas que ya reservaron.
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
            {guardando ? 'Guardando…' : nueva ? 'Agregar' : 'Guardar'}
          </button>
          <span className="flex-1" />
          <button onClick={onCancelar}
            className="rounded border border-hueso/20 px-4 py-2 text-sm">Cancelar</button>
        </div>
      </>
    </Dialogo>
  );
}
