'use client';

/**
 * **Las misiones de la ayuda** (2026-11-12). Ver `lib/misiones.ts`.
 *
 * - **Cinco botones grandes arriba**, uno por misión, con una barra de
 *   avance. La que se completa se pinta con ✓; con las cinco, el trofeo.
 * - **Cada misión es una captura real del panel de ese rol** con puntos
 *   numerados que se tocan: cada uno ilumina su explicación al lado (o abajo,
 *   en el teléfono), y tocar la explicación ilumina el punto. Así se aprende
 *   mirando la pantalla verdadera, no un dibujo.
 * - **Un solo botón relleno**: *Entendido, la siguiente*. *Pruébalo ahora*
 *   abre la pantalla de verdad; *¿Esto no te sirve?* lleva a *Tu voz* con la
 *   misión ya anotada.
 * - **El avance se recuerda por rol en el navegador** (`localStorage`), como
 *   el recorrido de antes: si se cambia de teléfono, se parte de nuevo. No se
 *   escribe en la planilla por cada misión vista.
 */
import { useEffect, useState } from 'react';
import FormularioComentario, { type ComentarioMandado } from './FormularioComentario';
import { misionesDe, type Mision } from '@/lib/misiones';
import type { Rol } from '@/lib/auth';
import PUNTOS from '../../public/ayuda/puntos.json';

type Medida = { ancho: number; alto: number; puntos: { x: number; y: number }[] };
const MEDIDAS = PUNTOS as Record<string, Medida>;

const leer = <T,>(llave: string, defecto: T): T => {
  try { return JSON.parse(localStorage.getItem(llave) ?? '') as T; } catch { return defecto; }
};
const anotar = (llave: string, v: unknown) => {
  try { localStorage.setItem(llave, JSON.stringify(v)); } catch { /* sin memoria */ }
};

export default function MisionesAyuda({ rol, nombreRol, conComentar }: {
  rol: string; nombreRol: string; conComentar: boolean;
}) {
  const misiones = misionesDe(rol as Rol);
  const llave = `brasas-misiones-${rol}`;
  const [hechas, setHechas] = useState<string[]>([]);
  const [actual, setActual] = useState(0);
  const [desde, setDesde] = useState('');

  // El avance se lee después de dibujar: el servidor no tiene `localStorage`.
  useEffect(() => {
    const h = leer<string[]>(llave, []);
    setHechas(h);
    const primera = misiones.findIndex((m) => !h.includes(m.id));
    setActual(primera < 0 ? 0 : primera);
  }, [llave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!misiones.length) return null;
  const m = misiones[actual];
  const todas = misiones.every((x) => hechas.includes(x.id));

  function completar(id: string) {
    const h = hechas.includes(id) ? hechas : [...hechas, id];
    setHechas(h); anotar(llave, h);
  }
  function ir(i: number) {
    setActual(i);
    document.getElementById('mision')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function siguiente() {
    completar(m.id);
    const sig = misiones.findIndex((x, i) => i > actual && !hechas.includes(x.id) && x.id !== m.id);
    ir(sig >= 0 ? sig : Math.min(actual + 1, misiones.length - 1));
  }
  function contarDesde(mision: Mision) {
    setDesde(`Ayuda · ${mision.titulo}`);
    ir(misiones.length - 1);
  }

  return (
    <section className="space-y-5" aria-label="Misiones">
      {/* El avance: cuántas van, la barra y el trofeo. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-lg font-bold">Tus misiones como {nombreRol}</h2>
          <span className="text-[14px] text-hueso/60">
            {hechas.filter((h) => misiones.some((x) => x.id === h)).length} de {misiones.length}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-hueso/10" aria-hidden>
          <div className="h-full rounded-full bg-oro transition-all"
            style={{ width: `${(hechas.filter((h) => misiones.some((x) => x.id === h)).length / misiones.length) * 100}%` }} />
        </div>
        {todas && (
          <p className="rounded-xl border-2 border-oro/60 bg-oro/10 px-4 py-3 text-[15px]">
            <strong className="text-oro">🏆 Ya conoces tu panel.</strong>{' '}
            Vuelve cuando quieras: las misiones quedan aquí, y Tu voz siempre está abierta.
          </p>
        )}
      </div>

      {/* Los cinco botones. */}
      <ol className="grid grid-cols-5 gap-2">
        {misiones.map((x, i) => {
          const hecha = hechas.includes(x.id);
          const aqui = i === actual;
          return (
            <li key={x.id}>
              <button type="button" onClick={() => ir(i)} aria-current={aqui ? 'step' : undefined}
                aria-label={`Misión ${i + 1}: ${x.titulo}${hecha ? ' (hecha)' : ''}`}
                className={`tecla flex min-h-[64px] w-full flex-col items-center justify-center gap-0.5 rounded-xl
                  border-2 px-1 py-2 text-center ${aqui
                    ? 'border-oro bg-oro/15'
                    : hecha ? 'border-verde/50 bg-verde/5' : 'border-hueso/20 hover:border-oro'}`}>
                <span className="text-[22px] leading-none" aria-hidden>{hecha && !aqui ? '✓' : x.emoji}</span>
                <span className={`text-[13px] font-semibold tabular-nums ${aqui ? 'text-oro' : 'text-hueso/70'}`}>
                  {i + 1}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <article id="mision" className="scroll-mt-4 space-y-4 rounded-2xl border-2 border-hueso/15 bg-panel p-4 sm:p-5">
        <header className="space-y-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-oro">
            Misión {actual + 1} de {misiones.length}
          </p>
          <h3 className="text-xl font-bold">{m.emoji} {m.titulo}</h3>
          <p className="max-w-2xl text-[15px] leading-relaxed text-hueso/80">{m.intro}</p>
        </header>

        {m.escena
          ? <MisionConCaptura key={m.id} m={m} onSiguiente={siguiente}
              onContar={conComentar ? () => contarDesde(m) : undefined} ultima={actual === misiones.length - 1} />
          : <TuVoz key={desde} desde={desde} conComentar={conComentar} onListo={() => completar(m.id)} />}
      </article>
    </section>
  );
}

/** Una misión con su captura y sus puntos que se tocan. */
function MisionConCaptura({ m, onSiguiente, onContar, ultima }: {
  m: Mision; onSiguiente: () => void; onContar?: () => void; ultima: boolean;
}) {
  const medida = m.escena ? MEDIDAS[m.escena] : undefined;
  const [activo, setActivo] = useState(0);
  const textos = m.puntos ?? [];

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:items-start">
      {/* La captura con sus puntos. Va en un marco de teléfono. */}
      <div className="mx-auto w-full max-w-[340px]">
        <div className="relative overflow-hidden rounded-[22px] border-[6px] border-hueso/80 bg-tinta shadow-lg"
          style={medida ? { aspectRatio: `${medida.ancho} / ${medida.alto}` } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/ayuda/${m.escena}.jpg`} alt={`Pantalla real: ${m.titulo}`}
            className="block h-full w-full object-cover" />
          {medida?.puntos.map((p, i) => (
            <button key={i} type="button" onClick={() => setActivo(i)}
              aria-label={`Punto ${i + 1}: ${textos[i] ?? ''}`} aria-pressed={activo === i}
              className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center
                rounded-full border-2 text-[15px] font-bold shadow-md transition-transform ${activo === i
                  ? 'scale-110 border-white bg-oro text-white ring-4 ring-oro/60'
                  : 'border-white bg-tinta/90 text-hueso'}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              {i + 1}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[13px] text-hueso/55">Toca los números de la pantalla.</p>
      </div>

      {/* Lo que es cada punto. Tocar uno ilumina su número en la captura. */}
      <div className="space-y-4">
        <ol className="space-y-2">
          {textos.map((t, i) => (
            <li key={i}>
              <button type="button" onClick={() => setActivo(i)} aria-pressed={activo === i}
                className={`tecla flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left
                  text-[15px] leading-snug ${activo === i
                    ? 'border-oro bg-oro/10 text-hueso'
                    : 'border-hueso/10 text-hueso/75 hover:border-oro/60'}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] font-bold
                  ${activo === i ? 'bg-oro text-white' : 'bg-hueso/10 text-hueso/80'}`}>{i + 1}</span>
                <span>{t}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onSiguiente} className="boton boton-relleno min-h-[48px] px-5 text-[15px]">
            ✓ Entendido{ultima ? '' : ', la siguiente →'}
          </button>
          {m.probar && (
            <a href={m.probar.url} className="tecla boton min-h-[44px]">▶ Pruébalo: {m.probar.texto}</a>
          )}
        </div>
        {onContar && (
          <button type="button" onClick={onContar}
            className="boton min-h-[40px] border-dashed text-hueso/70">
            💬 ¿Esto no te sirve para tu trabajo? Cuéntalo
          </button>
        )}
      </div>
    </div>
  );
}

/** La quinta misión: el formulario, a página completa, y lo que ya mandaste. */
function TuVoz({ desde, conComentar, onListo }: { desde: string; conComentar: boolean; onListo: () => void }) {
  const llave = 'brasas-comentarios-mandados';
  const [mandados, setMandados] = useState<ComentarioMandado[]>([]);
  useEffect(() => { setMandados(leer<ComentarioMandado[]>(llave, [])); }, []);

  if (!conComentar) {
    return (
      <p className="rounded-xl border-2 border-ambar/50 bg-ambar/10 px-4 py-3 text-[15px]">
        Los comentarios todavía no están conectados. Mientras tanto, cuéntaselo a quien administra el panel.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] md:items-start">
      <div className="rounded-2xl border-2 border-oro/50 bg-oro/5 p-4">
        <FormularioComentario pantalla={desde || 'Ayuda'}
          onMandado={(c) => {
            const lista = [c, ...mandados].slice(0, 6);
            setMandados(lista); anotar(llave, lista); onListo();
          }} />
      </div>
      <aside className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-[15px] font-semibold">Lo que más sirve</h4>
          <ul className="space-y-1.5 text-[14px] text-hueso/75">
            <li>🧩 <em>«Al recibir a la gente no veo si la reserva está pagada.»</em></li>
            <li>🐞 <em>«Al guardar la cotización me salió un error.»</em></li>
            <li>🤔 <em>«No entendí qué hace Cerrar el día.»</em></li>
            <li>💡 <em>«Sería más rápido si el día abriera en Turnos.»</em></li>
          </ul>
          <p className="text-[14px] text-hueso/60">
            Una cosa por comentario. Si piensas «¿y por qué no puedo hacer esto?», eso es justo lo que buscamos.
          </p>
        </div>
        {mandados.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[15px] font-semibold">Lo que ya mandaste desde aquí</h4>
            <ul className="space-y-1.5">
              {mandados.map((c, i) => (
                <li key={i} className="rounded-lg border border-hueso/15 px-3 py-2 text-[14px]">
                  <span className="font-semibold">{c.tipo}</span>{' '}
                  <span className="text-hueso/75">{c.texto.length > 90 ? c.texto.slice(0, 90) + '…' : c.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
