/**
 * **El link personal de un colaborador extra** (2026-11-12, lo pidió el
 * cliente: *"link personal para los extras, absolutamente corresponde"*).
 * Es la misma idea que la del trabajador —un estado de cuenta, no una
 * agenda— con lo que tiene un jinete o una pintacaritas: sus días, lo que
 * ganó (lo confirmado), lo que se le pagó y lo que viene.
 *
 * Componente de servidor, sin JavaScript: el periodo va en la URL. Las
 * cuentas salen de `informeDeExtras()`, la misma función del informe de
 * quien paga, para que los dos vean el mismo número.
 */
import type { Colaborador, Extra } from '@/lib/extras';
import { informeDeExtras, costoDeExtra } from '@/lib/extras';
import { VINO, rangoDelPeriodo, semanaPorDefecto, esPeriodo, etiquetaSemana } from '@/lib/equipo';
import { pagosEnPeriodo, faltaDe, type PagoEquipo } from '@/lib/remuneraciones';
import { enPesos } from '@/lib/ocupacion';
import { normalizar } from '@/lib/columnas';
import { enPalabras, mesEnPalabras, rangoEnPalabras, sumarDias, hoy } from '@/lib/fechas';

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

/** Cómo quedó ese día, por forma y no solo por color. */
function Estado({ e }: { e: Pick<Extra, 'estado'> }) {
  const [icono, texto, clase] = e.estado === VINO.si ? ['✓', 'confirmado', 'border-verde-fuerte/60 bg-verde/10 text-verde-texto']
    : e.estado === VINO.no ? ['✕', 'no vino', 'border-rojo-fuerte/60 bg-rojo/10 text-rojo-texto']
    : ['○', 'sin confirmar', 'border-ambar-fuerte/60 bg-ambar/10 text-ambar-texto'];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 px-2 py-0.5 text-[13px] font-bold ${clase}`}>
      <span aria-hidden>{icono}</span>{texto}
    </span>
  );
}

export default function VistaColaborador({ quien, extras, pagos, token, p, v, apertura }: {
  quien: Colaborador;
  extras: Extra[];
  pagos: PagoEquipo[];
  token: string;
  p?: string;
  v?: string;
  /** La hora de apertura de cada día, para lo que viene. */
  apertura: (fecha: string) => string;
}) {
  const ahora = hoy();
  const suyos = extras.filter((e) => normalizar(e.colaborador) === normalizar(quien.nombre));
  const pasados = suyos.filter((e) => e.fecha < ahora);
  const vienen = suyos.filter((e) => e.fecha >= ahora).sort((a, b) => a.fecha.localeCompare(b.fecha));

  const pedido = String(p ?? '');
  const periodo = esPeriodo(pedido) ? pedido : semanaPorDefecto(ahora);
  const esMes = periodo.length === 7;
  const { desde, hasta } = rangoDelPeriodo(periodo);
  const comoSeLlama = esMes ? mesEnPalabras(periodo) : rangoEnPalabras([desde, hasta]);
  const enlace = (q: string) => `/mi/${encodeURIComponent(token)}${q}`;
  const vista = v === 'viene' ? 'viene' : 'gane';

  // Las mismas cuentas que el informe de quien paga.
  const l = informeDeExtras(pasados, desde, hasta)[0];
  const total = l?.total ?? 0;
  const recibidos = pagosEnPeriodo(pagos, quien.nombre, desde, hasta);
  const pagado = recibidos.reduce((s, x) => s + x.monto, 0);
  const falta = faltaDe(total, pagado);
  const delPeriodo = pasados.filter((e) => e.fecha >= desde && e.fecha <= hasta).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const mesActual = ahora.slice(0, 7);
  const mesAnterior = (() => {
    const [a, m] = mesActual.split('-').map(Number);
    return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
  })();

  return (
    <section className="mx-auto max-w-md">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-oro">Tu resumen</p>
      <h1 className="mt-1 text-xl font-bold uppercase tracking-wide">{quien.nombre}</h1>
      {quien.actividad && <p className="text-[15px] text-hueso/75">{quien.actividad}</p>}

      <nav className="mt-4 flex gap-2">
        <Pestana href={enlace('')} elegida={vista === 'gane'}><span aria-hidden>💰</span> Lo que gané</Pestana>
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
            No tienes días agendados por ahora. Cuando te agenden uno, aparece acá —este mismo link sigue sirviendo—.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {vienen.map((e) => (
              <li key={e.fecha + e.actividad} className={`rounded-2xl border-2 bg-panel p-4 ${e.fecha === ahora ? 'border-oro' : 'border-hueso/20'}`}>
                <p className="text-[17px] font-bold first-letter:uppercase">{e.fecha === ahora ? 'Hoy · ' : ''}{enPalabras(e.fecha)}</p>
                <p className="text-[15px] text-hueso/80">{e.actividad || quien.actividad}{apertura(e.fecha) ? ` · desde las ${apertura(e.fecha)}` : ''}</p>
                {e.monto > 0 && <p className="mt-1 text-[15px]">Acordado: <b>{enPesos(e.monto)}</b></p>}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          {!esMes && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border-2 border-oro/60 bg-oro/[0.06] p-2.5">
              <Flecha href={enlace(`?p=${sumarDias(desde, -7)}`)} etiqueta="Semana anterior">◀</Flecha>
              <div className="min-w-0 flex-1 text-center">
                <span className="inline-block rounded-full border-2 border-hueso/25 px-2.5 py-0.5 text-[13px] font-bold">
                  {etiquetaSemana(desde, ahora)}
                </span>
                <p className="mt-1 text-[17px] font-bold leading-tight first-letter:uppercase">{comoSeLlama}</p>
              </div>
              <Flecha href={enlace(`?p=${sumarDias(desde, 7)}`)} etiqueta="Semana siguiente">▶</Flecha>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {[mesActual, mesAnterior].map((m) => (
              <a key={m} href={enlace(`?p=${m}`)} aria-current={periodo === m ? 'page' : undefined}
                 className={`boton tecla first-letter:uppercase ${periodo === m ? 'boton-relleno' : ''}`}>{mesEnPalabras(m)}</a>
            ))}
            {esMes && <a href={enlace('')} className="boton tecla">Por semana</a>}
          </div>
          {esMes && <h2 className="mt-6 text-base font-bold first-letter:uppercase">{comoSeLlama}</h2>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Azulejo grande que="Lo que ganaste" monto={total} tono="border-oro/30 bg-oro/[0.06] text-oro"
                nota={`${l?.dias ?? 0} ${(l?.dias ?? 0) === 1 ? 'día confirmado' : 'días confirmados'}`} />
            </div>
            <Azulejo que="Te pagaron" monto={pagado} tono="border-verde/40 bg-verde/[0.06] text-verde-texto"
              nota={recibidos.length ? `${recibidos.length} ${recibidos.length === 1 ? 'pago' : 'pagos'}` : undefined} />
            <Azulejo que="Falta" monto={falta} tono={falta > 0 ? 'border-ambar/40 bg-ambar/[0.06] text-ambar-texto' : 'border-hueso/20 bg-panel text-hueso/85'} />
          </div>
          {(l?.sinConfirmar ?? 0) > 0 && (
            <p className="mt-3 rounded-xl border-2 border-ambar-fuerte/60 bg-ambar/10 p-3 text-[15px]">
              <b>{l!.sinConfirmar} {l!.sinConfirmar === 1 ? 'día sin confirmar' : 'días sin confirmar'}</b>: no suman hasta que lo confirmen.
              Si viniste, avísale a quien te contrató.
            </p>
          )}

          <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-widest text-hueso/60">Día por día</h3>
          {delPeriodo.length === 0 ? (
            <p className="mt-2 text-[15px] text-hueso/70">Sin días en este periodo.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {delPeriodo.map((e) => (
                <li key={e.fecha + e.actividad} className="rounded-xl border-2 border-hueso/15 bg-panel p-3 text-[15px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold first-letter:uppercase">{enPalabras(e.fecha)}</span>
                    <Estado e={e} />
                  </div>
                  <p className="text-hueso/75">{e.actividad || quien.actividad}</p>
                  {e.estado === VINO.si && (
                    <p className="mt-1">
                      {enPesos(e.monto || 0)}
                      {e.ajuste ? <> {e.ajuste < 0 ? '−' : '+'} {enPesos(Math.abs(e.ajuste))}{e.motivo ? ` (${e.motivo})` : ''}</> : null}
                      {' = '}<b className="text-oro">{enPesos(costoDeExtra(e))}</b>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-7 text-[13px] font-semibold uppercase tracking-widest text-hueso/60">Lo que te pagaron</h3>
          {recibidos.length === 0 ? (
            <p className="mt-2 text-[15px] text-hueso/70">Nada registrado en este periodo.</p>
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
