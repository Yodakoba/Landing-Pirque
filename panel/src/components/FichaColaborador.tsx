'use client';

/**
 * La ficha de un colaborador, abierta desde el día.
 *
 * **Crea y edita con la misma ventana**, porque es el mismo formulario: lo
 * único que cambia es si la persona ya existe. Nació el 2026-10-23 de un
 * reclamo concreto del cliente —*"aún no puedo agregar los datos personales
 * de las actividades extras"*—: los campos estaban, pero vivían solo en
 * `/extras`, abajo del calendario, y quien arma un sábado nunca pasa por
 * ahí. Un dato que hay que ir a buscar a otra pantalla es un dato que queda
 * en blanco.
 *
 * Por eso ahora se piden **al crear**, y se pueden completar **desde la
 * ventana del día**, en la misma pasada en que se agenda al jinete. La
 * ficha queda completa de entrada, que es lo que el cliente pidió: *"y así
 * todos los colaboradores están completos directo"*.
 *
 * **El nombre no se edita acá, a propósito.** Las actividades ya guardadas
 * apuntan a la persona por su nombre, así que renombrarla desde la ventana
 * de un día dejaría las de los otros días con un nombre que ya no existe.
 * Eso se hace en `/extras`, que es donde se ve el daño.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import DatosBancarios from './DatosBancarios';
import { usarSoloMira } from './SesionCliente';
import { bancoVacio, type Banco } from '@/lib/banco';
import type { Colaborador } from '@/lib/extras';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function FichaColaborador({
  ficha, nombreSugerido = '', verSueldos, onListo, onCancelar
}: {
  /** La ficha a editar, o `undefined` para crear una nueva. */
  ficha?: Colaborador;
  /** Con qué nombre nace, cuando se crea desde un nombre ya escrito. */
  nombreSugerido?: string;
  verSueldos: boolean;
  onListo: (c: Colaborador, aviso?: string) => void;
  onCancelar: () => void;
}) {
  const creando = !ficha;
  const [nombre, setNombre] = useState(ficha?.nombre ?? nombreSugerido);
  const [actividad, setActividad] = useState(ficha?.actividad ?? '');
  const [telefono, setTelefono] = useState(ficha?.telefono ?? '');
  const [activo, setActivo] = useState(ficha?.activo ?? true);
  const [monto, setMonto] = useState(String(ficha?.monto || ''));
  const [banco, setBanco] = useState<Banco>(ficha?.banco ?? bancoVacio());
  // Con vista gerencia y el rol sin `sueldos`: se ven, no se cambian.
  const soloSueldos = usarSoloMira('sueldos');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const r = await fetch('/api/extras/colaborador', {
        method: creando ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre, actividad, telefono, monto, banco,
                               ...(creando ? {} : { activo }) })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      onListo(d.colaborador, d.aviso);
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={creando ? 'Nuevo colaborador' : `Ficha de ${ficha!.nombre}`}
             onCerrar={onCancelar} ancho="max-w-3xl">
      <p className="mt-3 text-sm text-hueso/60 empty:hidden">
        {creando ? 'Queda en la lista de actividades extras, y asignado a este día.' : null}
      </p>

      {/* En la rejilla de los campos (2026-11-21, regla *los formularios van
          alineados*), como la ficha de un trabajador. */}
      <div className="caja-campos mt-4"><div className="rejilla-campos">
        <Campo etiqueta="Nombre" ancho="campo-2">
          {creando ? (
            <input type="text" value={nombre} autoFocus className={ENTRADA}
              placeholder="Nombre y apellido, o la empresa"
              aria-label="Nombre del colaborador"
              onChange={(e) => setNombre(e.target.value)} />
          ) : (
            // Ver la explicación de arriba: renombrar desde acá dejaría las
            // actividades de los otros días apuntando a un nombre que ya no
            // está. Se muestra, no se edita.
            <p className="rounded border border-hueso/10 bg-panel px-2 py-1 text-sm">
              {ficha!.nombre}
            </p>
          )}
        </Campo>
        <Campo etiqueta="Actividad">
          <input type="text" value={actividad} className={ENTRADA}
            placeholder="show ecuestre, pintacaritas…"
            aria-label={`Actividad de ${nombre || 'esta persona'}`}
            onChange={(e) => setActividad(e.target.value)} />
        </Campo>
        <Campo etiqueta="Teléfono">
          <CampoTelefono valor={telefono} className={ENTRADA}
            etiqueta={`Teléfono de ${nombre || 'esta persona'}`}
            onCambio={setTelefono} />
        </Campo>
        {verSueldos && (
          <Campo etiqueta="Monto habitual">
            <input type="number" min={0} step={1000} value={monto}
              className={ENTRADA} placeholder="—" disabled={soloSueldos}
              aria-label={`Monto habitual de ${nombre || 'esta persona'}`}
              onChange={(e) => setMonto(e.target.value)} />
          </Campo>
        )}
        {!creando && (
          <label className="campo-todo flex min-h-[30px] items-center gap-2">
            <input type="checkbox" checked={activo} className="h-4 w-4 accent-oro"
              aria-label={`${ficha!.nombre} se sigue contratando`}
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
            Transferencia
          </p>
          <DatosBancarios banco={banco} nombre={nombre} onCambio={setBanco} />
        </fieldset>
      )}

      {!verSueldos && (
        <p className="mt-4 text-xs text-hueso/45">
          El monto habitual y los datos bancarios los manejan el
          administrador y quien hace los pagos.
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
          {guardando ? 'Guardando…' : creando ? 'Crear y agregar' : 'Guardar ficha'}
        </button>
      </div>
    </Dialogo>
  );
}
