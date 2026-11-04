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
import { aTransferirDe, desglosePago, CONCEPTO, pideBoleta, boletaDe,
         boletaEnPlanilla, textoTransferencia, glosaDe, filaTransferencia,
         ORDEN_TRANSFERENCIA, NOMBRE_COLUMNA_TRANSFERENCIA,
         type PagoEquipo, type Boleta, type Concepto, type Parte,
         type EstadoPago } from '@/lib/remuneraciones';
import Dialogo from './Dialogo';
import Campo from './Campo';
import { copiarConAviso, avisar } from './AvisoFlotante';

type Tipo = 'mes' | 'semana' | 'rango';

/** Una de las partes que se pueden pagar: sueldo, propina o servicio. */
interface Opcion { concepto: Concepto; parte: Parte }

/**
 * **El formulario de un pago, con dos preguntas y nada más** (2026-11-04).
 *
 * Lo pidió el cliente, con la regla PlayStation: *"que simple se pueda decir
 * yo le pagué esta parte: la propina, los sueldos, o una parte"*. Entonces:
 *
 * 1. **¿Qué le pagaste?** — un botón grande por concepto, con lo que falta
 *    escrito adentro, y *Los dos* cuando faltan los dos. Son dos
 *    transferencias porque legalmente son dos pagos; *Los dos* anota dos
 *    filas, una por concepto, no una sola por el total.
 * 2. **¿Cuánto?** — *Todo* o *Una parte*. Todo es lo normal y no pide
 *    escribir nada; una parte abre el campo del monto.
 *
 * **Al nivel del módulo**, como todo componente de este proyecto: declarado
 * adentro de otro, React lo desmontaría en cada dibujado y el campo perdería
 * el foco a cada tecla.
 */
function FormularioPago({
  quien, opciones, inicial, boletaPendiente, periodo, onGuardar, onCancelar
}: {
  quien: string;
  opciones: Opcion[];
  inicial: Concepto | 'ambos';
  /** Si la boleta de este periodo todavía no está marcada. */
  boletaPendiente: boolean;
  periodo: string;
  onGuardar: (lineas: { concepto: Concepto; monto: number }[], nota: string) => void;
  onCancelar: () => void;
}) {
  const conFalta = opciones.filter((o) => o.parte.falta > 0);
  const [que, setQue] = useState<Concepto | 'ambos'>(inicial);
  const [modo, setModo] = useState<'todo' | 'parte'>('todo');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');

  const elegida = opciones.find((o) => o.concepto === que);
  const n = Math.round(Number(monto.replace(/[^\d-]/g, '')) || 0);
  const lineas: { concepto: Concepto; monto: number }[] = que === 'ambos'
    ? conFalta.map((o) => ({ concepto: o.concepto, monto: o.parte.falta }))
    : elegida
      ? [{ concepto: elegida.concepto, monto: modo === 'todo' ? elegida.parte.falta : n }]
      : [];
  const suma = lineas.reduce((s, l) => s + l.monto, 0);
  const tocaSueldo = lineas.some((l) => l.concepto !== CONCEPTO.propina);
  const parcial = !!elegida && modo === 'parte' && n > 0 && n < elegida.parte.falta;

  const grande = (activo: boolean) =>
    `tecla flex min-h-[64px] flex-1 flex-col items-start justify-center rounded-xl border-2
     px-4 py-2 text-left ${activo
       ? 'border-oro bg-oro/15'
       : 'border-hueso/20 bg-panel hover:border-oro/60'}`;

  return (
    <div className="space-y-5">
      <p className="text-sm text-hueso/70">
        Pago a <strong className="text-hueso">{quien}</strong> por {periodo}.
      </p>

      <div>
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
          ¿Qué le pagaste?
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {opciones.map((o) => (
            <button key={o.concepto} type="button" disabled={o.parte.falta <= 0}
              aria-pressed={que === o.concepto}
              onClick={() => { setQue(o.concepto); setModo('todo'); }}
              className={grande(que === o.concepto)}>
              <span className="text-[16px] font-bold">{o.concepto}</span>
              <span className="text-[13px] text-hueso/70">
                {o.parte.falta > 0 ? <>falta {enPesos(o.parte.falta)}</> : '✓ ya pagado'}
              </span>
            </button>
          ))}
          {conFalta.length > 1 && (
            <button type="button" aria-pressed={que === 'ambos'}
              onClick={() => setQue('ambos')} className={grande(que === 'ambos')}>
              <span className="text-[16px] font-bold">Los dos</span>
              <span className="text-[13px] text-hueso/70">
                {enPesos(conFalta.reduce((s, o) => s + o.parte.falta, 0))} en dos pagos
              </span>
            </button>
          )}
        </div>
      </div>

      {que !== 'ambos' && elegida && (
        <div>
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
            ¿Cuánto?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" aria-pressed={modo === 'todo'}
              onClick={() => setModo('todo')} className={grande(modo === 'todo')}>
              <span className="text-[16px] font-bold">Todo</span>
              <span className="text-[13px] text-hueso/70">{enPesos(elegida.parte.falta)}</span>
            </button>
            <button type="button" aria-pressed={modo === 'parte'}
              onClick={() => setModo('parte')} className={grande(modo === 'parte')}>
              <span className="text-[16px] font-bold">Una parte</span>
              <span className="text-[13px] text-hueso/70">escribes cuánto</span>
            </button>
          </div>
          {modo === 'parte' && (
            <div className="mt-3">
              <Campo etiqueta="Cuánto le pagaste" ancho="w-48">
                <input type="text" inputMode="numeric" value={monto} autoFocus
                  aria-label="Monto pagado" placeholder="50000"
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full rounded border border-hueso/20 bg-transparent px-2 py-2
                             text-[16px] tabular-nums outline-none focus:border-oro/60" />
              </Campo>
              {parcial && (
                <p className="mt-2 text-[13px] text-ambar-texto">
                  Queda pendiente {enPesos(elegida.parte.falta - n)}.
                </p>
              )}
              {n > elegida.parte.falta && (
                <p className="mt-2 text-[13px] text-ambar-texto">
                  Es más de lo que falta. Se anota igual.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* La boleta avisa pero no bloquea: puede llegar después del pago, y
          trabar el registro obligaría a anotar el pago en otro lado mientras
          tanto, que es peor que un aviso. */}
      {tocaSueldo && boletaPendiente && (
        <p className="rounded-lg border-2 border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                      text-ambar-texto">
          Todavía no está marcada la boleta de esta semana. Se puede registrar
          igual; márcala cuando llegue.
        </p>
      )}

      <Campo etiqueta="Nota (opcional)" ancho="w-full">
        <input type="text" value={nota} placeholder="Transferencia 10/11"
          aria-label="Nota del pago" onChange={(e) => setNota(e.target.value)}
          className="w-full rounded border border-hueso/20 bg-transparent px-2 py-2
                     text-sm outline-none focus:border-oro/60" />
      </Campo>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => onGuardar(lineas.filter((l) => l.monto), nota)}
          disabled={!suma} className="boton boton-relleno min-h-[44px] text-[15px]">
          Registrar {suma ? enPesos(suma) : 'pago'}
        </button>
        <button onClick={onCancelar} className="boton min-h-[44px]">Cancelar</button>
        <span className="text-[13px] text-hueso/60">
          Queda anotado con tu nombre y la fecha.
        </span>
      </div>
    </div>
  );
}

/** Un dato del detalle de una persona: qué es y cuánto. */
interface Dato { que: string; valor: string; tono?: 'rojo' | 'ambar' | 'fuerte' }

/**
 * **La línea de una persona: cerrada se copia, abierta se paga**
 * (2026-11-04, segundo corte).
 *
 * El primer corte puso los pagos en una sección aparte, debajo de las
 * tablas, y el cliente lo pidió al revés: *"en esta línea acotada ya están
 * los dos botones, copiar la línea de propina, copiar la línea de sueldo, y
 * al apretar la línea del trabajador se abre y ahí das las opciones"*. Y
 * que funcione perfecto en el celular, *"más PlayStation que en cualquier
 * otro lado"*: la mayoría lo va a usar ahí.
 *
 * Por eso **dejó de ser una tabla**: once columnas no caben en un teléfono,
 * y botones de 40px dentro de una celda tampoco. Es una línea-tarjeta como
 * las fichas de `/equipo`, con la misma regla: **se abre una a la vez**.
 *
 * - **Cerrada**: el nombre, lo que hay que transferirle, su estado y los
 *   botones de copiar —uno por parte—. Es lo que se usa el lunes al pagar:
 *   copiar, pegar en el banco, siguiente.
 * - **Abierta**: el detalle de la semana (días, jornadas, horas extra,
 *   ajustes, propina), cada parte con su estado y **Registrar pago**, y la
 *   **boleta**.
 *
 * **Los botones de copiar no viven dentro del botón que abre la línea**: un
 * botón dentro de otro no es HTML válido, y el toque se iría a los dos.
 * Van en su propia fila, debajo.
 */
function LineaPersona({
  nombre, detalle, aTransferir, estado, partes, datos, avisos, sinCuenta,
  boleta, puedePagar, abierta, onAbrir, onCopiar, onPagar, onBoleta
}: {
  nombre: string;
  detalle: string;
  aTransferir: number;
  estado: EstadoPago;
  partes: Opcion[];
  datos: Dato[];
  /** "1 no vino", "2 sin marcar": lo que hace que el total esté incompleto. */
  avisos: string[];
  sinCuenta: boolean;
  /** `null` si no aplica; si aplica, si ya llegó. */
  boleta: boolean | null;
  puedePagar: boolean;
  abierta: boolean;
  onAbrir: () => void;
  onCopiar: (o: Opcion) => void;
  onPagar: (concepto: Concepto) => void;
  onBoleta: (recibida: boolean) => void;
}) {
  const pendientes = partes.filter((o) => o.parte.falta > 0);
  const estadoPill = (e: EstadoPago, falta: number) => (
    <span className={`whitespace-nowrap rounded-full border-2 px-2 py-0.5 text-[13px] font-bold ${
      e === 'pagado' ? 'border-verde/60 text-verde-texto'
      : e === 'parcial' ? 'border-ambar/60 text-ambar-texto'
      : 'border-hueso/25 text-hueso/65'}`}>
      {e === 'pagado' ? '✓ pagado' : e === 'parcial' ? `falta ${enPesos(falta)}` : 'sin pagar'}
    </span>
  );

  return (
    <li className={`rounded-2xl border-2 bg-panel ${
      abierta ? 'border-oro/70' : estado === 'pagado' && aTransferir > 0
        ? 'border-verde/40' : 'border-hueso/15'}`}>
      {/* **En el celular son dos filas**: arriba quién es y cuánto, abajo
          los botones de copiar a todo el ancho, para el dedo. **En una
          pantalla ancha es una sola fila**: los botones van entre el nombre
          y el monto, con su ancho natural; estirados a lo largo de 1.200px
          serían barras, no botones. */}
      <div className="md:flex md:items-center">
      <button type="button" onClick={onAbrir} aria-expanded={abierta}
        className="tecla flex w-full items-start gap-3 rounded-2xl px-4 pb-2 pt-3 text-left
                   md:order-1 md:min-w-0 md:flex-1 md:items-center md:pb-3">
        <span aria-hidden className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center
                                     rounded-full border-2 text-[15px] font-bold ${
          abierta ? 'border-oro bg-oro text-tinta' : 'border-hueso/30 text-hueso/70'}`}>
          {abierta ? '−' : '+'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold leading-tight">{nombre}</span>
          <span className="block text-[13px] text-hueso/65">
            {detalle}
            {avisos.map((a) => (
              <span key={a} className="text-ambar-texto"> · {a}</span>
            ))}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 md:hidden">
          <span className="text-[19px] font-bold tabular-nums">
            {aTransferir > 0 ? enPesos(aTransferir) : '—'}
          </span>
          {aTransferir > 0 && estadoPill(estado,
            partes.reduce((s, o) => s + o.parte.falta, 0))}
        </span>
      </button>

      {/* Los de copiar, a la vista con la línea cerrada: es lo que se hace
          el lunes, persona tras persona. Solo lo que falta pagar. */}
      {puedePagar && pendientes.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3 md:order-2 md:flex-nowrap md:py-3 md:pl-0">
          {sinCuenta ? (
            <span className="rounded-lg border-2 border-ambar/50 px-3 py-2 text-[13px]
                             font-semibold text-ambar-texto">
              Falta su cuenta para transferir
            </span>
          ) : partes.filter((o) => o.parte.debe > 0).map((o) => o.parte.falta <= 0 ? (
            // Ya pagada: se queda en la línea como pastilla verde, para que
            // cada persona muestre siempre sus dos partes y se vea de un
            // vistazo cuál falta.
            <span key={o.concepto}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5
                         whitespace-nowrap rounded-xl border-2 border-verde/50 bg-verde/[0.06] px-3
                         text-[14px] font-bold text-verde-texto md:flex-none">
              ✓ {o.concepto}
            </span>
          ) : (
            <button key={o.concepto} type="button" onClick={() => onCopiar(o)}
              className="tecla flex min-h-[44px] flex-1 items-center justify-center gap-2
                         whitespace-nowrap rounded-xl border-2 border-oro/60 bg-oro/[0.07] px-3
                         text-[14px] font-bold hover:border-oro md:flex-none">
              <span aria-hidden>📋</span>
              <span>{o.concepto}</span>
              <span className="tabular-nums text-hueso/75">{enPesos(o.parte.falta)}</span>
            </button>
          ))}
        </div>
      )}

      <span className="hidden shrink-0 flex-col items-end gap-1 py-3 pr-4 md:order-3 md:flex
                       md:w-40">
        <span className="text-[19px] font-bold tabular-nums">
          {aTransferir > 0 ? enPesos(aTransferir) : '—'}
        </span>
        {aTransferir > 0 && estadoPill(estado, partes.reduce((s, o) => s + o.parte.falta, 0))}
      </span>
      </div>

      {abierta && (
        <div className="space-y-3 border-t-2 border-hueso/10 px-4 pb-4 pt-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-3 md:max-w-2xl">
            {datos.map((d) => (
              <div key={d.que} className="flex items-baseline justify-between gap-2">
                <dt className="text-hueso/65">{d.que}</dt>
                <dd className={`tabular-nums ${d.tono === 'rojo' ? 'text-rojo-texto'
                  : d.tono === 'ambar' ? 'text-ambar-texto'
                  : d.tono === 'fuerte' ? 'font-bold' : 'text-hueso/85'}`}>{d.valor}</dd>
              </div>
            ))}
          </dl>

          {boleta !== null && (
            puedePagar ? (
              <button type="button" aria-pressed={boleta} onClick={() => onBoleta(!boleta)}
                className={`tecla flex min-h-[48px] w-full items-center gap-3 rounded-xl border-2
                            px-4 text-[15px] font-bold md:w-auto ${boleta
                  ? 'border-verde-fuerte bg-verde/10 text-verde-texto'
                  : 'border-ambar/60 text-ambar-texto hover:border-ambar-fuerte'}`}>
                <span aria-hidden className={`flex h-6 w-6 items-center justify-center rounded-md
                                             border-2 ${boleta
                  ? 'border-verde-fuerte bg-verde-fuerte text-tinta' : 'border-ambar/70'}`}>
                  {boleta ? '✓' : ''}
                </span>
                {boleta ? 'Boleta recibida' : 'Falta la boleta'}
              </button>
            ) : (
              <p className={`text-[14px] font-semibold ${boleta ? 'text-verde-texto' : 'text-ambar-texto'}`}>
                {boleta ? '✓ Boleta recibida' : 'Falta la boleta'}
              </p>
            )
          )}

          <div className="grid gap-3 md:grid-cols-2">
          {partes.filter((o) => o.parte.debe > 0).map((o) => (
            <div key={o.concepto} className={`rounded-xl border-2 p-3 ${
              o.parte.estado === 'pagado' ? 'border-verde/40 bg-verde/[0.04]' : 'border-hueso/15'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold uppercase tracking-widest text-hueso/65">
                  {o.concepto}
                </span>
                {estadoPill(o.parte.estado, o.parte.falta)}
              </div>
              <p className="mt-1 text-[24px] font-bold tabular-nums">{enPesos(o.parte.debe)}</p>
              {o.parte.pagado > 0 && o.parte.estado !== 'pagado' && (
                <p className="text-[13px] text-hueso/65">Pagado {enPesos(o.parte.pagado)}</p>
              )}
              {puedePagar && o.parte.falta > 0 && (
                <button type="button" onClick={() => onPagar(o.concepto)}
                  className="tecla mt-2 flex min-h-[48px] w-full items-center justify-center
                             rounded-xl border-2 border-oro bg-oro text-[15px] font-bold text-tinta">
                  Registrar pago de {o.concepto.toLowerCase()}
                </button>
              )}
            </div>
          ))}
          </div>
        </div>
      )}
    </li>
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
  // Las boletas marcadas. Igual que los pagos, el check se deduce de que
  // exista la fila: si no está, no llegó.
  const [boletas, setBoletas] = useState<Boleta[]>([]);
  // A quién se le está registrando un pago, con qué partes y cuál viene
  // elegida al abrir.
  const [pagando, setPagando] = useState<{
    quien: string; opciones: Opcion[]; inicial: Concepto | 'ambos'; boletaPendiente: boolean;
  } | null>(null);
  // La línea abierta. Una a la vez, como las fichas de /equipo: se paga a
  // una persona, no se comparan dos.
  const [abierta, setAbierta] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  // **Abre en la semana pasada** (2026-11-04): se paga el lunes la semana
  // que terminó el domingo, y el cliente pidió los pagos "por ahora
  // semanal". Es la misma semana con que abre el link personal de cada
  // trabajador, así que los dos miran lo mismo.
  const [tipo, setTipo] = useState<Tipo>('semana');
  const [periodo, setPeriodo] = useState(sumarDias(semanaDe(hoy()), -7));
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
        setBoletas(d.boletas ?? []);
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
    const actuales = tipo === 'mes'
      ? [hoy().slice(0, 7)]
      : [semanaDe(hoy()), sumarDias(semanaDe(hoy()), -7)];
    return [...new Set([...actuales, ...conTurnos])].sort().reverse();
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
    const d = desglosePago(pagos, nombre, desde, hasta, tot, prop);
    return {
      aTransferir: aTransferirDe(tot, prop), pagado: d.total.pagado,
      falta: d.total.falta, estado: d.total.estado
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

  /**
   * Registra uno o dos pagos —*Los dos* son dos filas, una por concepto,
   * porque legalmente son dos pagos—. Van uno detrás del otro y no en
   * paralelo: si el segundo falla, el primero ya quedó y se ve en pantalla,
   * en vez de no saber cuál de los dos entró.
   */
  async function registrarPagos(
    quien: string, lineasPago: { concepto: Concepto; monto: number }[], nota: string
  ) {
    for (const l of lineasPago) {
      const r = await fetch('/api/informe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quien, monto: l.monto, concepto: l.concepto, desde, hasta, nota })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      // Se agrega a lo que ya hay en pantalla en vez de recargar todo.
      if (d.pago) setPagos((antes) => [...antes, d.pago]);
    }
    setPagando(null);
    avisar(`Pago de ${quien} registrado`);
  }

  /** Marca o desmarca la boleta de alguien para el periodo que se mira. */
  async function cambiarBoleta(quien: string, recibida: boolean) {
    const r = await fetch('/api/informe/boleta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quien, desde, hasta, recibida })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    setBoletas((antes) => recibida
      ? [...antes, { quien, desde, hasta, registradoPor: '', cuando: '', nota: '', fila: -1 }]
      : antes.filter((b) => !(normalizar(b.quien) === normalizar(quien)
          && b.desde === desde && b.hasta === hasta)));
    avisar(recibida ? `Boleta de ${quien} marcada` : `Boleta de ${quien} desmarcada`);
  }

  /** Copia los datos de la transferencia de una parte, con lo que falta. */
  function copiarTransferencia(quien: string, o: Opcion) {
    const b = cuentaDe(quien);
    const texto = textoTransferencia({
      titular: titularDe(b, quien), rut: rutLimpio(b.rut), banco: b.banco,
      tipo: b.tipo, numero: b.numero, monto: o.parte.falta, correo: b.correo,
      glosa: glosaDe(o.concepto, desde, hasta)
    });
    copiarConAviso(texto, `${o.concepto} de ${quien} copiado · ${enPesos(o.parte.falta)}`,
                   `Datos de ${o.concepto.toLowerCase()} de ${quien}:`);
  }

  /**
   * **La planilla para la transferencia masiva del banco** (2026-11-04).
   *
   * Lo pidió el cliente para cuando tengan un banco con transferencia
   * masiva: *"dos botones: descargar planilla semanal propina y descargar
   * planilla semanal sueldos"*. Una por concepto, porque son dos pagos.
   *
   * - **Una fila por persona con algo pendiente** de ese concepto, con lo
   *   que **falta**: lo ya pagado no se vuelve a transferir.
   * - **Los sueldos llevan también las actividades extras** (su servicio):
   *   es la misma transferencia de pago, y el banco no distingue.
   * - **Quien no tiene la cuenta completa queda fuera**, y el aviso lo
   *   nombra: una fila con datos a medias suele hacer rechazar el archivo
   *   entero en la carga masiva.
   * - **Las columnas salen de `ORDEN_TRANSFERENCIA`**, el mismo orden del
   *   botón de copiar. El orden exacto que pide el banco todavía no está
   *   confirmado: cuando lo esté, se cambia ahí una vez.
   */
  function descargarBanco(cual: 'sueldos' | 'propinas') {
    const personas = [
      ...lineas.map((l) => ({ nombre: l.trabajador,
        partes: partesDe(l.trabajador, l.total, l.propina, false) })),
      ...(cual === 'sueldos' ? lineasExtras.map((l) => ({ nombre: l.colaborador,
        partes: partesDe(l.colaborador, l.total, 0, true) })) : [])
    ];
    const filas: string[][] = [];
    const fuera: string[] = [];
    for (const x of personas) {
      const o = x.partes.find((p) => cual === 'propinas'
        ? p.concepto === CONCEPTO.propina : p.concepto !== CONCEPTO.propina);
      if (!o || o.parte.falta <= 0) continue;
      const b = cuentaDe(x.nombre);
      if (!sePuedeTransferir(b)) { fuera.push(x.nombre); continue; }
      filas.push(filaTransferencia({
        titular: titularDe(b, x.nombre), rut: rutLimpio(b.rut), banco: b.banco,
        tipo: b.tipo, numero: b.numero, monto: o.parte.falta, correo: b.correo,
        glosa: glosaDe(o.concepto, desde, hasta)
      }));
    }
    if (!filas.length) {
      avisar(fuera.length
        ? `Nadie con cuenta completa: falta la de ${fuera.join(', ')}`
        : `No hay ${cual} pendientes en este periodo`, 'atencion');
      return;
    }
    const csv = aCSV(ORDEN_TRANSFERENCIA.map((k) => NOMBRE_COLUMNA_TRANSFERENCIA[k]), filas);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `banco-${cual}-${desde}-a-${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (fuera.length) {
      avisar(`${filas.length} ${cual} en la planilla · quedó fuera ${fuera.join(', ')} `
             + '(falta su cuenta)', 'atencion');
    } else {
      avisar(`Planilla de ${cual}: ${filas.length} `
             + `${filas.length === 1 ? 'transferencia' : 'transferencias'}`);
    }
  }

  /** Las partes que se le pagan a alguien: sueldo y propina, o el servicio. */
  const partesDe = (nombre: string, tot: number, prop: number, extra: boolean): Opcion[] => {
    const d = desglosePago(pagos, nombre, desde, hasta, tot, prop);
    if (extra) return [{ concepto: CONCEPTO.servicio, parte: d.sueldo }];
    const salida: Opcion[] = [{ concepto: CONCEPTO.sueldo, parte: d.sueldo }];
    // Sin propina en el periodo no hay bloque de propina: un "$0 sin pagar"
    // sería un botón que no lleva a nada.
    if (d.propina.debe > 0) salida.push({ concepto: CONCEPTO.propina, parte: d.propina });
    return salida;
  };

  const boletaRecibida = (nombre: string) => !!boletaDe(boletas, nombre, desde, hasta);

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
  const columnasPago = (
    nombre: string, tot: number, prop: number, primera: boolean, aplicaBoleta: boolean
  ) => {
    if (!primera) return ['', '', '', '', '', ''];
    const d = desglosePago(pagos, nombre, desde, hasta, tot, prop);
    return [aTransferirDe(tot, prop), d.total.pagado, d.total.falta,
            // Para Chipax: si el pago está respaldado. En blanco si no
            // llegó, que es lo que pidió el cliente.
            boletaEnPlanilla(aplicaBoleta, boletaRecibida(nombre)),
            d.sueldo.pagado || '', d.propina.pagado || ''];
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
       'A transferir', 'Pagado', 'Falta', 'Boleta', 'Pagado sueldo o servicio',
       'Pagado propina',
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
            i === 0 || normalizar(delPeriodo[i - 1].trabajador) !== normalizar(t.trabajador),
            pideBoleta('equipo', esContratado(
              lineas.find((l) => normalizar(l.trabajador) === normalizar(t.trabajador))?.modalidad ?? ''))
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
            i === 0 || normalizar(extrasDelPeriodo[i - 1].colaborador) !== normalizar(e.colaborador),
            pideBoleta('extra', false)
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
        {/* Las dos planillas para la transferencia masiva: una por
            concepto, solo para quien paga. */}
        {puedePagar && (
          <>
            <button onClick={() => descargarBanco('sueldos')}
              disabled={lineas.length === 0 && lineasExtras.length === 0}
              className="boton min-h-[40px] font-semibold">
              ⬇ Banco · sueldos
            </button>
            <button onClick={() => descargarBanco('propinas')}
              disabled={propina <= 0}
              className="boton min-h-[40px] font-semibold">
              ⬇ Banco · propinas
            </button>
          </>
        )}
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
          {puedePagar && (
            <p className="mb-4 max-w-2xl text-[14px] text-hueso/70">
              <strong>📋 Copia el sueldo y la propina</strong> de cada persona y
              pégalos en el banco: son dos transferencias. <strong>Aprieta la
              línea</strong> para registrar el pago o marcar la boleta.
            </p>
          )}

          <h2 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-hueso/70">
            Equipo del restaurante
          </h2>
          {lineas.length === 0 ? (
            <p className="mb-8 text-sm text-hueso/60">Sin turnos anotados en este periodo.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {lineas.map((l) => {
                  const pago = pagoDeFila(l.trabajador, l.total, l.propina);
                  const aplica = pideBoleta('equipo', esContratado(l.modalidad));
                  return (
                    <LineaPersona key={'e-' + l.trabajador}
                      nombre={l.trabajador}
                      detalle={`${esContratado(l.modalidad) ? 'Contratado' : 'Por turno'} · ${
                        l.dias} ${l.dias === 1 ? 'día' : 'días'}`}
                      avisos={[
                        ...(l.noVino ? [`${l.noVino} no vino`] : []),
                        ...(l.sinMarcar ? [`${l.sinMarcar} sin marcar`] : [])
                      ]}
                      aTransferir={pago.aTransferir} estado={pago.estado}
                      partes={partesDe(l.trabajador, l.total, l.propina, false)}
                      datos={[
                        { que: 'Jornadas', valor: esContratado(l.modalidad)
                            ? 'en su sueldo' : enPesos(l.jornadas) },
                        { que: 'Horas extra', valor: l.horasExtra
                            ? `${enPesos(l.montoHorasExtra)} (${l.horasExtra} h)` : '—' },
                        { que: 'Ajustes', valor: l.ajustes ? enPesos(l.ajustes) : '—',
                          tono: l.ajustes < 0 ? 'rojo' : undefined },
                        { que: 'Total', valor: enPesos(l.total), tono: 'fuerte' },
                        { que: 'Propina', valor: l.propina ? enPesos(l.propina) : '—' }
                      ]}
                      sinCuenta={!sePuedeTransferir(cuentaDe(l.trabajador))}
                      boleta={aplica ? boletaRecibida(l.trabajador) : null}
                      puedePagar={puedePagar}
                      abierta={abierta === 'e-' + l.trabajador}
                      onAbrir={() => setAbierta((a) => a === 'e-' + l.trabajador ? null : 'e-' + l.trabajador)}
                      onCopiar={(o) => copiarTransferencia(l.trabajador, o)}
                      onBoleta={(r) => void cambiarBoleta(l.trabajador, r)}
                      onPagar={(concepto) => setPagando({
                        quien: l.trabajador,
                        opciones: partesDe(l.trabajador, l.total, l.propina, false),
                        inicial: concepto,
                        boletaPendiente: aplica && !boletaRecibida(l.trabajador)
                      })} />
                  );
                })}
              </ul>
              <p className="mb-8 mt-2 px-1 text-[14px] text-hueso/70">
                {lineas.length} {lineas.length === 1 ? 'persona' : 'personas'}
                {' · '}total <strong className="text-oro">{enPesos(total)}</strong>
                {propina > 0 && <> · propina <strong>{enPesos(propina)}</strong></>}
                {sumaEquipo.falta > 0 && (
                  <> · <strong className="text-ambar-texto">falta {enPesos(sumaEquipo.falta)}</strong></>
                )}
              </p>
            </>
          )}

          {/* Las actividades extras van en su propia lista y no mezcladas con
              el equipo: un jinete no cobra una jornada ni entra en el reparto
              de la propina. Juntos aparecen en el total del periodo y en el
              CSV, que es donde hacen falta juntos. */}
          {lineasExtras.length > 0 && (
            <>
              <h2 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-hueso/70">
                Actividades extras
              </h2>
              <ul className="space-y-2">
                {lineasExtras.map((l) => {
                  const pago = pagoDeFila(l.colaborador, l.total, 0);
                  return (
                    <LineaPersona key={'x-' + l.colaborador}
                      nombre={l.colaborador}
                      detalle={`${l.actividad || 'Actividad extra'} · ${l.dias} ${
                        l.dias === 1 ? 'día' : 'días'}`}
                      avisos={[
                        ...(l.noVino ? [`${l.noVino} no vino`] : []),
                        ...(l.sinConfirmar ? [`${l.sinConfirmar} sin confirmar`] : [])
                      ]}
                      aTransferir={pago.aTransferir} estado={pago.estado}
                      partes={partesDe(l.colaborador, l.total, 0, true)}
                      datos={[
                        { que: 'Montos', valor: l.montos ? enPesos(l.montos) : '—' },
                        { que: 'Ajustes', valor: l.ajustes ? enPesos(l.ajustes) : '—',
                          tono: l.ajustes < 0 ? 'rojo' : undefined },
                        { que: 'Total', valor: enPesos(l.total), tono: 'fuerte' }
                      ]}
                      sinCuenta={!sePuedeTransferir(cuentaDe(l.colaborador))}
                      boleta={pideBoleta('extra', false) ? boletaRecibida(l.colaborador) : null}
                      puedePagar={puedePagar}
                      abierta={abierta === 'x-' + l.colaborador}
                      onAbrir={() => setAbierta((a) => a === 'x-' + l.colaborador ? null : 'x-' + l.colaborador)}
                      onCopiar={(o) => copiarTransferencia(l.colaborador, o)}
                      onBoleta={(r) => void cambiarBoleta(l.colaborador, r)}
                      onPagar={(concepto) => setPagando({
                        quien: l.colaborador,
                        opciones: partesDe(l.colaborador, l.total, 0, true),
                        inicial: concepto,
                        boletaPendiente: !boletaRecibida(l.colaborador)
                      })} />
                  );
                })}
              </ul>
              <p className="mb-8 mt-2 px-1 text-[14px] text-hueso/70">
                {lineasExtras.length} {lineasExtras.length === 1 ? 'colaborador' : 'colaboradores'}
                {' · '}total <strong className="text-oro">{enPesos(totalExtras)}</strong>
                {sumaExtras.falta > 0 && (
                  <> · <strong className="text-ambar-texto">falta {enPesos(sumaExtras.falta)}</strong></>
                )}
              </p>
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
      {pagando && (
        <Dialogo titulo={`Registrar pago · ${pagando.quien}`} ancho="max-w-xl"
          onCerrar={() => setPagando(null)}>
          <FormularioPago
            quien={pagando.quien}
            opciones={pagando.opciones}
            inicial={pagando.inicial}
            boletaPendiente={pagando.boletaPendiente}
            periodo={rangoEnPalabras([desde, hasta])}
            onGuardar={(ls, nota) => void registrarPagos(pagando.quien, ls, nota)}
            onCancelar={() => setPagando(null)} />
        </Dialogo>
      )}

    </section>
  );
}
