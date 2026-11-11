'use client';

/**
 * La otra cara de la ventana del día en `/turnos`: **las reservas**.
 *
 * Lo pidió el cliente (2026-11-03): la ventana del día tiene dos lados, uno
 * de trabajadores —quién trabaja y si vino— y otro de reservas —quién viene
 * a comer y si llegó—, y se pasa de uno al otro con un switch, como la
 * tarjeta del calendario de la portada. Son las dos listas que la jefa de
 * turno tiene que ir marcando el mismo día, y antes una vivía acá y la otra
 * en la página del día.
 *
 * **Es un resumen para marcar, no la página del día.** Trae lo que se mira
 * con el local andando —qué preparar, cómo viene el pago, quién llegó— y
 * los botones *Vino / No vino*, que guardan al instante igual que en la
 * página del día. Editar o borrar una reserva sigue allá, con su enlace:
 * repetir el formulario acá sería tener dos lugares donde se edita lo mismo.
 *
 * Pide las reservas cada vez que se muestra. Es un viaje más al girar, y a
 * cambio lo que se ve está al día — que es lo que importa en una lista que
 * otra persona puede estar marcando en el mesón al mismo tiempo.
 */
import { useEffect, useMemo, useState } from 'react';
import { yaLlego } from '@/lib/cierres';
import { hoy } from '@/lib/fechas';
import type { Reserva } from '@/lib/tipos';
import { ASISTENCIA, TIPO_PAGO, esManual } from '@/lib/columnas';
import { pagoEnEspanol, liberaCupo } from '@/lib/pagos';
import { ocupaLugar, faltaCobrar } from '@/lib/ocupacion';
import { menusDe } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, type Menu } from '@/lib/menus';
import Asistencia from './Asistencia';

/**
 * Un azulejo: el número grande arriba y qué es debajo. La misma forma que
 * los del resumen de la página del día, para que se lean igual. Va al nivel
 * del módulo, nunca dentro del componente: ver `Campo.tsx`.
 */
function Azulejo({ n, titulo, nota, color, borde }: {
  n: number; titulo: string; nota?: string; color?: string; borde?: string;
}) {
  return (
    <div className={`rounded border ${borde ?? 'border-hueso/15'} bg-panel px-3 py-2`}>
      <div className={`text-3xl font-bold leading-none tabular-nums ${color ?? 'text-oro'}`}>
        {n}
      </div>
      <div className="mt-1.5 text-sm font-medium leading-tight">{titulo}</div>
      {nota && <div className="mt-0.5 text-[13px] text-hueso/60">{nota}</div>}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-[13px] font-semibold uppercase tracking-widest
                  text-hueso/60">{children}</p>
  );
}

const gente = (rs: Reserva[]) => rs.reduce((n, r) => n + (Number(r.personas) || 0), 0);
const reservas = (n: number) => `${n} reserva${n === 1 ? '' : 's'}`;

export default function ReservasDelDia({
  fecha, onCuantas, modo = 'libre', pendientes = {}, onPendiente
}: {
  fecha: string;
  /** Avisa cuántas reservas hay, para que el switch lo pueda decir. */
  onCuantas?: (n: number) => void;
  /**
   * Cómo se puede marcar (2026-11-03):
   *
   * - `libre`: *Vino / No vino* guarda al apretarlo, como siempre.
   * - `bloqueado`: **el día está cerrado** y nada se puede tocar.
   * - `corrigiendo`: se marca, pero **no se guarda acá**: queda en
   *   `pendientes` y lo manda la ventana del día junto con el resto de la
   *   corrección y su motivo. Si se guardara al apretar, el día cerrado
   *   cambiaría por partes y sin motivo, que es lo que la corrección evita.
   */
  modo?: 'libre' | 'bloqueado' | 'corrigiendo';
  /** La asistencia cambiada durante una corrección, por fila. */
  pendientes?: Record<number, string>;
  onPendiente?: (fila: number, asistencia: string) => void;
}) {
  const [todas, setTodas] = useState<Reserva[] | null>(null);
  const [catalogo, setCatalogo] = useState<Menu[]>(POR_DEFECTO_MENUS);
  const [error, setError] = useState('');

  const cargar = () =>
    fetch('/api/reservas').then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setTodas(d.reservas ?? []);
        if (d.menus) setCatalogo(d.menus);
      })
      .catch((e) => setError(String(e)));

  useEffect(() => { cargar(); }, []);

  // Lo cambiado durante una corrección se ve como si ya estuviera: los
  // azulejos de arriba tienen que contar lo que se va a guardar.
  const delDia = useMemo(
    () => (todas ?? []).filter((r) => r.fecha === fecha)
      .map((r) => (r.fila in pendientes ? { ...r, asistencia: pendientes[r.fila] } : r)),
    [todas, fecha, pendientes]
  );
  const cuentan = useMemo(() => delDia.filter(ocupaLugar), [delDia]);
  const menus = useMemo(() => menusDe(cuentan, catalogo), [cuentan, catalogo]);

  useEffect(() => { if (todas) onCuantas?.(cuentan.length); }, [todas, cuentan.length]);

  /** Igual que en la página del día: guarda al instante, sin confirmar. */
  async function marcar(r: Reserva, asistencia: string) {
    if (modo === 'bloqueado') return;
    if (modo === 'corrigiendo') { onPendiente?.(r.fila, asistencia); return; }
    // Se pinta antes de que vuelva el servidor: es un botón que se aprieta
    // con gente esperando en el mesón, y un segundo sin respuesta se lee
    // como que no funcionó. Si falla, la recarga deja lo que de verdad hay.
    setTodas((xs) => (xs ?? []).map((x) => (x.fila === r.fila ? { ...x, asistencia } : x)));
    try {
      const res = await fetch(`/api/reservas/${r.fila}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asistencia })
      });
      const d = await res.json();
      if (d.error) { setError(d.error); cargar(); }
    } catch (e) { setError(String(e)); cargar(); }
  }

  async function resolverAviso(r: Reserva) {
    setTodas((xs) => (xs ?? []).map((x) => (x.fila === r.fila ? { ...x, avisoRecepcion: '' } : x)));
    try {
      const res = await fetch(`/api/reservas/${r.fila}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avisoRecepcion: '' })
      });
      const d = await res.json();
      if (d.error) { setError(d.error); cargar(); }
    } catch (e) { setError(String(e)); cargar(); }
  }

  if (!todas && !error) return <p className="mt-5 text-sm text-hueso/60">Cargando reservas…</p>;

  const porCobrar = cuentan.filter(faltaCobrar);
  const pagadas = cuentan.filter((r) => !faltaCobrar(r));
  const liberadas = delDia.filter((r) => !ocupaLugar(r));
  const vinieron = cuentan.filter((r) => r.asistencia === ASISTENCIA.vino);
  const noVinieron = cuentan.filter((r) => r.asistencia === ASISTENCIA.noVino);
  const sinMarcar = cuentan.filter((r) => !r.asistencia);

  return (
    <div>
      {error && <p className="mt-4 text-sm text-rojo-texto">{error}</p>}

      <p className="mt-3 text-[15px] text-hueso/70">
        {cuentan.length === 0
          ? <>No hay reservas este día.</>
          : <><strong className="text-hueso">{gente(cuentan)}</strong> personas
              {' '}en {reservas(cuentan.length)}.</>}
      </p>

      {cuentan.length > 0 && (
        <>
          {/* **Quién llegó, lo primero.** Es la pregunta por la que se da
              vuelta la ventana con el local andando; lo demás es contexto. */}
          <Rotulo>Quién vino</Rotulo>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Azulejo n={gente(vinieron)} titulo="vinieron" nota={reservas(vinieron.length)}
              color="text-verde-texto" borde="border-verde/40" />
            {noVinieron.length > 0 && (
              <Azulejo n={gente(noVinieron)} titulo="no llegaron"
                nota={reservas(noVinieron.length)}
                color="text-rojo-texto" borde="border-rojo/40" />
            )}
            <Azulejo n={gente(sinMarcar)} titulo="sin marcar" nota={reservas(sinMarcar.length)}
              color={sinMarcar.length > 0 ? 'text-ambar-texto' : 'text-hueso/60'}
              borde={sinMarcar.length > 0 ? 'border-ambar/40' : undefined} />
          </div>

          <Rotulo>Qué preparar</Rotulo>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {menus.map((m) => <Azulejo key={m.menu} n={m.cantidad} titulo={m.menu} />)}
          </div>

          <Rotulo>Cómo viene el pago</Rotulo>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Azulejo n={gente(pagadas)} titulo="ya pagaron" nota={reservas(pagadas.length)}
              color="text-verde-texto" borde="border-verde/40" />
            <Azulejo n={gente(porCobrar)} titulo="por cobrar" nota={reservas(porCobrar.length)}
              color="text-ambar-texto" borde="border-ambar/40" />
          </div>
        </>
      )}

      {delDia.length > 0 && (
        <>
          <Rotulo>Las reservas</Rotulo>
          {/* **Una tarjeta por reserva, con líneas fijas**: quién es, qué
              pidió y cómo viene el pago, y abajo *Vino / No vino* en su
              propia línea. Es la lección de la ventana del equipo: si los
              botones compartieran fila con el nombre, el largo del nombre
              decidiría dónde quedan. */}
          <fieldset disabled={modo === 'bloqueado'} className="m-0 min-w-0 border-0 p-0">
          <ul className="mt-2 space-y-2">
            {delDia.map((r) => {
              const enElLocal = String(r.tipoPago).includes(TIPO_PAGO.local);
              const libero = !ocupaLugar(r);
              return (
                <li key={r.fila}
                  className={`rounded border border-hueso/15 bg-panel p-3 ${
                    libero ? 'opacity-50' : ''}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`font-semibold ${libero ? 'line-through' : ''}`}>
                      {r.nombre || <span className="text-hueso/55">sin nombre</span>}
                    </span>
                    <span className="text-sm tabular-nums text-hueso/70">
                      {r.personas} {Number(r.personas) === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>
                  {/* El menú tal como está anotado: un pedido con dos menús
                      dice "3 × Tradiciones + 2 × Niños", que ya se lee solo. */}
                  {r.menu && <div className="mt-0.5 text-sm text-hueso/70">{r.menu}</div>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
                    {r.tipoPago ? (
                      <span className={`whitespace-nowrap rounded-full border px-2 py-0.5
                                        font-semibold ${enElLocal
                        ? 'border-ambar/50 bg-ambar/15 text-ambar-texto'
                        : 'border-verde/50 bg-verde/15 text-verde-texto'}`}>
                        {r.tipoPago}
                      </span>
                    ) : (
                      <span className="text-hueso/55">
                        {esManual(r.id) ? 'anotada a mano' : '—'}
                      </span>
                    )}
                    <span className={`font-semibold ${
                      liberaCupo(r.estadoPago) ? 'text-rojo-texto'
                      : faltaCobrar(r) ? 'text-ambar-texto' : 'text-verde-texto'}`}>
                      {pagoEnEspanol(r.estadoPago) || '—'}
                    </span>
                    {r.telefono && <span className="text-hueso/60">{r.telefono}</span>}
                  </div>
                  {/* Lo que anotó la anfitriona (2026-11-11): cuántos llegaron
                      si fue distinto, y su aviso hasta que alguien lo resuelve. */}
                  {r.llegaron != null && r.llegaron !== r.personas && (
                    <p className="mt-1.5 text-[14px] font-semibold text-ambar-texto">
                      Llegaron {r.llegaron} de {r.personas}
                    </p>
                  )}
                  {r.avisoRecepcion && (
                    <div className="mt-2 rounded-lg border-2 border-ambar/60 bg-ambar/10 p-2 text-[14px]">
                      <p className="font-semibold text-ambar-texto">📣 Recepción: {r.avisoRecepcion}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <a href={`/dia/${fecha}`} className="tecla boton">Editar en la página del día</a>
                        {modo === 'libre' && (
                          <button type="button" className="boton !border-verde-fuerte text-verde-texto"
                            onClick={() => void resolverAviso(r)}>✓ Resuelto</button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Una reserva que liberó su lugar no viene: no hay nada
                      que marcar, y ofrecer los botones invitaría a hacerlo. */}
                  {!libero && (
                    <div className="mt-2">
                      <Asistencia valor={r.asistencia || ''}
                        quien={r.nombre || 'esta reserva'}
                        onCambio={(v) => void marcar(r, v)}
                        esperar={!yaLlego(fecha, hoy())} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          </fieldset>
        </>
      )}

      <p className="mt-4 text-[13px] text-hueso/60">
        {modo === 'libre' && <><em>Vino / No vino</em> se guarda al apretarlo. </>}
        {modo === 'corrigiendo' && <><em>Vino / No vino</em> se guarda junto con la
          corrección. </>}
        Para editar o borrar una reserva, o anotar una nueva, abre{' '}
        <a href={`/dia/${fecha}`} className="text-oro hover:underline">la página del día</a>.
      </p>
    </div>
  );
}
