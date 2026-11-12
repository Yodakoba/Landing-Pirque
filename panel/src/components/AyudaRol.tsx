'use client';

/**
 * La página `/ayuda`: todo lo que una cuenta necesita para volver a revisar
 * cómo se usa su panel. Ver `lib/ayudaRol.ts`.
 *
 * - **Arriba, el recorrido**: el único botón relleno de la vista, porque es lo
 *   que se vino a buscar la primera vez.
 * - **Una tarjeta por pantalla que la cuenta abre**, con el mismo texto del
 *   `?` entero —para qué sirve, cómo se usa y el *Ojo*— y un botón para ir.
 *   Va a la vista, sin desplegables: es una página para leer.
 * - **Qué puede y qué no tu cuenta**, sacado de la tabla de permisos. Contesta
 *   *"¿por qué no tengo esto?"* antes de que haya que preguntarlo.
 * - **Al final, Comentar**: si después de leer algo falta, es el lugar.
 */
import Comentar from './Comentar';
import { verRecorrido } from './Recorrido';
import { pantallasDe } from '@/lib/ayudaRol';
import { NOMBRE_ROL, RESUMEN_ROL, resumenRol } from '@/lib/roles';
import type { Rol } from '@/lib/auth';

export default function AyudaRol({ rol, gerencia, conComentar }: {
  rol: string; gerencia: boolean; conComentar: boolean;
}) {
  const pantallas = pantallasDe(rol as Rol, gerencia);
  const { puede, noPuede } = resumenRol(rol as Rol);
  const nombre = NOMBRE_ROL[rol] ?? rol;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Ayuda</h1>
        <p className="text-[15px] text-hueso/80">
          Tu cuenta es <strong className="text-oro">{nombre}</strong>. {RESUMEN_ROL[rol] ?? ''}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={verRecorrido} className="boton boton-relleno min-h-[44px]">
            ▶ Ver el recorrido de tu panel
          </button>
          <span className="text-[14px] text-hueso/60">
            {pantallas.length === 1 ? 'Una pantalla' : `${pantallas.length} pantallas`}, en un minuto.
          </span>
        </div>
      </section>

      <section className="space-y-4" aria-label="Tus pantallas">
        <h2 className="text-[15px] font-semibold uppercase tracking-wide text-hueso/60">Tus pantallas</h2>
        {pantallas.map((p) => (
          <article key={p.href} className="space-y-3 rounded-xl border border-hueso/15 bg-panel p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold">{p.texto}</h3>
              <span className="flex-1" />
              <a href={p.href} className="tecla boton min-h-[40px]">Ir a {p.texto} →</a>
            </div>
            <div className="space-y-2 text-[15px] leading-relaxed text-hueso/80">
              {p.ayuda.cuerpo.map((t, i) => <p key={i}>{t}</p>)}
            </div>
            {p.ayuda.pasos && (
              <ol className="space-y-1.5 text-[15px] text-hueso/80">
                {p.ayuda.pasos.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 font-semibold tabular-nums text-oro">{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            )}
            {p.ayuda.ojo && (
              <p className="rounded border border-ambar/40 bg-ambar/5 px-3 py-2 text-[14px] text-ambar-texto">
                <strong>Ojo:</strong> {p.ayuda.ojo}
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Qué puede tu cuenta">
        <div className="rounded-xl border border-verde/40 bg-verde/5 p-4">
          <h2 className="text-[15px] font-semibold text-verde-texto">✓ Tu cuenta puede</h2>
          <ul className="mt-2 space-y-1 text-[14px] text-hueso/80">
            {puede.map((t) => <li key={t}>· {t}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-hueso/15 p-4">
          <h2 className="text-[15px] font-semibold text-hueso/70">✕ No es de tu rol</h2>
          <ul className="mt-2 space-y-1 text-[14px] text-hueso/60">
            {noPuede.length ? noPuede.map((t) => <li key={t}>· {t}</li>) : <li>Nada: puedes todo.</li>}
          </ul>
        </div>
      </section>

      {conComentar && (
        <section className="space-y-3 rounded-xl border-2 border-oro/40 bg-oro/5 p-4">
          <h2 className="text-lg font-bold">¿Algo falla, no se entiende o te falta?</h2>
          <p className="text-[15px] text-hueso/80">
            Cuéntalo con <strong>💬 Comentar</strong>, arriba en todas las pantallas. Si piensas
            «¿y por qué no puedo hacer esto?», justamente eso es lo que más sirve.
          </p>
          <Comentar />
        </section>
      )}
    </div>
  );
}
