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
import AyudaCorta from './AyudaCorta';
import Dialogo from './Dialogo';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import DatosBancarios from './DatosBancarios';
import { usarSoloMira } from './SesionCliente';
import { bancoVacio, type Banco } from '@/lib/banco';
import { MODALIDAD, esContratado, type Trabajador } from '@/lib/equipo';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function FichaTrabajador({
  ficha, puesto = '', nombreSugerido = '', verSueldos, onListo, onCancelar
}: {
  /** La ficha a editar, o `undefined` para crear una nueva. */
  ficha?: Trabajador;
  /** Con qué nombre nace, para la ficha que le falta a alguien ya asignado. */
  nombreSugerido?: string;
  /** El puesto desde el que se está creando: es su puesto habitual. */
  puesto?: string;
  verSueldos: boolean;
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
  // Con vista gerencia y el rol sin `sueldos`: se ven, no se cambian.
  const soloSueldos = usarSoloMira('sueldos');
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
      <p className="mt-3 text-sm text-hueso/60 empty:hidden">
        {creando ? (
          <>Queda en la lista del equipo{puesto && <>, y asignado a{' '}
            <strong>{puesto}</strong> en este día</>}.</>
        ) : null}
      </p>

      {/* En la rejilla de los campos (2026-11-21, regla *los formularios van
          alineados*): las tres secciones —quién es, cómo se le paga, dónde se
          le transfiere— usan las mismas columnas, así que sus campos calzan. */}
      <div className="caja-campos mt-4"><div className="rejilla-campos">
        <Campo etiqueta="Nombre" ancho="campo-2">
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
        <Campo etiqueta="Teléfono">
          <CampoTelefono valor={telefono} className={ENTRADA}
            etiqueta={`Teléfono de ${nombre || 'esta persona'}`}
            onCambio={setTelefono} />
        </Campo>
        <Campo etiqueta="Puesto habitual">
          <input type="text" value={habitual} className={ENTRADA}
            placeholder="garzón, parrillero…"
            aria-label={`Puesto habitual de ${nombre || 'esta persona'}`}
            onChange={(e) => setHabitual(e.target.value)} />
        </Campo>
        {!creando && (
          <label className="campo-todo flex min-h-[30px] items-center gap-2">
            <input type="checkbox" checked={activo} className="h-4 w-4 accent-oro"
              aria-label={`${ficha!.nombre} sigue en el equipo`}
              onChange={(e) => setActivo(e.target.checked)} />
            <span className="text-[13px] text-hueso/70">
              Activo
            </span>
          </label>
        )}
      </div></div>

      {verSueldos && (
        <fieldset disabled={soloSueldos}
          className="m-0 mt-4 min-w-0 border-0 border-t border-hueso/10 p-0 pt-4">
          <p className="rotulo-ficha mb-2">
            Pago
          </p>
          {/* **Esto es lo de siempre, no lo de un día**, y conviene decirlo
              acá: el cliente vino a buscar a esta ficha los ajustes con su
              motivo —un atraso, un adelanto de la caja, un feriado— porque
              el campo decía "Hora extra" y parecía el lugar. Son dos cosas
              distintas: acá va cuánto vale una hora extra de esta persona;
              cuántas hizo un sábado, y cualquier suma o resta de ese día, se
              anota en su turno. */}
          {/* Que esto es lo de costumbre y lo de un día va en el día, en el
              `?` de Modalidad (2026-11-21, regla *lo que explica va en su ?*). */}
          <div className="caja-campos"><div className="rejilla-campos">
            <Campo etiqueta="Modalidad" ayuda="modalidad">
              <select value={modalidad} className={ENTRADA}
                aria-label={`Cómo se le paga a ${nombre || 'esta persona'}`}
                onChange={(e) => setModalidad(e.target.value)}>
                <option value={MODALIDAD.porTurno}>Por turno</option>
                <option value={MODALIDAD.contratado}>Contratado (tiene sueldo)</option>
              </select>
            </Campo>
            <Campo etiqueta="Jornada">
              {/* A un contratado no se le paga por jornada: un monto acá no
                  lo usaría ninguna cuenta y haría creer que sí. */}
              <input type="number" min={0} step={1000} className={ENTRADA}
                value={contratado ? '' : pagoJornada} disabled={contratado}
                placeholder={contratado ? 'sin jornada' : '—'}
                aria-label={`Jornada de ${nombre || 'esta persona'}`}
                onChange={(e) => setPagoJornada(e.target.value)} />
            </Campo>
            {/* El rótulo es corto a propósito: "Valor de la hora extra" se
                partía en dos líneas y empujaba el campo hacia abajo,
                desalineándolo de los de al lado. */}
            <Campo etiqueta="Hora extra">
              <input type="number" min={0} step={500} className={ENTRADA}
                value={valorHora} placeholder="—"
                aria-label={`Valor de la hora extra de ${nombre || 'esta persona'}`}
                onChange={(e) => setValorHora(e.target.value)} />
            </Campo>
            <div className="campo-2 flex min-h-[30px] items-center self-end">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={propina} className="h-4 w-4 accent-oro"
                aria-label={`${nombre || 'Esta persona'} entra en el reparto de propina`}
                onChange={(e) => setPropina(e.target.checked)} />
              <span className="text-[13px] text-hueso/70">
                Entra en la propina
              </span>
            </label>
            <AyudaCorta tema="propinaFicha" />
            </div>
          </div></div>
        </fieldset>
      )}

      {verSueldos && (
        <fieldset disabled={soloSueldos}
          className="m-0 mt-4 min-w-0 border-0 border-t border-hueso/10 p-0 pt-4">
          <p className="rotulo-ficha mb-2">
            Transferencia
          </p>
          <DatosBancarios banco={banco} nombre={nombre} onCambio={setBanco} />
        </fieldset>
      )}

      {!verSueldos && (
        <p className="mt-4 text-xs text-hueso/45">
          Los sueldos y los datos bancarios los manejan el administrador y
          quien hace los pagos.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-rojo-texto">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <span className="flex-1" />
        <button onClick={onCancelar}
          className="boton">
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando || !nombre.trim()}
          className="boton boton-relleno whitespace-nowrap min-h-[40px] disabled:opacity-40">
          {guardando ? 'Guardando…' : creando ? 'Crear y asignar' : 'Guardar ficha'}
        </button>
      </div>
    </Dialogo>
  );
}
