/**
 * **El link personal de un socio comercial** (2026-11-12, segunda entrega).
 * Un estado de cuenta como el del vendedor en *Mi resumen*, sin cuenta en
 * el panel: lo que trajo, la comisión que ganó en el mes, lo que viene y lo
 * que se le pagó. Componente de servidor, sin JavaScript: el mes va en la
 * URL. Las cuentas salen de `resumenDelPeriodo()`, la misma del informe.
 *
 * **Ve solo lo suyo**: sus ventas (las cotizaciones que lo nombran), con el
 * cliente, el neto y su comisión. No ve al vendedor, ni cobros, ni nada de
 * otras ventas.
 */
import type { FichaVendedor, Venta } from '@/lib/vendedores';
import { resumenDelPeriodo, porCobrar } from '@/lib/vendedores';
import { rangoDelPeriodo } from '@/lib/equipo';
import { pagosEnPeriodo, faltaDe, type PagoEquipo } from '@/lib/remuneraciones';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, mesEnPalabras, hoy } from '@/lib/fechas';

type VentaConFolio = Venta & { folio: string };

function Azulejo({ que, monto, tono, nota, grande = false }: {
  que: string; monto: number; tono: string; nota?: string; grande?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${tono}`}>
      <p className={`font-bold leading-none tabular-nums ${grande ? 'text-[34px]' : 'text-[24px]'}`}>{enPesos(monto)}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-hueso/70">{que}</p>
      {nota && <p className="text-[13px] text-hueso/60">{nota}</p>}
    </div>
  );
}

function Pestana({ href, elegida, children }: { href: string; elegida: boolean; children: React.ReactNode }) {
  return (
    <a href={href} aria-current={elegida ? 'page' : undefined}
       className={`tecla flex min-h-[56px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl
                   border-2 px-2 text-center text-[15px] font-bold ${elegida
         ? 'border-oro bg-oro text-tinta' : 'border-hueso/25 bg-panel text-hueso/85 hover:border-oro'}`}>
      {children}
    </a>
  );
}

function Flecha({ href, children, etiqueta }: { href: string; children: React.ReactNode; etiqueta: string }) {
  return (
    <a href={href} aria-label={etiqueta} title={etiqueta}
       className="tecla flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-hueso/25
                  bg-panel text-xl font-bold text-hueso/85 hover:border-oro hover:text-oro">{children}</a>
  );
}

const moverMes = (mes: string, n: number) => {
  let [a, m] = mes.split('-').map(Number);
  m += n;
  while (m < 1) { m += 12; a--; }
  while (m > 12) { m -= 12; a++; }
  return `${a}-${String(m).padStart(2, '0')}`;
};

/** Su trato en una frase: *"5% desde 22 personas, 10% desde 55, 15% desde 77, sobre el neto"*. */
function trato(f: FichaVendedor): string {
  const pct = (n: number) => `${String(n).replace('.', ',')}%`;
  const etapas = [
    f.comisionPct > 0 ? `${pct(f.comisionPct)} desde ${f.etapa1Desde || 1} ${f.etapa1Desde === 1 ? 'persona' : 'personas'}` : '',
    f.etapa2Pct > 0 ? `${pct(f.etapa2Pct)} desde ${f.etapa2Desde}` : '',
    f.etapa3Pct > 0 ? `${pct(f.etapa3Pct)} desde ${f.etapa3Desde}` : ''
  ].filter(Boolean);
  return [
    etapas.length ? `${etapas.join(', ')}, sobre el ${f.base === 'neto' ? 'neto' : 'total con IVA'}` : '',
    f.bonoPuntos > 0 ? `${pct(f.bonoPuntos)} más en los menús premium` : '',
    f.montoEvento > 0 ? `${enPesos(f.montoEvento)} por evento` : ''
  ].filter(Boolean).join(' + ');
}

export default function VistaSocio({ socio, ventas, pagos, token, p, v }: {
  socio: FichaVendedor;
  ventas: VentaConFolio[];
  pagos: PagoEquipo[];
  token: string;
  p?: string;
  v?: string;
}) {
  const ahora = hoy();
  const periodo = /^\d{4}-\d{2}$/.test(String(p ?? '')) ? String(p) : ahora.slice(0, 7);
  const { desde, hasta } = rangoDelPeriodo(periodo);
  const enlace = (q: string) => `/mi/${encodeURIComponent(token)}${q}`;
  const vista = v === 'viene' ? 'viene' : 'gane';
  const r = resumenDelPeriodo({ sueldoFijo: 0 }, ventas, desde, hasta);
  const recibidos = pagosEnPeriodo(pagos, socio.nombre, desde, hasta);
  const pagado = recibidos.reduce((s, x) => s + x.monto, 0);
  const falta = faltaDe(r.total, pagado);
  const vienen = porCobrar(ventas).sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento));
  const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

  return (
    <section className="mx-auto max-w-md">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-oro">Tu resumen · socio comercial</p>
      <h1 className="mt-1 text-xl font-bold uppercase tracking-wide">{socio.nombre}</h1>
      {trato(socio) && <p className="text-[15px] text-hueso/75">Tu comisión: {trato(socio)}.</p>}

      <nav className="mt-4 flex gap-2">
        <Pestana href={enlace(periodo === ahora.slice(0, 7) ? '' : `?p=${periodo}`)} elegida={vista === 'gane'}>
          <span aria-hidden>💰</span> Lo que gané
        </Pestana>
        <Pestana href={enlace('?v=viene')} elegida={vista === 'viene'}>
          <span aria-hidden>📅</span> Lo que viene
          {vienen.length > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[13px] tabular-nums ${vista === 'viene' ? 'bg-tinta/15' : 'bg-oro text-tinta'}`}>
              {vienen.length}
            </span>
          )}
        </Pestana>
      </nav>

      {vista === 'viene' ? (
        vienen.length === 0 ? (
          <p className="mt-6 rounded-2xl border-2 border-hueso/20 bg-panel p-4 text-[15px] text-hueso/80">
            No hay eventos tuyos esperando pago. Cuando un cliente que trajiste confirme, aparece acá —este mismo link sigue sirviendo—.
          </p>
        ) : (
          <>
            <p className="mt-5 text-[15px] text-hueso/80">Eventos confirmados que el cliente todavía no termina de pagar. Tu comisión llega cuando pague todo.</p>
            <ul className="mt-3 space-y-3">
              {vienen.map((x) => (
                <li key={x.id} className="rounded-2xl border-2 border-ambar-fuerte/50 bg-panel p-4 text-[15px]">
                  <p className="text-[17px] font-bold">{x.cliente}</p>
                  <p className="text-hueso/80 first-letter:uppercase">{enPalabras(x.fechaEvento)} · {cuenta(x.personas, 'persona', 'personas')}</p>
                  <p className="mt-1">Comisión que viene: <b className="text-ambar-texto">{enPesos(x.comision)}</b></p>
                  {x.detalle && <p className="text-[13px] text-hueso/70">{x.detalle}</p>}
                </li>
              ))}
            </ul>
          </>
        )
      ) : (
        <>
          <div className="mt-5 flex items-center gap-2 rounded-2xl border-2 border-oro/60 bg-oro/[0.06] p-2.5">
            <Flecha href={enlace(`?p=${moverMes(periodo, -1)}`)} etiqueta="Mes anterior">◀</Flecha>
            <p className="min-w-0 flex-1 text-center text-[17px] font-bold first-letter:uppercase">{mesEnPalabras(periodo)}</p>
            <Flecha href={enlace(`?p=${moverMes(periodo, 1)}`)} etiqueta="Mes siguiente">▶</Flecha>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Azulejo grande que="Lo que ganaste" monto={r.total} tono="border-oro/30 bg-oro/[0.06] text-oro"
                nota={cuenta(r.cuentan.length, 'evento pagado', 'eventos pagados')} />
            </div>
            <Azulejo que="Te pagamos" monto={pagado} tono="border-verde/40 bg-verde/[0.06] text-verde-texto"
              nota={recibidos.length ? cuenta(recibidos.length, 'pago', 'pagos') : undefined} />
            <Azulejo que="Falta" monto={falta} tono={falta > 0 ? 'border-ambar/40 bg-ambar/[0.06] text-ambar-texto' : 'border-hueso/20 bg-panel text-hueso/85'} />
          </div>

          <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-widest text-hueso/60">Evento por evento</h3>
          <p className="text-[13px] text-hueso/65">Cuentan en el mes en que el cliente terminó de pagar.</p>
          {r.cuentan.length === 0 ? (
            <p className="mt-2 text-[15px] text-hueso/70">Ninguno en este mes.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {(r.cuentan as VentaConFolio[]).map((x) => (
                <li key={x.id} className="rounded-xl border-2 border-verde-fuerte/40 bg-panel p-3 text-[15px]">
                  <p className="font-bold">{x.cliente}</p>
                  <p className="text-hueso/80 first-letter:uppercase">{enPalabras(x.fechaEvento)} · {cuenta(x.personas, 'persona', 'personas')}</p>
                  <p className="mt-1">Comisión: <b className="text-oro">{enPesos(x.comision)}</b></p>
                  {x.detalle && <p className="text-[13px] text-hueso/70">{x.detalle}</p>}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-widest text-hueso/60">Lo que te pagamos</h3>
          {recibidos.length === 0 ? (
            <p className="mt-2 text-[15px] text-hueso/70">Nada registrado en este mes.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {recibidos.map((x) => (
                <li key={x.id} className="rounded-xl border-2 border-verde/30 bg-panel p-3 text-[15px]">
                  <b>{enPesos(x.monto)}</b> el {enPalabras(x.fecha)}{x.nota ? ` · ${x.nota}` : ''}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
