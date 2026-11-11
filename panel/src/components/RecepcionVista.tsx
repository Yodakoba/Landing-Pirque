'use client';

/**
 * **Recepción** (2026-11-11, lo pidió el cliente): la pantalla de la
 * anfitriona, *"con un tablet en la mano y simplemente recibiendo la
 * gente"*. Solo hoy, solo lo justo para recibir, y todo grande.
 *
 * - **Llegó / No vino**, dos botones gigantes por reserva.
 * - Al apretar *Llegó* pregunta **¿Llegaron las N?**: *Sí* de un toque, o un
 *   contador − / + si llegaron más o menos. Lo distinto **no cambia la
 *   reserva**: queda en `Llegaron` y le avisa solo al jefe de turno, que es
 *   quien decide si la ajusta (y así cuadra con Fudo, donde se cobra la mesa).
 * - **Avisar al jefe de turno**, con un texto corto, para todo lo demás.
 * - Lo que no puede tocar —personas, menús, pago— no tiene botón: la tarjeta
 *   dice *"Para cambiar la reserva, avisa al jefe de turno"*.
 * - **Antes de la hora de apertura está bloqueada** (`yaAbrio()`), y un día
 *   cerrado también: lo dice arriba y los botones no están.
 *
 * Se vuelve a pedir cada minuto, por si el jefe de turno resolvió un aviso o
 * alguien marcó desde otro lado.
 */
import { useEffect, useMemo, useState } from 'react';
import { avisar } from './AvisoFlotante';
import { enPalabras } from '@/lib/fechas';
import { ASISTENCIA } from '@/lib/columnas';

interface R {
  fila: number; nombre: string; personas: number; menu: string;
  asistencia: string; llegaron: number | null; avisoRecepcion: string;
}
interface Datos {
  fecha: string; apertura: string; abierta: boolean; cerrado: boolean; reservas: R[];
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hora = () => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false
}).format(new Date());

export default function RecepcionVista() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [busca, setBusca] = useState('');
  /** La reserva a la que se le está preguntando "¿llegaron las N?". */
  const [contando, setContando] = useState<{ fila: number; n: number } | null>(null);
  /** La reserva a la que se le está escribiendo un aviso. */
  const [avisando, setAvisando] = useState<{ fila: number; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(0);
  /**
   * **La recibida que se volvió a abrir.** En el celular —la pantalla
   * número uno, lo pidió el cliente— una reserva ya marcada se achica a una
   * línea, para no tener que bajar por todas las que ya entraron. *Cambiar*
   * la vuelve a abrir.
   */
  const [abierta, setAbierta] = useState(0);

  const cargar = () => fetch('/api/recepcion').then((r) => r.json()).then((x) => {
    if (x.error) return setError(x.error);
    setError(''); setD(x);
  }).catch((e) => setError(String(e)));
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, []);

  async function guardar(r: R, cambios: Partial<R>, aviso: string) {
    setGuardando(r.fila);
    // Se pinta antes de que vuelva el servidor: hay gente esperando.
    setD((x) => x && { ...x, reservas: x.reservas.map((y) => (y.fila === r.fila ? { ...y, ...cambios } : y)) });
    try {
      const res = await fetch(`/api/reservas/${r.fila}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cambios)
      });
      const j = await res.json().catch(() => ({}));
      if (j.error) { avisar(j.error, 'atencion'); cargar(); return; }
      avisar(aviso);
    } catch (e) { avisar(String(e), 'atencion'); cargar(); }
    finally { setGuardando(0); }
  }

  const llego = (r: R, n: number) => { setAbierta(0); return guardar(r, {
    asistencia: ASISTENCIA.vino, llegaron: n,
    // **Lo distinto avisa solo**: el jefe de turno lo ve y decide.
    ...(n !== r.personas ? { avisoRecepcion: `${hora()} · Llegaron ${n} de ${r.personas}` } : {})
  }, n === r.personas ? `✓ ${r.nombre}: llegaron los ${n}` : `${r.nombre}: llegaron ${n} de ${r.personas} · avisado al jefe de turno`); };

  const lista = useMemo(() => {
    const todas = d?.reservas ?? [];
    const q = sinTildes(busca.trim());
    const filtradas = q ? todas.filter((r) => sinTildes(r.nombre).includes(q)) : todas;
    // Las que faltan arriba, por nombre; las ya recibidas bajan.
    const orden = (r: R) => (!r.asistencia ? 0 : r.asistencia === ASISTENCIA.vino ? 1 : 2);
    return [...filtradas].sort((a, b) => orden(a) - orden(b) || a.nombre.localeCompare(b.nombre, 'es'));
  }, [d, busca]);

  if (error && !d) return <p className="mt-6 text-[16px] text-rojo-texto">{error}</p>;
  if (!d) return <p className="mt-6 text-[16px] text-hueso/70">Cargando la recepción…</p>;

  const cuentan = d.reservas;
  const esperadas = cuentan.reduce((n, r) => n + (r.personas || 0), 0);
  const llegaron = cuentan.filter((r) => r.asistencia === ASISTENCIA.vino)
    .reduce((n, r) => n + (r.llegaron ?? r.personas ?? 0), 0);
  const porLlegar = cuentan.filter((r) => !r.asistencia).length;
  const noVinieron = cuentan.filter((r) => r.asistencia === ASISTENCIA.noVino).length;
  const bloqueada = !d.abierta || d.cerrado;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[20px] font-bold uppercase tracking-wide sm:text-[22px]">Recepción</h1>
      <p className="mt-0.5 text-[16px] text-hueso/80 sm:text-[18px]">
        <span className="inline-block first-letter:uppercase">{enPalabras(d.fecha)}</span>
        {d.apertura && <> · abre a las {d.apertura}</>}
      </p>

      {bloqueada && (
        <p className="mt-4 rounded-xl border-2 border-ambar/60 bg-ambar/10 p-4 text-[17px] font-semibold text-ambar-texto">
          {d.cerrado
            ? 'El día ya se cerró. Si algo quedó mal, avísale al jefe de turno.'
            : `La recepción se abre a las ${d.apertura}. Mientras tanto puedes mirar las reservas.`}
        </p>
      )}

      {/* **Los números y el buscador quedan fijos arriba** al bajar por la
          lista: en el celular, quien recibe busca un nombre tras otro y no
          puede volver a subir cada vez. Llevan su propio fondo para que la
          lista no se vea por debajo. */}
      <div className="sticky top-0 z-10 -mx-5 mt-2 bg-tinta px-5 pb-3 pt-3 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {([
          [`${llegaron}/${esperadas}`, 'personas llegaron', 'text-verde-texto'],
          [String(porLlegar), porLlegar === 1 ? 'reserva por llegar' : 'reservas por llegar', 'text-oro'],
          [String(noVinieron), noVinieron === 1 ? 'no vino' : 'no vinieron', 'text-rojo-texto']
        ] as const).map(([n, que, color]) => (
          <div key={que} className="rounded-xl border border-hueso/15 bg-panel px-2 py-2.5 text-center">
            <p className={`text-[26px] font-extrabold leading-none tabular-nums sm:text-[30px] ${color}`}>{n}</p>
            <p className="mt-1 text-[13px] leading-tight text-hueso/75 sm:text-[14px]">{que}</p>
          </div>
        ))}
      </div>

      <input value={busca} onChange={(e) => setBusca(e.target.value)} type="search"
        placeholder="Buscar por nombre…" aria-label="Buscar reserva por nombre"
        className="mt-3 w-full rounded-xl border-2 border-hueso/20 bg-panel px-4 py-3 text-[18px]
                   outline-none focus:border-oro" />
      </div>

      {/* Una sola vez y no en cada tarjeta: repetida era ruido. */}
      {!bloqueada && (
        <p className="mt-1 text-[14px] text-hueso/65">
          Para cambiar personas, menús o el pago, usa <strong>📣 Avisar al jefe de turno</strong>.
        </p>
      )}

      {cuentan.length === 0 && (
        <p className="mt-6 text-[17px] text-hueso/70">Hoy no hay reservas.</p>
      )}
      {cuentan.length > 0 && lista.length === 0 && (
        <p className="mt-6 text-[17px] text-hueso/70">Nadie calza con “{busca}”.</p>
      )}

      <ul className="mt-3 grid grid-cols-1 items-start gap-3 md:grid-cols-2">
        {lista.map((r) => {
          const vino = r.asistencia === ASISTENCIA.vino;
          const noVino = r.asistencia === ASISTENCIA.noVino;
          const n = r.llegaron ?? r.personas;
          // Ya recibida y sin tocar: una línea. Abierta a mano, contando o
          // avisando, la tarjeta entera.
          if ((vino || noVino) && abierta !== r.fila && contando?.fila !== r.fila && avisando?.fila !== r.fila) {
            return (
              <li key={r.fila} className={`flex min-w-0 items-center gap-3 rounded-xl border-2 px-3 py-2 ${vino
                ? 'border-verde/40 bg-verde/[0.06]' : 'border-rojo/35 bg-rojo/[0.05]'}`}>
                <span aria-hidden className={`text-[22px] font-bold ${vino ? 'text-verde-texto' : 'text-rojo-texto'}`}>
                  {vino ? '✓' : '✕'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold">{r.nombre || 'Sin nombre'}</span>
                  <span className={`block text-[14px] ${vino && n !== r.personas ? 'font-semibold text-ambar-texto'
                    : 'text-hueso/70'}`}>
                    {vino ? `Llegaron ${n}${n !== r.personas ? ` de ${r.personas}` : ''}` : 'No vino'}
                    {r.avisoRecepcion && ' · 📣 avisado'}
                  </span>
                </span>
                {!bloqueada && (
                  <button type="button" className="boton min-h-[44px] shrink-0"
                    onClick={() => setAbierta(r.fila)}>Cambiar</button>
                )}
              </li>
            );
          }
          return (
            <li key={r.fila} className={`min-w-0 rounded-2xl border-2 p-3.5 sm:p-4 ${vino
              ? 'border-verde/50 bg-verde/[0.06]' : noVino ? 'border-rojo/40 bg-rojo/[0.05] opacity-80'
              : 'border-hueso/20 bg-panel'}`}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <p className="text-[21px] font-bold">{r.nombre || 'Sin nombre'}</p>
                <p className="text-[17px] text-hueso/80">
                  <strong className="tabular-nums">{r.personas}</strong> {r.personas === 1 ? 'persona' : 'personas'}
                </p>
              </div>
              {r.menu && <p className="mt-0.5 text-[15px] text-hueso/70">{r.menu}</p>}

              {vino && (
                <p className="mt-2 text-[17px] font-semibold text-verde-texto">
                  ✓ Llegaron {n}{n !== r.personas && <span className="text-ambar-texto"> de {r.personas}</span>}
                </p>
              )}
              {noVino && <p className="mt-2 text-[17px] font-semibold text-rojo-texto">✕ No vino</p>}
              {r.avisoRecepcion && (
                <p className="mt-2 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-2 text-[15px] text-ambar-texto">
                  📣 Avisado al jefe de turno: {r.avisoRecepcion}
                </p>
              )}

              {/* ¿Llegaron las N? */}
              {contando?.fila === r.fila ? (
                <div className="mt-3 rounded-xl border-2 border-verde/50 p-3">
                  <p className="text-[18px] font-semibold">¿Llegaron las {r.personas}?</p>
                  <button type="button" disabled={!!guardando}
                    onClick={() => { setContando(null); void llego(r, r.personas); }}
                    className="tecla mt-2 min-h-[60px] w-full rounded-xl border-2 border-verde-fuerte bg-verde-fuerte
                               text-[19px] font-bold text-tinta">
                    ✓ Sí, las {r.personas}
                  </button>
                  <p className="mt-3 text-[15px] text-hueso/75">Llegaron más o menos:</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <button type="button" aria-label="Una menos" className="boton h-14 w-14 !text-[28px] !font-bold"
                      onClick={() => setContando({ fila: r.fila, n: Math.max(0, contando.n - 1) })}>−</button>
                    <span className="w-16 text-center text-[28px] font-bold tabular-nums">{contando.n}</span>
                    <button type="button" aria-label="Una más" className="boton h-14 w-14 !text-[28px] !font-bold"
                      onClick={() => setContando({ fila: r.fila, n: contando.n + 1 })}>+</button>
                    <button type="button" disabled={!!guardando || contando.n === r.personas}
                      onClick={() => { const k = contando.n; setContando(null); void llego(r, k); }}
                      className="boton boton-relleno boton-hito w-full disabled:opacity-40 sm:w-auto sm:flex-1">
                      Llegaron {contando.n}
                    </button>
                  </div>
                  <p className="mt-2 text-[14px] text-hueso/65">
                    Si es otro número, la reserva no cambia: se le avisa al jefe de turno.
                  </p>
                  <button type="button" className="boton mt-2 min-h-[44px]" onClick={() => setContando(null)}>Volver</button>
                </div>
              ) : avisando?.fila === r.fila ? (
                <div className="mt-3 rounded-xl border-2 border-ambar/60 p-3">
                  <p className="text-[17px] font-semibold">¿Qué le avisas al jefe de turno?</p>
                  <textarea value={avisando.texto} autoFocus rows={2} maxLength={250}
                    onChange={(e) => setAvisando({ fila: r.fila, texto: e.target.value })}
                    placeholder="Quieren cambiar de menú, traen una torta, preguntan por la cuenta…"
                    className="mt-2 w-full rounded-xl border-2 border-hueso/20 bg-panel px-3 py-2 text-[17px]" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="boton min-h-[52px]" onClick={() => setAvisando(null)}>Volver</button>
                    <button type="button" disabled={!avisando.texto.trim() || !!guardando}
                      onClick={() => { const t = avisando.texto.trim(); setAvisando(null);
                        void guardar(r, { avisoRecepcion: `${hora()} · ${t}` }, 'Avisado al jefe de turno'); }}
                      className="boton boton-relleno boton-hito flex-1 disabled:opacity-40">📣 Avisar</button>
                  </div>
                </div>
              ) : !bloqueada && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={!!guardando}
                      onClick={() => setContando({ fila: r.fila, n: r.personas })}
                      className={`tecla min-h-[64px] rounded-xl border-2 text-[20px] font-bold ${vino
                        ? 'border-verde-fuerte bg-verde-fuerte text-tinta'
                        : 'border-verde-fuerte text-verde-texto hover:bg-verde/10'}`}>
                      ✓ Llegó
                    </button>
                    <button type="button" disabled={!!guardando}
                      onClick={() => { setAbierta(0); void guardar(r, { asistencia: noVino ? '' : ASISTENCIA.noVino, llegaron: null },
                        noVino ? `${r.nombre}: sin marcar` : `${r.nombre}: no vino`); }}
                      className={`tecla min-h-[64px] rounded-xl border-2 text-[20px] font-bold ${noVino
                        ? 'border-rojo-fuerte bg-rojo-fuerte text-white'
                        : 'border-rojo-fuerte/70 text-rojo-texto hover:bg-rojo/10'}`}>
                      ✕ No vino
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="boton min-h-[48px] flex-1 !text-[15px]"
                      onClick={() => setAvisando({ fila: r.fila, texto: '' })}>📣 Avisar al jefe de turno</button>
                    {abierta === r.fila && (
                      <button type="button" className="boton min-h-[48px]" onClick={() => setAbierta(0)}>Listo</button>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
