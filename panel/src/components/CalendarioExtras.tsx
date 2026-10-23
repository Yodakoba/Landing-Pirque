'use client';

/**
 * Las actividades extras, mes por mes, y la lista de quién las hace.
 *
 * Es una pantalla aparte y no una pestaña más del equipo, y eso lo pidió el
 * cliente con un motivo que vale tener escrito: **la planilla semanal que se
 * manda al grupo del restaurante no tiene por qué mostrar a los jinetes.**
 * Separarlas acá es lo que permite mandar esa planilla sin pensarlo.
 *
 * Donde sí vuelven a juntarse es en el informe: quien paga hace **un solo
 * pago a la semana** y necesita verlo todo junto, distinguido por quién
 * recibe propina y quién no. Eso vive en `/informe`.
 *
 * El calendario muestra lo mismo que el del equipo —cuánta gente viene ese
 * día, si está cerrado, si es privado— porque contratar un castillo inflable
 * para un día sin reservas es justo el error que esto tiene que hacer
 * evidente.
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Aviso } from './CalendarView';
import ExtrasDialogo from './ExtrasDialogo';
import { COLOR_TARJETA, PUNTO_TARJETA } from './TarjetaDia';
import { costoDeExtra, extrasDelDia, costoExtrasDelDia, actividadesConocidas,
         type Colaborador, type Extra } from '@/lib/extras';
import { VINO } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import type { Ocupacion } from '@/lib/tipos';
import { enPesos } from '@/lib/ocupacion';
import DatosBancarios from './DatosBancarios';
// El mismo campo con rótulo de Equipo: una sola definición, y **fuera de
// todo componente**, porque uno declarado adentro se remonta en cada
// dibujado y se lleva el foco de lo que se esté escribiendo.
import { Campo } from './EquipoEditor';
import { bancoVacio, type Banco } from '@/lib/banco';
import CampoTelefono from './CampoTelefono';
import { diasDelMes, sumarMeses, mesDe, mesEnPalabras, diaSemana, hoy,
         enPalabras } from '@/lib/fechas';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const columna = (f: string) => (diaSemana(f) === 0 ? 6 : diaSemana(f) - 1);

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function CalendarioExtras() {
  const [mes, setMes] = useState(() => mesDe(hoy()));
  const [colaboradores, setColaboradores] = useState<Colaborador[] | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [ocupacion, setOcupacion] = useState<Ocupacion[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  const cargar = () =>
    fetch('/api/extras').then((r) => r.json())
      .then((d) => {
        if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
        setColaboradores(d.colaboradores ?? []);
        setExtras(d.extras ?? []);
        setEsAdmin(!!d.esAdmin);
        setSucio(false);
      })
      .catch((e) => setError(String(e)));

  useEffect(() => {
    cargar();
    // La ocupación es solo para pintar el mes: si falla, el calendario se
    // dibuja igual y se pueden contratar actividades.
    fetch('/api/ocupacion').then((r) => r.json())
      .then((d) => { if (d.ocupacion) setOcupacion(d.ocupacion); })
      .catch(() => {});
  }, []);

  const porFecha = useMemo(
    () => new Map(ocupacion.map((o) => [o.fecha, o])), [ocupacion]
  );
  const dias = useMemo(() => diasDelMes(mes), [mes]);
  const delMes = extras.filter((e) => e.fecha.startsWith(mes));
  const totalDelMes = delMes.reduce((s, e) => s + costoDeExtra(e), 0);
  const conActividades = dias.filter((f) => extrasDelDia(extras, f).length > 0);

  async function guardarFichas() {
    setGuardando(true);
    try {
      const r = await fetch('/api/extras', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ colaboradores })
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setColaboradores(d.colaboradores); setError(''); setSucio(false); }
    } finally { setGuardando(false); }
  }

  /** El guardado dentro de la ficha, igual que en Equipo y por lo mismo. */
  const guardarEnTarjeta = sucio ? (
    <button onClick={guardarFichas} disabled={guardando}
      className="rounded bg-oro px-3 py-1 text-xs font-semibold text-tinta
                 disabled:opacity-40"
      title="Guarda los cambios de esta pantalla">
      {guardando ? 'Guardando…' : 'Guardar cambios'}
    </button>
  ) : null;

  const cambiarBanco = (i: number, banco: Banco) => {
    const copia = (colaboradores ?? []).map((c) => ({ ...c }));
    copia[i].banco = banco;
    setColaboradores(copia); setSucio(true);
  };

  const cambiar = (i: number, campo: keyof Colaborador, valor: string | boolean) => {
    const copia = (colaboradores ?? []).map((c) => ({ ...c }));
    if (campo === 'activo') copia[i].activo = Boolean(valor);
    else if (campo === 'monto') {
      const n = Number(String(valor).replace(/[^\d]/g, ''));
      copia[i].monto = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    } else copia[i][campo] = String(valor) as never;
    setColaboradores(copia); setSucio(true);
  };

  // Quién tiene días contratados y no está en la lista. Pasa al renombrar a
  // alguien que ya tenía actividades; mismo mecanismo que `sinFicha()`.
  const conocidos = new Set((colaboradores ?? []).map((c) => normalizar(c.nombre)));
  const huerfanos = [...new Set(
    extras.map((e) => e.colaborador).filter((n) => !conocidos.has(normalizar(n)))
  )];

  if (error && !colaboradores) return <Aviso error={error} permiso={sinPermiso} />;
  if (!colaboradores) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Actividades extras
      </h1>
      <p className="mb-5 max-w-2xl text-sm text-hueso/60">
        Lo que se contrata aparte del equipo: jinetes, pintacaritas, el
        castillo inflable. <strong>Apreta un día</strong> para agregar lo que
        venga, marcar si llegó y anotar cuánto se le paga. Va aparte del
        equipo a propósito —la planilla semanal del grupo no los muestra— y
        se junta con él en el{' '}
        <a href="/informe" className="text-oro hover:underline">informe</a>,
        que es lo que descarga quien paga.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setMes(sumarMeses(mes, -1))}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          ‹ Mes anterior
        </button>
        <h2 className="text-sm font-semibold uppercase tracking-wide capitalize">
          {mesEnPalabras(mes)}
        </h2>
        <button onClick={() => setMes(sumarMeses(mes, 1))}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          Mes siguiente ›
        </button>
        <span className="flex-1" />
        <span className="text-xs text-hueso/50">
          {conActividades.length} {conActividades.length === 1 ? 'día' : 'días'} con
          actividades
          {totalDelMes > 0 && (
            <> · <strong className="tabular-nums text-oro">{enPesos(totalDelMes)}</strong>
              {' '}en el mes</>
          )}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
       <div className="min-w-[640px]">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px]
                        uppercase tracking-wide text-hueso/40">
          {DIAS.map((d) => <div key={d} className="pb-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: columna(dias[0] ?? hoy()) }, (_, i) => (
            <div key={`hueco-${i}`} />
          ))}

          {dias.map((f) => {
            const oc = porFecha.get(f);
            const delDia = extrasDelDia(extras, f);
            const costo = costoExtrasDelDia(extras, f);
            const sinConfirmar = delDia.filter((e) => !e.estado).length;
            const esHoy = f === hoy();
            return (
              <button key={f} onClick={() => setEditando(f)}
                title={`${enPalabras(f)} · actividades extras`}
                className={`min-h-[82px] overflow-hidden rounded border p-1.5
                            text-left align-top text-[11px] leading-tight transition
                            hover:border-oro
                            ${delDia.length > 0 ? 'border-oro/40 bg-oro/5'
                               : oc ? COLOR_TARJETA(oc)
                                    : 'border-hueso/10 bg-hueso/[0.02]'}
                            ${esHoy ? 'ring-1 ring-oro' : ''}`}>
                <span className="flex items-start justify-between">
                  <span className={oc || delDia.length ? 'font-semibold' : 'text-hueso/45'}>
                    {Number(f.slice(8, 10))}
                  </span>
                  {oc && <span aria-hidden>{PUNTO_TARJETA(oc)}</span>}
                </span>

                {oc && !oc.bloqueada && (
                  <span className="mt-1 block text-hueso/70">
                    {oc.tomadas > 0
                      ? <>{oc.tomadas} <span className="text-hueso/45">personas</span></>
                      : <span className="text-hueso/35">sin reservas</span>}
                  </span>
                )}
                {oc?.bloqueada && (
                  <span className="mt-1 block text-red-300/70">cerrado</span>
                )}

                {delDia.length > 0 && (
                  <span className="mt-1 block text-oro">
                    {delDia.length} {delDia.length === 1 ? 'actividad' : 'actividades'}
                    {costo > 0 && (
                      <span className="block tabular-nums text-oro/80">
                        {enPesos(costo)}
                      </span>
                    )}
                  </span>
                )}
                {sinConfirmar > 0 && (
                  <span className="mt-0.5 block text-amber-300">
                    {sinConfirmar} sin confirmar
                  </span>
                )}
              </button>
            );
          })}
        </div>
       </div>
      </div>

      <p className="mt-4 max-w-2xl text-xs text-hueso/50">
        <strong>Una actividad sin confirmar no suma</strong>, igual que un
        turno sin pasar lista: agendar no es pagar. Los colores del día son
        los del calendario —cuánta gente viene, si está cerrado o es privado—
        porque contratar un castillo para un día sin nadie es justo lo que
        conviene ver antes de hacerlo.
      </p>

      {huerfanos.length > 0 && (
        <div className="mt-6 rounded border border-amber-500/50 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            Hay actividades contratadas a nombre de alguien que no está en la lista.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Pasa al renombrar a alguien que ya tenía días: los días viejos
            siguen con el nombre anterior. Agrégalo abajo con ese nombre
            exacto, o corrige el nombre en la pestaña{' '}
            <code className="text-hueso/90">Actividades</code> de la planilla.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {huerfanos.map((n) => (
              <li key={n} className="rounded bg-hueso/10 px-2 py-1 font-mono text-xs">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-3 mt-10 text-xs uppercase tracking-widest text-hueso/45">
        Quiénes hacen las actividades
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-hueso/60">
        Se guardan como fichas porque se repiten: el mismo jinete vuelve el
        sábado siguiente. El <strong>monto habitual</strong> es el que se
        propone al agregarlo a un día y se puede corregir ahí; lo que se le
        pagó un día queda anotado en ese día y no cambia si después le subes
        la tarifa.
        {!esAdmin && (
          <> El monto y la cuenta bancaria los maneja el administrador.</>
        )}
      </p>

      {/* **Una tarjeta por colaborador**, igual que en Equipo y por el
          mismo motivo: con los datos del banco en una segunda línea, una
          tabla dejaba las líneas de uno pegadas a las del siguiente y no se
          veía dónde terminaba cada ficha. */}
      <ul className="space-y-3">
        {(colaboradores ?? []).map((c, i) => {
          const tieneDias = extras.some(
            (e) => normalizar(e.colaborador) === normalizar(c.nombre));
          return (
            <li key={i}
              className={`rounded border p-3 ${c.activo
                ? 'border-hueso/15 bg-hueso/[0.02]'
                : 'border-hueso/10 bg-transparent opacity-60'}`}>

              <div className="flex flex-wrap items-start gap-3">
                <Campo etiqueta="Nombre" ancho="w-52">
                  <input type="text" value={c.nombre} className={ENTRADA}
                    placeholder="Nombre o empresa"
                    aria-label={`Nombre del colaborador ${i + 1}`}
                    onChange={(e) => cambiar(i, 'nombre', e.target.value)} />
                </Campo>
                <Campo etiqueta="Actividad" ancho="w-44">
                  <input type="text" value={c.actividad} className={ENTRADA}
                    list="actividades-de-fichas" placeholder="show ecuestre…"
                    aria-label={`Actividad de ${c.nombre || 'esta persona'}`}
                    onChange={(e) => cambiar(i, 'actividad', e.target.value)} />
                </Campo>
                <Campo etiqueta="Teléfono" ancho="w-44">
                  <CampoTelefono valor={c.telefono} className={ENTRADA}
                    etiqueta={`Teléfono de ${c.nombre || 'esta persona'}`}
                    onCambio={(v) => cambiar(i, 'telefono', v)} />
                </Campo>
                {esAdmin && (
                  <Campo etiqueta="Monto habitual" ancho="w-32">
                    <input type="number" min={0} step={1000} className={ENTRADA}
                      value={c.monto || ''} placeholder="—"
                      aria-label={`Monto habitual de ${c.nombre || 'esta persona'}`}
                      onChange={(e) => cambiar(i, 'monto', e.target.value)} />
                  </Campo>
                )}
                <label className="flex items-center gap-2 self-center pt-4">
                  <input type="checkbox" checked={c.activo}
                    aria-label={`${c.nombre || 'Sin nombre'} se sigue contratando`}
                    className="h-4 w-4 accent-oro"
                    onChange={(e) => cambiar(i, 'activo', e.target.checked)} />
                  <span className="text-[10px] uppercase tracking-wide text-hueso/35">
                    Activo
                  </span>
                </label>

                <span className="flex-1" />

                {/* Quitar solo a quien no tiene días contratados, igual que
                    en Equipo: borrar la ficha de alguien que ya vino dejaría
                    sus días con un nombre que no está en ninguna parte. */}
                <div className="flex flex-wrap items-center gap-3 self-center pt-4 text-xs">
                  {guardarEnTarjeta}
                  {!tieneDias ? (
                    <button
                      onClick={() => {
                        setColaboradores((colaboradores ?? []).filter((_, k) => k !== i));
                        setSucio(true);
                      }}
                      className="text-hueso/60 hover:text-red-400"
                      title="Todavía no tiene ningún día contratado">Quitar</button>
                  ) : c.activo ? (
                    <button
                      onClick={() => cambiar(i, 'activo', false)}
                      className="text-hueso/60 hover:text-oro"
                      title="Tiene días guardados, así que su ficha no se quita: se desactiva">
                      Desactivar
                    </button>
                  ) : (
                    <span className="text-hueso/30"
                      title="Su ficha se conserva porque tiene días guardados">
                      Desactivado
                    </span>
                  )}
                </div>
              </div>

              {esAdmin && (
                <div className="mt-3 border-t border-hueso/10 pt-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="w-28 pt-4 text-[10px] uppercase tracking-widest
                                     text-hueso/35">Transferencia</span>
                    <div className="min-w-[20rem] flex-1">
                      <DatosBancarios
                        banco={c.banco} nombre={c.nombre}
                        onCambio={(b) => cambiarBanco(i, b)} />
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {(colaboradores ?? []).length === 0 && (
          <li className="rounded border border-dashed border-hueso/15 p-6 text-sm text-hueso/50">
            Todavía no hay nadie. Apreta <strong>Agregar colaborador</strong>, o
            créalo desde un día.
          </li>
        )}
      </ul>

      {/* Las actividades que ya hace alguien, para sugerirlas al escribir. */}
      <datalist id="actividades-de-fichas">
        {actividadesConocidas(colaboradores ?? []).map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setColaboradores([...colaboradores, {
              nombre: '', actividad: '', telefono: '', activo: true,
              monto: 0, banco: bancoVacio()
            }]);
            setSucio(true);
          }}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          Agregar colaborador
        </button>
        <span className="flex-1" />
        {sucio && <span className="text-xs text-hueso/50">Hay cambios sin guardar.</span>}
        <button onClick={guardarFichas} disabled={guardando || !sucio}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                     disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {editando && (
        <ExtrasDialogo
          fecha={editando}
          extras={extras}
          colaboradores={colaboradores}
          esAdmin={esAdmin}
          onListo={() => { setEditando(null); cargar(); }}
          onCancelar={() => setEditando(null)}
        />
      )}
    </section>
  );
}
