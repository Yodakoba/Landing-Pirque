'use client';
/**
 * Los próximos fines de semana con su ocupación y el semáforo.
 *
 * El desglose online / en el local no es decoración: dice cuánta plata está
 * cobrada y cuánta hay que cobrar el mismo día.
 */
import { useEffect, useMemo, useState } from 'react';
import Ayuda from './Ayuda';
import { verRecorrido } from './Recorrido';
import type { Ocupacion, Reserva } from '@/lib/tipos';
import ReservaForm from './ReservaForm';
import DiaEditor from './DiaEditor';
import TarjetaDia from './TarjetaDia';
import { usePronostico } from './Clima';
import EquipoDialogo from './EquipoDialogo';
import { POR_DEFECTO, type Config } from '@/lib/config';
import { menusConocidos } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, type Menu } from '@/lib/menus';
import { resumenEquipo, type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { enPalabras, mesDe, mesEnPalabras, semanaDe, rangoEnPalabras, hoy } from '@/lib/fechas';

/**
 * Lo que se dice de una semana completa, de un vistazo.
 *
 * **En el local se piensa por semana**, que es lo que pidió el cliente el
 * 2026-10-30: el mes sigue marcado, pero la unidad que se mira es la semana.
 * Por eso cada una es ahora una caja con su cabecera, y no una línea gris
 * sobre una grilla corrida.
 *
 * Los días cerrados no se cuentan como públicos ni como privados: se nombran
 * aparte, porque "3 días" que incluyen uno que no abre no es lo que alguien
 * lee ahí.
 */
function resumenSemana(dias: Ocupacion[]) {
  let personas = 0, publicos = 0, privados = 0, cerrados = 0;
  for (const d of dias) {
    personas += d.tomadas;
    if (d.bloqueada) cerrados++;
    else if (d.privada) privados++;
    else publicos++;
  }
  const partes = [
    publicos ? `${publicos} ${publicos === 1 ? 'público' : 'públicos'}` : null,
    privados ? `${privados} ${privados === 1 ? 'privado' : 'privados'}` : null,
    cerrados ? `${cerrados} ${cerrados === 1 ? 'cerrado' : 'cerrados'}` : null
  ].filter(Boolean);
  return { personas, dias: partes.join(' · ') };
}

export default function CalendarView() {
  const [dias, setDias] = useState<Ocupacion[] | null>(null);
  const pronostico = usePronostico();
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
  // **Una fecha, no una Ocupacion**: a un día de preparación se le asigna
  // equipo sin que exista en el calendario, así que no hay ocupación que
  // pasarle. Ver "Agregar fecha" y la opción de preparación.
  const [planificando, setPlanificando] =
    useState<{ fecha: string; personas: number } | null>(null);
  const [avisoPlanilla, setAvisoPlanilla] = useState('');

  /** Crear o renovar la llave. Devuelve la nueva, o `''` si algo falló. */
  async function pedirToken(accion: 'crear' | 'renovar') {
    const r = await fetch('/api/planilla', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accion })
    });
    const d = await r.json();
    if (d.error) { setAvisoPlanilla(d.error); return ''; }
    setCfg((antes) => ({ ...antes, tokenPlanilla: d.tokenPlanilla }));
    return d.tokenPlanilla as string;
  }

  /**
   * Copia el link de la planilla de una semana, para mandarlo al grupo.
   *
   * Lo que abre ese link es **quién trabaja cada día y los números del día**,
   * sin un peso y sin menús: está hecho para circular. Lo que un trabajador
   * necesita de su propio día vive en su link personal.
   */
  async function mandarPlanilla(lunes: string) {
    // No existe hasta que alguien lo crea: un link público, aunque sea con
    // llave, no puede aparecer solo.
    const token = cfg.tokenPlanilla || await pedirToken('crear');
    if (!token) return;
    const url = `${window.location.origin}/semana/${token}?semana=${lunes}`;
    navigator.clipboard?.writeText(url)
      .then(() => setAvisoPlanilla('Link de la planilla copiado. Mándalo al grupo.'))
      .catch(() => window.prompt('Link de la planilla:', url));
  }

  /**
   * Renovar la llave: lo que hay que hacer cuando alguien deja el equipo.
   *
   * **Pide confirmación porque no afecta a una persona, afecta a todas**:
   * la copia que tiene guardada quien sí trabaja también deja de servir, así
   * que después hay que volver a mandar el link. Es el único botón del
   * calendario que rompe algo que ya estaba andando.
   */
  async function renovarPlanilla() {
    if (!confirm('¿Renovar el link de la planilla?\n\nLas copias que ya '
               + 'mandaste dejan de servir al instante, también las de quienes '
               + 'siguen en el equipo: vas a tener que mandarlo de nuevo.')) {
      return;
    }
    if (await pedirToken('renovar')) {
      setAvisoPlanilla('Link renovado: las copias anteriores dejaron de servir. '
                     + 'Vuelve a mandarlo con "Enviar planilla semanal".');
    }
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

  /**
   * Agrupado **por semana**, conservando el orden.
   *
   * Hasta el 2026-10-30 el corte de mes mandaba y una semana que cruzaba de
   * mes quedaba partida en dos. Dejó de tener sentido cuando la semana pasó
   * a ser una caja: un sábado 31 y su domingo 1 son el mismo fin de semana
   * —el mismo turno, la misma planilla— y verlos en dos cajas distintas es
   * justo lo contrario de lo que el cliente pidió. El mes sigue marcado,
   * como una línea antes de la primera semana que lo estrena.
   */
  const semanas = useMemo(() => {
    const grupos: { semana: string; dias: Ocupacion[] }[] = [];
    for (const d of dias ?? []) {
      const semana = semanaDe(d.fecha);
      const ultima = grupos[grupos.length - 1];
      if (ultima && ultima.semana === semana) ultima.dias.push(d);
      else grupos.push({ semana, dias: [d] });
    }
    return grupos;
  }, [dias]);

  if (error) return <Aviso error={error} />;
  if (!dias) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">
        Fechas abiertas
        {/* El único `?` que además ofrece el recorrido: es la portada,
            o sea donde vuelve quien se perdió. */}
        <Ayuda tema="calendario" onRecorrido={verRecorrido} />
      </h1>
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
        <p className="mb-2 rounded border border-hueso/20 bg-panel px-3 py-2 text-sm">
          {avisoPlanilla}
        </p>
      )}

      {/* **Renovar vive acá y no en cada semana**: el link es uno solo para
          todas, y repetir el botón semana por semana haría pensar que se
          renueva "la de este sábado". Aparece recién cuando hay una llave
          creada —antes no hay nada que renovar— y en letra chica, porque es
          lo que casi nunca hay que apretar. */}
      {cfg.tokenPlanilla && (
        <p className="mb-5 text-xs text-hueso/35">
          El link de la planilla semanal ya está creado.{' '}
          <button onClick={renovarPlanilla} className="text-hueso/50 hover:text-oro"
            title="Las copias que andan dando vueltas dejan de servir al instante">
            Renovarlo
          </button>{' '}
          deja sin servir las copias que andan dando vueltas — es lo que hay
          que hacer cuando alguien deja el equipo.
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
          /* Un día de preparación no se agrega, se planifica: se cierra esta
             ventana y se abre la del equipo de esa fecha. No se escribe nada
             en `Fechas Hábiles`, así que el sitio sigue sin ofrecer ese día. */
          onPreparacion={(fecha) => {
            setAgregandoFecha(false);
            setPlanificando({ fecha, personas: 0 });
          }}
        />
      )}

      {planificando && equipo && (
        <EquipoDialogo
          fecha={planificando.fecha}
          personas={planificando.personas}
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

      {semanas.map(({ semana, dias: deLaSemana }, i) => {
        const resumen = resumenSemana(deLaSemana);
        const esta = semana === semanaDe(hoy());
        // El mes se anuncia antes de la PRIMERA semana que lo estrena, y no
        // envolviendo las semanas: así una que cruza de mes sigue entera y
        // el mes igual queda marcado. Se mira el primer día de la semana
        // porque es el que decide bajo qué mes aparece.
        const mes = mesDe(deLaSemana[0].fecha);
        const anterior = i > 0 ? mesDe(semanas[i - 1].dias[0].fecha) : null;
        const estrena = mes !== anterior;
        return (
        <div key={semana}>
          {estrena && (
            /* Separador sutil: una línea y el mes en chico. No un título
               grande, que competiría con el dato de cada día. */
            <div className={`mb-3 flex items-center gap-3 ${i > 0 ? 'mt-8' : ''}`}>
              <h2 className="text-xs uppercase tracking-widest text-hueso/45">
                {mesEnPalabras(mes)}
              </h2>
              <span className="h-px flex-1 bg-hueso/10" />
              <span className="text-xs text-hueso/35">
                {(dias ?? []).filter((d) => mesDe(d.fecha) === mes).length} días
              </span>
            </div>
          )}

          {/* **La semana es la caja y el mes la línea de arriba**, y no al
              revés como era hasta el 2026-10-30. Lo pidió el cliente con el
              porqué: en el local se piensa por semana. El mes sigue marcado
              —es la referencia para ubicarse entre 90 días— pero dejó de ser
              lo que agrupa: una grilla corrida bajo un título de mes no dice
              dónde termina un fin de semana y empieza el otro. */}
          <div
            className={`mb-4 rounded-lg border p-3 ${
              esta ? 'border-oro/40 bg-oro/[0.03]' : 'border-hueso/15'}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1
                            border-b border-hueso/10 pb-2">
              <strong className="text-sm">
                {rangoEnPalabras(deLaSemana.map((x) => x.fecha))}
              </strong>
              {esta && (
                <span className="rounded bg-oro/15 px-1.5 py-0.5 text-[10px]
                                 font-semibold uppercase tracking-wide text-oro">
                  esta semana
                </span>
              )}
              {/* Lo que se pregunta de una semana: cuánta gente viene y qué
                  días son. Los estados ya están en cada tarjeta; acá va el
                  conteo, que es lo que no se puede ver sin sumarlo. */}
              <span className="text-xs text-hueso/50">
                <strong className="tabular-nums text-hueso/75">{resumen.personas}</strong>
                {resumen.personas === 1 ? ' persona' : ' personas'}
                {resumen.dias && <span className="text-hueso/35"> · {resumen.dias}</span>}
              </span>
              <span className="flex-1" />
              <button onClick={() => mandarPlanilla(semana)}
                className="text-xs text-hueso/45 hover:text-oro">
                Enviar planilla semanal
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {deLaSemana.map((d) => (
              <TarjetaDia key={d.fecha} d={d} clima={pronostico.get(d.fecha)}
                resumen={equipo
                  ? resumenEquipo(equipo.turnos, equipo.puestos, d.fecha, d.tomadas)
                  : null}
                onEditar={() => setEditando(d)}
                onPlanificar={() => setPlanificando({ fecha: d.fecha, personas: d.tomadas })} />
            ))}
            </div>
          </div>
        </div>
        );
      })}
    </>
  );
}

export function Aviso({ error, permiso = false }: { error: string; permiso?: boolean }) {
  // Un 403 no es una falla de la planilla, y decir que lo es manda a buscar
  // el problema donde no está.
  if (permiso) {
    return (
      <div className="rounded border border-hueso/20 bg-panel p-4">
        <p className="font-semibold text-hueso/85">Esta parte no es tuya.</p>
        <p className="mt-1 text-sm text-hueso/70">{error}</p>
      </div>
    );
  }
  return (
    <div className="rounded border border-rojo/50 bg-rojo/5 p-4">
      <p className="font-semibold text-rojo-texto">No se pudo leer la planilla.</p>
      <p className="mt-1 text-sm text-hueso/70">{error}</p>
      <p className="mt-3 text-sm text-hueso/60">
        Abre <a className="underline" href="/api/diagnostico">/api/diagnostico</a> para
        ver si las hojas existen y si los encabezados calzan.
      </p>
    </div>
  );
}
