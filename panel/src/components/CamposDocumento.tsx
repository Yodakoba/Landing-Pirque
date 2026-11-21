'use client';
/**
 * **Con qué documento se le paga a un vendedor o a un socio** (2026-11-20):
 * boleta o factura, si lo que gana trae el impuesto, y los datos de la
 * factura. La usan la ventana de agregar y la de *Documento* de la tarjeta,
 * así que se pregunta igual en los dos lugares (regla de coherencia).
 *
 * Todo con botones grandes, y un ejemplo en pesos que dice qué pasa con lo
 * elegido: *"si gana $100.000, boletea $100.000 y se le transfieren
 * $84.750"*. Es lo que decide cuánto sale del banco, así que se ve antes de
 * elegir.
 */
import CampoRut from './CampoRut';
import AyudaCorta from './AyudaCorta';
import { desgloseDocumento, retencionDelAno, tasaEnTexto, type Documento } from '@/lib/boletas';
import { faltaParaFacturar, type DatosFactura } from '@/lib/vendedores';
import { enPesos } from '@/lib/ocupacion';
import { hoy } from '@/lib/fechas';

const ENTRADA = 'min-h-[44px] w-full rounded-lg border-2 border-hueso/25 bg-tinta px-3 text-[16px] focus:border-oro focus:outline-none';

export interface CambioDocumento { documento?: Documento; incluido?: boolean; factura?: DatosFactura }

export default function CamposDocumento({ documento, incluido, factura, onCambio }: {
  documento: Documento; incluido: boolean; factura: DatosFactura;
  onCambio: (c: CambioDocumento) => void;
}) {
  const ej = desgloseDocumento(100000, { documento, incluido }, retencionDelAno(hoy()));
  const esFactura = documento === 'factura';
  const opciones = esFactura
    ? [[true, 'IVA incluido', 'Factura lo que gana, con el IVA adentro'], [false, 'Más IVA', 'Se le suma el 19% a lo que gana']] as const
    : [[true, 'Retención incluida', 'Boletea lo que gana; se le transfiere menos la retención'],
       [false, 'Retención aparte', 'Recibe lo que gana; boletea por más']] as const;
  const falta = faltaParaFacturar({ documento, factura });
  const campo = (k: keyof DatosFactura, v: string) => onCambio({ factura: { ...factura, [k]: v } });
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[15px] font-bold">¿Con qué documento se le paga?</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2" role="group" aria-label="Documento">
          {([['boleta', 'Boleta de honorarios'], ['factura', 'Factura']] as const).map(([k, rotulo]) => (
            <button key={k} type="button" aria-pressed={documento === k} onClick={() => onCambio({ documento: k })}
              className={`boton !min-h-[52px] !whitespace-normal !px-2 text-center !text-[15px] leading-tight ${documento === k
                ? '!border-oro bg-oro/15 font-bold !text-oro' : ''}`}>
              {documento === k ? '✓ ' : ''}{rotulo}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[15px] font-bold">Lo que gana según su trato…</p>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2" role="group" aria-label={esFactura ? 'IVA' : 'Retención'}>
          {opciones.map(([v, rotulo, detalle]) => (
            <button key={rotulo} type="button" aria-pressed={incluido === v} onClick={() => onCambio({ incluido: v })}
              className={`tecla flex min-h-[56px] flex-col items-start justify-center rounded-xl border-2 px-3 py-2 text-left ${incluido === v
                ? 'border-oro bg-oro/15' : 'border-hueso/20 hover:border-oro/60'}`}>
              <span className={`text-[15px] font-bold ${incluido === v ? 'text-oro' : ''}`}>{incluido === v ? '✓ ' : ''}{rotulo}</span>
              <span className="text-[13px] text-hueso/75">{detalle}</span>
            </button>
          ))}
        </div>
        {/* El ejemplo con números, en su `?` (2026-11-21, regla *lo que explica
            va en su ?*). */}
        <p className="mt-2 flex items-center gap-1.5 text-[14px] text-hueso/70">
          Un ejemplo con números
          <AyudaCorta titulo="Un ejemplo">
            Si gana {enPesos(100000)},{' '}
            {esFactura
              ? <>factura {enPesos(ej.enDocumento)} (neto {enPesos(ej.neto)} + IVA {tasaEnTexto(ej.tasa)} {enPesos(ej.impuesto)}) y se le transfieren {enPesos(ej.aTransferir)}.</>
              : <>boletea {enPesos(ej.enDocumento)}, se retienen {enPesos(ej.impuesto)} ({tasaEnTexto(ej.tasa)}) y se le transfieren {enPesos(ej.aTransferir)}.</>}
          </AyudaCorta>
        </p>
      </div>

      {esFactura && (
        <div className="space-y-2">
          <p className="text-[15px] font-bold">A nombre de quién se emite la factura</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[14px] font-semibold">Razón social
              <input className={ENTRADA} value={factura.razonSocial} placeholder="Turismo Valle del Maipo SpA"
                onChange={(e) => campo('razonSocial', e.target.value)} />
            </label>
            <label className="block text-[14px] font-semibold">RUT
              <CampoRut valor={factura.rut} onCambio={(v) => campo('rut', v)} className={ENTRADA} etiqueta="RUT de la factura" />
            </label>
            <label className="block text-[14px] font-semibold">Giro
              <input className={ENTRADA} value={factura.giro} placeholder="Agencia de viajes"
                onChange={(e) => campo('giro', e.target.value)} />
            </label>
            <label className="block text-[14px] font-semibold">Dirección
              <input className={ENTRADA} value={factura.direccion} placeholder="Calle, número, comuna"
                onChange={(e) => campo('direccion', e.target.value)} />
            </label>
          </div>
          {falta.length > 0 && (
            <p className="text-[13px] font-semibold text-ambar-texto">Falta {falta.join(', ')}: se puede completar después.</p>
          )}
        </div>
      )}
    </div>
  );
}
