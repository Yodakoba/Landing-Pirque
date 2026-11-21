/**
 * **El documento de una persona en un periodo**: la boleta —el bruto que se
 * escribe en el SII, la retención y el neto que recibe— o la factura —el
 * total con IVA, el IVA y el neto— (2026-11-20, `lib/boletas.ts`).
 *
 * Es **la misma pieza** en el link personal (`/mi/`) y en el informe de
 * quien paga (regla de coherencia): la persona y quien le exige el documento
 * ven los mismos números, con las mismas palabras. Cambia solo la persona
 * gramatical —*"lo que escribes"* en el link, *"lo que escribe"* en el
 * informe— y lo que va debajo (los botones de cada pantalla).
 *
 * - **Falta**: borde ámbar cortado, y los números son los del **documento
 *   que falta** —si ya mandó una parte, solo el resto—.
 * - **Recibido**: borde verde lleno con ✓, y los números del periodo, para
 *   consultarlos.
 * - Siempre dice **cuánto se le transfiere**: con boleta, el neto; con
 *   factura, el total.
 *
 * Sin estado ni efectos: se dibuja igual en el servidor (el link) y en el
 * navegador (el informe).
 */
import type { ReactNode } from 'react';
import { tasaEnTexto, type CuentaBoleta } from '@/lib/boletas';
import { enPesos } from '@/lib/ocupacion';
import { rangoEnPalabras } from '@/lib/fechas';

export default function CajaBoleta({ titulo, cuenta, tu = false, estado = true, sinPropina = false, compacta = false, children }: {
  /** *Tu boleta de esta semana*, *Factura de noviembre*… */
  titulo: string;
  cuenta: CuentaBoleta;
  /** En el link personal: *"lo que escribes"*. En el informe: *"lo que escribe"*. */
  tu?: boolean;
  /** La pastilla de arriba. El informe la apaga: su botón ya dice si llegó. */
  estado?: boolean;
  /** El equipo: recuerda que la propina no va en la boleta. */
  sinPropina?: boolean;
  /**
   * **Más chica en el computador** (2026-11-21, el informe; lo pidió el
   * cliente: *"achicar un poco la parte de la boleta, un poco nomás"*). Desde
   * 1024px los botones de la pantalla suben a la fila del título, y bruto,
   * retención y neto van lado a lado, el bruto a 20px; sin la nota del pie,
   * que dice su `?`. Los mismos datos con las mismas palabras: cambia el
   * tamaño, no la pieza. En el celular, igual que siempre.
   */
  compacta?: boolean;
  /** Lo de cada pantalla: marcar el documento, ir al mes… */
  children?: ReactNode;
}) {
  const lista = cuenta.falta === 0;
  const d = lista ? cuenta.delPeriodo : cuenta.porBoletear;
  const factura = d.documento === 'factura';
  const de = (b: { desde: string; hasta: string }) => rangoEnPalabras([b.desde, b.hasta]);
  const verbo = factura ? (tu ? 'Ya facturaste' : 'Ya facturó') : (tu ? 'Ya boleteaste' : 'Ya boleteó');
  // Compacta, en el computador es una grilla: el título y los botones en la
  // primera fila, todo lo demás a lo ancho debajo.
  const ancho = compacta ? 'lg:col-span-2' : '';
  return (
    <section className={`rounded-xl border-2 p-3 ${lista
      ? 'border-verde/50 bg-verde/[0.05]' : 'border-dashed border-ambar/70 bg-ambar/[0.05]'} ${compacta
      ? 'lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-x-3 lg:px-3 lg:py-2' : ''}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${compacta ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
        <h3 className="text-[15px] font-bold first-letter:uppercase">
          <span aria-hidden>🧾</span> {titulo}
        </h3>
        {estado && (
          <span className={`whitespace-nowrap rounded-full border-2 px-2.5 py-0.5 text-[13px] font-bold ${lista
            ? 'border-verde-fuerte bg-verde/10 text-verde-texto' : 'border-dashed border-ambar/70 text-ambar-texto'}`}>
            {lista ? (tu ? '✓ Ya la recibimos' : '✓ Recibida') : (tu ? '○ Por mandar' : '○ Falta')}
          </span>
        )}
      </div>
      {(factura || d.incluido) && (
        <p className={`mt-0.5 text-[13px] text-hueso/70 ${ancho}`}>
          {factura
            ? (d.incluido ? 'Factura con el IVA incluido en lo que gana.' : 'Factura más IVA: el IVA va sobre lo que gana.')
            : 'Boleta con la retención incluida en lo que gana.'}
        </p>
      )}

      <dl className={`mt-2 space-y-1.5 ${compacta ? 'lg:col-span-2 lg:mt-1 lg:flex lg:items-start lg:gap-6 lg:space-y-0' : ''}`}>
        <div className={`flex items-baseline justify-between gap-3 ${compacta ? 'lg:block' : ''}`}>
          <dt className="min-w-0">
            <span className="text-[15px] font-bold">{factura ? 'Total' : 'Bruto'}</span>
            <span className={`block text-[13px] text-hueso/70 ${compacta ? 'lg:whitespace-nowrap' : ''}`}>
              {factura ? `lo que ${tu ? 'facturas' : 'factura'}, con IVA` : `lo que ${tu ? 'escribes' : 'escribe'} en la boleta del SII`}
            </span>
          </dt>
          <dd className={`shrink-0 text-[24px] font-bold tabular-nums text-oro ${compacta ? 'lg:text-[20px]' : ''}`}>{enPesos(d.enDocumento)}</dd>
        </div>
        <div className={`flex items-baseline justify-between gap-3 text-[14px] ${compacta ? 'lg:block' : ''}`}>
          <dt className="text-hueso/75">{factura ? 'IVA' : 'Retención'} {tasaEnTexto(d.tasa)}</dt>
          <dd className="shrink-0 tabular-nums text-hueso/80">{factura ? '' : '−'}{enPesos(d.impuesto)}</dd>
        </div>
        <div className={`flex items-baseline justify-between gap-3 border-t border-hueso/15 pt-1.5 ${compacta ? 'lg:block lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0' : ''}`}>
          <dt className="min-w-0">
            <span className="text-[15px] font-bold">Neto</span>
            <span className="block text-[13px] text-hueso/70">
              {factura ? 'sin IVA' : `lo que ${tu ? 'recibes' : 'recibe'}`}
            </span>
          </dt>
          <dd className="shrink-0 text-[18px] font-bold tabular-nums">{enPesos(d.neto)}</dd>
        </div>
      </dl>
      {/* Lo que sale del banco, dicho una vez: con boleta es el neto (la
          retención la paga la empresa en el F29); con factura, el total. */}
      {(factura || d.incluido) && (
        <p className={`mt-2 rounded-lg border border-hueso/15 px-2.5 py-1.5 text-[14px] ${ancho}`}>
          {tu ? 'Te transferimos' : 'Se le transfiere'} <b className="tabular-nums">{enPesos(d.aTransferir)}</b>
          {!factura && <span className="text-hueso/70"> · la retención la paga la empresa en el F29</span>}
        </p>
      )}

      {!lista && cuenta.boleteado > 0 && (
        <p className={`mt-2 text-[13px] text-hueso/80 ${ancho}`}>
          {verbo} {enPesos(cuenta.boleteado)} de {enPesos(cuenta.total)}: esta es la que falta.
        </p>
      )}
      {cuenta.diferencias.map((x) => (
        <p key={x.boleta.fila} className={`mt-2 text-[13px] font-semibold text-ambar-texto ${ancho}`}>
          La {factura ? 'factura' : 'boleta'} del {de(x.boleta)} fue por {enPesos(x.dice)} y hoy esos días suman {enPesos(x.suma)}:
          falta una por {enPesos(x.suma - x.dice)}.
        </p>
      ))}
      {lista && !cuenta.exacta && cuenta.otras.length > 0 && (
        <p className={`mt-2 text-[13px] text-verde-texto ${ancho}`}>
          {cuenta.otras.length === 1
            ? <>Con la {factura ? 'factura' : 'boleta'} del {de(cuenta.otras[0])}.</>
            : <>Con {cuenta.otras.length} {factura ? 'facturas' : 'boletas'}: {cuenta.otras.map(de).join(' · ')}.</>}
        </p>
      )}

      {children && (
        <div className={compacta ? 'lg:col-start-2 lg:row-start-1 lg:[&>*]:mt-0' : ''}>{children}</div>
      )}

      <p className={`mt-2 text-[13px] text-hueso/60 ${compacta ? 'lg:hidden' : ''}`}>
        {factura
          ? 'El IVA es el 19%; el neto y el IVA siempre suman el total.'
          : <>{sinPropina && 'Sin propina. '}La retención es la de la ley para el año en que se emite; el SII la calcula del bruto y puede ajustar un peso.</>}
      </p>
    </section>
  );
}
