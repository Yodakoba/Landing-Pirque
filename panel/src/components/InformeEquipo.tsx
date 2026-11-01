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
import Ayuda from './Ayuda';
import { Aviso } from './CalendarView';
import {
  informeDelPeriodo, mesesConTurnos, semanasConTurnos, rangoDelPeriodo,
  pagoDe, esContratado, type Turno
} from '@/lib/equipo';
import { informeDeExtras, costoDeExtra, type Extra } from '@/lib/extras';
import { enPesos } from '@/lib/ocupacion';
import { normalizar } from '@/lib/columnas';
import { mesEnPalabras, rangoEnPalabras, sumarDias, semanaDe, hoy } from '@/lib/fechas';
import { aCSV } from '@/lib/csv';
import { totalAjustes, motivosDe } from '@/lib/equipo';
import { bancoVacio, sePuedeTransferir, titularDe, rutLimpio,
         type Banco } from '@/lib/banco';
import { pagadoDe, aTransferirDe, faltaDe, estadoDePago,
         type PagoEquipo } from '@/lib/remuneraciones';
import Dialogo from './Dialogo';
import Campo from './Campo';

type Tipo = 'mes' | 'semana' | 'rango';

/**
 * Las tres celdas del pago, iguales en las dos tablas.
 *
 * **Va al nivel del módulo, nunca dentro del componente**: una función
 * declarada adentro es, para React, otro tipo de elemento en cada dibujado,
 * y lo desmonta y lo vuelve a montar. Ya nos costó el foco de los inputs de
 * `/equipo` una vez.
 *
 * El **check es derivado**: sale de comparar lo pagado con lo que hay que
 * transferir, no de un campo guardado. Por eso no puede contradecir a los
 * montos que tiene al lado.
 */
function CeldasPago({
  aTransferir, pagado, falta, estado, puedePagar, onCobrar
}: {
  aTransferir: number; pagado: number; falta: number;
  estado: 'pagado' | 'parcial' | 'pendiente';
  puedePagar: boolean;
  onCobrar: () => void;
}) {
  return (
    <>
      <td className="py-2 pr-3 text-right tabular-nums">
        {aTransferir > 0
          ? <strong className="text-[15px]">{enPesos(aTransferir)}</strong>
          : <span className="text-hueso/25">—</span>}
      </td>
      <td className="py-2 pr-3 text-right">
        {pagado > 0 ? (
          <>
            <div className="tabular-nums text-hueso/75">{enPesos(pagado)}</div>
            {/* Se distingue por forma y no solo por color: una pastilla con
                borde se reconoce sin leerla y sin distinguir el verde del
                ámbar, que es lo que pide la regla del panel. */}
            <span className={`mt-0.5 inline-block whitespace-nowrap rounded-full border
                              px-2 py-0.5 text-[13px] font-semibold ${
              estado === 'pagado'
                ? 'border-verde/50 text-verde-texto'
                : 'border-ambar/50 text-ambar-texto'}`}>
              {estado === 'pagado' ? '✓ pagado' : 'parcial'}
            </span>
          </>
        ) : estado === 'pagado' ? (
          // Nada que transferir: no queda eternamente "pendiente" por cero.
          <span className="text-hueso/25">—</span>
        ) : (
          <span className="whitespace-nowrap rounded-full border border-hueso/25
                           px-2 py-0.5 text-[13px] font-semibold text-hueso/60">
            sin pagar
          </span>
        )}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">
        {falta > 0
          ? <strong className="text-ambar-texto">{enPesos(falta)}</strong>
          : <span className="text-hueso/25">—</span>}
      </td>
      <td className="py-2 text-right">
        {puedePagar && falta > 0 && (
          <button onClick={onCobrar} className="boton whitespace-nowrap">
            Registrar pago
          </button>
        )}
      </td>
    </>
  );
}

/**
 * El formulario de un pago.
 *
 * **Al nivel del módulo** por lo mismo que `CeldasPago`: declarado dentro
 * del componente, React lo desmontaría en cada dibujado y el input perdería
 * el foco a cada tecla.
 *
 * El monto **nace con lo que falta**, que es el caso de siempre: lo normal
 * es pagar todo, y entonces esto es apretar dos botones. Bajarlo es lo que
 * convierte el pago en parcial, sin un modo aparte que haya que elegir.
 */
function FormularioPago({
  quien, propuesto, periodo, onGuardar, onCancelar
}: {
  quien: string; propuesto: number; periodo: string;
  onGuardar: (monto: number, nota: string) => void;
  onCancelar: () => void;
}) {
  const [monto, setMonto] = useState(String(propuesto));
  const [nota, setNota] = useState('');
  const n = Math.round(Number(monto.replace(/[^\d-]/g, '')) || 0);
  const parcial = n > 0 && n < propuesto;

  return (
    <div className="space-y-4">
      <p className="text-sm text-hueso/70">
        Lo que falta transferirle a <strong className="text-hueso">{quien}</strong>{' '}
        por {periodo} son <strong className="text-hueso">{enPesos(propuesto)}</strong>.
      </p>
      <div className="flex flex-wrap gap-3">
        <Campo etiqueta="Cuánto se le pagó" ancho="w-44">
          <input type="text" inputMode="numeric" value={monto} autoFocus
            aria-label="Monto pagado"
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded border border-hueso/20 bg-transparent px-2 py-1.5
                       text-sm tabular-nums outline-none focus:border-oro/60" />
        </Campo>
        <Campo etiqueta="Nota (opcional)" ancho="w-full sm:w-72">
          <input type="text" value={nota} placeholder="Transferencia 2/11"
            aria-label="Nota del pago"
            onChange={(e) => setNota(e.target.value)}
            className="w-full rounded border border-hueso/20 bg-transparent px-2 py-1.5
                       text-sm outline-none focus:border-oro/60" />
        </Campo>
      </div>

      {/* Que va a quedar parcial se dice antes de guardar, no después: es
          justamente lo que alguien querría saber si se equivocó de cifra. */}
      {parcial && (
        <p className="rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[13px]
                      text-ambar-texto">
          Queda como pago parcial: faltarían {enPesos(propuesto - n)}.
        </p>
      )}
      {n > propuesto && (
        <p className="rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[13px]
                      text-ambar-texto">
          Es más de lo que falta. Se anota igual, y el periodo queda pagado de más.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => onGuardar(n, nota)} disabled={!n}
          className="boton boton-relleno">
          Registrar pago
        </button>
        <button onClick={onCancelar} className="boton">Cancelar</button>
        <span className="flex-1" />
        <span className="text-[13px] text-hueso/55">
          Queda anotado con tu nombre y la fecha.
        </span>
      </div>
    </div>
  );
}

/** Los encabezados de esas mismas tres columnas, para no escribirlos dos veces. */
function EncabezadosPago() {
  return (
    <>
      <th className="w-32 py-2 pr-3 text-right">A transferir</th>
      <th className="w-28 py-2 pr-3 text-right">Pagado</th>
      <th className="w-28 py-2 pr-3 text-right">Falta</th>
      <th className="w-32 py-2" />
    </>
  );
}

export default function InformeEquipo() {
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  // Las actividades extras van en su propia tabla y en el mismo CSV: quien
  // paga hace un solo pago a la semana, pero un jinete no cobra una jornada
  // ni recibe propina, así que sumarlos en una sola lista sería mentir.
  const [extras, setExtras] = useState<Extra[]>([]);
  const [cuentas, setCuentas] = useState<Record<string, Banco>>({});
  // Los pagos ya registrados. El "check" de cada fila **se deduce de
  // sumarlos**, no es un campo guardado que pueda decir otra cosa que la
  // plata. Ver `remuneraciones.ts`.
  const [pagos, setPagos] = useState<PagoEquipo[]>([]);
  const [puedePagar, setPuedePagar] = useState(false);
  // A quién se le está registrando un pago, con el monto propuesto.
  const [cobrando, setCobrando] = useState<
    { quien: string; propuesto: number } | null>(null);
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
        setExtras(d.extras ?? []);
        setCuentas(d.cuentas ?? {});
        setPagos(d.pagos ?? []);
        setPuedePagar(!!d.puedePagar);
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
  const lineasExtras = useMemo(
    () => informeDeExtras(extras, desde, hasta, new Map(Object.entries(cuentas))),
    [extras, desde, hasta, cuentas]
  );
  const total = lineas.reduce((s, l) => s + l.total, 0);
  const propina = lineas.reduce((s, l) => s + l.propina, 0);
  const sinMarcar = lineas.reduce((s, l) => s + l.sinMarcar, 0);
  const totalExtras = lineasExtras.reduce((s, l) => s + l.total, 0);
  const sinConfirmar = lineasExtras.reduce((s, l) => s + l.sinConfirmar, 0);
  const cuentaDe = (nombre: string): Banco =>
    cuentas[normalizar(nombre)] ?? bancoVacio();

  /**
   * Lo que falta saber de una persona para transferirle.
   *
   * **A transferir = remuneración + propina.** Es la única parte donde las
   * dos se suman, y es a propósito: en el costo del equipo la propina sigue
   * yendo aparte —esa plata no sale del negocio, pasa por él— pero a la hora
   * de transferir sale una sola plata a una sola cuenta. Hasta ahora había
   * que sumar dos columnas a mano.
   */
  const pagoDeFila = (nombre: string, tot: number, prop: number) => {
    const aTransferir = aTransferirDe(tot, prop);
    const pagado = pagadoDe(pagos, nombre, desde, hasta);
    return {
      aTransferir, pagado,
      falta: faltaDe(aTransferir, pagado),
      estado: estadoDePago(aTransferir, pagado)
    };
  };

  const sumaDe = (nombres: { nombre: string; tot: number; prop: number }[]) =>
    nombres.reduce((s, x) => {
      const p = pagoDeFila(x.nombre, x.tot, x.prop);
      return { aTransferir: s.aTransferir + p.aTransferir,
               pagado: s.pagado + p.pagado, falta: s.falta + p.falta };
    }, { aTransferir: 0, pagado: 0, falta: 0 });

  const sumaEquipo = sumaDe(
    lineas.map((l) => ({ nombre: l.trabajador, tot: l.total, prop: l.propina }))
  );
  // Un colaborador no recibe propina —no entra en el reparto— así que su
  // "a transferir" es su total y nada más. El cero va escrito para que se
  // lea que es una decisión y no un campo que faltó.
  const sumaExtras = sumaDe(
    lineasExtras.map((l) => ({ nombre: l.colaborador, tot: l.total, prop: 0 }))
  );

  async function registrarPago(quien: string, monto: number, nota: string) {
    const r = await fetch('/api/informe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quien, monto, desde, hasta, nota })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    // Se agrega a lo que ya hay en pantalla en vez de recargar todo: el
    // informe de un mes son muchas filas y lo único que cambió es esta.
    if (d.pago) setPagos((antes) => [...antes, d.pago]);
    setCobrando(null);
  }

  // Quién aparece en el periodo y no se le puede transferir con lo que hay
  // anotado. Se avisa acá porque es el momento en que importa: descubrirlo
  // con la planilla ya descargada significa volver a entrar, completarla y
  // bajarla de nuevo.
  const sinCuenta = [
    ...lineas.map((l) => l.trabajador),
    ...lineasExtras.map((l) => l.colaborador)
  ].filter((n) => !sePuedeTransferir(cuentaDe(n)));

  const comoSeLlama = (p: string) => p.length === 7
    ? mesEnPalabras(p)
    : rangoEnPalabras(Array.from({ length: 7 }, (_, i) => sumarDias(p, i)));

  function cambiarTipo(nuevo: Tipo) {
    setTipo(nuevo);
    if (nuevo === 'mes') setPeriodo(hoy().slice(0, 7));
    if (nuevo === 'semana') setPeriodo(semanaDe(hoy()));
  }

  /**
   * La planilla del pago: el equipo y las actividades extras, juntos.
   *
   * **Juntos porque quien paga hace un solo pago a la semana**, y separarlos
   * en dos archivos le devolvería el trabajo que esto viene a evitar.
   * **Distinguidos porque no son lo mismo**: la primera columna dice qué es
   * cada fila, y las columnas que no aplican van en blanco y no en cero —un
   * cero se lee como "le tocó cero propina", y lo que pasa es que un jinete
   * no entra en el reparto.
   *
   * **Los datos de la transferencia van al final, un campo por columna**, y
   * eso es lo que vuelve esta planilla pegable en la carga masiva de un
   * banco: titular, RUT, banco, tipo, número y correo. En una sola columna
   * de texto libre había que separarlos a mano, fila por fila, que es
   * exactamente el trabajo que esto viene a evitar.
   */
  /** Las siete columnas del pago, en el orden del encabezado. */
  const columnasBanco = (nombre: string) => {
    const b = cuentaDe(nombre);
    return [titularDe(b, nombre), rutLimpio(b.rut), b.banco, b.tipo,
            b.numero, b.correo, b.nota];
  };

  /**
   * Las tres columnas del pago, **solo en la primera fila de cada persona**.
   *
   * El CSV es detalle día por día y el pago es por persona y periodo: si
   * fuera en cada fila, alguien que sume la columna cobraría cinco veces lo
   * mismo. En blanco en las demás filas la columna suma exactamente lo que
   * hay que transferir, que es para lo que se abre esta planilla.
   */
  const columnasPago = (nombre: string, tot: number, prop: number, primera: boolean) => {
    if (!primera) return ['', '', ''];
    const x = pagoDeFila(nombre, tot, prop);
    return [x.aTransferir, x.pagado, x.falta];
  };

  function exportar() {
    const delPeriodo = (turnos ?? [])
      .filter((t) => t.fecha >= desde && t.fecha <= hasta)
      .sort((a, b) => a.trabajador.localeCompare(b.trabajador)
        || a.fecha.localeCompare(b.fecha));
    const extrasDelPeriodo = extras
      .filter((e) => e.fecha >= desde && e.fecha <= hasta)
      .sort((a, b) => a.colaborador.localeCompare(b.colaborador)
        || a.fecha.localeCompare(b.fecha));
    const csv = aCSV(
      ['Tipo', 'Nombre', 'Fecha', 'Puesto o actividad', 'Modalidad', 'Vino',
       'Jornada o monto', 'Horas extra', 'Valor hora', 'Ajuste', 'Motivo',
       'Total', 'Propina',
       'A transferir', 'Pagado', 'Falta',
       'Titular', 'RUT', 'Banco', 'Tipo de cuenta', 'N° de cuenta',
       'Correo del comprobante', 'Nota de pago'],
      [
        ...delPeriodo.map((t, i) => [
          'Equipo',
          t.trabajador, t.fecha, t.puesto, t.modalidad,
          t.asistencia || 'sin marcar',
          // Un contratado va en blanco, no en cero: cero se lee como "se le
          // pagó cero", y lo que pasa es que esa columna no le aplica.
          esContratado(t.modalidad) ? '' : (t.pagoJornada || ''),
          t.horasExtra || '', t.valorHora || '',
          totalAjustes(t.ajustes) || '', motivosDe(t.ajustes),
          pagoDe(t),
          // Aparte del total, igual que en pantalla: la propina no es
          // sueldo, y quien reciba esta planilla tiene que poder sumar una
          // cosa sin arrastrar la otra.
          t.propina || '',
          ...columnasPago(
            t.trabajador,
            lineas.find((l) => normalizar(l.trabajador) === normalizar(t.trabajador))?.total ?? 0,
            lineas.find((l) => normalizar(l.trabajador) === normalizar(t.trabajador))?.propina ?? 0,
            // La primera fila de esa persona: las filas vienen ordenadas por
            // nombre, así que es la que no tiene a nadie igual encima.
            i === 0 || normalizar(delPeriodo[i - 1].trabajador) !== normalizar(t.trabajador)
          ),
          ...columnasBanco(t.trabajador)
        ]),
        ...extrasDelPeriodo.map((e, i) => [
          'Actividad extra',
          e.colaborador, e.fecha, e.actividad,
          // Modalidad, horas extra y valor hora no le aplican a un extra:
          // van en blanco para que se note que no aplican.
          '', e.estado || 'sin confirmar',
          e.monto || '', '', '', e.ajuste || '', e.motivo,
          costoDeExtra(e),
          // Propina en blanco, a propósito: un jinete no entra en el
          // reparto, y un cero se leería como que le tocó cero.
          '',
          ...columnasPago(
            e.colaborador,
            lineasExtras.find((l) => normalizar(l.colaborador) === normalizar(e.colaborador))?.total ?? 0,
            0,
            i === 0 || normalizar(extrasDelPeriodo[i - 1].colaborador) !== normalizar(e.colaborador)
          ),
          ...columnasBanco(e.colaborador)
        ])
      ]
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pago-${
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
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Informe del equipo<Ayuda tema="informe" />
      </h1>
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
        <button onClick={exportar}
          disabled={lineas.length === 0 && lineasExtras.length === 0}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                     disabled:opacity-40">
          Descargar planilla
        </button>
      </div>

      {sinMarcar > 0 && (
        <div className="mb-6 rounded border border-ambar/50 bg-ambar/5 p-4">
          <p className="text-sm font-semibold text-ambar-texto">
            Hay {sinMarcar} turno{sinMarcar === 1 ? '' : 's'} sin pasar lista
            en este periodo.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Esos no suman nada, así que el total de abajo está incompleto
            mientras no se cierren. Se pasan desde la página de cada día.
          </p>
        </div>
      )}

      {sinConfirmar > 0 && (
        <div className="mb-6 rounded border border-ambar/50 bg-ambar/5 p-4">
          <p className="text-sm font-semibold text-ambar-texto">
            Hay {sinConfirmar} actividad{sinConfirmar === 1 ? '' : 'es'} extra
            sin confirmar en este periodo.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Igual que un turno sin pasar lista, no suman: mientras nadie diga
            si el jinete o la pintacaritas llegó, el total está incompleto. Se
            confirma en{' '}
            <a href="/extras" className="text-oro hover:underline">
              actividades extras
            </a>.
          </p>
        </div>
      )}

      {lineas.length === 0 && lineasExtras.length === 0 ? (
        <p className="text-sm text-hueso/50">
          No hay turnos ni actividades extras anotados entre el {desde} y el{' '}
          {hasta}.
        </p>
      ) : (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-hueso/70">
            Equipo del restaurante
          </h2>
          {lineas.length === 0 ? (
            <p className="mb-8 text-sm text-hueso/50">
              Sin turnos anotados en este periodo.
            </p>
          ) : (
          <div className="relative mb-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[13px] uppercase tracking-wide text-hueso/50">
                <tr className="border-b border-hueso/10">
                  <th className="sticky left-0 z-10 bg-tinta [box-shadow:1px_0_0_0_rgb(var(--hueso)/0.15)] py-2 pr-3">Quién</th>
                  <th className="w-24 py-2 pr-3">Días</th>
                  <th className="w-28 py-2 pr-3 text-right">Jornadas</th>
                  <th className="w-32 py-2 pr-3 text-right">Horas extra</th>
                  <th className="w-28 py-2 pr-3 text-right">Ajustes</th>
                  <th className="w-28 py-2 pr-3 text-right">Total</th>
                  <th className="w-28 py-2 pr-3 text-right">Propina</th>
                  <EncabezadosPago />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.trabajador} className="border-b border-hueso/5">
                    <td className="sticky left-0 z-10 bg-tinta [box-shadow:1px_0_0_0_rgb(var(--hueso)/0.15)] py-2 pr-3">
                      {l.trabajador}
                      {esContratado(l.modalidad) && (
                        <span className="ml-1 text-[13px] text-hueso/40">contratado</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {l.dias}
                      {l.noVino > 0 && (
                        <span className="ml-1 text-[13px] text-rojo-texto/80">
                          · {l.noVino} no vino
                        </span>
                      )}
                      {l.sinMarcar > 0 && (
                        <span className="ml-1 text-[13px] text-ambar-texto/80">
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
                            <span className="ml-1 text-[13px] text-hueso/40">
                              ({l.horasExtra} h)
                            </span></>
                        : <span className="text-hueso/25">—</span>}
                    </td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${
                      l.ajustes < 0 ? 'text-rojo-texto/80' : 'text-hueso/70'}`}>
                      {l.ajustes ? enPesos(l.ajustes) : <span className="text-hueso/25">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <strong>{enPesos(l.total)}</strong>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-hueso/70">
                      {l.propina ? enPesos(l.propina) : <span className="text-hueso/25">—</span>}
                    </td>
                    <CeldasPago {...pagoDeFila(l.trabajador, l.total, l.propina)}
                      puedePagar={puedePagar}
                      onCobrar={() => setCobrando({
                        quien: l.trabajador,
                        propuesto: pagoDeFila(l.trabajador, l.total, l.propina).falta
                      })} />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-hueso/15">
                  <td className="sticky left-0 z-10 bg-tinta [box-shadow:1px_0_0_0_rgb(var(--hueso)/0.15)] py-3 pr-3 text-[13px] uppercase tracking-wide text-hueso/45">
                    {lineas.length} {lineas.length === 1 ? 'persona' : 'personas'}
                  </td>
                  <td colSpan={4} />
                  <td className="py-3 pr-3 text-right tabular-nums">
                    <strong className="text-oro">{enPesos(total)}</strong>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {propina > 0
                      ? <strong className="text-hueso/80">{enPesos(propina)}</strong>
                      : <span className="text-hueso/25">—</span>}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    <strong className="text-[15px]">{enPesos(sumaEquipo.aTransferir)}</strong>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-hueso/75">
                    {sumaEquipo.pagado > 0
                      ? enPesos(sumaEquipo.pagado) : <span className="text-hueso/25">—</span>}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {sumaEquipo.falta > 0
                      ? <strong className="text-ambar-texto">{enPesos(sumaEquipo.falta)}</strong>
                      : <span className="text-hueso/25">—</span>}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          )}

          {/* Las actividades extras van en su propia tabla y no mezcladas con
              el equipo: un jinete no cobra una jornada ni entra en el reparto
              de la propina, así que sumarlos en una sola lista haría ilegibles
              las dos columnas donde eso se ve. Juntos aparecen en el total del
              periodo y en el CSV, que es donde hacen falta juntos. */}
          {lineasExtras.length > 0 && (
            <>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-hueso/70">
                Actividades extras
              </h2>
              <div className="relative mb-8 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[13px] uppercase tracking-wide text-hueso/50">
                    <tr className="border-b border-hueso/10">
                      <th className="sticky left-0 z-10 bg-tinta [box-shadow:1px_0_0_0_rgb(var(--hueso)/0.15)] py-2 pr-3">Quién</th>
                      <th className="w-48 py-2 pr-3">Actividad</th>
                      <th className="w-40 py-2 pr-3">Días</th>
                      <th className="w-28 py-2 pr-3 text-right">Montos</th>
                      <th className="w-28 py-2 pr-3 text-right">Ajustes</th>
                      <th className="w-28 py-2 pr-3 text-right">Total</th>
                      <EncabezadosPago />
                    </tr>
                  </thead>
                  <tbody>
                    {lineasExtras.map((l) => (
                      <tr key={l.colaborador} className="border-b border-hueso/5">
                        <td className="sticky left-0 z-10 bg-tinta [box-shadow:1px_0_0_0_rgb(var(--hueso)/0.15)] py-2 pr-3">{l.colaborador}</td>
                        <td className="py-2 pr-3 text-hueso/70">
                          {l.actividad || <span className="text-hueso/25">—</span>}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {l.dias}
                          {l.noVino > 0 && (
                            <span className="ml-1 text-[13px] text-rojo-texto/80">
                              · {l.noVino} no vino
                            </span>
                          )}
                          {l.sinConfirmar > 0 && (
                            <span className="ml-1 text-[13px] text-ambar-texto/80">
                              · {l.sinConfirmar} sin confirmar
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-hueso/70">
                          {l.montos ? enPesos(l.montos) : <span className="text-hueso/25">—</span>}
                        </td>
                        <td className={`py-2 pr-3 text-right tabular-nums ${
                          l.ajustes < 0 ? 'text-rojo-texto/80' : 'text-hueso/70'}`}>
                          {l.ajustes ? enPesos(l.ajustes) : <span className="text-hueso/25">—</span>}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          <strong>{enPesos(l.total)}</strong>
                        </td>
                        {/* Un colaborador no entra en el reparto de la
                            propina, así que su "a transferir" es su total y
                            nada más: el cero va escrito para que se lea como
                            decisión y no como un campo que faltó. */}
                        <CeldasPago {...pagoDeFila(l.colaborador, l.total, 0)}
                          puedePagar={puedePagar}
                          onCobrar={() => setCobrando({
                            quien: l.colaborador,
                            propuesto: pagoDeFila(l.colaborador, l.total, 0).falta
                          })} />
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-hueso/15">
                      <td className="sticky left-0 z-10 bg-tinta [box-shadow:1px_0_0_0_rgb(var(--hueso)/0.15)] py-3 pr-3 text-[13px] uppercase tracking-wide text-hueso/45">
                        {lineasExtras.length}{' '}
                        {lineasExtras.length === 1 ? 'colaborador' : 'colaboradores'}
                      </td>
                      <td colSpan={3} />
                      <td className="py-3 pr-3" />
                      <td className="py-3 pr-3 text-right tabular-nums">
                        <strong className="text-oro">{enPesos(totalExtras)}</strong>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        <strong className="text-[15px]">{enPesos(sumaExtras.aTransferir)}</strong>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-hueso/75">
                        {sumaExtras.pagado > 0
                          ? enPesos(sumaExtras.pagado) : <span className="text-hueso/25">—</span>}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {sumaExtras.falta > 0
                          ? <strong className="text-ambar-texto">{enPesos(sumaExtras.falta)}</strong>
                          : <span className="text-hueso/25">—</span>}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* **Dos números y no uno**, porque son dos preguntas distintas y
              hasta ahora solo estaba la primera:

              - **Lo que cuesta el equipo**, que es la pregunta del negocio.
                La propina sigue fuera a propósito: no sale del negocio, pasa
                por él.
              - **Lo que hay que transferir**, que es la pregunta de quien
                paga — y ahí la propina SÍ va sumada, porque sale una sola
                plata a una sola cuenta.

              Juntarlas en un solo número obligaría a elegir cuál de las dos
              contestar mal. */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-oro/30 bg-oro/5 px-4 py-3">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
                Costo del periodo
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-oro">
                {enPesos(total + totalExtras)}
              </p>
              <p className="mt-1 text-[13px] text-hueso/60">
                Equipo {enPesos(total)}
                {' · '}Extras {enPesos(totalExtras)}
                {propina > 0 && <> · propina {enPesos(propina)}, que va aparte</>}
              </p>
            </div>
            <div className="rounded border border-hueso/20 bg-panel px-4 py-3">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
                A transferir
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {enPesos(sumaEquipo.aTransferir + sumaExtras.aTransferir)}
              </p>
              <p className="mt-1 text-[13px] text-hueso/60">
                Pagado {enPesos(sumaEquipo.pagado + sumaExtras.pagado)}
                {' · '}
                {sumaEquipo.falta + sumaExtras.falta > 0 ? (
                  <strong className="text-ambar-texto">
                    falta {enPesos(sumaEquipo.falta + sumaExtras.falta)}
                  </strong>
                ) : (
                  <strong className="text-verde-texto">✓ todo pagado</strong>
                )}
              </p>
            </div>
          </div>

          {sinCuenta.length > 0 && (
            <p className="mb-6 max-w-2xl text-[13px] text-ambar-texto/80">
              Sin datos para transferir: {sinCuenta.join(' · ')}. La planilla
              sale igual, con esas columnas a medias; se completa en{' '}
              <a href="/equipo" className="hover:underline">equipo</a> o en{' '}
              <a href="/extras" className="hover:underline">actividades extras</a>.
            </p>
          )}

          <p className="mt-6 max-w-2xl text-[13px] text-hueso/50">
            <strong>Un contratado suma cero en jornadas</strong>, porque su
            sueldo no sale de acá; lo que aparece en su fila son horas extra y
            ajustes. <strong>La propina va aparte y no se suma al total</strong>:
            esa plata no sale del negocio, pasa por él, así que juntarlas haría
            imposible contestar cuánto costó el equipo. <strong>Las actividades
            extras no reciben propina</strong> y no cobran jornada: cobran lo
            acordado para ese día, y por eso van en su propia tabla.
          </p>
          <p className="mt-3 max-w-2xl text-[13px] text-hueso/50">
            <strong>La planilla que se descarga trae las dos cosas juntas</strong>,
            día por día, con el motivo de cada ajuste y los datos de la
            transferencia de cada uno —titular, RUT, banco, tipo, número y
            correo, un campo por columna—: es un solo pago a la semana, se
            pega en la carga del banco, y cada fila dice si es equipo o
            actividad extra.
          </p>
        </>
      )}

      {/* **Registrar un pago, entero o en parte.** El monto viene propuesto
          con lo que falta —que es el caso de siempre— y se puede bajar: eso
          es todo lo que hace falta para "pagué solo 100 de 250". El resto
          queda a la vista y se cierra con un segundo pago cuando se haga.

          No hay una casilla "pagado": se deduce de que la suma cubra lo que
          hay que transferir. Ver `remuneraciones.ts`. */}
      {cobrando && (
        <Dialogo titulo={`Registrar pago · ${cobrando.quien}`}
          onCerrar={() => setCobrando(null)}>
          <FormularioPago
            quien={cobrando.quien}
            propuesto={cobrando.propuesto}
            periodo={rangoEnPalabras([desde, hasta])}
            onGuardar={(monto, nota) => void registrarPago(cobrando.quien, monto, nota)}
            onCancelar={() => setCobrando(null)} />
        </Dialogo>
      )}

    </section>
  );
}
