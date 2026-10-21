'use client';
/**
 * Los próximos fines de semana con su ocupación y el semáforo.
 *
 * El desglose online / en el local no es decoración: dice cuánta plata está
 * cobrada y cuánta hay que cobrar el mismo día.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Ocupacion, Reserva } from '@/lib/tipos';
import ReservaForm from './ReservaForm';
import DiaEditor from './DiaEditor';
import { POR_DEFECTO, type Config } from '@/lib/config';
import { menusConocidos } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, type Menu } from '@/lib/menus';
import { enPalabras, mesDe, mesEnPalabras, semanaDe, rangoEnPalabras, hoy } from '@/lib/fechas';

const COLOR: Record<Ocupacion['semaforo'], string> = {
  verde: 'border-emerald-500/50 bg-emerald-500/5',
  amarillo: 'border-amber-500/60 bg-amber-500/5',
  rojo: 'border-red-500/60 bg-red-500/5'
};
const PUNTO: Record<Ocupacion['semaforo'], string> = {
  verde: '🟢', amarillo: '🟡', rojo: '🔴'
};

/**
 * Qué porcentaje del cupo ocupa un número.
 *
 * Se recorta a 100 porque un día sobrevendido existe —el cupo se puede bajar
 * después de que la gente reservó— y una barra que se sale de su caja se ve
 * como un error de dibujo en vez de como un día lleno.
 */
const pct = (n: number, de: number) =>
  de > 0 ? Math.min(100, (n / de) * 100) : 0;

export default function CalendarView() {
  const [dias, setDias] = useState<Ocupacion[] | null>(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Ocupacion | null>(null);
  const [cfg, setCfg] = useState<Config>(POR_DEFECTO);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [menus, setMenus] = useState<Menu[]>(POR_DEFECTO_MENUS);

  const cargar = () => {
    // Sin parámetro: la ventana la decide dias_a_futuro de la planilla.
    fetch('/api/ocupacion')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setDias(d.ocupacion);
        if (d.config) setCfg(d.config);
      })
      .catch((e) => setError(String(e)));
    // Solo para los nombres de menú del formulario manual; si falla, el
    // calendario se dibuja igual y el formulario deja escribirlos a mano.
    fetch('/api/reservas')
      .then((r) => r.json())
      .then((d) => {
        if (d.reservas) setReservas(d.reservas);
        if (d.menus) setMenus(d.menus);
      })
      .catch(() => {});
  };
  useEffect(cargar, []);

  // Agrupado por mes, conservando el orden. Con 90 días a la vista una
  // grilla corrida se vuelve ilegible: el corte de mes es la referencia que
  // la gente usa para ubicarse.
  const meses = useMemo(() => {
    const grupos: { mes: string; semanas: { semana: string; dias: Ocupacion[] }[] }[] = [];
    for (const d of dias ?? []) {
      const mes = mesDe(d.fecha);
      const semana = semanaDe(d.fecha);
      let grupo = grupos[grupos.length - 1];
      if (!grupo || grupo.mes !== mes) {
        grupo = { mes, semanas: [] };
        grupos.push(grupo);
      }
      const ultima = grupo.semanas[grupo.semanas.length - 1];
      // Una semana que cruza de mes queda partida en dos grupos, a
      // proposito: el encabezado de mes manda, y un sabado 31 con su domingo
      // 1 se lee mejor separado que colgando del mes anterior.
      if (ultima && ultima.semana === semana) ultima.dias.push(d);
      else grupo.semanas.push({ semana, dias: [d] });
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

      {/* También está en la vista de cada día, pero ahí hay que entrar
          primero. Una reserva que llega por teléfono se anota sin saber
          todavía de qué día es: la fecha se elige en el formulario. */}
      <div className="mb-6">
        <button onClick={() => setCreando(true)}
          className="rounded bg-oro px-4 py-2 text-sm font-semibold text-tinta">
          Agregar reserva
        </button>
      </div>

      {editando && (
        <DiaEditor
          dia={editando}
          cupoNormal={cfg.cupoNormal}
          apertura={cfg.horaApertura}
          onListo={() => { setEditando(null); cargar(); }}
          onCancelar={() => setEditando(null)}
        />
      )}

      {creando && (
        <ReservaForm
          fecha={dias[0]?.fecha ?? hoy()}
          menusConocidos={[...new Set([
            ...menus.map((m) => m.nombre),
            ...menusConocidos(reservas, menus)
          ])].sort((a, b) => a.localeCompare(b))}
          catalogo={menus}
          reserva={null}
          onListo={() => { setCreando(false); cargar(); }}
          onCancelar={() => setCreando(false)}
        />
      )}

      {meses.map(({ mes, semanas }) => (
        <section key={mes} className="mb-8 last:mb-0">
          {/* Separador sutil: una línea y el mes en chico. No un título
              grande, que competiría con el dato de cada día. */}
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-xs uppercase tracking-widest text-hueso/45">
              {mesEnPalabras(mes)}
            </h2>
            <span className="h-px flex-1 bg-hueso/10" />
            <span className="text-xs text-hueso/35">
              {semanas.reduce((n, s) => n + s.dias.length, 0)} días
            </span>
          </div>

          {semanas.map(({ semana, dias: deLaSemana }) => (
          <div key={semana} className="mb-4 last:mb-0">
            {/* La semana se marca más suave que el mes: es una agrupación
                para escanear, no una sección. */}
            <p className="mb-2 text-xs text-hueso/35">
              {rangoEnPalabras(deLaSemana.map((x) => x.fecha))}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {deLaSemana.map((d) => (
          <div key={d.fecha}
             className={`rounded border p-4 transition ${COLOR[d.semaforo]}`}>
            <div className="flex items-start justify-between gap-2">
              <a href={`/dia/${d.fecha}`} className="text-sm capitalize hover:text-oro">
                {enPalabras(d.fecha)}
              </a>
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
                {/* La barra: cuánto del cupo está cobrado y cuánto falta
                    cobrar el mismo día. Verde es plata que ya está; ámbar
                    es plata que hay que cobrar en la puerta. El resto de la
                    barra es lo que queda libre. */}
                <div className="mt-3 flex h-1.5 overflow-hidden rounded bg-hueso/10"
                     role="img"
                     aria-label={`${d.online} pagadas online, ${d.local} pagan en el local, de ${d.capacidad} lugares`}>
                  <div className="bg-emerald-400"
                       style={{ width: `${pct(d.online, d.capacidad)}%` }} />
                  <div className="bg-amber-400"
                       style={{ width: `${pct(d.local, d.capacidad)}%` }} />
                </div>

                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className="text-hueso/70">
                    <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-400" />
                    <strong className="tabular-nums text-hueso">{d.online}</strong> pagadas
                  </span>
                  <span className="text-hueso/70">
                    <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />
                    <strong className="tabular-nums text-hueso">{d.local}</strong> en el local
                  </span>
                </p>
              </>
            )}

            {d.bloqueada && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-red-400">
                Bloqueado
              </p>
            )}
            {d.notas && <p className="mt-1 text-xs text-hueso/50">{d.notas}</p>}

            <div className="mt-3 flex items-center gap-3 border-t border-hueso/10 pt-3 text-xs">
              <a href={`/dia/${d.fecha}`} className="text-hueso/60 hover:text-oro">
                Ver quiénes vienen
              </a>
              <span className="flex-1" />
              <button onClick={() => setEditando(d)}
                className="text-hueso/60 hover:text-oro">
                {d.capacidad === 0 && !d.bloqueada ? 'Abrir día' : 'Editar'}
              </button>
            </div>
          </div>
            ))}
            </div>
          </div>
          ))}
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
