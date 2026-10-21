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
import TarjetaDia from './TarjetaDia';
import EquipoDialogo from './EquipoDialogo';
import { POR_DEFECTO, type Config } from '@/lib/config';
import { menusConocidos } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, type Menu } from '@/lib/menus';
import { resumenEquipo, type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { enPalabras, mesDe, mesEnPalabras, semanaDe, rangoEnPalabras, hoy } from '@/lib/fechas';

export default function CalendarView() {
  const [dias, setDias] = useState<Ocupacion[] | null>(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Ocupacion | null>(null);
  // Agregar una fecha usa la MISMA ventana que editar una: `editando` en
  // null no alcanza para distinguir "ninguna" de "una nueva", así que la
  // intención va aparte.
  const [agregandoFecha, setAgregandoFecha] = useState(false);
  const [fechasEnLaHoja, setFechasEnLaHoja] = useState<string[]>([]);
  const [cfg, setCfg] = useState<Config>(POR_DEFECTO);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [menus, setMenus] = useState<Menu[]>(POR_DEFECTO_MENUS);
  // El equipo se carga aparte del calendario a propósito: si la planilla
  // todavía no tiene las pestañas del equipo, el calendario se dibuja igual.
  // Lo que no hay es el resumen, y el dorso de la tarjeta lo dice.
  const [equipo, setEquipo] = useState<{
    puestos: Puesto[]; trabajadores: Trabajador[]; turnos: Turno[]; esAdmin: boolean;
  } | null>(null);
  const [planificando, setPlanificando] = useState<Ocupacion | null>(null);
  const [avisoPlanilla, setAvisoPlanilla] = useState('');

  /**
   * Copia el link de la planilla de una semana, para mandarlo al grupo.
   *
   * Lo que abre ese link es **quién trabaja cada día y los números del día**,
   * sin un peso y sin menús: está hecho para circular. Lo que un trabajador
   * necesita de su propio día vive en su link personal.
   */
  async function mandarPlanilla(lunes: string) {
    let token = cfg.tokenPlanilla;
    if (!token) {
      // No existe hasta que alguien lo crea: un link público, aunque sea con
      // llave, no puede aparecer solo.
      const r = await fetch('/api/planilla', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'crear' })
      });
      const d = await r.json();
      if (d.error) return setAvisoPlanilla(d.error);
      token = d.tokenPlanilla;
      setCfg({ ...cfg, tokenPlanilla: token });
    }
    const url = `${window.location.origin}/semana/${token}?semana=${lunes}`;
    navigator.clipboard?.writeText(url)
      .then(() => setAvisoPlanilla('Link de la planilla copiado. Mándalo al grupo.'))
      .catch(() => window.prompt('Link de la planilla:', url));
  }

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
    // Solo para avisar si una fecha nueva ya estaba en la hoja.
    fetch('/api/fechas')
      .then((r) => r.json())
      .then((d) => d.fechas && setFechasEnLaHoja(d.fechas.map((x: { fecha: string }) => x.fecha)))
      .catch(() => {});
    fetch('/api/reservas')
      .then((r) => r.json())
      .then((d) => {
        if (d.reservas) setReservas(d.reservas);
        if (d.menus) setMenus(d.menus);
      })
      .catch(() => {});
    fetch('/api/equipo')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setEquipo({
          puestos: d.puestos ?? [], trabajadores: d.trabajadores ?? [],
          turnos: d.turnos ?? [], esAdmin: !!d.esAdmin
        });
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
      <div className="mb-6 flex flex-wrap gap-3">
        <button onClick={() => setCreando(true)}
          className="rounded bg-oro px-4 py-2 text-sm font-semibold text-tinta">
          Agregar reserva
        </button>
        <button onClick={() => setAgregandoFecha(true)}
          className="rounded border border-hueso/20 px-4 py-2 text-sm hover:border-oro">
          Agregar fecha
        </button>
      </div>

      {avisoPlanilla && (
        <p className="mb-5 rounded border border-hueso/20 bg-hueso/5 px-3 py-2 text-sm">
          {avisoPlanilla}
        </p>
      )}

      {(editando || agregandoFecha) && (
        <DiaEditor
          dia={editando}
          cupoNormal={cfg.cupoNormal}
          apertura={cfg.horaApertura}
          fechasExistentes={fechasEnLaHoja}
          onListo={() => { setEditando(null); setAgregandoFecha(false); cargar(); }}
          onCancelar={() => { setEditando(null); setAgregandoFecha(false); }}
        />
      )}

      {planificando && equipo && (
        <EquipoDialogo
          fecha={planificando.fecha}
          personas={planificando.tomadas}
          puestos={equipo.puestos}
          trabajadores={equipo.trabajadores}
          turnos={equipo.turnos}
          esAdmin={equipo.esAdmin}
          onListo={() => { setPlanificando(null); cargar(); }}
          onCancelar={() => setPlanificando(null)}
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
            <p className="mb-2 flex flex-wrap items-baseline gap-3 text-xs text-hueso/35">
              {rangoEnPalabras(deLaSemana.map((x) => x.fecha))}
              <button onClick={() => mandarPlanilla(semanaDe(deLaSemana[0].fecha))}
                className="text-hueso/45 hover:text-oro">
                Enviar planilla semanal
              </button>
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {deLaSemana.map((d) => (
              <TarjetaDia key={d.fecha} d={d}
                resumen={equipo
                  ? resumenEquipo(equipo.turnos, equipo.puestos, d.fecha, d.tomadas)
                  : null}
                onEditar={() => setEditando(d)}
                onPlanificar={() => setPlanificando(d)} />
            ))}
            </div>
          </div>
          ))}
        </section>
      ))}
    </>
  );
}

export function Aviso({ error, permiso = false }: { error: string; permiso?: boolean }) {
  // Un 403 no es una falla de la planilla, y decir que lo es manda a buscar
  // el problema donde no está.
  if (permiso) {
    return (
      <div className="rounded border border-hueso/20 bg-hueso/5 p-4">
        <p className="font-semibold text-hueso/85">Esta parte no es tuya.</p>
        <p className="mt-1 text-sm text-hueso/70">{error}</p>
      </div>
    );
  }
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
