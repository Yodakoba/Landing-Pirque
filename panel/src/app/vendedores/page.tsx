/**
 * **El equipo de ventas** (2026-11-12). El vendedor la ve como *Mi resumen*,
 * con lo suyo; quien paga, la gerencia y el administrador eligen a cualquier
 * vendedor y editan cómo se le paga. El permiso se comprueba acá y en la
 * ruta: escribir /vendedores a mano es gratis.
 */
import { headers } from 'next/headers';
import ResumenVendedor from '@/components/ResumenVendedor';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';
import { puedeVer, ROL, type Rol } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  const rol = (sesion?.rol ?? '') as Rol;
  if (!puedeVer(rol, 'vendedores', sesion?.gerencia === true)) {
    return (
      <div className="rounded border border-hueso/20 bg-panel p-4">
        <p className="font-semibold text-hueso/85">Esta parte no es tuya.</p>
        <p className="mt-1 text-[14px] text-hueso/70">
          El resumen de ventas lo ven cada vendedor —el suyo—, quien hace los pagos, la gerencia
          general y el administrador.
        </p>
      </div>
    );
  }
  return <ResumenVendedor esVendedor={rol === ROL.vendedor} />;
}
