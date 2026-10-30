/**
 * La bitácora: quién hizo qué y cuándo.
 *
 * Es una página de servidor y no una pantalla con `fetch` porque **no hay
 * nada que tocar acá**: se lee y se cierra. Sin ruta de API propia tampoco
 * hay un endpoint nuevo que alguien pueda llamar para sacar el registro
 * completo en bruto.
 *
 * Muestra las últimas 200 líneas. El registro entero vive en la pestaña
 * `Bitácora` de la planilla, que es donde se busca cuando hace falta ir más
 * atrás — con el buscador de Sheets, que para esto es mejor que cualquier
 * filtro que pudiéramos escribir acá.
 */
import { headers } from 'next/headers';
import Ayuda from '@/components/Ayuda';
import { leerBitacora } from '@/lib/datos';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';
import { puede, type Rol } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  // El permiso se comprueba acá y no solo en el menú: el menú no se lo
  // muestra al encargado, pero escribir /bitacora a mano es gratis.
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  if (!puede((sesion?.rol ?? '') as Rol, 'bitacora')) {
    return (
      <div className="rounded border border-hueso/20 bg-panel p-4">
        <p className="font-semibold text-hueso/85">Esta parte no es tuya.</p>
        <p className="mt-1 text-sm text-hueso/70">
          La bitácora la ve el administrador.
        </p>
      </div>
    );
  }

  const lineas = await leerBitacora();

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Bitácora<Ayuda tema="bitacora" />
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-hueso/60">
        Lo último que se hizo en el panel, de lo más reciente a lo más
        antiguo. Las horas son de Chile.{' '}
        <strong>Queda el rastro, no el valor anterior</strong>: esto sirve
        para saber a quién preguntarle, no para deshacer un cambio.
      </p>

      {lineas.length === 0 ? (
        <p className="text-sm text-hueso/50">
          Todavía no hay nada anotado. La pestaña <code>Bitácora</code> se crea
          sola con la primera acción.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
              <tr className="border-b border-hueso/10">
                <th className="w-36 py-2 pr-3">Cuándo</th>
                <th className="w-44 py-2 pr-3">Quién</th>
                <th className="w-56 py-2 pr-3">Acción</th>
                <th className="py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i} className="border-b border-hueso/5 align-top">
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-hueso/55">
                    {l.cuando}
                  </td>
                  <td className="py-2 pr-3">
                    {l.quien}
                    {l.rol && <span className="ml-1 text-xs text-hueso/35">· {l.rol}</span>}
                  </td>
                  <td className="py-2 pr-3 text-hueso/85">{l.accion}</td>
                  <td className="py-2 text-hueso/55">{l.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 max-w-2xl text-xs text-hueso/50">
        Las {lineas.length} últimas. Para ir más atrás, la pestaña{' '}
        <code>Bitácora</code> de la planilla las tiene todas y se puede buscar
        ahí.
      </p>
    </section>
  );
}
