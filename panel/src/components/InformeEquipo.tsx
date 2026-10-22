'use client';

/**
 * Cuánto se le pagó a cada persona, por semana o por mes.
 *
 * **La descarga es el punto, no un extra.** Quien paga tiene que juntar la
 * información de todos y pasarla a quien corresponda; que esa pega sea
 * copiar una tabla a mano es justo lo que esta pantalla viene a evitar. Por
 * eso el CSV trae el **detalle día por día** y no solo los totales: los
 * totales se miran acá, el detalle es lo que se entrega.
 *
 * **Semana, mes y rango libre son el mismo cálculo.** Internamente todo es un
 * rango de fechas (`informeDelPeriodo`), así que no hay tres versiones de la
 * misma suma esperando a desalinearse. Semana y mes son atajos para los dos
 * periodos que se piden siempre; el rango libre cubre el resto —una quincena,
 * un fin de semana largo, lo que haya quedado pendiente de pagar—.
 *
 * Las sumas salen de lo que quedó **escrito en cada turno**, no de la ficha
 * del trabajador: subirle el sueldo a alguien en marzo no puede cambiar lo
 * que se le pagó en noviembre.
 *
 * Muestra también a quien **no vino** y a quien quedó **sin marcar**, con
 * total cero. Una persona que desaparece del informe se lee como que no
 * trabajó, y lo que puede haber pasado es que nadie cerró ese día; esas dos
 * columnas son lo que permite darse cuenta a tiempo.
 */
import { useEffect, useMemo, useState } from 'react';
import { Aviso } from './CalendarView';
import {
  informeDelPeriodo, mesesConTurnos, semanasConTurnos, rangoDelPeriodo,
  pagoDe, esContratado, type Turno
} from '@/lib/equipo';
import { enPesos } from '@/lib/ocupacion';
import { mesEnPalabras, rangoEnPalabras, sumarDias, semanaDe, hoy } from '@/lib/fechas';
import { aCSV } from '@/lib/csv';

type Tipo = 'mes' | 'semana' | 'rango';

export default function InformeEquipo() {
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('mes');
  const [periodo, setPeriodo] = useState(hoy().slice(0, 7));
  // El rango libre lleva sus propias fechas: no se puede derivar de un
  // periodo con nombre, que es justamente la gracia.
  const [desdeLibre, setDesdeLibre] = useState(hoy().slice(0, 7) + '-01');
  const [hastaLibre, setHastaLibre] = useState(hoy());

  useEffect(() => {
    // `/api/informe` y no `/api/equipo`: quien hace los pagos no tiene por
    // qué recibir reservas, clientes ni la lista del equipo para sacar sus
    // cuentas. Esa ruta devuelve turnos y nada más.
    fetch('/api/informe').then((r) => r.json())
      .then((d) => {
        if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
        setTurnos(d.turnos ?? []);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // El periodo en curso siempre está en la lista, aunque todavía no tenga
  // turnos: si no, el selector aparecería sin la opción que uno busca primero.
  const opciones = useMemo(() => {
    const conTurnos = tipo === 'mes'
      ? mesesConTurnos(turnos ?? [])
      : semanasConTurnos(turnos ?? []);
    const actual = tipo === 'mes' ? hoy().slice(0, 7) : semanaDe(hoy());
    return conTurnos.includes(actual) ? conTurnos : [actual, ...conTurnos];
  }, [turnos, tipo]);

  const { desde, hasta } = tipo === 'rango'
    // Al revés también vale: si alguien pone las fechas en el orden
    // contrario, se ordenan en vez de devolver un informe vacío que parece
    // que no hubo turnos.
    ? (desdeLibre <= hastaLibre
        ? { desde: desdeLibre, hasta: hastaLibre }
        : { desde: hastaLibre, hasta: desdeLibre })
    : rangoDelPeriodo(periodo);
  const lineas = useMemo(
    () => informeDelPeriodo(turnos ?? [], desde, hasta), [turnos, desde, hasta]
  );
  const total = lineas.reduce((s, l) => s + l.total, 0);
  const propina = lineas.reduce((s, l) => s + l.propina, 0);
  const sinMarcar = lineas.reduce((s, l) => s + l.sinMarcar, 0);

  const comoSeLlama = (p: string) => p.length === 7
    ? mesEnPalabras(p)
    : rangoEnPalabras(Array.from({ length: 7 }, (_, i) => sumarDias(p, i)));

  function cambiarTipo(nuevo: Tipo) {
    setTipo(nuevo);
    if (nuevo === 'mes') setPeriodo(hoy().slice(0, 7));
    if (nuevo === 'semana') setPeriodo(semanaDe(hoy()));
  }

  function exportar() {
    const delPeriodo = (turnos ?? [])
      .filter((t) => t.fecha >= desde && t.fecha <= hasta)
      .sort((a, b) => a.trabajador.localeCompare(b.trabajador)
        || a.fecha.localeCompare(b.fecha));
    const csv = aCSV(
      ['Trabajador', 'Fecha', 'Puesto', 'Modalidad', 'Vino', 'Jornada',
       'Horas extra', 'Valor hora', 'Ajuste', 'Motivo', 'Total', 'Propina'],
      delPeriodo.map((t) => [
        t.trabajador, t.fecha, t.puesto, t.modalidad,
        t.asistencia || 'sin marcar',
        // Un contratado va en blanco, no en cero: cero se lee como "se le
        // pagó cero", y lo que pasa es que esa columna no le aplica.
        esContratado(t.modalidad) ? '' : (t.pagoJornada || ''),
        t.horasExtra || '', t.valorHora || '', t.ajuste || '', t.motivo,
        pagoDe(t),
        // Última columna y aparte del total, igual que en pantalla: la
        // propina no es sueldo, y quien reciba esta planilla tiene que poder
        // sumar una cosa sin arrastrar la otra.
        t.propina || ''
      ])
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipo-${
      tipo === 'mes' ? periodo
      : tipo === 'semana' ? `semana-${periodo}`
      : `${desde}-a-${hasta}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!turnos) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">Informe del equipo</h1>
      <p className="mb-6 max-w-2xl text-sm text-hueso/60">
        Lo que se le pagó a cada persona, según lo que quedó anotado al pasar
        lista. <strong>No se recalcula desde los sueldos de hoy</strong>: un
        cambio de sueldo no reescribe los periodos ya cerrados.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(['semana', 'mes', 'rango'] as Tipo[]).map((t) => (
            <button key={t} onClick={() => cambiarTipo(t)}
              className={`rounded border px-3 py-1.5 text-sm ${
                tipo === t ? 'border-oro text-oro' : 'border-hueso/20 text-hueso/70'}`}>
              {t === 'rango' ? 'Otro rango' : `Por ${t}`}
            </button>
          ))}
        </div>

        {tipo === 'rango' ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <input type="date" value={desdeLibre} aria-label="Desde"
              onChange={(e) => setDesdeLibre(e.target.value)}
              className="rounded border border-hueso/20 bg-tinta px-3 py-1.5 text-sm
                         focus:border-oro focus:outline-none" />
            <span className="text-hueso/40">a</span>
            <input type="date" value={hastaLibre} aria-label="Hasta"
              onChange={(e) => setHastaLibre(e.target.value)}
              className="rounded border border-hueso/20 bg-tinta px-3 py-1.5 text-sm
                         focus:border-oro focus:outline-none" />
          </span>
        ) : (
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}
            aria-label="Periodo del informe"
            className="rounded border border-hueso/20 bg-tinta px-3 py-1.5 text-sm
                       capitalize focus:border-oro focus:outline-none">
            {opciones.map((p) => (
              <option key={p} value={p}>{comoSeLlama(p)}</option>
            ))}
          </select>
        )}
        <span className="flex-1" />
        <button onClick={exportar} disabled={lineas.length === 0}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                     disabled:opacity-40">
          Descargar planilla
        </button>
      </div>

      {sinMarcar > 0 && (
        <div className="mb-6 rounded border border-amber-500/50 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            Hay {sinMarcar} turno{sinMarcar === 1 ? '' : 's'} sin pasar lista
            en este periodo.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Esos no suman nada, así que el total de abajo está incompleto
            mientras no se cierren. Se pasan desde la página de cada día.
          </p>
        </div>
      )}

      {lineas.length === 0 ? (
        <p className="text-sm text-hueso/50">
          No hay turnos anotados entre el {desde} y el {hasta}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
                <tr className="border-b border-hueso/10">
                  <th className="py-2 pr-3">Quién</th>
                  <th className="w-24 py-2 pr-3">Días</th>
                  <th className="w-28 py-2 pr-3 text-right">Jornadas</th>
                  <th className="w-32 py-2 pr-3 text-right">Horas extra</th>
                  <th className="w-28 py-2 pr-3 text-right">Ajustes</th>
                  <th className="w-28 py-2 pr-3 text-right">Total</th>
                  <th className="w-28 py-2 text-right">Propina</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.trabajador} className="border-b border-hueso/5">
                    <td className="py-2 pr-3">
                      {l.trabajador}
                      {esContratado(l.modalidad) && (
                        <span className="ml-1 text-xs text-hueso/40">contratado</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {l.dias}
                      {l.noVino > 0 && (
                        <span className="ml-1 text-xs text-red-300/80">
                          · {l.noVino} no vino
                        </span>
                      )}
                      {l.sinMarcar > 0 && (
                        <span className="ml-1 text-xs text-amber-300/80">
                          · {l.sinMarcar} sin marcar
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-hueso/70">
                      {l.jornadas ? enPesos(l.jornadas) : <span className="text-hueso/25">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-hueso/70">
                      {l.horasExtra
                        ? <>{enPesos(l.montoHorasExtra)}
                            <span className="ml-1 text-xs text-hueso/40">
                              ({l.horasExtra} h)
                            </span></>
                        : <span className="text-hueso/25">—</span>}
                    </td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${
                      l.ajustes < 0 ? 'text-red-300/80' : 'text-hueso/70'}`}>
                      {l.ajustes ? enPesos(l.ajustes) : <span className="text-hueso/25">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <strong>{enPesos(l.total)}</strong>
                    </td>
                    <td className="py-2 text-right tabular-nums text-hueso/70">
                      {l.propina ? enPesos(l.propina) : <span className="text-hueso/25">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-hueso/15">
                  <td className="py-3 pr-3 text-xs uppercase tracking-wide text-hueso/45">
                    {lineas.length} {lineas.length === 1 ? 'persona' : 'personas'}
                  </td>
                  <td colSpan={4} />
                  <td className="py-3 pr-3 text-right tabular-nums">
                    <strong className="text-oro">{enPesos(total)}</strong>
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {propina > 0
                      ? <strong className="text-hueso/80">{enPesos(propina)}</strong>
                      : <span className="text-hueso/25">—</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-6 max-w-2xl text-xs text-hueso/50">
            <strong>Un contratado suma cero en jornadas</strong>, porque su
            sueldo no sale de acá; lo que aparece en su fila son horas extra y
            ajustes. <strong>La propina va aparte y no se suma al total</strong>:
            esa plata no sale del negocio, pasa por él, así que juntarlas haría
            imposible contestar cuánto costó el equipo. <strong>La planilla que se descarga trae el detalle día
            por día</strong>, con el motivo de cada ajuste: es lo que sirve
            para entregar, en vez de copiar totales a mano.
          </p>
        </>
      )}
    </section>
  );
}
