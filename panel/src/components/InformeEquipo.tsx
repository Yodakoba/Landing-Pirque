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
         boletaEnPlanilla, textoTransferencia, glosaDe,
         type PagoEquipo, type Boleta, type Concepto, type Parte } from '@/lib/remuneraciones';
import Dialogo from './Dialogo';
import Campo from './Campo';
import { copiarConAviso, avisar } from './AvisoFlotante';

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
  aTransferir, pagado, falta, estado
}: {
  aTransferir: number; pagado: number; falta: number;
  estado: 'pagado' | 'parcial' | 'pendiente';
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
    </>
  );
}

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

/**
 * **La tarjeta de pago de una persona** (2026-11-04).
 *
 * Lo pidió el cliente pensando en quien hace las transferencias: *"dos
 * botones en cada línea: copiar los datos de transferencia con el monto de
 * propina, y con el monto de sueldo"*. Son dos porque legalmente son dos
 * pagos.
 *
 * Cada parte es un bloque con su monto, su estado y sus dos botones
 * —**Copiar datos** y **Registrar pago**—, y arriba a la derecha el check de
 * la **boleta**, cuando aplica. Es tarjeta y no columnas de la tabla porque
 * la tabla ya tiene once columnas: cuatro botones más por fila la habrían
 * vuelto ilegible en un teléfono, y la regla PlayStation pide botones
 * grandes, que no caben en una celda.
 */
function TarjetaPago({
  nombre, detalle, partes, sinCuenta, boleta, onCopiar, onPagar, onBoleta
}: {
  nombre: string;
  /** "contratado", la actividad de un extra, o nada. */
  detalle: string;
  partes: Opcion[];
  sinCuenta: boolean;
  /** `null` si no aplica; si aplica, si ya llegó. */
  boleta: boolean | null;
  onCopiar: (o: Opcion) => void;
  onPagar: (concepto: Concepto) => void;
  onBoleta: (recibida: boolean) => void;
}) {
  return (
    <li className="rounded-2xl border-2 border-hueso/15 bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold">{nombre}</p>
          {detalle && <p className="text-[13px] text-hueso/60">{detalle}</p>}
        </div>
        {boleta !== null && (
          <button type="button" aria-pressed={boleta} onClick={() => onBoleta(!boleta)}
            className={`tecla flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3
                        text-[14px] font-bold ${boleta
              ? 'border-verde-fuerte bg-verde/10 text-verde-texto'
              : 'border-ambar/60 text-ambar-texto hover:border-ambar-fuerte'}`}>
            <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
              boleta ? 'border-verde-fuerte bg-verde-fuerte text-tinta' : 'border-ambar/70'}`}>
              {boleta ? '✓' : ''}
            </span>
            {boleta ? 'Boleta recibida' : 'Falta la boleta'}
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {partes.map((o) => (
          <div key={o.concepto} className={`rounded-xl border-2 p-3 ${
            o.parte.estado === 'pagado' ? 'border-verde/40 bg-verde/[0.04]' : 'border-hueso/15'}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
                {o.concepto}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[13px] font-semibold ${
                o.parte.estado === 'pagado' ? 'border-verde/50 text-verde-texto'
                : o.parte.estado === 'parcial' ? 'border-ambar/50 text-ambar-texto'
                : 'border-hueso/25 text-hueso/60'}`}>
                {o.parte.estado === 'pagado' ? '✓ pagado'
                  : o.parte.estado === 'parcial' ? `falta ${enPesos(o.parte.falta)}`
                  : 'sin pagar'}
              </span>
            </div>
            <p className="mt-1 text-[24px] font-bold tabular-nums">{enPesos(o.parte.debe)}</p>
            {o.parte.falta > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => onCopiar(o)} disabled={sinCuenta}
                  title={sinCuenta ? 'Falta completar su cuenta' : undefined}
                  className="boton min-h-[40px]">
                  📋 {sinCuenta ? 'Falta su cuenta' : 'Copiar datos'}
                </button>
                <button type="button" onClick={() => onPagar(o.concepto)}
                  className="boton min-h-[40px] border-oro/60 font-semibold">
                  Registrar pago
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </li>
  );
}

/** Los encabezados de esas mismas tres columnas, para no escribirlos dos veces. */
function EncabezadosPago() {
  return (
    <>
      <th className="w-32 py-2 pr-3 text-right">A transferir</th>
      <th className="w-28 py-2 pr-3 text-right">Pagado</th>
      <th className="w-28 py-2 pr-3 text-right">Falta</th>
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
  // Las boletas marcadas. Igual que los pagos, el check se deduce de que
  // exista la fila: si no está, no llegó.
  const [boletas, setBoletas] = useState<Boleta[]>([]);
  // A quién se le está registrando un pago, con qué partes y cuál viene
  // elegida al abrir.
  const [pagando, setPagando] = useState<{
    quien: string; opciones: Opcion[]; inicial: Concepto | 'ambos'; boletaPendiente: boolean;
  } | null>(null);
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
                    <CeldasPago {...pagoDeFila(l.trabajador, l.total, l.propina)} />
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
                        <CeldasPago {...pagoDeFila(l.colaborador, l.total, 0)} />
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
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* **Pagar, persona por persona** (2026-11-04). Solo para quien puede
              registrar pagos: es su herramienta. Cada tarjeta trae lo que
              hay que transferirle partido en sueldo y propina —o el servicio
              de una actividad extra—, con el botón para copiar los datos de
              la transferencia y el de registrar el pago, y el check de la
              boleta cuando aplica. Las que ya están pagadas del todo bajan
              al final, para que lo pendiente quede arriba. */}
          {puedePagar && (
            <div className="mb-8">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-hueso/70">
                Pagar
              </h2>
              <p className="mb-3 max-w-2xl text-[13px] text-hueso/60">
                <strong>Copiar datos</strong> copia la cuenta y el monto que falta,
                listos para pegar en el banco. El sueldo y la propina van en
                transferencias separadas.
              </p>
              <ul className="grid gap-3 lg:grid-cols-2">
                {[
                  ...lineas.map((l) => ({
                    nombre: l.trabajador,
                    detalle: esContratado(l.modalidad) ? 'Contratado · horas extra y ajustes' : 'Por turno',
                    partes: partesDe(l.trabajador, l.total, l.propina, false),
                    aplica: pideBoleta('equipo', esContratado(l.modalidad))
                  })),
                  ...lineasExtras.map((l) => ({
                    nombre: l.colaborador,
                    detalle: `Actividad extra${l.actividad ? ` · ${l.actividad}` : ''}`,
                    partes: partesDe(l.colaborador, l.total, 0, true),
                    aplica: pideBoleta('extra', false)
                  }))
                ]
                  // Quien no tiene nada que cobrar en el periodo no necesita
                  // tarjeta: no vino, o quedó sin marcar (eso lo avisa arriba).
                  .filter((x) => x.partes.some((o) => o.parte.debe > 0))
                  .sort((a, b) => Number(a.partes.every((o) => o.parte.falta <= 0))
                    - Number(b.partes.every((o) => o.parte.falta <= 0)))
                  .map((x) => (
                    <TarjetaPago key={x.nombre} nombre={x.nombre} detalle={x.detalle}
                      partes={x.partes}
                      sinCuenta={!sePuedeTransferir(cuentaDe(x.nombre))}
                      boleta={x.aplica ? boletaRecibida(x.nombre) : null}
                      onCopiar={(o) => copiarTransferencia(x.nombre, o)}
                      onBoleta={(r) => void cambiarBoleta(x.nombre, r)}
                      onPagar={(concepto) => setPagando({
                        quien: x.nombre, opciones: x.partes, inicial: concepto,
                        boletaPendiente: x.aplica && !boletaRecibida(x.nombre)
                      })} />
                  ))}
              </ul>
            </div>
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
