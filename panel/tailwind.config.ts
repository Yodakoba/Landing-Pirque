import type { Config } from 'tailwindcss';

/**
 * Los colores no son valores fijos: son **variables CSS**, para que el panel
 * tenga dos temas sin tocar una sola clase de los componentes.
 *
 * `bg-tinta`, `text-hueso/60` y `border-oro/40` siguen escribiéndose igual;
 * lo único que cambia entre el día y la noche es qué valor tiene la variable.
 * La alternativa —prefijar `dark:` en cada clase de cada pantalla— habría
 * sido reescribir el panel entero y dejar cada color nuevo con dos lugares
 * donde equivocarse.
 *
 * Van en canales sueltos (`11 11 10`, no `#0B0B0A`) porque es lo que
 * `rgb(… / <alpha-value>)` necesita para que `/60` siga funcionando.
 *
 * **Los tres colores de estado tienen nombre propio** —verde, rojo, ámbar—
 * en vez de los `emerald-400` de Tailwind, y eso no es gusto: en el tema
 * oscuro el texto de un aviso es claro y en el claro tiene que ser oscuro,
 * así que el número de la paleta dejaría de significar lo mismo. Cada uno
 * trae lo que de verdad se usa: el tono base para fondos y bordes con
 * transparencia, uno `-fuerte` para bordes y rellenos sólidos, y uno
 * `-texto` que es el único pensado para leerse.
 */
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Los de la marca, para que el panel no se vea ajeno al sitio.
        tinta: c('--tinta'),
        panel: c('--panel'),
        hueso: c('--hueso'),
        oro: c('--oro'),

        verde: { DEFAULT: c('--verde'), fuerte: c('--verde-fuerte'), texto: c('--verde-texto') },
        rojo: { DEFAULT: c('--rojo'), fuerte: c('--rojo-fuerte'), texto: c('--rojo-texto') },
        ambar: { DEFAULT: c('--ambar'), fuerte: c('--ambar-fuerte'), texto: c('--ambar-texto') },
        cielo: { DEFAULT: c('--cielo'), fuerte: c('--cielo-fuerte'), texto: c('--cielo-texto') }
      }
    }
  },
  plugins: []
} satisfies Config;
