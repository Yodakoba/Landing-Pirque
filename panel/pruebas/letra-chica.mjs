/**
 * **La regla PlayStation, en letra** (2026-11-12): en el panel no hay
 * letra bajo 13px donde hay un dato. Esta prueba cuenta, archivo por
 * archivo, las clases de letra chica —`text-xs` y `text-[9px]` a
 * `text-[12px]`— y **falla si alguno suma una nueva**. Lo que ya había se
 * anotó abajo como punto de partida: va bajando cuando se arregla, nunca
 * subiendo.
 *
 * Si un archivo baja de su número, la prueba lo dice para que se actualice
 * el de abajo y quede fijo.
 *
 *   npm run letra-chica
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const CHICA = /text-\[(9|10|11|12)px\]|\btext-xs\b/g;

/** Lo que había el 2026-11-12. Solo puede bajar. */
const HABIA = {
    "src/components/CampoTelefono.tsx": 1,
    "src/components/IngresoFudo.tsx": 1,
    "src/components/Entrada.tsx": 3,
    "src/components/EventosCRM.tsx": 1,
    "src/components/Clima.tsx": 2,
    "src/components/CalendarioExtras.tsx": 0,
    "src/components/CalendarioEquipo.tsx": 8,
    "src/components/PuntoDia.tsx": 0,
    "src/components/BotonTema.tsx": 0,
    "src/components/DiaEditor.tsx": 9,
    "src/components/EquipoDialogo.tsx": 3,
    "src/components/UsuariosEditor.tsx": 5,
    "src/components/ReservaForm.tsx": 10,
    "src/components/FichaColaborador.tsx": 4,
    "src/components/CalendarView.tsx": 1,
    "src/components/TarjetaDia.tsx": 1,
    "src/components/Ayuda.tsx": 1,
    "src/components/ExtrasDialogo.tsx": 2,
    "src/components/FichaTrabajador.tsx": 6,
    "src/app/bitacora/page.tsx": 3,
    "src/app/semana/[token]/page.tsx": 2
  };

const archivos = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? archivos(p) : /\.tsx?$/.test(n) ? [p] : [];
});

let fallos = 0;
for (const p of [...archivos(join(RAIZ, 'src/components')), ...archivos(join(RAIZ, 'src/app'))]) {
  const rel = relative(RAIZ, p);
  const n = (readFileSync(p, 'utf8').match(CHICA) ?? []).length;
  const tope = HABIA[rel] ?? 0;
  if (n > tope) {
    fallos++;
    console.log(`  FALLA  ${rel}: ${n} con letra chica (tope ${tope}). Usa 13px o más.`);
  } else if (n < tope) {
    console.log(`  bien   ${rel}: bajó de ${tope} a ${n}. Anota ${n} en HABIA para fijarlo.`);
  }
}
if (fallos) {
  console.log(`\n${fallos} archivo(s) suman letra bajo 13px: la regla PlayStation la prohíbe en el panel.`);
  process.exit(1);
}
console.log('Todo bien: nadie sumó letra chica.');
