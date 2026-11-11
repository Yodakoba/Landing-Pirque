'use client';

/**
 * La barra de arriba.
 *
 * **En la página del trabajador no hay barra.** No es cosmético: todos los
 * enlaces del panel le pedirían una contraseña que no tiene, así que una
 * barra ahí sería una fila de puertas cerradas. Lo que ve es su propia
 * página y nada más. Lo mismo en la pantalla de entrada.
 *
 * **El botón de salir existe desde que hay sesión con cookie.** Con
 * autenticación básica no se podía: el navegador recordaba la credencial
 * hasta cerrarlo entero, y en un equipo que comparte dispositivos eso
 * significaba que el turno siguiente entraba como el anterior — justo lo
 * que la bitácora necesita que no pase.
 *
 * **Son dos filas y no una sola que envuelve** (2026-11-01). Antes la marca,
 * las nueve páginas, el tema, el nombre y el botón de salir iban todos en un
 * mismo `flex-wrap`, así que en un teléfono se mezclaban: el nombre de la
 * cuenta podía terminar entre dos páginas del menú. Arriba va **quién eres y
 * dónde estás** —la marca, el tema, la cuenta y salir—; abajo, **a dónde
 * puedes ir**. Son dos preguntas distintas y ahora se ven distintas.
 */
import { usePathname } from 'next/navigation';
import Nav, { PAGINAS } from './Nav';
import { puede, puedeVer, type Rol } from '@/lib/auth';
import BotonTema from './BotonTema';

export default function Cabecera({ rol, usuario, gerencia = false }: {
  rol: string; usuario: string; gerencia?: boolean;
}) {
  const ruta = usePathname();
  // **Vista gerencia** (2026-11-11): la página que se está mirando, y si se
  // ve solo por la gerencia —o sea, que el rol no la puede cambiar—.
  const pagina = [...PAGINAS].sort((a, b) => b.href.length - a.href.length)
    .find((p) => (p.href === '/' ? ruta === '/' : ruta.startsWith(p.href)));
  const soloMira = !!pagina && gerencia && !puede(rol as Rol, pagina.accion)
    && puedeVer(rol as Rol, pagina.accion, gerencia);
  // Ni la página del trabajador ni la planilla del grupo llevan barra:
  // todos sus enlaces pedirían una contraseña que quien las abre no tiene.
  //
  // **El presupuesto tampoco**, y ahí es más fuerte todavía: lo abre un
  // cliente, no alguien del equipo. Una barra con "Turnos" y "Bitácora"
  // sobre una cotización diría que hay un panel detrás al que asomarse.
  const esDeTrabajador = ruta.startsWith('/mi/') || ruta.startsWith('/semana/')
                      || ruta.startsWith('/presupuesto/')
                      || ruta.startsWith('/contrato/');
  const esEntrada = ruta === '/login';

  async function salir() {
    await fetch('/api/sesion', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <header className="border-b border-hueso/10">
      <div className="mx-auto max-w-7xl px-5 py-3">
        {esDeTrabajador || esEntrada ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold uppercase tracking-widest text-oro">
              Brasas de Lo Pirque
            </span>
            {/* En la pantalla de entrada sí, porque es la primera que se abre
                y es donde alguien se encuentra con el tema que no quería. En
                la página del trabajador no: ahí la barra es una sola palabra
                y el botón sería el único control de una página de lectura. */}
            {esEntrada && (<><span className="flex-1" /><BotonTema /></>)}
          </div>
        ) : (
          <>
            {/* Fila 1: quién eres y dónde estás. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <a href="/" className="text-base font-bold uppercase tracking-widest text-oro">
                Reservas
              </a>
              <span className="flex-1" />
              <BotonTema />
              {usuario && (
                <>
                  {/* El nombre de la cuenta ya no va a 12px y al 45%: es el
                      dato que contesta "¿con cuál estoy adentro?", y la
                      bitácora depende de que alguien se dé cuenta. */}
                  <span className="text-[13px] text-hueso/70">
                    {usuario}
                    <span className="ml-1 text-hueso/50">· {rol}</span>
                  </span>
                  {gerencia && (
                    <span className="rounded-full border-2 border-cielo-fuerte/60 bg-cielo/10 px-2.5 py-0.5
                                     text-[13px] font-semibold text-cielo-texto">👁 Vista gerencia</span>
                  )}
                  <button onClick={salir} className="tecla boton">Salir</button>
                </>
              )}
            </div>
            {/* Fila 2: a dónde puedes ir. */}
            <div className="mt-3">
              <Nav rol={rol} gerencia={gerencia} />
            </div>
            {soloMira && (
              <p className="mt-3 rounded-xl border-2 border-cielo-fuerte/60 bg-cielo/10 px-3 py-2 text-[14px]">
                <strong className="text-cielo-texto">👁 Vista gerencia: acá solo miras.</strong>{' '}
                Tu rol ({rol}) no cambia esta pantalla; si algo hay que corregir, pídeselo a quien la tiene a cargo.
              </p>
            )}
          </>
        )}
      </div>
    </header>
  );
}
