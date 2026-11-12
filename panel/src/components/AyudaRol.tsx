'use client';

/**
 * La página `/ayuda` (2026-11-12): las misiones del rol arriba y, debajo, la
 * consulta rápida. Ver `lib/misiones.ts` y `lib/ayudaRol.ts`.
 *
 * - **Las misiones** son lo que se vino a buscar: cuatro con la pantalla real
 *   y *Tu voz*, el formulario de comentarios, como quinta.
 * - **La consulta rápida** es para quien ya sabe y busca algo puntual: cada
 *   pantalla con su `?` (el mismo texto de la pantalla) y *Ir →*.
 * - **Qué puede y qué no tu cuenta**, sacado de la tabla de permisos. Contesta
 *   *"¿por qué no tengo esto?"* antes de que haya que preguntarlo.
 */
import Ayuda from './Ayuda';
import MisionesAyuda, { Seccion } from './MisionesAyuda';
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
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Ayuda</h1>
        <p className="max-w-3xl text-[15px] text-hueso/80">
          Tu cuenta es <strong className="text-oro">{nombre}</strong>. {RESUMEN_ROL[rol] ?? ''}
        </p>
      </header>

      <MisionesAyuda rol={rol} nombreRol={nombre} conComentar={conComentar} />

      <section className="space-y-4" aria-label="Consulta rápida">
        <Seccion icono="🔎" titulo="Consulta rápida" que="Cada pantalla que abres, con su explicación en el ?." />
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pantallas.map((p) => (
            <li key={p.href} className="flex items-center gap-2 rounded-xl border border-hueso/15 bg-panel px-3 py-2">
              <span className="font-semibold">{p.texto}</span>
              <Ayuda tema={p.tema} />
              <span className="flex-1" />
              <a href={p.href} className="tecla boton min-h-[40px]">Ir →</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" aria-label="Qué puede tu cuenta">
        <Seccion icono="🪪" titulo="Tu rol" que="Lo que tu cuenta puede hacer, y lo que es de otro rol." />
        <div className="grid gap-4 sm:grid-cols-2">
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
          {noPuede.length > 0 && conComentar && (
            <p className="mt-3 text-[14px] text-hueso/70">
              ¿Necesitas algo de esta lista para tu trabajo? Cuéntalo en la misión <strong>💬 Tu voz</strong>.
            </p>
          )}
        </div>
        </div>
      </section>
    </div>
  );
}
