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
import { ESTADO_DIA } from '@/lib/columnas';
import { enPalabras } from '@/lib/fechas';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-sm ' +
  'focus:border-oro focus:outline-none';

/**
 * El valor del cuarto radio, que **no es un estado de la planilla**.
 *
 * Un día de preparación no se escribe en `Fechas Hábiles`: se deduce de que
 * tenga equipo y no reciba público (`esPreparacion()`). Esta opción existe
 * porque el cliente la pidió desde acá —"se agrega una fecha pública y al
 * final el encargado dice: ah, y tengo que preparar una fecha"— y lo que
 * hace es **llevar a planificar el equipo de ese día**, que es lo único que
 * de verdad lo vuelve de preparación. Si escribiera una fila, habría dos
 * verdades capaces de contradecirse: un día marcado "preparación" que
 * después se abre, o al revés.
 */
const PREPARACION = 'preparacion';

export default function DiaEditor({
  dia, cupoNormal, apertura, fechasExistentes = [], onListo, onCancelar,
  onPreparacion
}: {
  /** El día a editar, o `null` para agregar uno que todavía no existe. */
  dia: Ocupacion | null;
  cupoNormal: number;
  apertura: string;
  /** Las fechas que ya están en la hoja, solo para avisar si se repite una. */
  fechasExistentes?: string[];
  onListo: () => void;
  onCancelar: () => void;
  /** Llevar a planificar el equipo de esa fecha, sin tocar la planilla. */
  onPreparacion?: (fecha: string) => void;
}) {
  // Agregar una fecha y editar una existente son la misma ventana a
  // propósito: los campos son los mismos y la validación también. Lo único
  // que cambia es si la fecha se elige o viene dada.
  const nueva = dia === null;

  // Un día que todavía no está en la hoja viene con capacidad 0: se propone
  // el cupo normal, que es lo que se va a querer casi siempre.
  const sinDefinir = !dia || (dia.capacidad === 0 && !dia.bloqueada);
  const [f, setF] = useState<{
    fecha: string; capacidad: string; apertura: string;
    estado: string; notas: string;
  }>({
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
  // La preparación solo se ofrece al agregar: un día que ya está en la hoja
  // se vuelve de preparación cerrándolo y asignándole equipo, y ofrecer acá
  // un atajo a eso sería explicar dos caminos para lo mismo.
  const ofrecePreparacion = nueva && !!onPreparacion;
  const esPreparacion = f.estado === PREPARACION;


  async function guardar(cambios?: Partial<typeof f>) {
    if (nueva && !f.fecha) return setError('Elige una fecha.');
    // Preparación no es un estado que se guarde: se sale de acá a asignarle
    // equipo, y eso es lo que lo vuelve un día de preparación.
    if (esPreparacion) return onPreparacion!(f.fecha);
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
            una fecha especial o un evento privado. También para anotar un día
            de preparación, en que no entra nadie y se trabaja igual.
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
          {!esPreparacion && (
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-hueso/60">
              Cupo
            </span>
            <input type="number" min={0} step={1} className={ENTRADA}
              value={f.capacidad}
              onChange={(e) => setF({ ...f, capacidad: e.target.value })} />
          </label>
          )}
          {!esPreparacion && (
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-hueso/60">
              Hora de apertura
            </span>
            <input type="text" className={ENTRADA} value={f.apertura}
              onChange={(e) => setF({ ...f, apertura: e.target.value })} />
          </label>
          )}
          {!esPreparacion && (
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
          )}
        </div>

        {!esPreparacion && yaEstaba && (
          <p className="mt-3 rounded border border-ambar/50 bg-ambar/5 p-3 text-sm text-ambar-texto">
            Esa fecha ya está en la lista. Guardar va a reemplazar su cupo,
            su hora y su estado por lo que pongas acá.
          </p>
        )}

        {!nueva && Number(f.capacidad) > 0 && Number(f.capacidad) < dia!.tomadas && (
          <p className="mt-3 rounded border border-ambar/50 bg-ambar/5 p-3 text-sm text-ambar-texto">
            Ese cupo es menor que las {dia!.tomadas} personas que ya reservaron.
            Se puede guardar igual, pero el día va a quedar sobrevendido.
          </p>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-rojo-texto">{error}</p>}

        {/* Tres estados y no un interruptor, porque son tres cosas
            distintas: abierta al público, abierta solo para nosotros, y
            cerrada. Antes el botón solo alternaba entre la primera y la
            tercera, y no había forma de tener la del medio.

            La cuarta, preparación, no es un estado de la planilla y no se
            guarda: lleva a planificar el equipo. Por eso la pregunta dejó de
            ser "quién puede reservar" —a eso la preparación contestaría
            "nadie", que no es lo que dice— y pasó a ser qué día es. */}
        <fieldset className="mt-5">
          <legend className="mb-2 text-xs uppercase tracking-wide text-hueso/60">
            Qué día es
          </legend>
          <div className="space-y-2">
            {([
              [ESTADO_DIA.abierta, 'Abierta al público',
               'Aparece en el calendario del sitio y cualquiera puede reservar.'],
              [ESTADO_DIA.privada, 'Privado',
               'No aparece en el sitio. Para un evento privado o algo vendido aparte: ' +
               'se ve acá con su cupo y sus reservas, y nadie puede comprar un lugar.'],
              [ESTADO_DIA.cerrada, 'Cerrada',
               'No se ofrece ni se atiende. Las reservas que ya hubiera no se borran.'],
              ...(ofrecePreparacion ? [[PREPARACION, 'Día de preparación',
                   'No entra nadie y se trabaja igual: montar un matrimonio, dejar ' +
                   'la carne lista. Se le asigna equipo, y con eso queda.'] as const]
                : [])
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

        {esPreparacion && (
          <p className="mt-3 rounded border border-oro/40 bg-oro/5 p-3 text-sm text-hueso/70">
            Un día de preparación <strong>no se agrega al calendario</strong>:
            se le asigna equipo y con eso queda. No aparece en el sitio, no
            recibe reservas y no necesita cupo ni hora de apertura.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => guardar()} disabled={guardando}
            className="rounded bg-oro px-4 py-2 text-sm font-semibold text-tinta disabled:opacity-50">
            {guardando ? 'Guardando…'
              : esPreparacion ? 'Planificar el equipo'
              : nueva ? 'Agregar' : 'Guardar'}
          </button>
          <span className="flex-1" />
          <button onClick={onCancelar}
            className="rounded border border-hueso/20 px-4 py-2 text-sm">Cancelar</button>
        </div>
      </>
    </Dialogo>
  );
}
