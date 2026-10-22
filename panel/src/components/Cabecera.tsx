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
 */
import { usePathname } from 'next/navigation';
import Nav from './Nav';

export default function Cabecera({ rol, usuario }: { rol: string; usuario: string }) {
  const ruta = usePathname();
  // Ni la página del trabajador ni la planilla del grupo llevan barra:
  // todos sus enlaces pedirían una contraseña que quien las abre no tiene.
  const esDeTrabajador = ruta.startsWith('/mi/') || ruta.startsWith('/semana/');
  const esEntrada = ruta === '/login';

  async function salir() {
    await fetch('/api/sesion', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <header className="border-b border-hueso/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-4">
        {esDeTrabajador || esEntrada ? (
          <span className="text-sm font-bold uppercase tracking-widest text-oro">
            Brasas de Lo Pirque
          </span>
        ) : (
          <>
            <a href="/" className="text-sm font-bold uppercase tracking-widest text-oro">
              Reservas
            </a>
            <Nav rol={rol} />
            <span className="flex-1" />
            {usuario && (
              <span className="flex items-baseline gap-3 text-xs">
                <span className="text-hueso/45">
                  {usuario}
                  <span className="ml-1 text-hueso/30">· {rol}</span>
                </span>
                <button onClick={salir} className="text-hueso/60 hover:text-oro">
                  Salir
                </button>
              </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
