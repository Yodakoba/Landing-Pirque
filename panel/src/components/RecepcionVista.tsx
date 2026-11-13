'use client';

/**
 * **Recepción** (2026-11-11, lo pidió el cliente): la pantalla de la
 * anfitriona, *"con un tablet en la mano y simplemente recibiendo la
 * gente"*. Solo hoy, solo lo justo para recibir, y todo grande.
 *
 * - **Llegó / No vino**, dos botones grandes por reserva, siempre a la vista.
 * - **Cada reserva es una fila de dos pisos** (2026-11-13, lo pidió el
 *   cliente: *"compactar toda la información… colapsar pero sin colapsar,
 *   que ya hay el botón simplemente vino o no vino"*). Arriba la misma fila
 *   de la página del día —(+), nombre y menú, el círculo de Fudo y la
 *   gente—; abajo Llegó / No vino. Con (+) se abre cómo ingresarla en Fudo y
 *   *Avisar al jefe de turno*. Una reserva por llegar medía unos 390px en el
 *   celular (cabía una y media por pantalla); ahora unos 130.
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
import AvisoFijo from './AvisoFijo';
import IngresoFudo, { IconoFudo } from './IngresoFudo';
import { usarSoloMira } from './SesionCliente';
import type { Ingreso } from '@/lib/fudo';
import { useEffect, useMemo, useState } from 'react';
import { avisar } from './AvisoFlotante';
import { enPalabras } from '@/lib/fechas';
import { ASISTENCIA } from '@/lib/columnas';

interface R {
  fila: number; nombre: string; personas: number; menu: string;
  asistencia: string; llegaron: number | null; avisoRecepcion: string;
  /** Cómo se ingresa en Fudo, armado por el servidor. */
  ingreso?: Ingreso | null;
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
  /** Vista gerencia sin `asistencia`: la entrada se mira y no se marca. */
  const soloMira = usarSoloMira('asistencia');
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
  /** Las reservas abiertas con (+): cómo ingresarla en Fudo y Avisar. */
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const alternar = (fila: number) => setExpandidas((x) => {
    const y = new Set(x); if (y.has(fila)) y.delete(fila); else y.add(fila); return y;
  });

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
  const bloqueada = !d.abierta || d.cerrado || soloMira;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[20px] font-bold uppercase tracking-wide sm:text-[22px]">Recepción</h1>
      <p className="mt-0.5 text-[16px] text-hueso/80 sm:text-[18px]">
        <span className="inline-block first-letter:uppercase">{enPalabras(d.fecha)}</span>
        {d.apertura && <> · abre a las {d.apertura}</>}
      </p>

      {bloqueada && !soloMira && (
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
      <div className="sticky top-0 z-10 -mx-5 mt-2 bg-tinta px-5 pb-2 pt-2 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {([
          [`${llegaron}/${esperadas}`, 'personas llegaron', 'text-verde-texto'],
          [String(porLlegar), porLlegar === 1 ? 'reserva por llegar' : 'reservas por llegar', 'text-oro'],
          [String(noVinieron), noVinieron === 1 ? 'no vino' : 'no vinieron', 'text-rojo-texto']
        ] as const).map(([n, que, color]) => (
          // **Más bajos** (2026-11-13): el número y su palabra en la misma
          // línea. Antes cada uno ocupaba dos y la franja fija de arriba se
          // comía un cuarto de la pantalla del celular.
          <div key={que} className="flex items-center justify-center gap-1.5 rounded-xl border border-hueso/15
                                    bg-panel px-1.5 py-1.5 sm:gap-2 sm:py-2">
            <p className={`text-[22px] font-extrabold leading-none tabular-nums sm:text-[26px] ${color}`}>{n}</p>
            <p className="text-left text-[13px] leading-tight text-hueso/75 sm:text-[14px]">{que}</p>
          </div>
        ))}
      </div>

      <input value={busca} onChange={(e) => setBusca(e.target.value)} type="search"
        placeholder="Buscar por nombre…" aria-label="Buscar reserva por nombre"
        className="mt-2 w-full rounded-xl border-2 border-hueso/20 bg-panel px-4 py-2.5 text-[18px]
                   outline-none focus:border-oro" />
      </div>

      {/* Una sola vez y no en cada tarjeta: repetida era ruido. */}
      {!bloqueada && (
        <AvisoFijo clave="recepcion-avisar" className="mt-1">
          Para cambiar personas, menús o el pago, abre la reserva con <strong>+</strong> y usa
          {' '}<strong>📣 Avisar al jefe de turno</strong>.
        </AvisoFijo>
      )}

      {cuentan.length === 0 && (
        <p className="mt-6 text-[17px] text-hueso/70">Hoy no hay reservas.</p>
      )}
      {cuentan.length > 0 && lista.length === 0 && (
        <p className="mt-6 text-[17px] text-hueso/70">Nadie calza con “{busca}”.</p>
      )}

      <ul className="mt-3 grid grid-cols-1 items-start gap-2.5 md:grid-cols-2">
        {lista.map((r) => {
          const vino = r.asistencia === ASISTENCIA.vino;
          const noVino = r.asistencia === ASISTENCIA.noVino;
          const n = r.llegaron ?? r.personas;
          const marcada = vino || noVino;
          const abiertaEsta = expandidas.has(r.fila);
          const contandoEsta = contando?.fila === r.fila;
          const avisandoEsta = avisando?.fila === r.fila;
          // Una marcada vuelve a ofrecer Llegó / No vino solo con *Cambiar*.
          const cambiandoEsta = abierta === r.fila;
          return (
            <li key={r.fila} className={`min-w-0 overflow-hidden rounded-2xl border-2 ${vino
              ? 'border-verde/50 bg-verde/[0.06]' : noVino ? 'border-rojo/40 bg-rojo/[0.05]'
              : abiertaEsta ? 'border-oro bg-panel' : 'border-hueso/20 bg-panel'}`}>
              {/* **El primer piso: la misma fila de la página del día**, más
                  grande porque se usa de pie y con un tablet. (+), quién y qué
                  menú, el círculo de Fudo y la gente. */}
              <button type="button" aria-expanded={abiertaEsta} onClick={() => alternar(r.fila)}
                className={`tecla flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left
                            ${abiertaEsta ? 'bg-oro/10' : 'hover:bg-hueso/5'}`}>
                <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                                             border-2 text-[17px] font-bold ${abiertaEsta
                  ? 'border-oro bg-oro text-tinta' : 'border-hueso/30 text-hueso/70'}`}>
                  {abiertaEsta ? '−' : '+'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[18px] font-bold ${noVino ? 'line-through opacity-70' : ''}`}>
                    {r.nombre || 'Sin nombre'}
                  </span>
                  {r.menu && <span className="block truncate text-[14px] text-hueso/70">{r.menu}</span>}
                </span>
                {!noVino && <IconoFudo ingreso={r.ingreso} />}
                <span className="w-[4.5rem] shrink-0 text-right text-[20px] font-bold tabular-nums">
                  {r.personas}<span className="ml-1 text-[13px] font-normal text-hueso/65">pers.</span>
                </span>
              </button>

              {/* El aviso ya mandado, a la vista sin abrirla. */}
              {r.avisoRecepcion && (
                <p className="mx-3 mb-2 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-1.5 text-[14px] text-ambar-texto">
                  📣 Avisado al jefe de turno: {r.avisoRecepcion}
                </p>
              )}

              {/* Abierta con (+): cómo ingresarla en Fudo y Avisar. */}
              {abiertaEsta && !contandoEsta && !avisandoEsta && (
                <div className="space-y-2 border-t border-hueso/10 px-3 py-2.5">
                  {!noVino && <IngresoFudo ingreso={r.ingreso} />}
                  {!bloqueada && (
                    <button type="button" className="boton min-h-[48px] w-full !text-[15px]"
                      onClick={() => setAvisando({ fila: r.fila, texto: '' })}>📣 Avisar al jefe de turno</button>
                  )}
                </div>
              )}

              {/* El segundo piso. */}
              {contandoEsta ? (
                <div className="mx-3 mb-3 mt-1 rounded-xl border-2 border-verde/50 p-3">
                  {/* Al apretar Llegó se abre la mesa: lo que hay que
                      ingresar en Fudo va acá mismo, sin abrir nada. */}
                  <IngresoFudo ingreso={r.ingreso} compacto />
                  <p className="mt-3 text-[18px] font-semibold">¿Llegaron las {r.personas}?</p>
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
              ) : avisandoEsta ? (
                <div className="mx-3 mb-3 mt-1 rounded-xl border-2 border-ambar/60 p-3">
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
              ) : marcada && !cambiandoEsta ? (
                // Ya recibida: lo que quedó, y *Cambiar* por si fue un error.
                <div className="flex items-center gap-2 px-3 pb-2.5">
                  <span className={`flex-1 text-[16px] font-bold ${vino
                    ? (n !== r.personas ? 'text-ambar-texto' : 'text-verde-texto') : 'text-rojo-texto'}`}>
                    {vino ? `✓ Llegaron ${n}${n !== r.personas ? ` de ${r.personas}` : ''}` : '✕ No vino'}
                  </span>
                  {!bloqueada && (
                    <button type="button" className="boton min-h-[44px] shrink-0"
                      onClick={() => setAbierta(r.fila)}>Cambiar</button>
                  )}
                </div>
              ) : !bloqueada && (
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  <button type="button" disabled={!!guardando}
                    onClick={() => setContando({ fila: r.fila, n: r.personas })}
                    className={`tecla min-h-[52px] rounded-xl border-2 text-[18px] font-bold ${vino
                      ? 'border-verde-fuerte bg-verde-fuerte text-tinta'
                      : 'border-verde-fuerte text-verde-texto hover:bg-verde/10'}`}>
                    ✓ Llegó
                  </button>
                  <button type="button" disabled={!!guardando}
                    onClick={() => { setAbierta(0); void guardar(r, { asistencia: noVino ? '' : ASISTENCIA.noVino, llegaron: null },
                      noVino ? `${r.nombre}: sin marcar` : `${r.nombre}: no vino`); }}
                    className={`tecla min-h-[52px] rounded-xl border-2 text-[18px] font-bold ${noVino
                      ? 'border-rojo-fuerte bg-rojo-fuerte text-white'
                      : 'border-rojo-fuerte/70 text-rojo-texto hover:bg-rojo/10'}`}>
                    ✕ No vino
                  </button>
                  {cambiandoEsta && (
                    <button type="button" className="boton col-span-2 min-h-[44px]" onClick={() => setAbierta(0)}>Listo</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
