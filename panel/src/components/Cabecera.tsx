'use client';

/**
 * La barra de arriba.
 *
 * **En la página del trabajador no hay barra.** No es cosmético: todos los
 * enlaces del panel le pedirían una contraseña que no tiene, así que una
 * barra ahí sería una fila de puertas cerradas. Lo que ve es su propia
 * página y nada más.
 */
import { usePathname } from 'next/navigation';
import Nav from './Nav';

export default function Cabecera({ rol }: { rol: string }) {
  const ruta = usePathname();
  const esDeTrabajador = ruta.startsWith('/mi/');

  return (
    <header className="border-b border-hueso/10">
      <div className="mx-auto flex max-w-6xl items-baseline gap-6 px-5 py-4">
        {esDeTrabajador ? (
          <span className="text-sm font-bold uppercase tracking-widest text-oro">
            Brasas de Lo Pirque
          </span>
        ) : (
          <>
            <a href="/" className="text-sm font-bold uppercase tracking-widest text-oro">
              Reservas
            </a>
            <Nav rol={rol} />
          </>
        )}
      </div>
    </header>
  );
}
