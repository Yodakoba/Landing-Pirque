'use client';

/**
 * La página `/ayuda`. Ver `lib/misiones.ts`, `lib/poderes.ts` y `lib/ayudaRol.ts`.
 *
 * **El orden es la decisión** (2026-11-13, segunda vuelta: *"lo primero que
 * tengo que ver es: haz esta tarea"*, y el formulario *"como un cliquéame"*):
 *
 * 1. **💬 Tu voz** (`VozAyuda`): una barra de una línea con *Coméntame*. El
 *    formulario se abre al apretarlo.
 * 2. **🎮 Tus misiones**: cuatro, con la pantalla real del rol.
 * 3. **⚡ Tus poderes** (`PoderesRol`): qué desbloquea tu rol y qué no, por
 *    mundos. Reemplaza a las dos listas *puede / no puede*, *"muy Excel"*.
 * 4. **🔎 Consulta rápida**: cada pantalla con su `?`.
 *
 * **Todo lo de abajo abre Tu voz y sube hasta él**: *¿Esto no te sirve?
 * Coméntame* de una misión y *🙋 Lo necesito* de un poder bloqueado dejan el
 * pedido armado. Y mientras se baja por la página, un botón flotante
 * **💬 Coméntame** hace lo mismo.
 */
import { useEffect, useState } from 'react';
import Ayuda from './Ayuda';
import MisionesAyuda, { Seccion } from './MisionesAyuda';
import VozAyuda, { type Pedido } from './VozAyuda';
import PoderesRol from './PoderesRol';
import { pantallasDe } from '@/lib/ayudaRol';
import { pedidoDePoder } from '@/lib/poderes';
import { NOMBRE_ROL, RESUMEN_ROL } from '@/lib/roles';
import type { Rol } from '@/lib/auth';

const subir = () => document.getElementById('tu-voz')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export default function AyudaRol({ rol, gerencia, conComentar }: {
  rol: string; gerencia: boolean; conComentar: boolean;
}) {
  const pantallas = pantallasDe(rol as Rol, gerencia);
  const nombre = NOMBRE_ROL[rol] ?? rol;
  const [pedido, setPedido] = useState<Pedido>({ pantalla: 'Ayuda', tipo: '', texto: '', vez: 0 });
  const [flotante, setFlotante] = useState(false);
  const [abierto, setAbierto] = useState(false);

  // El botón flotante aparece cuando Tu voz ya quedó arriba, fuera de la vista.
  useEffect(() => {
    const voz = document.getElementById('tu-voz');
    if (!voz || !('IntersectionObserver' in window)) return;
    const o = new IntersectionObserver(([e]) => setFlotante(!e.isIntersecting), { threshold: 0 });
    o.observe(voz);
    return () => o.disconnect();
  }, []);

  function pedir(p: Omit<Pedido, 'vez'>) {
    setPedido((x) => ({ ...p, vez: x.vez + 1 }));
    setAbierto(true);
    setTimeout(subir, 30);
  }
  function abrir() { setAbierto(true); setTimeout(subir, 30); }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Ayuda</h1>
        <p className="max-w-3xl text-[15px] text-hueso/80">
          Tu cuenta es <strong className="text-oro">{nombre}</strong>. {RESUMEN_ROL[rol] ?? ''}
        </p>
      </header>

      {conComentar && (
        <VozAyuda pedido={pedido} abierto={abierto} onAbrir={abrir} onCerrar={() => setAbierto(false)} />
      )}

      <MisionesAyuda rol={rol} nombreRol={nombre}
        onContar={conComentar ? (pantalla) => pedir({ pantalla, tipo: '', texto: '' }) : undefined} />

      <section className="space-y-4" aria-label="Tus poderes">
        <Seccion icono="⚡" titulo="Tus poderes"
          que="Lo que tu rol desbloquea. Toca uno para ver qué es; si te falta uno para tu trabajo, pídelo." />
        <PoderesRol rol={rol}
          onPedir={conComentar ? (p) => pedir({ pantalla: 'Ayuda · Tus poderes', tipo: '🧩 Me falta', texto: pedidoDePoder(p) }) : undefined} />
      </section>

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

      {conComentar && flotante && (
        <button type="button" onClick={abrir}
          className="tecla fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex min-h-[52px] items-center gap-2
                     rounded-full border-2 border-white bg-rosa-fuerte px-5 text-[16px] font-black text-white shadow-xl">
          💬 Coméntame
        </button>
      )}
    </div>
  );
}
