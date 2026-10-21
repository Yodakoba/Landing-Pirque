'use client';
/**
 * Los próximos fines de semana con su ocupación y el semáforo.
 *
 * El desglose online / en el local no es decoración: dice cuánta plata está
 * cobrada y cuánta hay que cobrar el mismo día.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Ocupacion } from '@/lib/tipos';
import { enPalabras, mesDe, mesEnPalabras } from '@/lib/fechas';

const COLOR: Record<Ocupacion['semaforo'], string> = {
  verde: 'border-emerald-500/50 bg-emerald-500/5',
  amarillo: 'border-amber-500/60 bg-amber-500/5',
  rojo: 'border-red-500/60 bg-red-500/5'
};
const PUNTO: Record<Ocupacion['semaforo'], string> = {
  verde: '🟢', amarillo: '🟡', rojo: '🔴'
};

export default function CalendarView() {
  const [dias, setDias] = useState<Ocupacion[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Sin parámetro: la ventana la decide dias_a_futuro de la planilla.
    fetch('/api/ocupacion')
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setDias(d.ocupacion)))
      .catch((e) => setError(String(e)));
  }, []);

  // Agrupado por mes, conservando el orden. Con 90 días a la vista una
  // grilla corrida se vuelve ilegible: el corte de mes es la referencia que
  // la gente usa para ubicarse.
  const meses = useMemo(() => {
    const grupos: { mes: string; dias: Ocupacion[] }[] = [];
    for (const d of dias ?? []) {
      const mes = mesDe(d.fecha);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.mes === mes) ultimo.dias.push(d);
      else grupos.push({ mes, dias: [d] });
    }
    return grupos;
  }, [dias]);

  if (error) return <Aviso error={error} />;
  if (!dias) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">Fechas abiertas</h1>
      <p className="text-hueso/60 text-sm mb-6">
        Toca un día para ver quiénes vienen.{' '}
        {dias.length > 0 && (
          <span className="text-hueso/40">
            {dias.length} días, hasta {enPalabras(dias[dias.length - 1].fecha)}.{' '}
          </span>
        )}
        <a href="/config" className="text-oro hover:underline">Cambiar el rango</a>.
      </p>

      {meses.map(({ mes, dias: delMes }) => (
        <section key={mes} className="mb-8 last:mb-0">
          {/* Separador sutil: una línea y el mes en chico. No un título
              grande, que competiría con el dato de cada día. */}
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs uppercase tracking-widest text-hueso/45">
              {mesEnPalabras(mes)}
            </h2>
            <span className="h-px flex-1 bg-hueso/10" />
            <span className="text-xs text-hueso/35">
              {delMes.length} {delMes.length === 1 ? 'día' : 'días'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {delMes.map((d) => (
          <a key={d.fecha} href={`/dia/${d.fecha}`}
             className={`block rounded border p-4 transition hover:border-oro ${COLOR[d.semaforo]}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm capitalize">{enPalabras(d.fecha)}</span>
              <span aria-hidden>{PUNTO[d.semaforo]}</span>
            </div>

            {d.capacidad === 0 && !d.bloqueada ? (
              <p className="mt-3 text-sm text-hueso/50">Sin capacidad definida</p>
            ) : (
              <>
                <p className="mt-3 text-2xl font-bold">
                  {d.tomadas}<span className="text-hueso/40">/{d.capacidad}</span>
                  <span className="ml-1 text-xs font-normal text-hueso/50">personas</span>
                </p>
                <p className="mt-2 text-xs text-hueso/60">
                  {d.online} pagadas online · {d.local} pagan en el local
                </p>
              </>
            )}

            {d.bloqueada && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-red-400">
                Bloqueado
              </p>
            )}
            {d.notas && <p className="mt-1 text-xs text-hueso/50">{d.notas}</p>}
          </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function Aviso({ error }: { error: string }) {
  return (
    <div className="rounded border border-red-500/50 bg-red-500/5 p-4">
      <p className="font-semibold text-red-300">No se pudo leer la planilla.</p>
      <p className="mt-1 text-sm text-hueso/70">{error}</p>
      <p className="mt-3 text-sm text-hueso/60">
        Abre <a className="underline" href="/api/diagnostico">/api/diagnostico</a> para
        ver si las hojas existen y si los encabezados calzan.
      </p>
    </div>
  );
}
