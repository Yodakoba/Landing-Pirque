'use client';

/**
 * **Dejar la base en cero para el paso a producción** (2026-11-18), en
 * Configuración → Mantención. Solo el administrador (`mantencion`).
 *
 * Se aprieta una vez en la vida del panel, así que va escondido detrás de
 * un botón y pregunta en serio: muestra qué se borra con cuántas filas y qué
 * se conserva, avisa si Shopify sigue en la tienda de desarrollo, y no deja
 * seguir sin la copia de la planilla y la palabra. Las dos condiciones las
 * vuelve a comprobar `/api/mantencion/produccion`.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { usarPuede } from './SesionCliente';

interface Pestana { hoja: string; que: string; filas: number | null }
interface Estado {
  seVacian: Pestana[]; seConservan: Pestana[];
  eventos: number; calendario: boolean;
  tienda: { dominio: string; desarrollo: boolean };
  palabra: string; planilla: string;
  regla: { dias: string; hasta: number; cupo: number };
}

function cuantas(n: number | null): string {
  if (n === null) return 'no existe';
  if (n === 0) return 'vacía';
  return `${n.toLocaleString('es-CL')} ${n === 1 ? 'fila' : 'filas'}`;
}

export default function PasoAProduccion() {
  const puede = usarPuede('mantencion');
  const [abierta, setAbierta] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState('');
  const [copia, setCopia] = useState(false);
  const [palabra, setPalabra] = useState('');
  const [borrando, setBorrando] = useState(false);
  const [listo, setListo] = useState('');
  const [abiertos, setAbiertos] = useState('');

  if (!puede) return null;

  async function abrir() {
    setAbierta(true); setEstado(null); setError(''); setCopia(false); setPalabra(''); setListo('');
    try {
      const r = await fetch('/api/mantencion/produccion');
      const d = await r.json();
      if (!r.ok || d.error) setError(d.error || 'No se pudo leer la planilla.');
      else setEstado(d);
    } catch (e) { setError(String(e)); }
  }

  async function borrar() {
    setBorrando(true); setError('');
    try {
      const r = await fetch('/api/mantencion/produccion', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ copia, palabra })
      });
      const d = await r.json();
      if (!r.ok || d.error) { setError(d.error || 'No se pudo borrar.'); return; }
      setListo(`Se borraron ${Number(d.filas).toLocaleString('es-CL')} filas de ${d.vaciadas.length} pestañas`
        + (d.eventos ? ` y ${d.eventos} eventos de Google Calendar` : '') + '.'
        + (d.eventosFallidos ? ` ${d.eventosFallidos} eventos no se pudieron borrar: quítalos a mano en el calendario.` : ''));
      setAbiertos(d.sinAbrir
        ? 'Los días de la regla no se alcanzaron a abrir: los abre la tarea de mañana temprano, o ábrelos desde la portada.'
        : `Se abrieron solos ${d.abiertos} ${d.abiertos === 1 ? 'día' : 'días'} de la regla: el sitio ya ofrece fechas.`);
    } catch (e) { setError(String(e)); }
    finally { setBorrando(false); }
  }

  const total = estado ? estado.seVacian.reduce((a, p) => a + (p.filas ?? 0), 0) : 0;
  const palabraOk = !!estado && palabra.trim().toUpperCase() === estado.palabra;

  return (
    <div className="mt-6 border-t border-hueso/10 pt-4">
      <p className="text-[16px] font-bold">🧹 Dejar la base en cero para producción</p>
      <p className="mt-1 max-w-2xl text-[14px] text-hueso/75">
        Borra lo que fueron pruebas —reservas, cotizaciones, clientes, pagos, turnos— y conserva
        el equipo, las cuentas, los productos y la configuración. Se hace una sola vez, antes de
        empezar a usar el panel de verdad.
      </p>
      <button type="button" onClick={() => void abrir()}
        className="boton mt-3 min-h-[44px] border-rojo-fuerte/70 text-rojo-texto">
        🧹 Ver qué se borra…
      </button>

      {abierta && (
        <Dialogo titulo="Dejar la base en cero" ancho="max-w-2xl lg:max-w-6xl" onCerrar={() => setAbierta(false)}>
          {!estado && !error && <p className="mt-3 text-[15px] text-hueso/70">Contando lo que hay en la planilla…</p>}

          {listo ? (
            <div className="mt-3 rounded-xl border-2 border-verde-fuerte bg-verde/10 p-3" role="status">
              <p className="text-[16px] font-bold text-verde-texto">✓ La base quedó en cero</p>
              <p className="mt-1 text-[15px]">{listo}</p>
              <p className="mt-1 text-[14px] text-hueso/75">
                La bitácora empieza con esta línea, a tu nombre. El equipo, las cuentas, los
                productos y la configuración siguen como estaban.
              </p>
              {abiertos && <p className="mt-2 text-[15px] font-semibold">{abiertos}</p>}
              <div className="mt-3 flex justify-end">
                <button type="button" className="boton min-h-[48px]" onClick={() => setAbierta(false)}>Cerrar</button>
              </div>
            </div>
          ) : estado && (
            // **En el computador, dos columnas** (2026-11-21, regla *una tarjeta
            // abierta cabe en una pantalla*): a la izquierda qué se borra y qué
            // se conserva; a la derecha el aviso de Shopify y los dos pasos.
            // Apilado medía 993px y el botón de borrar quedaba fuera de la
            // pantalla. Las advertencias son las mismas, con las mismas palabras.
            <div className="lg:grid lg:grid-flow-row-dense lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-x-5">
              {(estado.tienda.desarrollo) && (
                <div className="mt-3 rounded-xl border-2 border-ambar-fuerte bg-ambar/10 p-3 lg:col-start-2">
                  <p className="text-[15px] font-bold text-ambar-texto">
                    ⚠ {estado.tienda.dominio
                      ? <>Shopify sigue en la tienda de desarrollo ({estado.tienda.dominio})</>
                      : <>Shopify no está conectado</>}
                  </p>
                  <p className="mt-1 text-[14px]">
                    La revisión diaria con Shopify vuelve a traer los pedidos de los últimos 10 días
                    de la tienda a la que está conectado. Cambia primero la tienda en Vercel
                    (<code>SHOPIFY_DOMINIO</code> y las credenciales de la app) y después borra.
                  </p>
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:col-start-1 lg:row-span-4 lg:row-start-1">
                <div className="rounded-xl border-2 border-rojo-fuerte/60 p-3">
                  <p className="text-[15px] font-bold text-rojo-texto">✕ Se borra</p>
                  <ul className="mt-2 space-y-1 text-[14px]">
                    {estado.seVacian.map((p) => (
                      <li key={p.hoja} className="flex justify-between gap-3">
                        <span>{p.que}</span>
                        <span className={`shrink-0 tabular-nums ${p.filas ? 'font-semibold' : 'text-hueso/55'}`}>{cuantas(p.filas)}</span>
                      </li>
                    ))}
                    {estado.calendario && (
                      <li className="flex justify-between gap-3">
                        <span>Eventos en Google Calendar</span>
                        <span className={`shrink-0 tabular-nums ${estado.eventos ? 'font-semibold' : 'text-hueso/55'}`}>
                          {estado.eventos || 'ninguno'}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
                <div className="rounded-xl border-2 border-dashed border-verde-fuerte/70 p-3">
                  <p className="text-[15px] font-bold text-verde-texto">✓ Se conserva</p>
                  <ul className="mt-2 space-y-1 text-[14px]">
                    {estado.seConservan.map((p) => (
                      <li key={p.hoja} className="flex justify-between gap-3">
                        <span>{p.que}</span>
                        <span className="shrink-0 tabular-nums text-hueso/70">{cuantas(p.filas)}</span>
                      </li>
                    ))}
                    <li className="text-hueso/70">Los comentarios, que viven en otra planilla</li>
                  </ul>
                </div>
              </div>
              <p className="mt-2 text-[14px] text-hueso/70 lg:col-start-2 lg:mt-3">
                Las pestañas quedan con su encabezado: la planilla sigue sirviendo.{' '}
                <strong className="text-hueso">Los días de la regla se vuelven a abrir solos</strong>
                {' '}({estado.regla.dias} de los próximos {estado.regla.hasta} días, públicos y con cupo{' '}
                {estado.regla.cupo}): el sitio no se queda sin fechas. Un feriado u otro día se abre a mano
                desde la portada.
              </p>

              <div className="mt-4 rounded-xl border-2 border-oro/50 p-3 lg:col-start-2 lg:mt-3">
                <p className="text-[15px] font-bold">1. Haz una copia de la planilla</p>
                <p className="mt-1 text-[14px] text-hueso/75">
                  En la planilla: <strong>Archivo → Hacer una copia</strong>. Si algo sale mal, de ahí
                  se recupera todo.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={estado.planilla} target="_blank" rel="noreferrer" className="boton min-h-[44px]">
                    Abrir la planilla ↗
                  </a>
                  <button type="button" aria-pressed={copia} onClick={() => setCopia(!copia)}
                    className={`boton min-h-[44px] ${copia ? 'border-verde-fuerte bg-verde/15 font-semibold text-verde-texto' : ''}`}>
                    {copia ? '✓ Ya hice la copia' : 'Ya hice la copia'}
                  </button>
                </div>
              </div>

              <label className="mt-3 block rounded-xl border-2 border-oro/50 p-3 lg:col-start-2 lg:flex lg:items-center lg:gap-3">
                <span className="shrink-0 text-[15px] font-bold">2. Escribe {estado.palabra}</span>
                <input value={palabra} onChange={(e) => setPalabra(e.target.value)} autoComplete="off"
                  aria-label={`Escribe ${estado.palabra}`}
                  className="mt-2 block w-full max-w-xs min-h-[44px] rounded border border-hueso/20 bg-tinta px-3 py-2
                             text-[16px] uppercase tracking-wide focus:border-oro focus:outline-none lg:mt-0" />
              </label>
            </div>
          )}

          {error && <p role="alert" className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}

          {!listo && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="boton min-h-[48px]" onClick={() => setAbierta(false)}>Volver</button>
              {estado && (
                <button type="button" disabled={borrando || !copia || !palabraOk}
                  onClick={() => void borrar()}
                  className="boton boton-hito border-rojo-fuerte bg-rojo-fuerte text-white
                             disabled:border-hueso/20 disabled:bg-hueso/15 disabled:text-hueso/60">
                  {borrando ? 'Borrando…' : `🧹 Borrar ${total.toLocaleString('es-CL')} ${total === 1 ? 'fila' : 'filas'}`}
                </button>
              )}
            </div>
          )}
        </Dialogo>
      )}
    </div>
  );
}
