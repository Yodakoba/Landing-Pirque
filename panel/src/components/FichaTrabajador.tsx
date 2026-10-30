'use client';

/**
 * La ficha de un trabajador, abierta desde el planificador.
 *
 * Hermana de `FichaColaborador`, y existe por lo mismo (ver ahí el porqué
 * largo): los datos que no cambian de un día a otro —cómo ubicarlo, cómo se
 * le paga, dónde se le transfiere— vivían solo en `/equipo`, y quien arma un
 * sábado no pasa por ahí. Ahora se piden al crear y se pueden completar
 * desde la misma ventana donde se planifica.
 *
 * **El nombre no se edita acá**, igual que en la otra: los turnos guardados
 * apuntan a la persona por su nombre, y renombrarla desde la ventana de un
 * día dejaría los turnos de los otros días huérfanos. Eso se hace en
 * `/equipo`, que es donde el panel avisa del daño (`sinFicha()`).
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import DatosBancarios from './DatosBancarios';
import { bancoVacio, type Banco } from '@/lib/banco';
import { MODALIDAD, esContratado, type Trabajador } from '@/lib/equipo';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function FichaTrabajador({
  ficha, puesto = '', nombreSugerido = '', esAdmin, onListo, onCancelar
}: {
  /** La ficha a editar, o `undefined` para crear una nueva. */
  ficha?: Trabajador;
  /** Con qué nombre nace, para la ficha que le falta a alguien ya asignado. */
  nombreSugerido?: string;
  /** El puesto desde el que se está creando: es su puesto habitual. */
  puesto?: string;
  esAdmin: boolean;
  onListo: (t: Trabajador, aviso?: string) => void;
  onCancelar: () => void;
}) {
  const creando = !ficha;
  const [nombre, setNombre] = useState(ficha?.nombre ?? nombreSugerido);
  const [telefono, setTelefono] = useState(ficha?.telefono ?? '');
  const [habitual, setHabitual] = useState(ficha?.puesto ?? puesto);
  const [activo, setActivo] = useState(ficha?.activo ?? true);
  const [modalidad, setModalidad] = useState<string>(
    ficha?.modalidad ?? MODALIDAD.porTurno);
  const [pagoJornada, setPagoJornada] = useState(String(ficha?.pagoJornada || ''));
  const [valorHora, setValorHora] = useState(String(ficha?.valorHora || ''));
  const [propina, setPropina] = useState(ficha?.propina ?? true);
  const [banco, setBanco] = useState<Banco>(ficha?.banco ?? bancoVacio());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const contratado = esContratado(modalidad);

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const r = await fetch('/api/equipo/trabajador', {
        method: creando ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, puesto: habitual, modalidad,
                               pagoJornada, valorHora, propina, banco,
                               ...(creando ? {} : { activo }) })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      onListo(d.trabajador, d.aviso);
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={creando ? 'Nuevo trabajador' : `Ficha de ${ficha!.nombre}`}
             onCerrar={onCancelar} ancho="max-w-3xl">
      <p className="mt-3 text-sm text-hueso/60">
        {creando ? (
          <>Queda en la lista del equipo{puesto && <>, y asignado a{' '}
            <strong>{puesto}</strong> en este día</>}.</>
        ) : (
          <>Lo que no cambia de un día a otro: cómo ubicarlo, cómo se le paga
            y dónde se le transfiere.</>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <Campo etiqueta="Nombre" ancho="w-60">
          {creando ? (
            <input type="text" value={nombre} autoFocus className={ENTRADA}
              placeholder="Nombre y apellido" aria-label="Nombre del trabajador"
              onChange={(e) => setNombre(e.target.value)} />
          ) : (
            <p className="rounded border border-hueso/10 bg-panel px-2 py-1 text-sm">
              {ficha!.nombre}
            </p>
          )}
        </Campo>
        <Campo etiqueta="Teléfono" ancho="w-44">
          <CampoTelefono valor={telefono} className={ENTRADA}
            etiqueta={`Teléfono de ${nombre || 'esta persona'}`}
            onCambio={setTelefono} />
        </Campo>
        <Campo etiqueta="Puesto habitual" ancho="w-44">
          <input type="text" value={habitual} className={ENTRADA}
            placeholder="garzón, parrillero…"
            aria-label={`Puesto habitual de ${nombre || 'esta persona'}`}
            onChange={(e) => setHabitual(e.target.value)} />
        </Campo>
        {!creando && (
          <label className="flex items-center gap-2 self-center pt-4">
            <input type="checkbox" checked={activo} className="h-4 w-4 accent-oro"
              aria-label={`${ficha!.nombre} sigue en el equipo`}
              onChange={(e) => setActivo(e.target.checked)} />
            <span className="text-[10px] uppercase tracking-wide text-hueso/35">
              Activo
            </span>
          </label>
        )}
      </div>

      {esAdmin && (
        <div className="mt-4 border-t border-hueso/10 pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-hueso/35">
            Pago
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <Campo etiqueta="Modalidad" ancho="w-44">
              <select value={modalidad} className={ENTRADA}
                aria-label={`Cómo se le paga a ${nombre || 'esta persona'}`}
                onChange={(e) => setModalidad(e.target.value)}>
                <option value={MODALIDAD.porTurno}>Por turno</option>
                <option value={MODALIDAD.contratado}>Contratado (tiene sueldo)</option>
              </select>
            </Campo>
            <Campo etiqueta="Jornada" ancho="w-32">
              {/* A un contratado no se le paga por jornada: un monto acá no
                  lo usaría ninguna cuenta y haría creer que sí. */}
              <input type="number" min={0} step={1000} className={ENTRADA}
                value={contratado ? '' : pagoJornada} disabled={contratado}
                placeholder={contratado ? 'no aplica' : '—'}
                aria-label={`Jornada de ${nombre || 'esta persona'}`}
                onChange={(e) => setPagoJornada(e.target.value)} />
            </Campo>
            <Campo etiqueta="Hora extra" ancho="w-32">
              <input type="number" min={0} step={500} className={ENTRADA}
                value={valorHora} placeholder="—"
                aria-label={`Valor de la hora extra de ${nombre || 'esta persona'}`}
                onChange={(e) => setValorHora(e.target.value)} />
            </Campo>
            <label className="flex items-center gap-2 self-center pt-4">
              <input type="checkbox" checked={propina} className="h-4 w-4 accent-oro"
                aria-label={`${nombre || 'Esta persona'} entra en el reparto de propina`}
                onChange={(e) => setPropina(e.target.checked)} />
              <span className="text-[10px] uppercase tracking-wide text-hueso/35">
                Entra en la propina
              </span>
            </label>
          </div>
        </div>
      )}

      {esAdmin && (
        <div className="mt-4 border-t border-hueso/10 pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-hueso/35">
            Transferencia
          </p>
          <DatosBancarios banco={banco} nombre={nombre} onCambio={setBanco} />
          <p className="mt-2 text-xs text-hueso/45">
            Es lo que sale en la planilla que descarga quien paga. Se puede
            dejar para después, pero es justo lo que después cuesta juntar.
          </p>
        </div>
      )}

      {!esAdmin && (
        <p className="mt-4 text-xs text-hueso/45">
          Los sueldos y los datos bancarios los maneja el administrador.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-rojo-texto">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <span className="flex-1" />
        <button onClick={onCancelar}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-hueso/40">
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando || !nombre.trim()}
          className="whitespace-nowrap rounded bg-oro px-4 py-1.5 text-sm
                     font-semibold text-tinta disabled:opacity-40">
          {guardando ? 'Guardando…' : creando ? 'Crear y asignar' : 'Guardar ficha'}
        </button>
      </div>
    </Dialogo>
  );
}
