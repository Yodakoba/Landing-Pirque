/**
 * **La boleta de una persona en un periodo**: el bruto que se escribe en el
 * SII, la retención y el neto que recibe (2026-11-20, `lib/boletas.ts`).
 *
 * Es **la misma pieza** en el link personal (`/mi/`) y en el informe de
 * quien paga (regla de coherencia): la persona y quien le exige la boleta
 * ven los mismos tres números, con las mismas palabras. Cambia solo la
 * persona gramatical —*"lo que escribes"* en el link, *"lo que escribe"* en
 * el informe— y lo que va debajo (los botones de cada pantalla).
 *
 * - **Falta**: borde ámbar cortado, y los números son los de **la boleta que
 *   falta** —si ya boleteó una parte, solo el resto—.
 * - **Recibida**: borde verde lleno con ✓, y los números del periodo, para
 *   consultarlos.
 *
 * Sin estado ni efectos: se dibuja igual en el servidor (el link) y en el
 * navegador (el informe).
 */
import type { ReactNode } from 'react';
import { tasaEnTexto, type CuentaBoleta } from '@/lib/boletas';
import { enPesos } from '@/lib/ocupacion';
import { rangoEnPalabras } from '@/lib/fechas';

export default function CajaBoleta({ titulo, cuenta, tu = false, estado = true, children }: {
  /** *Tu boleta de esta semana*, *Boleta del periodo*… */
  titulo: string;
  cuenta: CuentaBoleta;
  /** En el link personal: *"lo que escribes"*. En el informe: *"lo que escribe"*. */
  tu?: boolean;
  /** La pastilla de arriba. El informe la apaga: su botón ya dice si llegó. */
  estado?: boolean;
  /** Lo de cada pantalla: marcar la boleta, ir al mes… */
  children?: ReactNode;
}) {
  const lista = cuenta.falta === 0;
  const d = lista ? cuenta.delPeriodo : cuenta.porBoletear;
  const de = (b: { desde: string; hasta: string }) => rangoEnPalabras([b.desde, b.hasta]);
  return (
    <section className={`rounded-xl border-2 p-3 ${lista
      ? 'border-verde/50 bg-verde/[0.05]' : 'border-dashed border-ambar/70 bg-ambar/[0.05]'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
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

      <dl className="mt-2 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="min-w-0">
            <span className="text-[15px] font-bold">Bruto</span>
            <span className="block text-[13px] text-hueso/70">
              lo que {tu ? 'escribes' : 'escribe'} en la boleta del SII
            </span>
          </dt>
          <dd className="shrink-0 text-[24px] font-bold tabular-nums text-oro">{enPesos(d.bruto)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-[14px]">
          <dt className="text-hueso/75">Retención {tasaEnTexto(d.tasa)}</dt>
          <dd className="shrink-0 tabular-nums text-hueso/80">−{enPesos(d.retencion)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-hueso/15 pt-1.5">
          <dt className="min-w-0">
            <span className="text-[15px] font-bold">Neto</span>
            <span className="block text-[13px] text-hueso/70">lo que {tu ? 'recibes' : 'recibe'}</span>
          </dt>
          <dd className="shrink-0 text-[18px] font-bold tabular-nums">{enPesos(d.neto)}</dd>
        </div>
      </dl>

      {!lista && cuenta.boleteado > 0 && (
        <p className="mt-2 text-[13px] text-hueso/80">
          {tu ? 'Ya boleteaste' : 'Ya boleteó'} {enPesos(cuenta.boleteado)} de {enPesos(cuenta.neto)}:
          esta es la que falta.
        </p>
      )}
      {cuenta.diferencias.map((x) => (
        <p key={x.boleta.fila} className="mt-2 text-[13px] font-semibold text-ambar-texto">
          La boleta del {de(x.boleta)} fue por {enPesos(x.dice)} y hoy esos días suman {enPesos(x.suma)}:
          falta una por {enPesos(x.suma - x.dice)}.
        </p>
      ))}
      {lista && !cuenta.exacta && cuenta.otras.length > 0 && (
        <p className="mt-2 text-[13px] text-verde-texto">
          {cuenta.otras.length === 1
            ? <>Con la boleta del {de(cuenta.otras[0])}.</>
            : <>Con {cuenta.otras.length} boletas: {cuenta.otras.map(de).join(' · ')}.</>}
        </p>
      )}

      {children}

      <p className="mt-2 text-[13px] text-hueso/60">
        Sin propina. La retención es la de la ley para el año en que se emite; el SII
        la calcula del bruto y puede ajustar un peso.
      </p>
    </section>
  );
}
