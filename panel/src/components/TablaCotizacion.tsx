/**
 * **La tabla de una cotización: sus líneas en neto y, abajo, neto,
 * descuento, IVA y total.** La usan la hoja de la cotización y el contrato
 * (2026-11-10), y por eso vive acá: así el contrato no puede decir un precio
 * distinto del que el cliente aprobó — que es justo lo que pasaba en el CRM
 * del socio, que perdía el descuento al armar el contrato.
 */
import { netoDeLinea, IVA, type Cuentas, type LineaPresupuesto } from '@/lib/presupuestos';
import { enUF } from '@/lib/uf';
import { enPesos } from '@/lib/ocupacion';

export default function TablaCotizacion({ lineas, cuentas, descuento, uf, fechaUF }: {
  lineas: LineaPresupuesto[];
  cuentas: Cuentas;
  /** El descuento sobre el total, en %. */
  descuento: number;
  uf: number;
  fechaUF: string;
}) {
  const tasaIVA = Math.round(IVA * 100);
  const precioNeto = (precio: number, ivaIncluido: boolean) =>
    Math.round(ivaIncluido ? precio / (1 + IVA) : precio);
  const p = { descuento, uf, fechaUF };
  return (
    <>
      {/* **La tabla se desplaza de lado dentro de su caja**, como las del
          panel, y lleva `relative` por lo mismo: sin eso la página entera se
          corría 11px a 393px —venía así de antes— y un documento que se
          abre en un teléfono no puede empezar movido. Al imprimir la caja
          deja de recortar: la hoja es mucho más ancha y la tabla entra. */}
      <div className="relative overflow-x-auto caja-tabla">
      <table className="w-full text-sm">
        <thead className="text-left text-[13px] font-semibold uppercase
                          tracking-wide text-hueso/60">
          <tr className="border-b border-hueso/20">
            <th className="py-2 pr-3">Concepto</th>
            <th className="py-2 pr-3 text-right">Cantidad</th>
            <th className="py-2 pr-3 text-right">Precio neto</th>
            <th className="py-2 text-right">Subtotal neto</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i} className="border-b border-hueso/10">
              <td className="py-2.5 pr-3">
                {l.concepto}
                {l.precioUF > 0 && (
                  <span className="ml-1 text-hueso/60">({enUF(l.precioUF)} c/u)</span>
                )}
                {l.precio === 0 && <span className="text-hueso/60"> · incluido</span>}
                {l.descuento > 0 && <span className="text-hueso/60"> · {l.descuento}% de descuento</span>}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{l.cantidad}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{enPesos(precioNeto(l.precio, l.ivaIncluido))}</td>
              <td className="py-2.5 text-right tabular-nums">{enPesos(Math.round(netoDeLinea(l)))}</td>
            </tr>
          ))}
          {lineas.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-hueso/60">
              Todavía no hay nada cotizado.
            </td></tr>
          )}
        </tbody>
        {/* **El desglose va sobre el total y no línea por línea**: la suma
            de los netos de cada línea no da el neto del total, y dos netos
            distintos en una misma hoja es justo lo que no puede pasar en un
            documento que va a la contabilidad de una empresa. El total es el
            que manda —es lo que se cobra— y por eso sigue siendo el número
            grande y en dorado. */}
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 pr-3 text-right text-sm text-hueso/70">
              Neto
            </td>
            <td className="pt-4 text-right text-sm tabular-nums text-hueso/70">
              {enPesos(cuentas.subtotal)}
            </td>
          </tr>
          {cuentas.descuento > 0 && (
            <>
              <tr>
                <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
                  Descuento {p.descuento}%
                </td>
                <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
                  −{enPesos(cuentas.descuento)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
                  Neto con descuento
                </td>
                <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
                  {enPesos(cuentas.neto)}
                </td>
              </tr>
            </>
          )}
          <tr>
            <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
              IVA {tasaIVA}%
            </td>
            <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
              {enPesos(cuentas.iva)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="border-t border-hueso/20 pr-3 pt-2 text-right
                                       text-sm font-semibold">
              Total
            </td>
            <td className="border-t border-hueso/20 pt-2 text-right text-xl
                           font-bold tabular-nums text-oro">
              {enPesos(cuentas.total)}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {/* **Que los precios incluyen IVA se dice con palabras, no solo con el
          desglose.** Un presupuesto que va a una empresa lo lee alguien que,
          si no está dicho, le suma 19% encima por costumbre — y nos deja
          fuera de presupuesto por un impuesto que ya estaba cobrado. */}
      <p className="mt-3 text-[13px] font-semibold text-hueso/70">
        Los precios de cada línea son netos: el IVA se suma al final.
      </p>
      {p.uf > 0 && lineas.some((l) => l.precioUF > 0) && (
        <p className="mt-1 text-[13px] text-hueso/70">
          Los valores en UF se convirtieron con la UF del {p.fechaUF}: {enPesos(p.uf)}.
        </p>
      )}

    </>
  );
}
