'use client';

/**
 * **Las misiones de la ayuda** (2026-11-12). Ver `lib/misiones.ts`.
 *
 * **Segunda vuelta, el mismo día** (lo pidió el cliente: *"más estilo
 * PlayStation, más en partes, más en secciones y más claro diferenciado las
 * etapas"*):
 *
 * - **Arriba, un mapa de niveles**: las cinco misiones como casillas unidas
 *   por una línea. Cada estado se distingue **por forma**, no solo por color:
 *   hecha (verde, rellena, ✓), la actual (dorada, más grande, *Aquí estás*),
 *   pendiente (borde cortado).
 * - **Tu voz ya no es una misión** (2026-11-13): es lo primero de la página,
 *   `VozAyuda.tsx`. *¿Esto no te sirve?* sube hasta ella.
 * - **Cada misión en tres etapas**, cada una con su franja de color y su
 *   número: **① Mira** (la captura con sus puntos), **② Entiende** (qué es
 *   cada punto: tocar uno ilumina su número y al revés) y **③ Hazlo**
 *   (*Entendido*, el único relleno; *Pruébalo*; *¿Esto no te sirve?*).
 * - **El avance se recuerda por rol en el navegador** (`localStorage`): si se
 *   cambia de teléfono, se parte de nuevo. No se escribe en la planilla.
 */
import { useEffect, useState } from 'react';
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

/** El color de cada etapa: la franja, el número y el borde. */
const COLOR = {
  cielo: { franja: 'bg-cielo/15 border-cielo-fuerte/50', num: 'bg-cielo-fuerte text-white', borde: 'border-cielo-fuerte/40', texto: 'text-cielo-texto' },
  ambar: { franja: 'bg-ambar/15 border-ambar-fuerte/50', num: 'bg-ambar-fuerte text-tinta', borde: 'border-ambar-fuerte/40', texto: 'text-ambar-texto' },
  verde: { franja: 'bg-verde/15 border-verde-fuerte/50', num: 'bg-verde-fuerte text-white', borde: 'border-verde-fuerte/40', texto: 'text-verde-texto' }
} as const;

/** Una etapa: franja con su número y su nombre, y lo de adentro. */
function Etapa({ n, titulo, que, color, children, className = '' }: {
  n: string; titulo: string; que: string; color: keyof typeof COLOR; children: React.ReactNode; className?: string;
}) {
  const c = COLOR[color];
  return (
    <section className={`overflow-hidden rounded-2xl border-2 bg-panel ${c.borde} ${className}`}>
      <header className={`flex items-center gap-3 border-b-2 px-4 py-2.5 ${c.franja}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] font-black ${c.num}`}>
          {n}
        </span>
        <div className="min-w-0">
          <h4 className={`text-[17px] font-black uppercase tracking-wide ${c.texto}`}>{titulo}</h4>
          <p className="text-[13px] text-hueso/70">{que}</p>
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** El título de una sección grande de la página. */
export function Seccion({ icono, titulo, que }: { icono: string; titulo: string; que?: string }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-hueso/10 pb-2">
      <span className="text-[26px] leading-none" aria-hidden>{icono}</span>
      <div>
        <h2 className="text-[19px] font-black uppercase tracking-wide">{titulo}</h2>
        {que && <p className="text-[14px] text-hueso/65">{que}</p>}
      </div>
    </div>
  );
}

export default function MisionesAyuda({ rol, nombreRol, onContar }: {
  rol: string; nombreRol: string;
  /** *¿Esto no te sirve? Coméntame*: abre Tu voz con la misión anotada. Sin esto no se ofrece. */
  onContar?: (pantalla: string) => void;
}) {
  const misiones = misionesDe(rol as Rol);
  const llave = `brasas-misiones-${rol}`;
  const [hechas, setHechas] = useState<string[]>([]);
  const [actual, setActual] = useState(0);

  // El avance se lee después de dibujar: el servidor no tiene `localStorage`.
  useEffect(() => {
    const h = leer<string[]>(llave, []);
    setHechas(h);
    const primera = misiones.findIndex((m) => !h.includes(m.id));
    setActual(primera < 0 ? 0 : primera);
  }, [llave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!misiones.length) return null;
  const m = misiones[actual];
  const cuantas = hechas.filter((h) => misiones.some((x) => x.id === h)).length;
  const todas = cuantas === misiones.length;

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

  return (
    <section className="space-y-6" aria-label="Misiones">
      <Seccion icono="🎮" titulo="Tus misiones" que={`Cuatro misiones cortas para conocer tu panel de ${nombreRol}.`} />

      {/* El marcador: cuántas van y la barra, con el trofeo al final. */}
      <div className="flex items-center gap-4 rounded-2xl border-2 border-oro/40 bg-oro/5 px-4 py-3">
        <div className="text-center">
          <p className="text-[32px] font-black leading-none tabular-nums text-oro">{cuantas}<span className="text-hueso/40">/{misiones.length}</span></p>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">hechas</p>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 overflow-hidden rounded-full border border-oro/30 bg-hueso/10" aria-hidden>
            <div className="h-full rounded-full bg-oro transition-all" style={{ width: `${(cuantas / misiones.length) * 100}%` }} />
          </div>
          <p className="text-[14px] text-hueso/75">
            {todas ? <><strong className="text-oro">🏆 Ya conoces tu panel.</strong> Vuelve cuando quieras.</>
              : cuantas === 0 ? 'Parte por la misión 1. Toma un par de minutos cada una.'
              : `Vas bien: te ${misiones.length - cuantas === 1 ? 'falta una' : `faltan ${misiones.length - cuantas}`}.`}
          </p>
        </div>
        <span className={`text-[34px] leading-none ${todas ? '' : 'opacity-25 grayscale'}`} aria-hidden>🏆</span>
      </div>

      {/* El mapa de niveles. */}
      <nav aria-label="Elegir misión" className="relative">
        <div className="absolute left-[10%] right-[10%] top-[34px] h-1 rounded-full bg-hueso/15" aria-hidden />
        <ol className="relative grid gap-1.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${misiones.length}, minmax(0, 1fr))` }}>
          {misiones.map((x, i) => {
            const hecha = hechas.includes(x.id);
            const aqui = i === actual;
            return (
              <li key={x.id} className="flex flex-col items-center gap-1.5 text-center">
                <button type="button" onClick={() => ir(i)} aria-current={aqui ? 'step' : undefined}
                  aria-label={`Misión ${i + 1}: ${x.titulo}${hecha ? ' (hecha)' : ''}`}
                  className={`tecla relative flex items-center justify-center rounded-2xl transition-transform ${aqui
                    ? 'h-[68px] w-[68px] scale-105 border-[3px] border-oro bg-oro text-white shadow-lg ring-4 ring-oro/25'
                    : hecha
                      ? 'h-[60px] w-[60px] border-[3px] border-verde-fuerte bg-verde-fuerte text-white'
                      : 'h-[60px] w-[60px] border-[3px] border-dashed border-hueso/35 bg-panel hover:border-oro'}`}>
                  <span className="text-[26px] leading-none" aria-hidden>{x.emoji}</span>
                  {hecha && !aqui && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full
                                     border-2 border-panel bg-verde-fuerte text-[13px] font-black text-white" aria-hidden>✓</span>
                  )}
                </button>
                <span className={`text-[13px] font-black tabular-nums ${aqui ? 'text-oro' : hecha ? 'text-verde-texto' : 'text-hueso/60'}`}>
                  {aqui ? 'AQUÍ' : `${i + 1}`}
                </span>
                <span className={`hidden text-[13px] leading-tight sm:block ${aqui ? 'font-semibold text-hueso' : 'text-hueso/60'}`}>
                  {x.titulo}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <article id="mision" className="scroll-mt-4 space-y-4">
        {/* La cabecera de la misión, como la pantalla de inicio de un nivel. */}
        <header className="rounded-2xl border-2 border-oro/50 bg-oro/10 px-4 py-4 sm:px-5">
          <p className="text-[13px] font-black uppercase tracking-widest text-oro">
            Misión {actual + 1} de {misiones.length}{hechas.includes(m.id) ? ' · ✓ hecha' : ''}
          </p>
          <h3 className="mt-1 text-[22px] font-black leading-tight sm:text-[26px]">
            <span aria-hidden>{m.emoji}</span> {m.titulo}
          </h3>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-hueso/80">{m.intro}</p>
        </header>

        <MisionConCaptura key={m.id} m={m} onSiguiente={siguiente}
          onContar={onContar ? () => onContar(`Ayuda · ${m.titulo}`) : undefined} ultima={actual === misiones.length - 1} />
      </article>
    </section>
  );
}

/** Una misión con su captura: Mira, Entiende y Hazlo. */
function MisionConCaptura({ m, onSiguiente, onContar, ultima }: {
  m: Mision; onSiguiente: () => void; onContar?: () => void; ultima: boolean;
}) {
  const medida = m.escena ? MEDIDAS[m.escena] : undefined;
  const [activo, setActivo] = useState(0);
  const textos = m.puntos ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] md:items-start">
      <Etapa n="1" titulo="Mira" que="Tu pantalla de verdad. Toca los números." color="cielo">
        <div className="mx-auto w-full max-w-[330px]">
          <div className="relative overflow-hidden rounded-[22px] border-[6px] border-hueso/80 bg-tinta shadow-lg"
            style={medida ? { aspectRatio: `${medida.ancho} / ${medida.alto}` } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/ayuda/${m.escena}.jpg`} alt={`Pantalla real: ${m.titulo}`}
              className="block h-full w-full object-cover" />
            {medida?.puntos.map((p, i) => (
              <button key={i} type="button" onClick={() => setActivo(i)}
                aria-label={`Punto ${i + 1}: ${textos[i] ?? ''}`} aria-pressed={activo === i}
                className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center
                  rounded-full border-2 text-[15px] font-black shadow-md transition-transform ${activo === i
                    ? 'scale-110 border-white bg-oro text-white ring-4 ring-oro/60'
                    : 'border-white bg-tinta/90 text-hueso'}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </Etapa>

      <div className="space-y-4">
        <Etapa n="2" titulo="Entiende" que="Qué es cada número de la pantalla." color="ambar">
          <ol className="space-y-2">
            {textos.map((t, i) => (
              <li key={i}>
                <button type="button" onClick={() => setActivo(i)} aria-pressed={activo === i}
                  className={`tecla flex w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left
                    text-[15px] leading-snug ${activo === i
                      ? 'border-oro bg-oro/10 text-hueso'
                      : 'border-hueso/10 text-hueso/75 hover:border-oro/60'}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-black
                    ${activo === i ? 'bg-oro text-white' : 'bg-hueso/10 text-hueso/80'}`}>{i + 1}</span>
                  <span className="pt-1">{t}</span>
                </button>
              </li>
            ))}
          </ol>
        </Etapa>

        <Etapa n="3" titulo="Hazlo" que="Pruébalo en tu panel y sigue a la próxima." color="verde">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button type="button" onClick={onSiguiente}
              className="boton boton-relleno min-h-[52px] px-5 text-[16px] font-bold">
              ✓ Entendido{ultima ? '' : ', la siguiente →'}
            </button>
            {m.probar && (
              <a href={m.probar.url} className="tecla boton min-h-[48px] text-[15px]">▶ Pruébalo: {m.probar.texto}</a>
            )}
          </div>
          {onContar && (
            <button type="button" onClick={onContar}
              className="boton mt-3 min-h-[44px] border-dashed text-hueso/75">
              💬 ¿Esto no te sirve para tu trabajo? Coméntame
            </button>
          )}
        </Etapa>
      </div>
    </div>
  );
}
