/**
 * **El contrato, como lo firma el cliente** (Fase 4, 2026-11-10).
 *
 * Misma forma que la hoja de la cotización (`/presupuesto/<token>`) y con
 * el mismo token: un componente de servidor que lee la planilla directo, sin
 * ninguna ruta de API nueva, y que se guarda a PDF desde el navegador.
 *
 * **Se firma en papel**, en dos ejemplares, que es lo que se hacía con el
 * CRM del socio y lo que decidió el cliente. El firmado se sube después
 * desde la cotización, a Drive. Por eso esta página **no tiene un botón de
 * "firmar"**: sería una puerta de escritura sin contraseña.
 *
 * El texto y la numeración salen de `lib/contrato.ts`; la tabla del precio
 * es la misma de la cotización (`TablaCotizacion`), así que el contrato no
 * puede decir un precio distinto del que el cliente aprobó.
 */
import { leerPresupuestos, leerLineasPresupuesto, leerClientes, leerConfig } from '@/lib/datos';
import { porToken, lineasDe } from '@/lib/presupuestos';
import HojaContrato from '@/components/HojaContrato';
import { vistaPrevia } from '@/lib/vistaPrevia';

/** El título al llegar el link: ver `lib/vistaPrevia.ts`. */
export const metadata = vistaPrevia('Contrato', 'El contrato del evento, para revisarlo e imprimirlo.');

export const dynamic = 'force-dynamic';

export default async function Pagina({ params }: { params: { token: string } }) {
  const [lista, todas, clientes, cfg] = await Promise.all([
    leerPresupuestos(), leerLineasPresupuesto(),
    leerClientes().catch(() => []), leerConfig()
  ]);
  const p = porToken(lista, decodeURIComponent(params.token ?? ''));

  // El mismo mensaje para un link inventado y uno que ya no está, como en
  // la cotización.
  if (!p) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">Este link no sirve</h1>
        <p className="mt-3 text-sm text-hueso/70">
          Puede estar mal copiado, o puede que te hayan mandado uno nuevo.
          Escríbenos y te lo reenviamos.
        </p>
      </section>
    );
  }

  return <HojaContrato p={p} lista={lista} lineas={lineasDe(todas, p.id)} clientes={clientes} cfg={cfg} />;
}
