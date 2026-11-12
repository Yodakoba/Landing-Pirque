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
import AyudaCorta from './AyudaCorta';

/** Minúsculas y sin tildes, para buscar "jose" y encontrar a José. */
const llano = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
import Ayuda from './Ayuda';
import { Aviso } from './CalendarView';
import {
  informeDelPeriodo, mesesConTurnos, semanasConTurnos, rangoDelPeriodo,
  pagoDe, esContratado, type Turno
} from '@/lib/equipo';
import { informeDeExtras, costoDeExtra, type Extra } from '@/lib/extras';
import { resumenDelPeriodo, type Venta, type FichaVendedor } from '@/lib/vendedores';
import { enPesos } from '@/lib/ocupacion';
import { normalizar } from '@/lib/columnas';
import { mesEnPalabras, rangoEnPalabras, enPalabras, enCorto, sumarDias, semanaDe, hoy } from '@/lib/fechas';
import { aCSV } from '@/lib/csv';
import { totalAjustes, motivosDe, diasQueNoSuman } from '@/lib/equipo';
import { bancoVacio, sePuedeTransferir, titularDe, rutLimpio,
         type Banco } from '@/lib/banco';
import { aTransferirDe, desglosePago, CONCEPTO, pideBoleta, boletaDe, pagosEnPeriodo,
         boletaEnPlanilla, textoTransferencia, glosaDe, filaTransferencia,
         ORDEN_TRANSFERENCIA, NOMBRE_COLUMNA_TRANSFERENCIA,
         type PagoEquipo, type Boleta, type Concepto, type Parte,
         type EstadoPago } from '@/lib/remuneraciones';
import Dialogo from './Dialogo';
import Campo from './Campo';
import { copiarConAviso, avisar } from './AvisoFlotante';

/**
 * **Sueldo y propina se distinguen por su color** (2026-11-05, lo pidió el
 * cliente: *"que se entienda gráficamente… sin ser muy gritón"*). Son dos
 * pagos distintos y antes se veían iguales salvo por la palabra.
 *
 * - **Sueldo** (y el servicio de una actividad extra, que es lo mismo:
 *   lo que se paga por el trabajo) en **cielo**.
 * - **Propina** en **dorado**, el color de la plata que dejan los clientes.
 *
 * Son tintes suaves —un fondo al 7% y un borde—, no rellenos: el verde y el
 * ámbar siguen diciendo si está pagado o no, y eso no se toca.
 */
const TINTE = {
  sueldo: { caja: 'border-cielo/50 bg-cielo/[0.07]', texto: 'text-cielo-texto', punto: 'bg-cielo-fuerte' },
  propina: { caja: 'border-oro/55 bg-oro/[0.08]', texto: 'text-oro', punto: 'bg-oro' }
} as const;
const tinteDe = (c: string) => (c === CONCEPTO.propina ? TINTE.propina : TINTE.sueldo);

type Tipo = 'dia' | 'semana' | 'mes' | 'rango';

/** Quien vino todos los días: nada fuera. */
const SIN_FUERA = { sinMarcar: [] as string[], noVino: [] as string[] };

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
  quien, opciones, inicial, modoInicial = 'todo', boletaPendiente, periodo, onGuardar, onCancelar
}: {
  quien: string;
  opciones: Opcion[];
  inicial: Concepto | 'ambos';
  /** Con qué respuesta abre "¿Cuánto?": *Pago parcial* la abre en *Una parte*. */
  modoInicial?: 'todo' | 'parte';
  /** Si la boleta de este periodo todavía no está marcada. */
  boletaPendiente: boolean;
  periodo: string;
  onGuardar: (lineas: { concepto: Concepto; monto: number }[], nota: string) => void;
  onCancelar: () => void;
}) {
  const conFalta = opciones.filter((o) => o.parte.falta > 0);
  const [que, setQue] = useState<Concepto | 'ambos'>(inicial);
  const [modo, setModo] = useState<'todo' | 'parte'>(modoInicial);
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
  nombre, detalle, aTransferir, estado, partes, datos, cuentan, fuera, marcarEn, palabraSinMarcar, nota, sinCuenta,
  boleta, puedePagar, puedeBoleta = puedePagar, abierta, onAbrir, onCopiar, onPagar, onPagarCompleto, onBoleta,
  anotados, onVerPagos
}: {
  nombre: string;
  detalle: string;
  aTransferir: number;
  estado: EstadoPago;
  partes: Opcion[];
  datos: Dato[];
  /** Cuántos días suman: los que vino (o se confirmaron). */
  cuentan: number;
  /**
   * **Los días que no suman** (2026-11-12): sin marcar —no se sabe si vino,
   * así que no se pagan todavía— y los que no vino.
   */
  fuera: { sinMarcar: string[]; noVino: string[] };
  /** Dónde se marcan: `/turnos` o `/extras`; se abre en el día con `?dia=`. */
  marcarEn: string;
  /** *"sin marcar"* para el equipo, *"sin confirmar"* para una actividad extra. */
  palabraSinMarcar: string;
  /** Una línea más bajo lo que suma, como la de un contratado. */
  nota?: string;
  sinCuenta: boolean;
  /** `null` si no aplica; si aplica, si ya llegó. */
  boleta: boolean | null;
  puedePagar: boolean;
  /** Si marca la boleta: quien paga y también el gerente (2026-11-12). */
  puedeBoleta?: boolean;
  abierta: boolean;
  onAbrir: () => void;
  onCopiar: (o: Opcion) => void;
  /** *Pago parcial*: abre la ventana con el campo del monto. */
  onPagar: (concepto: Concepto) => void;
  /** *Pagado completo*: anota lo que falta de esa parte, sin ventana. */
  onPagarCompleto: (o: Opcion) => Promise<void>;
  onBoleta: (recibida: boolean) => void;
  /** Cuántos pagos tiene anotados en el periodo. */
  anotados: number;
  onVerPagos: () => void;
}) {
  const pendientes = partes.filter((o) => o.parte.falta > 0);
  // Qué parte se está guardando con "Pagado completo": mientras tanto el
  // botón se apaga, para que dos toques seguidos no anoten dos pagos.
  const [enviando, setEnviando] = useState<Concepto | null>(null);
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
      {/* El anillo del foco va **adentro** del botón (`ring-inset`) y solo con
          el teclado: el de siempre del navegador se montaba sobre los botones
          de copiar de al lado (2026-11-12). */}
      <button type="button" onClick={onAbrir} aria-expanded={abierta}
        className="tecla flex w-full items-start gap-3 rounded-2xl px-4 pb-2 pt-3 text-left
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-oro
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
            {fuera.noVino.length > 0 && <> · {fuera.noVino.length} no vino</>}
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
      {/* La fila sigue a la vista cuando todo está pagado: dos pastillas
          verdes son la confirmación de un vistazo, y que la fila desapareciera
          se leía como que algo se había perdido. */}
      {puedePagar && partes.some((o) => o.parte.debe > 0) && (
        <div className="flex flex-wrap gap-2 px-4 pb-3 md:order-2 md:flex-nowrap md:py-3 md:pl-0">
          {sinCuenta && pendientes.length > 0 ? (
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
              className={`tecla flex min-h-[44px] flex-1 items-center justify-center gap-2
                         whitespace-nowrap rounded-xl border-2 px-3 text-[14px] font-bold
                         md:flex-none ${tinteDe(o.concepto).caja}`}>
              <span aria-hidden>📋</span>
              <span className={tinteDe(o.concepto).texto}>{o.concepto}</span>
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

      {/* **Los sin marcar, a la vista y con su camino** (2026-11-12, lo
          pidió el cliente): no suman al total hasta que el encargado de turno
          marque si vino, y el botón lleva al primero de esos días. Va fuera
          del botón que abre la línea: un enlace dentro de un botón no es
          HTML válido. */}
      {!abierta && fuera.sinMarcar.length > 0 && (
        <div className="px-4 pb-3">
          <a href={`${marcarEn}?dia=${fuera.sinMarcar[0]}`}
            className="tecla boton min-h-[40px] border-2 border-ambar/60 bg-ambar/10 font-semibold text-ambar-texto">
            ⚠ {fuera.sinMarcar.length} {palabraSinMarcar}: no {fuera.sinMarcar.length === 1 ? 'suma' : 'suman'} · Marcar →
          </a>
        </div>
      )}

      {abierta && (
        <div className="space-y-3 border-t-2 border-hueso/10 px-4 pb-4 pt-3">
          {/* **Qué se paga, como un recibo** (2026-11-12): lo que suma con su
              cuenta, y después lo que no suma y por qué. Antes era una grilla
              de tres columnas donde los valores quedaban lejos de su nombre. */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border-2 border-verde/40 bg-verde/[0.05] p-3">
              <p className="text-[15px] font-bold text-verde-texto">
                ✓ Suma: {cuentan} {cuentan === 1 ? 'día' : 'días'} que vino
              </p>
              <dl className="mt-2 space-y-1 text-[14px]">
                {datos.map((d) => (
                  <div key={d.que} className={`flex items-baseline justify-between gap-3 ${
                    d.tono === 'fuerte' ? 'border-t border-hueso/15 pt-1' : ''}`}>
                    <dt className="text-hueso/70">{d.que}</dt>
                    <dd className={`tabular-nums ${d.tono === 'rojo' ? 'text-rojo-texto'
                      : d.tono === 'ambar' ? 'text-ambar-texto'
                      : d.tono === 'fuerte' ? 'font-bold' : 'text-hueso/90'}`}>{d.valor}</dd>
                  </div>
                ))}
              </dl>
              {nota && <p className="mt-2 text-[13px] text-hueso/70">{nota}</p>}
            </div>
            {(fuera.sinMarcar.length > 0 || fuera.noVino.length > 0) && (
              <div className="space-y-3">
                {fuera.sinMarcar.length > 0 && (
                  <div className="rounded-xl border-2 border-ambar/60 bg-ambar/[0.07] p-3">
                    <p className="text-[15px] font-bold text-ambar-texto">
                      ○ Todavía no suma: {fuera.sinMarcar.length} {fuera.sinMarcar.length === 1 ? 'día' : 'días'} {palabraSinMarcar}
                    </p>
                    <p className="mt-1 text-[13px] text-hueso/75">
                      Hasta que el encargado de turno marque si vino, esos días no se pagan. Márcalos y vuelve.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fuera.sinMarcar.map((f) => (
                        <a key={f} href={`${marcarEn}?dia=${f}`}
                          className="tecla boton min-h-[40px] border-2 border-ambar/60 font-semibold">
                          Marcar el {enCorto(f)} →
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {fuera.noVino.length > 0 && (
                  <div className="rounded-xl border-2 border-hueso/15 p-3">
                    <p className="text-[15px] font-bold text-hueso/80">
                      ✕ No se paga: {fuera.noVino.length} {fuera.noVino.length === 1 ? 'día' : 'días'} que no vino
                    </p>
                    <p className="mt-1 text-[13px] text-hueso/70">{fuera.noVino.map(enCorto).join(' · ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {boleta !== null && (
            puedeBoleta ? (
              <div className="flex items-center gap-1">
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
              <AyudaCorta tema="boleta" />
              </div>
            ) : (
              <p className={`text-[14px] font-semibold ${boleta ? 'text-verde-texto' : 'text-ambar-texto'}`}>
                {boleta ? '✓ Boleta recibida' : 'Falta la boleta'}
              </p>
            )
          )}

          <div className="grid gap-3 md:grid-cols-2">
          {partes.filter((o) => o.parte.debe > 0).map((o) => (
            <div key={o.concepto} className={`rounded-xl border-2 p-3 ${tinteDe(o.concepto).caja}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-2 text-[14px] font-black uppercase
                                  tracking-widest ${tinteDe(o.concepto).texto}`}>
                  <span aria-hidden className={`h-3 w-3 rounded-full ${tinteDe(o.concepto).punto}`} />
                  {o.concepto}
                </span>
                {estadoPill(o.parte.estado, o.parte.falta)}
              </div>
              <p className="mt-1 text-[24px] font-bold tabular-nums">{enPesos(o.parte.debe)}</p>
              {fuera.sinMarcar.length > 0 && (
                <p className="text-[13px] font-semibold text-ambar-texto">
                  Sin {fuera.sinMarcar.length === 1 ? 'el día' : `los ${fuera.sinMarcar.length} días`} {palabraSinMarcar}: si vino, después se le debe más.
                </p>
              )}
              {o.parte.pagado > 0 && o.parte.estado !== 'pagado' && (
                <p className="text-[13px] text-hueso/65">Pagado {enPesos(o.parte.pagado)}</p>
              )}
              {/* **Los dos pasos de pagar, en el orden en que se hacen**:
                  copiar los datos y pegarlos en el banco, y después anotar
                  que se pagó. Copiar va primero y delineado; registrar,
                  relleno, porque es lo que cierra. */}
              {puedePagar && o.parte.falta > 0 && (
                <div className="mt-2 grid gap-2">
                  {sinCuenta ? (
                    <p className="rounded-xl border-2 border-ambar/50 px-3 py-2 text-center
                                  text-[14px] font-semibold text-ambar-texto">
                      Falta su cuenta para transferir
                    </p>
                  ) : (
                    <button type="button" onClick={() => onCopiar(o)}
                      className="tecla flex min-h-[48px] w-full items-center justify-center gap-2
                                 rounded-xl border-2 border-oro/70 bg-panel text-[15px]
                                 font-bold hover:border-oro">
                      <span aria-hidden>📋</span>
                      Copiar datos de transferencia
                    </button>
                  )}
                  {/* **Completo o parcial, dos botones** (2026-11-04, lo pidió el
                      cliente para acortar el trabajo). Lo normal es pagar
                      todo, y entonces es un toque: *Pagado completo* anota lo
                      que falta sin abrir ninguna ventana. *Pago parcial* abre
                      la ventana con el campo del monto ya listo. */}
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={enviando === o.concepto}
                      onClick={() => {
                        setEnviando(o.concepto);
                        void onPagarCompleto(o).finally(() => setEnviando(null));
                      }}
                      className="tecla flex min-h-[56px] flex-col items-center justify-center
                                 rounded-xl border-2 border-oro bg-oro px-1 text-tinta">
                      <span className="whitespace-nowrap text-[14px] font-bold">
                        {enviando === o.concepto ? 'Guardando…' : '✓ Pagado completo'}
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums">
                        {enPesos(o.parte.falta)}
                      </span>
                    </button>
                    <button type="button" onClick={() => onPagar(o.concepto)}
                      className="tecla flex min-h-[56px] flex-col items-center justify-center
                                 rounded-xl border-2 border-oro/70 px-2 hover:border-oro">
                      <span className="text-[15px] font-bold">Pago parcial</span>
                      <span className="text-[13px] text-hueso/65">escribes cuánto</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>

          {/* **Con todo pagado esta tarjeta no tenía ningún botón**, que es
              justo el caso en que alguien necesita volver: el cliente apretó
              *Pagado completo* sin querer y no tenía dónde deshacerlo
              (2026-11-04). Mientras haya algo anotado, hay por dónde mirarlo.

              **Va por persona y no por parte**: los pagos viejos vienen sin
              concepto y `desglosePago()` los reparte entre sueldo y propina
              con una regla suya. Filtrar acá por concepto sería reescribir
              esa regla en un segundo lugar, y el día que cambie una de las
              dos diría otra cosa. */}
          {anotados > 0 && (
            <button type="button" onClick={onVerPagos}
              className="boton w-full md:w-auto">
              {anotados === 1 ? 'Ver el pago anotado' : `Ver los ${anotados} pagos anotados`}
            </button>
          )}
          {anotados > 0 && <AyudaCorta tema="deshacerPago" />}
        </div>
      )}
    </li>
  );
}

/** Lo pendiente de un concepto, para la transferencia masiva. */
interface Pendientes { entran: { nombre: string; o: Opcion }[]; fuera: string[]; total: number }

/**
 * **La transferencia masiva, en una tarjeta** (2026-11-04).
 *
 * Una fila por concepto —sueldos y propinas, porque son dos pagos— con lo
 * que falta, la planilla para subir al banco y el botón para marcar a todos
 * pagados después. **En ese orden, a propósito**: primero se baja la
 * planilla, se sube al banco, y recién entonces se marca. Los dos botones
 * de una fila trabajan sobre la misma lista (`pendientesDe()`), así que lo
 * que se marca es exactamente lo que salió en la planilla.
 *
 * En el celular cada fila se apila: el texto arriba, los dos botones abajo
 * a todo el ancho. En pantalla ancha, todo en una línea.
 */
function TransferenciaMasiva({ sueldos, propinas, onDescargar, onMarcar }: {
  sueldos: Pendientes;
  propinas: Pendientes;
  onDescargar: (cual: 'sueldos' | 'propinas') => void;
  onMarcar: (cual: 'sueldos' | 'propinas') => void;
}) {
  const fila = (cual: 'sueldos' | 'propinas', p: Pendientes) => (
    <div key={cual} className={`flex flex-col gap-2 rounded-xl border-2 p-3 md:flex-row
                               md:items-center ${tinteDe(cual === 'propinas' ? CONCEPTO.propina : CONCEPTO.sueldo).caja}`}>
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-2 text-[15px] font-black uppercase tracking-wide ${
          tinteDe(cual === 'propinas' ? CONCEPTO.propina : CONCEPTO.sueldo).texto}`}>
          <span aria-hidden className={`h-3 w-3 rounded-full ${
            tinteDe(cual === 'propinas' ? CONCEPTO.propina : CONCEPTO.sueldo).punto}`} />
          {cual}
        </p>
        <p className="text-[13px] text-hueso/70">
          {p.entran.length
            ? <>{p.entran.length} {p.entran.length === 1 ? 'persona' : 'personas'} ·{' '}
                <strong className="tabular-nums text-hueso">{enPesos(p.total)}</strong></>
            : '✓ nada pendiente'}
          {p.fuera.length > 0 && (
            <span className="text-ambar-texto"> · sin cuenta: {p.fuera.join(', ')}</span>
          )}
        </p>
      </div>
      {p.entran.length > 0 && (
        <div className="grid grid-cols-[auto_1fr] gap-2 md:flex">
          <button type="button" onClick={() => onDescargar(cual)}
            className="tecla flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl
                       border-2 border-oro/70 px-3 text-[14px] font-bold hover:border-oro">
            ⬇ Planilla
          </button>
          <button type="button" onClick={() => onMarcar(cual)}
            className="tecla flex min-h-[48px] items-center justify-center gap-1.5 whitespace-nowrap
                       rounded-xl border-2 border-oro bg-oro px-3 text-[14px] font-bold text-tinta">
            ✓ Todos pagados
          </button>
        </div>
      )}
    </div>
  );
  return (
    <div className="mb-6 rounded-2xl border-2 border-oro/40 bg-panel p-4">
      <p className="text-[13px] font-bold uppercase tracking-widest text-hueso/65">
        Transferencia masiva <AyudaCorta tema="transferenciaMasiva" />
      </p>
      <p className="mb-3 mt-1 text-[14px] text-hueso/70">
        Baja la planilla, súbela al banco, y cuando esté pagada marca todos
        pagados.
      </p>
      <div className="grid gap-2">
        {fila('sueldos', sueldos)}
        {fila('propinas', propinas)}
      </div>
    </div>
  );
}

/**
 * La confirmación de "todos pagados". **Muestra a quién y cuánto antes de
 * guardar**, porque es el único botón del informe que anota muchos pagos de
 * un golpe: lo que se ve en la lista es exactamente lo que se va a anotar.
 */
function ConfirmarTodos({ cual, periodo, entran, fuera, total, onGuardar, onCancelar }: Pendientes & {
  cual: 'sueldos' | 'propinas';
  periodo: string;
  onGuardar: (nota: string) => void;
  onCancelar: () => void;
}) {
  const [nota, setNota] = useState('Transferencia masiva');
  const [guardando, setGuardando] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-[15px] text-hueso/80">
        Se anota como pagado {cual === 'sueldos' ? 'el sueldo' : 'la propina'} de la
        semana del {periodo} de estas {entran.length} personas:
      </p>
      <ul className="divide-y-2 divide-hueso/10 rounded-xl border-2 border-hueso/15">
        {entran.map(({ nombre, o }) => (
          <li key={nombre} className="flex items-center justify-between gap-3 px-3 py-2 text-[15px]">
            <span className="min-w-0 truncate">{nombre}
              {o.concepto === CONCEPTO.servicio && (
                <span className="text-[13px] text-hueso/60"> · servicio</span>
              )}
              {o.concepto === CONCEPTO.comision && (
                <span className="text-[13px] text-hueso/60"> · comisión</span>
              )}
            </span>
            <strong className="shrink-0 tabular-nums">{enPesos(o.parte.falta)}</strong>
          </li>
        ))}
        <li className="flex items-center justify-between px-3 py-2 text-[16px]">
          <span className="font-bold">Total</span>
          <strong className="tabular-nums text-oro">{enPesos(total)}</strong>
        </li>
      </ul>
      {fuera.length > 0 && (
        <p className="rounded-lg border-2 border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                      text-ambar-texto">
          No van: {fuera.join(', ')}. Les falta la cuenta, así que tampoco estaban
          en la planilla del banco.
        </p>
      )}
      <Campo etiqueta="Nota" ancho="w-full">
        <input type="text" value={nota} aria-label="Nota de los pagos"
          onChange={(e) => setNota(e.target.value)}
          className="w-full rounded border border-hueso/20 bg-transparent px-2 py-2
                     text-sm outline-none focus:border-oro/60" />
      </Campo>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={guardando}
          onClick={() => { setGuardando(true); onGuardar(nota); }}
          className="boton boton-relleno boton-hito">
          {guardando ? 'Guardando…' : `Marcar ${entran.length} pagados · ${enPesos(total)}`}
        </button>
        <button type="button" onClick={onCancelar} className="boton min-h-[48px]">Cancelar</button>
      </div>
    </div>
  );
}

export default function InformeEquipo() {
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  // Las actividades extras van en su propia tabla y en el mismo CSV: quien
  // paga hace un solo pago a la semana, pero un jinete no cobra una jornada
  // ni recibe propina, así que sumarlos en una sola lista sería mentir.
  const [extras, setExtras] = useState<Extra[]>([]);
  /** El equipo de ventas (2026-11-12): solo llega para quien paga, la gerencia y el administrador. */
  const [vendedores, setVendedores] = useState<{
    nombre: string; usuario: string;
    ficha: Pick<FichaVendedor, 'sueldoFijo' | 'comisionPct' | 'montoEvento' | 'base'>;
    ventas: (Venta & { folio: string })[];
  }[]>([]);
  const [cuentas, setCuentas] = useState<Record<string, Banco>>({});
  // Los pagos ya registrados. El "check" de cada fila **se deduce de
  // sumarlos**, no es un campo guardado que pueda decir otra cosa que la
  // plata. Ver `remuneraciones.ts`.
  const [pagos, setPagos] = useState<PagoEquipo[]>([]);
  const [puedePagar, setPuedePagar] = useState(false);
  const [puedeBoleta, setPuedeBoleta] = useState(false);
  // Las boletas marcadas. Igual que los pagos, el check se deduce de que
  // exista la fila: si no está, no llegó.
  const [boletas, setBoletas] = useState<Boleta[]>([]);
  // A quién se le está registrando un pago, con qué partes y cuál viene
  // elegida al abrir.
  const [pagando, setPagando] = useState<{
    quien: string; opciones: Opcion[]; inicial: Concepto | 'ambos'; boletaPendiente: boolean;
    modo?: 'todo' | 'parte';
  } | null>(null);
  // De quién se están mirando los pagos ya anotados, para poder deshacer uno.
  const [viendoPagos, setViendoPagos] = useState<string | null>(null);
  // La línea abierta. Una a la vez, como las fichas de /equipo: se paga a
  // una persona, no se comparan dos.
  const [abierta, setAbierta] = useState<string | null>(null);
  /** El filtro de arriba de la lista: todos, o solo a quien le falta pago. */
  const [soloPorPagar, setSoloPorPagar] = useState(false);
  /**
   * **Qué sección se ve** (2026-11-12, lo pidió el cliente: *"tres botones
   * grandes para filtrar qué estoy viendo: trabajadores, extras o
   * vendedores"*). Vacío es las tres. Se suma al filtro de *Por pagar* y al
   * buscador; los totales de abajo siguen siendo los del periodo entero.
   */
  const [seccion, setSeccion] = useState<'' | 'equipo' | 'extras' | 'vendedores'>('');
  /** Lo escrito en el buscador de nombre. */
  const [busca, setBusca] = useState('');
  // Qué "todos pagados" se está confirmando.
  const [marcando, setMarcando] = useState<'sueldos' | 'propinas' | null>(null);
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
  /** **Por día** (2026-11-12, lo pidió el cliente): una fecha y nada más. */
  const [diaElegido, setDiaElegido] = useState(hoy());

  useEffect(() => {
    // `/api/informe` y no `/api/equipo`: quien hace los pagos no tiene por
    // qué recibir reservas, clientes ni la lista del equipo para sacar sus
    // cuentas. Esa ruta devuelve turnos y nada más.
    fetch('/api/informe').then((r) => r.json())
      .then((d) => {
        if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
        setTurnos(d.turnos ?? []);
        setExtras(d.extras ?? []);
        setVendedores(d.vendedores ?? []);
        setCuentas(d.cuentas ?? {});
        setPagos(d.pagos ?? []);
        setBoletas(d.boletas ?? []);
        setPuedePagar(!!d.puedePagar);
        setPuedeBoleta(!!d.puedeBoleta);
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

  const { desde, hasta } = tipo === 'dia'
    ? { desde: diaElegido, hasta: diaElegido }
    : tipo === 'rango'
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
  /** Los días que no suman, por persona: turnos y actividades extras. */
  const fueraEquipo = useMemo(() => diasQueNoSuman(turnos ?? [], desde, hasta,
    (t) => t.trabajador, (t) => t.asistencia), [turnos, desde, hasta]);
  const fueraExtras = useMemo(() => diasQueNoSuman(extras, desde, hasta,
    (e) => e.colaborador, (e) => e.estado), [extras, desde, hasta]);
  const lineasExtras = useMemo(
    () => informeDeExtras(extras, desde, hasta, new Map(Object.entries(cuentas))),
    [extras, desde, hasta, cuentas]
  );
  /**
   * **Los vendedores en el periodo** (2026-11-12): la comisión de lo que el
   * cliente terminó de pagar y el sueldo fijo de los meses que cierran
   * adentro (`resumenDelPeriodo()`, la misma cuenta que ve el vendedor en
   * *Mi resumen*). Aparece quien suma algo o tiene un pago en el periodo.
   */
  const lineasVendedores = useMemo(() => vendedores.map((v) => {
    const r = resumenDelPeriodo(v.ficha, v.ventas, desde, hasta);
    return { nombre: v.nombre, usuario: v.usuario, total: r.total, comisiones: r.comisiones,
             sueldoFijo: r.sueldoFijo, mesesFijo: r.mesesFijo,
             ventas: r.cuentan as (Venta & { folio: string })[] };
  }).filter((l) => l.total > 0 || pagosEnPeriodo(pagos, l.nombre, desde, hasta).length > 0),
  [vendedores, desde, hasta, pagos]);
  const totalVendedores = lineasVendedores.reduce((s, l) => s + l.total, 0);
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

  /**
   * **Si una línea se muestra con el filtro de arriba** (2026-11-05, lo
   * pidió el cliente: *"un botón por pagar… y el mismo campo de búsqueda de
   * nombre"*). *Por pagar* deja a quien todavía tiene algo pendiente en
   * este periodo, con lo mismo que dice su pastilla —`falta`—, así que el
   * filtro y la línea no pueden contradecirse. El nombre se busca sin
   * tildes ni mayúsculas, igual que en `BuscarPersona`.
   */
  const q = llano(busca);
  const sePorPagar = (nombre: string, tot: number, prop: number) =>
    pagoDeFila(nombre, tot, prop).falta > 0;
  const seVe = (nombre: string, tot: number, prop: number) =>
    (!q || llano(nombre).includes(q)) && (!soloPorPagar || sePorPagar(nombre, tot, prop));
  const visiblesEquipo = seccion && seccion !== 'equipo' ? [] : lineas.filter((l) => seVe(l.trabajador, l.total, l.propina));
  const visiblesExtras = seccion && seccion !== 'extras' ? [] : lineasExtras.filter((l) => seVe(l.colaborador, l.total, 0));
  const visiblesVendedores = seccion && seccion !== 'vendedores' ? [] : lineasVendedores.filter((l) => seVe(l.nombre, l.total, 0));
  // Los contadores de *Todos / Por pagar* cuentan la sección que se ve.
  const en = (x: 'equipo' | 'extras' | 'vendedores') => !seccion || seccion === x;
  const cuantosTodos = (en('equipo') ? lineas.length : 0) + (en('extras') ? lineasExtras.length : 0)
    + (en('vendedores') ? lineasVendedores.length : 0);
  const cuantosPorPagar =
    (en('equipo') ? lineas.filter((l) => sePorPagar(l.trabajador, l.total, l.propina)).length : 0)
    + (en('extras') ? lineasExtras.filter((l) => sePorPagar(l.colaborador, l.total, 0)).length : 0)
    + (en('vendedores') ? lineasVendedores.filter((l) => sePorPagar(l.nombre, l.total, 0)).length : 0);

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
  const sumaVendedores = sumaDe(lineasVendedores.map((l) => ({ nombre: l.nombre, tot: l.total, prop: 0 })));

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

  /**
   * *Pagado completo*: anota lo que falta de una parte, de un toque. La
   * boleta no lo frena —puede llegar después—, pero si falta lo dice en el
   * aviso, en ámbar, que es el momento en que alguien lo va a leer.
   */
  async function pagarCompleto(quien: string, o: Opcion, boletaPendiente: boolean) {
    await registrarPagos(quien, [{ concepto: o.concepto, monto: o.parte.falta }], '');
    if (boletaPendiente && o.concepto !== CONCEPTO.propina) {
      avisar(`${o.concepto} de ${quien} pagado · falta marcar su boleta`, 'atencion');
    } else {
      avisar(`${o.concepto} de ${quien} pagado · ${enPesos(o.parte.falta)}`);
    }
  }

  /**
   * Deshace un pago anotado por error.
   *
   * Lo pidió el cliente con el caso exacto: *"apreté el botón pago completo
   * en un trabajador, queda como pagado, pero necesito igual la posibilidad
   * de rehacer esta acción, porque si lo aprieto por no querer, tengo que
   * tener la posibilidad de volver y decir: no, esto no se pagó aún"*.
   *
   * **Borra la fila; no anota un negativo**, y la diferencia es real:
   *
   * - **Se apretó sin querer** y ese pago nunca ocurrió. No hubo ningún
   *   movimiento que registrar, así que dejar una fila y su contraria sería
   *   inventar dos. Que alguien lo deshizo queda en la bitácora, que es
   *   donde corresponde.
   * - **Se pagó de más, o devolvieron plata.** Ahí sí hubo dos movimientos y
   *   se anota **un pago en negativo**, que el formulario ya acepta. Borrar
   *   uno de los dos escondería la mitad de lo que pasó.
   *
   * **`DELETE /api/informe` existía desde el 2026-11-01** —con su permiso y
   * su bitácora— **y ninguna pantalla lo llamaba.** Lo que faltaba era el
   * botón, no la lógica: una ruta sin pantalla no está hecha.
   */
  async function deshacerPago(pago: PagoEquipo) {
    if (!confirm(
      `¿Deshacer el pago de ${enPesos(pago.monto)} a ${pago.quien}?\n\n`
      + 'Es para cuando se anotó por error: la fila se borra y vuelve a quedar '
      + 'como no pagado. Si de verdad se pagó de más o devolvieron plata, en '
      + 'vez de esto anota un pago en negativo.')) return;
    const r = await fetch('/api/informe', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pago.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    // Se saca de lo que hay en pantalla en vez de recargar el informe
    // entero, igual que al registrarlo: lo único que cambió es esta fila.
    setPagos((antes) => antes.filter((x) => x.id !== pago.id));
    avisar(`Pago de ${pago.quien} deshecho`);
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
  /**
   * Lo pendiente de un concepto en el periodo, persona por persona: quiénes
   * entran en la transferencia masiva y quiénes no, porque les falta la
   * cuenta.
   *
   * **Una sola lista para la planilla y para el "todos pagados"**, a
   * propósito: lo que se marca como pagado tiene que ser exactamente lo que
   * salió en la planilla. Si las dos armaran su lista por su cuenta, el día
   * que una cambie se marcaría pagado a alguien que nunca estuvo en la
   * transferencia.
   */
  function pendientesDe(cual: 'sueldos' | 'propinas') {
    const personas = [
      ...lineas.map((l) => ({ nombre: l.trabajador,
        partes: partesDe(l.trabajador, l.total, l.propina, false) })),
      ...(cual === 'sueldos' ? lineasExtras.map((l) => ({ nombre: l.colaborador,
        partes: partesDe(l.colaborador, l.total, 0, true) })) : []),
      // Los vendedores van con los sueldos: su pago es la comisión (2026-11-12).
      ...(cual === 'sueldos' ? lineasVendedores.map((l) => ({ nombre: l.nombre,
        partes: partesDe(l.nombre, l.total, 0, false, true) })) : [])
    ];
    const entran: { nombre: string; o: Opcion }[] = [];
    const fuera: string[] = [];
    for (const x of personas) {
      const o = x.partes.find((p) => cual === 'propinas'
        ? p.concepto === CONCEPTO.propina : p.concepto !== CONCEPTO.propina);
      if (!o || o.parte.falta <= 0) continue;
      if (!sePuedeTransferir(cuentaDe(x.nombre))) { fuera.push(x.nombre); continue; }
      entran.push({ nombre: x.nombre, o });
    }
    return { entran, fuera, total: entran.reduce((t, x) => t + x.o.parte.falta, 0) };
  }

  function descargarBanco(cual: 'sueldos' | 'propinas') {
    const { entran, fuera } = pendientesDe(cual);
    const filas = entran.map(({ nombre, o }) => {
      const b = cuentaDe(nombre);
      return filaTransferencia({
        titular: titularDe(b, nombre), rut: rutLimpio(b.rut), banco: b.banco,
        tipo: b.tipo, numero: b.numero, monto: o.parte.falta, correo: b.correo,
        glosa: glosaDe(o.concepto, desde, hasta)
      });
    });
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

  /**
   * **Todos los sueldos —o todas las propinas— de la semana, pagados**, en
   * una sola escritura (2026-11-04). Es lo que se aprieta después de una
   * transferencia masiva: anota un pago por persona, con lo que le faltaba,
   * y cada uno queda como su propia fila con su concepto.
   */
  async function marcarTodos(cual: 'sueldos' | 'propinas', nota: string) {
    const { entran } = pendientesDe(cual);
    if (!entran.length) return setMarcando(null);
    const r = await fetch('/api/informe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagos: entran.map(({ nombre, o }) => ({
        quien: nombre, monto: o.parte.falta, concepto: o.concepto, desde, hasta, nota
      })) })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    setPagos((antes) => [...antes, ...(d.pagos ?? [])]);
    setMarcando(null);
    avisar(`${entran.length} ${cual} marcados como pagados`);
  }

  /** Las partes que se le pagan a alguien: sueldo y propina, o el servicio. */
  const partesDe = (nombre: string, tot: number, prop: number, extra: boolean, vendedor = false): Opcion[] => {
    const d = desglosePago(pagos, nombre, desde, hasta, tot, prop);
    if (vendedor) return [{ concepto: CONCEPTO.comision, parte: d.sueldo }];
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
    ...lineasExtras.map((l) => l.colaborador),
    ...lineasVendedores.map((l) => l.nombre)
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
  // **Solo para quien paga** (2026-11-12): sin las cuentas, las columnas
  // del banco no van —ni el encabezado—, así que el gerente baja la
  // planilla sin datos de transferencia.
  const columnasBanco = (nombre: string) => {
    if (!puedePagar) return [];
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

  /**
   * **Tres planillas: solo sueldos, solo propinas, o completa** (2026-11-12,
   * lo pidió el cliente, sobre todo para quien paga). Son dos pagos —por ley
   * van separados— y cada uno se revisa y se paga por su lado; la completa
   * sigue siendo la de siempre.
   *
   * - **Sueldos**: el equipo y las actividades extras, sin la columna de
   *   propina, y el pago de esa parte —lo que se debe, lo pagado, lo que
   *   falta y la boleta—.
   * - **Propinas**: solo los turnos con propina, sin jornada ni ajustes, y el
   *   pago de la propina. Un jinete no entra en el reparto, así que no va.
   *
   * Las dos llevan los datos de la transferencia al final, igual que la
   * completa, y el pago **solo en la primera fila de cada persona**.
   */
  function exportar(cual: 'completa' | 'sueldos' | 'propinas' = 'completa') {
    const delPeriodo = (turnos ?? [])
      .filter((t) => t.fecha >= desde && t.fecha <= hasta)
      .sort((a, b) => a.trabajador.localeCompare(b.trabajador)
        || a.fecha.localeCompare(b.fecha));
    const extrasDelPeriodo = extras
      .filter((e) => e.fecha >= desde && e.fecha <= hasta)
      .sort((a, b) => a.colaborador.localeCompare(b.colaborador)
        || a.fecha.localeCompare(b.fecha));
    const lineaDe = (nombre: string) => lineas.find((l) => normalizar(l.trabajador) === normalizar(nombre));
    const totalExtraDe = (nombre: string) =>
      lineasExtras.find((l) => normalizar(l.colaborador) === normalizar(nombre))?.total ?? 0;
    const banco = !puedePagar ? [] : ['Titular', 'RUT', 'Banco', 'Tipo de cuenta', 'N° de cuenta',
                   'Correo del comprobante', 'Nota de pago'];
    // La primera fila de cada persona: las filas vienen ordenadas por nombre.
    const primeraDe = <T,>(lista: T[], i: number, nombre: (x: T) => string) =>
      i === 0 || normalizar(nombre(lista[i - 1])) !== normalizar(nombre(lista[i]));
    /** Lo debido, lo pagado y lo que falta de UNA parte, en la primera fila. */
    const parteEnFila = (nombre: string, sueldo: number, propina: number, cualParte: 'sueldo' | 'propina', primera: boolean) => {
      if (!primera) return ['', '', ''];
      const p = desglosePago(pagos, nombre, desde, hasta, sueldo, propina)[cualParte];
      return [p.debe, p.pagado, p.falta];
    };

    /**
     * **Las filas de los vendedores** (2026-11-12): una por venta que suma en
     * el periodo y una por el sueldo fijo, con el pago solo en la primera.
     * `fin` son las columnas del pago y la boleta de cada planilla.
     */
    const filasVendedores = (fin: (nombre: string, total: number, primera: boolean) => unknown[], conPropina: boolean) =>
      lineasVendedores.flatMap((l) => {
        const partes: { fecha: string; que: string; modalidad: string; monto: number; motivo: string }[] = [
          ...l.ventas.map((v) => ({ fecha: v.pagadaEl, que: `Venta: ${v.cliente} (Cotización N° ${v.folio})`,
            modalidad: 'Comisión', monto: v.comision, motivo: [v.detalle, `pagó todo ${v.pagadaEl}`].filter(Boolean).join(' · ') })),
          ...(l.sueldoFijo ? [{ fecha: hasta, que: 'Sueldo fijo', modalidad: 'Fijo', monto: l.sueldoFijo,
            motivo: `${l.mesesFijo} ${l.mesesFijo === 1 ? 'mes' : 'meses'}` }] : [])
        ];
        if (!partes.length) partes.push({ fecha: '', que: 'Sin ventas pagadas en el periodo', modalidad: '', monto: 0, motivo: '' });
        return partes.map((x, i) => [
          'Vendedor', l.nombre, x.fecha, x.que, x.modalidad, '', x.monto || '', '', '', '', x.motivo, x.monto,
          ...(conPropina ? [''] : []),
          ...fin(l.nombre, l.total, i === 0), ...columnasBanco(l.nombre)
        ]);
      });

    let csv: string;
    let filas = 0;
    if (cual === 'sueldos') {
      const deEquipo = delPeriodo.map((t, i) => {
        const l = lineaDe(t.trabajador);
        const primera = primeraDe(delPeriodo, i, (x) => x.trabajador);
        return [
          'Equipo', t.trabajador, t.fecha, t.puesto, t.modalidad, t.asistencia || 'sin marcar',
          esContratado(t.modalidad) ? '' : (t.pagoJornada || ''),
          t.horasExtra || '', t.valorHora || '',
          totalAjustes(t.ajustes) || '', motivosDe(t.ajustes), pagoDe(t),
          ...parteEnFila(t.trabajador, l?.total ?? 0, l?.propina ?? 0, 'sueldo', primera),
          primera ? boletaEnPlanilla(pideBoleta('equipo', esContratado(l?.modalidad ?? '')), boletaRecibida(t.trabajador)) : '',
          ...columnasBanco(t.trabajador)
        ];
      });
      const deExtras = extrasDelPeriodo.map((e, i) => {
        const primera = primeraDe(extrasDelPeriodo, i, (x) => x.colaborador);
        return [
          'Actividad extra', e.colaborador, e.fecha, e.actividad, '', e.estado || 'sin confirmar',
          e.monto || '', '', '', e.ajuste || '', e.motivo, costoDeExtra(e),
          ...parteEnFila(e.colaborador, totalExtraDe(e.colaborador), 0, 'sueldo', primera),
          primera ? boletaEnPlanilla(pideBoleta('extra', false), boletaRecibida(e.colaborador)) : '',
          ...columnasBanco(e.colaborador)
        ];
      });
      const deVendedores = filasVendedores((nombre, tot, primera) => [
        ...parteEnFila(nombre, tot, 0, 'sueldo', primera),
        primera ? boletaEnPlanilla(pideBoleta('vendedor', false), boletaRecibida(nombre)) : ''
      ], false);
      filas = deEquipo.length + deExtras.length + deVendedores.length;
      csv = aCSV(['Tipo', 'Nombre', 'Fecha', 'Puesto o actividad', 'Modalidad', 'Vino',
        'Jornada o monto', 'Horas extra', 'Valor hora', 'Ajuste', 'Motivo', 'Total',
        'Sueldo del periodo', 'Pagado', 'Falta', 'Boleta', ...banco], [...deEquipo, ...deExtras, ...deVendedores]);
    } else if (cual === 'propinas') {
      const conPropina = delPeriodo.filter((t) => (t.propina || 0) > 0);
      const deEquipo = conPropina.map((t, i) => {
        const l = lineaDe(t.trabajador);
        return [
          t.trabajador, t.fecha, t.puesto, t.asistencia || 'sin marcar', t.propina,
          ...parteEnFila(t.trabajador, l?.total ?? 0, l?.propina ?? 0, 'propina',
            primeraDe(conPropina, i, (x) => x.trabajador)),
          ...columnasBanco(t.trabajador)
        ];
      });
      filas = deEquipo.length;
      csv = aCSV(['Nombre', 'Fecha', 'Puesto', 'Vino', 'Propina del día',
        'Propina del periodo', 'Pagado', 'Falta', ...banco], deEquipo);
    } else {
      csv = aCSV(
        ['Tipo', 'Nombre', 'Fecha', 'Puesto o actividad', 'Modalidad', 'Vino',
         'Jornada o monto', 'Horas extra', 'Valor hora', 'Ajuste', 'Motivo',
         'Total', 'Propina',
         'A transferir', 'Pagado', 'Falta', 'Boleta', 'Pagado sueldo o servicio',
         'Pagado propina',
         ...banco],
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
          ]),
          ...filasVendedores((nombre, tot, primera) =>
            columnasPago(nombre, tot, 0, primera, pideBoleta('vendedor', false)), true)
        ]
      );
      filas = delPeriodo.length + extrasDelPeriodo.length + lineasVendedores.length;
    }
    if (!filas) {
      avisar(cual === 'propinas' ? 'No hay propinas anotadas en este periodo.' : 'No hay nada que descargar en este periodo.', 'atencion');
      return;
    }
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cual === 'completa' ? 'pago' : cual}-${
      tipo === 'mes' ? periodo
      : tipo === 'semana' ? `semana-${periodo}`
      : tipo === 'dia' ? `dia-${diaElegido}`
      : `${desde}-a-${hasta}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!turnos) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <section>
      {/* Sin bajada (2026-11-05, lo pidió el cliente): explicaba cómo
          funciona el sistema por dentro —que lo pagado no se recalcula con
          los sueldos de hoy— y no ayudaba a hacer nada. */}
      <h1 className="mb-5 text-xl font-bold uppercase tracking-wide">
        Informe del equipo<Ayuda tema="informe" />
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* **Día, semana, mes u otro rango** (el día, 2026-11-12). Botones
            de 44px con el elegido teñido de dorado, como los filtros del
            resto del panel. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
          {(['dia', 'semana', 'mes', 'rango'] as Tipo[]).map((t) => (
            <button key={t} type="button" onClick={() => cambiarTipo(t)} aria-pressed={tipo === t}
              className={`boton min-h-[44px] ${tipo === t ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
              {t === 'rango' ? 'Otro rango' : t === 'dia' ? 'Por día' : `Por ${t}`}
            </button>
          ))}
        </div>

        {tipo === 'dia' ? (
          <span className="flex flex-wrap items-center gap-2">
            <button type="button" className="boton min-h-[44px] min-w-[44px]" aria-label="Día anterior"
              onClick={() => setDiaElegido(sumarDias(diaElegido, -1))}>◀</button>
            <input type="date" value={diaElegido} aria-label="Día"
              onChange={(e) => e.target.value && setDiaElegido(e.target.value)}
              className="min-h-[44px] rounded-lg border border-hueso/20 bg-tinta px-3 text-[15px]
                         focus:border-oro focus:outline-none" />
            <button type="button" className="boton min-h-[44px] min-w-[44px]" aria-label="Día siguiente"
              onClick={() => setDiaElegido(sumarDias(diaElegido, 1))}>▶</button>
            <span className="w-full text-[14px] text-hueso/70 first-letter:uppercase sm:w-auto">{enPalabras(diaElegido)}</span>
          </span>
        ) : tipo === 'rango' ? (
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
        {/* **Tres descargas** (2026-11-12): sueldos y propinas son dos pagos y
            se revisan por separado; la completa trae las dos cosas. Con el
            mismo tinte que el resto de esta pantalla: sueldo en celeste,
            propina en dorado. */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Descargar planilla">
          <span className="w-full text-[14px] font-semibold text-hueso/70 sm:w-auto">⬇ Descargar planilla:</span>
          {([['sueldos', 'Solo sueldos', TINTE.sueldo], ['propinas', 'Solo propinas', TINTE.propina]] as const)
            .map(([cual, texto, t]) => (
              <button key={cual} type="button" onClick={() => exportar(cual)}
                disabled={lineas.length === 0 && lineasExtras.length === 0 && lineasVendedores.length === 0}
                className={`boton min-h-[44px] border-2 font-semibold ${t.caja} ${t.texto} disabled:opacity-40`}>
                <span aria-hidden className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${t.punto}`} />{texto}
              </button>
            ))}
          <button type="button" onClick={() => exportar('completa')}
            disabled={lineas.length === 0 && lineasExtras.length === 0 && lineasVendedores.length === 0}
            className="boton min-h-[44px] border-2 font-semibold disabled:opacity-40">
            Completa
          </button>
        </div>
      </div>

      {sinMarcar > 0 && (
        <div className="mb-6 rounded border border-ambar/50 bg-ambar/5 p-4">
          <p className="text-sm font-semibold text-ambar-texto">
            Hay {sinMarcar} turno{sinMarcar === 1 ? '' : 's'} sin cerrar
            en este periodo.
          </p>
          {/* **Se dice con las palabras de la pantalla** (2026-11-05, lo
              pidió el cliente): el paso se llama *cerrar el día*, no "pasar
              lista". Primero qué pasa, después por qué y dónde se arregla. */}
          <p className="mt-1 text-sm text-hueso/70">
            Falta que el jefe de turno marque si cada persona vino o no y
            cierre el día en{' '}
            <a href="/turnos" className="text-oro hover:underline">Turnos</a>.
            Mientras tanto esos turnos no suman nada, así que el total de
            abajo está incompleto.
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
            Igual que un turno sin cerrar, no suman: mientras nadie diga
            si el jinete o la pintacaritas llegó, el total está incompleto. Se
            confirma en{' '}
            <a href="/extras" className="text-oro hover:underline">
              actividades extras
            </a>.
          </p>
        </div>
      )}

      {lineas.length === 0 && lineasExtras.length === 0 && lineasVendedores.length === 0 ? (
        <p className="text-sm text-hueso/50">
          No hay turnos ni actividades extras anotados entre el {desde} y el{' '}
          {hasta}.
        </p>
      ) : (
        <>
          {puedePagar && (
            <TransferenciaMasiva
              sueldos={pendientesDe('sueldos')} propinas={pendientesDe('propinas')}
              onDescargar={descargarBanco} onMarcar={setMarcando} />
          )}

          {puedePagar && (
            <p className="mb-4 max-w-2xl text-[14px] text-hueso/70">
              <strong>📋 Copia el sueldo y la propina</strong> de cada persona y
              pégalos en el banco: son dos transferencias. <strong>Aprieta la
              línea</strong> para registrar el pago o marcar la boleta.
            </p>
          )}

          {/* **Las tres secciones, tres botones grandes** (2026-11-12): cada
              uno dice cuántos son y cuánto hay que transferirles. Apretar el
              elegido vuelve a mostrar las tres. Vendedores aparece solo para
              quien los ve. */}
          <div role="group" aria-label="Qué sección ver"
            className={`mb-3 grid grid-cols-1 gap-2 ${vendedores.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {([
              { id: 'equipo', icono: '🧑‍🍳', nombre: 'Trabajadores', n: lineas.length, suma: sumaEquipo },
              { id: 'extras', icono: '🐴', nombre: 'Extras', n: lineasExtras.length, suma: sumaExtras },
              ...(vendedores.length > 0
                ? [{ id: 'vendedores', icono: '💼', nombre: 'Vendedores', n: lineasVendedores.length, suma: sumaVendedores }] : [])
            ] as const).map((x) => {
              const elegida = seccion === x.id;
              return (
                <button key={x.id} type="button" aria-pressed={elegida}
                  onClick={() => { setSeccion(elegida ? '' : x.id as 'equipo' | 'extras' | 'vendedores'); setAbierta(null); }}
                  className={`tecla flex min-h-[64px] flex-col items-start justify-center rounded-xl border-2 px-4 py-2
                              text-left ${elegida ? 'border-oro bg-oro/15' : seccion ? 'border-hueso/15 opacity-70 hover:opacity-100'
                              : 'border-hueso/25 hover:border-oro/60'}`}>
                  <span className="text-[17px] font-bold">{elegida ? '✓ ' : ''}<span aria-hidden>{x.icono}</span> {x.nombre}</span>
                  <span className="text-[14px] text-hueso/75">
                    {x.n} {x.n === 1 ? 'persona' : 'personas'} · {enPesos(x.suma.aTransferir)}
                    {x.suma.falta > 0 && <> · <b className="text-ambar-texto">falta {enPesos(x.suma.falta)}</b></>}
                  </span>
                </button>
              );
            })}
          </div>
          {seccion && (
            <p className="mb-3 text-[14px] text-hueso/75">
              Viendo solo {seccion === 'equipo' ? 'trabajadores' : seccion}.{' '}
              <button type="button" className="boton min-h-[36px] align-middle" onClick={() => setSeccion('')}>Ver las tres</button>
            </p>
          )}

          {/* **El filtro, justo arriba de la lista.** Dos botones —*Todos* y
              *Por pagar*, con cuántos hay en cada uno— y el buscador de nombre.
              Filtran las dos listas, equipo y actividades extras; los totales
              de abajo siguen siendo los del periodo entero. */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div role="group" aria-label="Qué personas mostrar" className="grid grid-cols-2 gap-2 sm:flex">
              {([[false, 'Todos', cuantosTodos], [true, 'Por pagar', cuantosPorPagar]] as const)
                .map(([valor, rotulo, n]) => (
                  <button key={rotulo} type="button" aria-pressed={soloPorPagar === valor}
                    onClick={() => setSoloPorPagar(valor)}
                    className={`tecla flex min-h-[44px] items-center justify-center gap-2 rounded-xl
                                border-2 px-4 text-[15px] font-bold ${soloPorPagar === valor
                      ? 'border-oro bg-oro/15 text-hueso'
                      : 'border-hueso/20 text-hueso/70 hover:border-oro/60'}`}>
                    {rotulo}
                    <span className={`rounded-full px-2 text-[13px] tabular-nums ${
                      valor && n > 0 ? 'bg-ambar/20 text-ambar-texto' : 'bg-hueso/10'}`}>{n}</span>
                  </button>
                ))}
            </div>
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nombre" aria-label="Buscar por nombre"
              className="min-h-[44px] w-full rounded-xl border-2 border-hueso/20 bg-tinta px-3
                         text-[15px] focus:border-oro focus:outline-none sm:w-72" />
          </div>
          {visiblesEquipo.length === 0 && visiblesExtras.length === 0 && visiblesVendedores.length === 0 && (
            <p className="mb-8 rounded-xl border-2 border-hueso/15 px-4 py-3 text-[15px] text-hueso/70">
              {soloPorPagar && !q
                ? <>✓ A nadie le falta pago en este periodo.</>
                : <>Nadie calza con {q ? <>“{busca.trim()}”</> : 'este filtro'}.</>}
            </p>
          )}

          {(visiblesEquipo.length > 0 || (!q && !soloPorPagar && (!seccion || seccion === 'equipo'))) && (
          <h2 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-hueso/70">
            Equipo del restaurante
          </h2>
          )}
          {lineas.length === 0 && (!seccion || seccion === 'equipo') ? (
            <p className="mb-8 text-[14px] text-hueso/60">Sin turnos anotados en este periodo.</p>
          ) : visiblesEquipo.length === 0 ? null : (
            <>
              <ul className="space-y-2">
                {visiblesEquipo.map((l) => {
                  const pago = pagoDeFila(l.trabajador, l.total, l.propina);
                  const aplica = pideBoleta('equipo', esContratado(l.modalidad));
                  return (
                    <LineaPersona key={'e-' + l.trabajador}
                      nombre={l.trabajador}
                      detalle={`${esContratado(l.modalidad) ? 'Contratado' : 'Por turno'} · ${
                        l.dias} ${l.dias === 1 ? 'día' : 'días'} que vino`}
                      cuentan={l.dias}
                      fuera={fueraEquipo.get(normalizar(l.trabajador)) ?? SIN_FUERA}
                      marcarEn="/turnos" palabraSinMarcar="sin marcar"
                      nota={esContratado(l.modalidad)
                        ? 'Contratado: sus jornadas van en su sueldo; acá suman solo horas extra y ajustes.'
                        : 'La propina se paga aparte del sueldo: son dos transferencias.'}
                      aTransferir={pago.aTransferir} estado={pago.estado}
                      partes={partesDe(l.trabajador, l.total, l.propina, false)}
                      datos={[
                        { que: 'Jornadas', valor: esContratado(l.modalidad)
                            ? 'en su sueldo' : enPesos(l.jornadas) },
                        { que: 'Horas extra', valor: l.horasExtra
                            ? `${enPesos(l.montoHorasExtra)} (${l.horasExtra} h)` : '—' },
                        { que: 'Ajustes',
                          // El signo adelante —`−$20.000`, no `$-20.000`—, que
                          // es la convención del panel: el menos pegado al peso
                          // se lee como un error de tipeo justo donde importa
                          // saber si se suma o se resta.
                          valor: l.ajustes
                            ? (l.ajustes < 0 ? '−' : '') + enPesos(Math.abs(l.ajustes))
                            : '—',
                          tono: l.ajustes < 0 ? 'rojo' : undefined },
                        { que: 'Sueldo', valor: enPesos(l.total), tono: 'fuerte' },
                        { que: 'Propina (aparte)', valor: l.propina ? enPesos(l.propina) : '—' }
                      ]}
                      sinCuenta={!sePuedeTransferir(cuentaDe(l.trabajador))}
                      boleta={aplica ? boletaRecibida(l.trabajador) : null}
                      puedePagar={puedePagar}
                      puedeBoleta={puedeBoleta}
                      abierta={abierta === 'e-' + l.trabajador}
                      onAbrir={() => setAbierta((a) => a === 'e-' + l.trabajador ? null : 'e-' + l.trabajador)}
                      onCopiar={(o) => copiarTransferencia(l.trabajador, o)}
                      onBoleta={(r) => void cambiarBoleta(l.trabajador, r)}
                      anotados={pagosEnPeriodo(pagos, l.trabajador, desde, hasta).length}
                      onVerPagos={() => setViendoPagos(l.trabajador)}
                      onPagar={(concepto) => setPagando({
                        quien: l.trabajador,
                        opciones: partesDe(l.trabajador, l.total, l.propina, false),
                        inicial: concepto, modo: 'parte',
                        boletaPendiente: aplica && !boletaRecibida(l.trabajador)
                      })}
                      onPagarCompleto={(o) => pagarCompleto(l.trabajador, o,
                        aplica && !boletaRecibida(l.trabajador))} />
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
          {visiblesExtras.length > 0 && (
            <>
              <h2 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-hueso/70">
                Actividades extras
              </h2>
              <ul className="space-y-2">
                {visiblesExtras.map((l) => {
                  const pago = pagoDeFila(l.colaborador, l.total, 0);
                  return (
                    <LineaPersona key={'x-' + l.colaborador}
                      nombre={l.colaborador}
                      detalle={`${l.actividad || 'Actividad extra'} · ${l.dias} ${
                        l.dias === 1 ? 'día' : 'días'} que vino`}
                      cuentan={l.dias}
                      fuera={fueraExtras.get(normalizar(l.colaborador)) ?? SIN_FUERA}
                      marcarEn="/extras" palabraSinMarcar="sin confirmar"
                      aTransferir={pago.aTransferir} estado={pago.estado}
                      partes={partesDe(l.colaborador, l.total, 0, true)}
                      datos={[
                        { que: 'Montos', valor: l.montos ? enPesos(l.montos) : '—' },
                        { que: 'Ajustes',
                          valor: l.ajustes
                            ? (l.ajustes < 0 ? '−' : '') + enPesos(Math.abs(l.ajustes))
                            : '—',
                          tono: l.ajustes < 0 ? 'rojo' : undefined },
                        { que: 'Servicio', valor: enPesos(l.total), tono: 'fuerte' }
                      ]}
                      sinCuenta={!sePuedeTransferir(cuentaDe(l.colaborador))}
                      boleta={pideBoleta('extra', false) ? boletaRecibida(l.colaborador) : null}
                      puedePagar={puedePagar}
                      puedeBoleta={puedeBoleta}
                      abierta={abierta === 'x-' + l.colaborador}
                      onAbrir={() => setAbierta((a) => a === 'x-' + l.colaborador ? null : 'x-' + l.colaborador)}
                      onCopiar={(o) => copiarTransferencia(l.colaborador, o)}
                      onBoleta={(r) => void cambiarBoleta(l.colaborador, r)}
                      anotados={pagosEnPeriodo(pagos, l.colaborador, desde, hasta).length}
                      onVerPagos={() => setViendoPagos(l.colaborador)}
                      onPagar={(concepto) => setPagando({
                        quien: l.colaborador,
                        opciones: partesDe(l.colaborador, l.total, 0, true),
                        inicial: concepto, modo: 'parte',
                        boletaPendiente: !boletaRecibida(l.colaborador)
                      })}
                      onPagarCompleto={(o) => pagarCompleto(l.colaborador, o,
                        !boletaRecibida(l.colaborador))} />
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

          {/* **El equipo de ventas** (2026-11-12): su comisión y su sueldo fijo,
              con los mismos pagos, boleta y cuenta que el equipo y los extras.
              El detalle de cada venta está en *Vendedores*. */}
          {visiblesVendedores.length > 0 && (
            <>
              <h2 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-hueso/70">
                Vendedores
              </h2>
              <ul className="space-y-2">
                {visiblesVendedores.map((l) => {
                  const pago = pagoDeFila(l.nombre, l.total, 0);
                  const clave = 'v-' + l.nombre;
                  return (
                    <LineaPersona key={clave}
                      nombre={l.nombre}
                      detalle={`${l.ventas.length} ${l.ventas.length === 1 ? 'venta pagada' : 'ventas pagadas'}`
                        + (l.mesesFijo ? ` · sueldo fijo de ${l.mesesFijo} ${l.mesesFijo === 1 ? 'mes' : 'meses'}` : '')}
                      cuentan={l.ventas.length}
                      fuera={SIN_FUERA}
                      marcarEn={`/vendedores`} palabraSinMarcar="sin pagar"
                      aTransferir={pago.aTransferir} estado={pago.estado}
                      partes={partesDe(l.nombre, l.total, 0, false, true)}
                      datos={[
                        { que: 'Comisiones', valor: l.comisiones ? enPesos(l.comisiones) : '—' },
                        { que: 'Sueldo fijo', valor: l.sueldoFijo ? enPesos(l.sueldoFijo) : '—' },
                        { que: 'Total', valor: enPesos(l.total), tono: 'fuerte' }
                      ]}
                      sinCuenta={!sePuedeTransferir(cuentaDe(l.nombre))}
                      boleta={pideBoleta('vendedor', false) ? boletaRecibida(l.nombre) : null}
                      puedePagar={puedePagar}
                      puedeBoleta={puedeBoleta}
                      abierta={abierta === clave}
                      onAbrir={() => setAbierta((a) => a === clave ? null : clave)}
                      onCopiar={(o) => copiarTransferencia(l.nombre, o)}
                      onBoleta={(r) => void cambiarBoleta(l.nombre, r)}
                      anotados={pagosEnPeriodo(pagos, l.nombre, desde, hasta).length}
                      onVerPagos={() => setViendoPagos(l.nombre)}
                      onPagar={(concepto) => setPagando({
                        quien: l.nombre,
                        opciones: partesDe(l.nombre, l.total, 0, false, true),
                        inicial: concepto, modo: 'parte',
                        boletaPendiente: !boletaRecibida(l.nombre)
                      })}
                      onPagarCompleto={(o) => pagarCompleto(l.nombre, o, !boletaRecibida(l.nombre))} />
                  );
                })}
              </ul>
              <p className="mb-8 mt-2 px-1 text-[14px] text-hueso/70">
                {lineasVendedores.length} {lineasVendedores.length === 1 ? 'vendedor' : 'vendedores'}
                {' · '}total <strong className="text-oro">{enPesos(totalVendedores)}</strong>
                {sumaVendedores.falta > 0 && (
                  <> · <strong className="text-ambar-texto">falta {enPesos(sumaVendedores.falta)}</strong></>
                )}
                {' · '}<a href="/vendedores" className="font-semibold text-oro hover:underline">ver cada venta →</a>
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
                {enPesos(total + totalExtras + totalVendedores)}
              </p>
              <p className="mt-1 text-[13px] text-hueso/60">
                Equipo {enPesos(total)}
                {' · '}Extras {enPesos(totalExtras)}
                {lineasVendedores.length > 0 && <>{' · '}Vendedores {enPesos(totalVendedores)}</>}
                {propina > 0 && <> · propina {enPesos(propina)}, que va aparte</>}
              </p>
            </div>
            <div className="rounded border border-hueso/20 bg-panel px-4 py-3">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
                A transferir
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {enPesos(sumaEquipo.aTransferir + sumaExtras.aTransferir + sumaVendedores.aTransferir)}
              </p>
              <p className="mt-1 text-[13px] text-hueso/60">
                Pagado {enPesos(sumaEquipo.pagado + sumaExtras.pagado + sumaVendedores.pagado)}
                {' · '}
                {sumaEquipo.falta + sumaExtras.falta + sumaVendedores.falta > 0 ? (
                  <strong className="text-ambar-texto">
                    falta {enPesos(sumaEquipo.falta + sumaExtras.falta + sumaVendedores.falta)}
                  </strong>
                ) : (
                  <strong className="text-verde-texto">✓ todo pagado</strong>
                )}
              </p>
            </div>
          </div>

          {puedePagar && sinCuenta.length > 0 && (
            <p className="mb-6 max-w-2xl text-[13px] text-ambar-texto/80">
              Sin datos para transferir: {sinCuenta.join(' · ')}. La planilla
              sale igual, con esas columnas a medias; se completa en{' '}
              <a href="/equipo" className="hover:underline">equipo</a>, en{' '}
              <a href="/extras" className="hover:underline">actividades extras</a>
              {lineasVendedores.length > 0 && <> o en <a href="/vendedores" className="hover:underline">vendedores</a></>}.
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
            día por día, con el motivo de cada ajuste{puedePagar ? <> y los datos de la
            transferencia de cada uno —titular, RUT, banco, tipo, número y
            correo, un campo por columna—: es un solo pago a la semana, se
            pega en la carga del banco,</> : ','} y cada fila dice si es equipo o
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
      {marcando && (
        <Dialogo titulo={`Marcar pagados · ${marcando}`} ancho="max-w-xl"
          onCerrar={() => setMarcando(null)}>
          <ConfirmarTodos cual={marcando} periodo={rangoEnPalabras([desde, hasta])}
            {...pendientesDe(marcando)}
            onGuardar={(nota) => void marcarTodos(marcando, nota)}
            onCancelar={() => setMarcando(null)} />
        </Dialogo>
      )}

      {/* Los pagos ya anotados de una persona, con su Deshacer. Es la única
          puerta que queda cuando ya no falta nada por transferir. */}
      {viendoPagos && (
        <Dialogo titulo={`Pagos de ${viendoPagos}`}
          onCerrar={() => setViendoPagos(null)}>
          <p className="text-[14px] text-hueso/70">
            Por {rangoEnPalabras([desde, hasta])}.
          </p>
          <ul className="mt-3 space-y-2">
            {pagosEnPeriodo(pagos, viendoPagos, desde, hasta).map((x) => (
              <li key={x.id || x.fila}
                  className="flex flex-wrap items-center justify-between gap-3
                             rounded-xl border-2 border-hueso/15 p-3">
                <span className="text-[14px]">
                  <strong className={`text-[17px] tabular-nums ${
                    x.monto < 0 ? 'text-rojo-texto' : 'text-hueso/85'}`}>
                    {x.monto < 0 && '−'}{enPesos(Math.abs(x.monto))}
                  </strong>
                  {x.concepto && (
                    <span className="ml-2 whitespace-nowrap rounded-full border-2
                                     border-hueso/25 px-2 py-0.5 text-[13px] font-bold
                                     text-hueso/65">{x.concepto}</span>
                  )}
                  <span className="block text-hueso/65 first-letter:uppercase">
                    {x.fecha ? enPalabras(x.fecha) : 'sin fecha'}
                    {x.nota && ` · ${x.nota}`}
                    {x.registradoPor && ` · lo anotó ${x.registradoPor}`}
                  </span>
                </span>
                {puedePagar && (
                  <button type="button" onClick={() => void deshacerPago(x)}
                    className="boton hover:border-rojo-fuerte hover:text-rojo-texto">
                    Deshacer
                  </button>
                )}
              </li>
            ))}
          </ul>
          {/* La distinción que hay que hacer **antes** de apretar. */}
          <p className="mt-3 text-[14px] text-hueso/70">
            <strong className="text-hueso/85">Deshacer</strong> es para un pago
            anotado por error: borra la fila y vuelve a quedar como no pagado.
            Si de verdad se pagó de más o devolvieron plata, anota un pago en
            negativo, y así queda el rastro de los dos movimientos.
          </p>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => setViendoPagos(null)}
              className="boton">Listo</button>
          </div>
        </Dialogo>
      )}

      {pagando && (
        <Dialogo titulo={`Registrar pago · ${pagando.quien}`} ancho="max-w-xl"
          onCerrar={() => setPagando(null)}>
          <FormularioPago
            quien={pagando.quien}
            opciones={pagando.opciones}
            inicial={pagando.inicial}
            modoInicial={pagando.modo}
            boletaPendiente={pagando.boletaPendiente}
            periodo={rangoEnPalabras([desde, hasta])}
            onGuardar={(ls, nota) => void registrarPagos(pagando.quien, ls, nota)}
            onCancelar={() => setPagando(null)} />
        </Dialogo>
      )}

    </section>
  );
}
