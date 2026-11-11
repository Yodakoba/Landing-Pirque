'use client';

/**
 * Armar una cotización, en cuatro pasos (Fase 2, 2026-11-10).
 *
 * **Una pregunta por pantalla**, que es la regla PlayStation llevada a un
 * formulario: 1 Cliente · 2 Evento · 3 Productos · 4 Enviar. Los pasos son
 * botones y se puede saltar entre ellos: es un orden sugerido, no una cárcel.
 *
 * - **El cliente se elige de su ficha** (o se crea ahí mismo, con la misma
 *   pregunta de "¿es alguno de estos?" de `/clientes`). Se escribe una vez.
 * - **Lo que se ve es lo que se guarda**: las líneas pasan por
 *   `prepararLineas()` —la misma función que usa el servidor— en cada
 *   dibujado, así que el monto fijo en 1 y la regla del
 *   show ecuestre se ven mientras se escribe.
 * - **Un candidato** es una cotización que se guarda en el paso 2, con
 *   cliente, fecha e invitados. Después se sigue cotizando desde ahí mismo.
 * - **Lo que no es de esta cuenta se ve y no se toca**: el vendedor ve las
 *   cotizaciones de otros en solo lectura (`<fieldset disabled>`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import BotonGuardar from './BotonGuardar';
import AvisoGuardado from './AvisoGuardado';
import { usarAutoguardado } from './usarAutoguardado';
import Dialogo from './Dialogo';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import { avisar, copiarConAviso } from './AvisoFlotante';
import {
  cuentasDe, totalDeLinea, folioDe, estadoVisible, ESTADO_PRESUPUESTO, IVA,
  DOCUMENTO, documentoDe, numeroONulo, montoONulo, estaMandada, totalDe, estadoNormal, lineasDe, type Documento, type Presupuesto, type LineaPresupuesto
} from '@/lib/presupuestos';
import {
  prepararLineas, esDiaPublico, lineaDeProducto, yaEstaEnLaCotizacion, productoDe, showDe, cambiarCantidad,
  alternativasDe, letraDe, grupoDe, vivasDelGrupo, sigueViva, paraElLink,
  MOTIVOS_PERDIDA
} from '@/lib/cotizar';
import { paraCotizar, precioParaCotizar, aPrecio, TIPO_PRODUCTO, MONEDA, COBRO, type Menu } from '@/lib/menus';
import {
  condicionesDe, estadoCobros, montoCobro, CONCEPTO_COBRO, type Cobro
} from '@/lib/cobros';
import { buscarClientes, porNombreCliente, faltaParaFactura, type Cliente } from '@/lib/clientes';
import { puedeTocarPresupuesto, puede, type Rol } from '@/lib/auth';
import { achicarFoto } from '@/lib/achicarFoto';
import { faltaDelCliente, partirHorario, textoHorario, moverHora, PASO_HORARIO } from '@/lib/contrato';
import CampoRut from './CampoRut';
import { frasesCancelacion } from '@/lib/cancelacion';
import CancelarEvento from './CancelarEvento';
import CorregirGanada from './CorregirGanada';
import BloqueCancelada from './BloqueCancelada';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, esFecha } from '@/lib/fechas';
import { estaCerrado, esPrivada, esExclusiva } from '@/lib/columnas';
import { enlaceWhatsApp } from '@/lib/contacto';
import { cupoParaGanar } from '@/lib/dias';
import { usarSoloMira } from './SesionCliente';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

type Linea = Omit<LineaPresupuesto, 'fila'>;

export interface DatosCotizar {
  menus: Menu[];
  clientes: Cliente[];
  fechas: { fecha: string; estado: string; capacidad: number }[];
  descuentos: number[];
  /** Las líneas de todas las cotizaciones, para el total de cada alternativa. */
  lineas?: LineaPresupuesto[];
  /** Las condiciones de pago por defecto, de Configuración. */
  condiciones?: { anticipoPct: number; saldoDias: number };
  /** Los plazos del seguimiento de Configuración: los que rigen en blanco. */
  seguimiento?: { dias: number; antesEvento: number };
  /** El nombre comercial, para el asunto del correo. */
  empresa?: string;
  /** El cupo de un día nuevo, para `cupoParaGanar()`. */
  cupoNormal?: number;
  horaApertura?: string;
  /** Para el contrato: el horario de siempre y qué le falta a la empresa. */
  contrato?: { horario: string; faltaEmpresa: string[];
    tranquilidad?: { cambiosFecha: number; cancelacionDias: number; reembolsoPct: number } };
  hoy: string;
  usuario: string;
  rol: string;
}

/** El 4 se llamaba *Enviar* y ahí no se manda nada solo: tiene el documento,
 *  el pago, el contrato y el cierre (2026-11-11). Mandarla es un botón más. */
const PASOS = ['Cliente', 'Evento', 'Productos', 'Envío', 'Contrato'] as const;
const TIPOS_EVENTO = ['Cumpleaños', 'Matrimonio', 'Empresa', 'Paseo', 'Otro'];

/** Qué es ese día, en palabras, para el paso 2. */
function estadoDelDia(fecha: string, fechas: DatosCotizar['fechas']): string {
  if (!esFecha(fecha)) return '';
  const d = fechas.find((f) => f.fecha === fecha);
  if (!d) return 'Ese día no está en el calendario: cuenta como evento privado.';
  if (estaCerrado(d.estado)) return 'Ese día está cerrado.';
  if (esExclusiva(d.estado)) return 'Ese día está arrendado en exclusiva.';
  if (esPrivada(d.estado)) return 'Ese día es privado.';
  return 'Ese día es público: el show ecuestre va incluido.';
}

/**
 * **El horario se elige, no se escribe** (2026-11-12, lo pidió el cliente:
 * *"elegible de forma fácil, estilo PlayStation… siempre el mismo
 * formato"*). Desde y hasta con − y + de media hora; se guarda como
 * `13:00 a 18:00`. En blanco rige el de Configuración, y lo dice.
 */
function ElegirHorario({ valor, deSiempre, onCambio }: {
  valor: string; deSiempre: string; onCambio: (v: string) => void;
}) {
  const propio = partirHorario(valor);
  const base = propio ?? partirHorario(deSiempre) ?? { desde: '13:00', hasta: '18:00' };
  const poner = (desde: string, hasta: string) => onCambio(textoHorario(desde, hasta));
  const fila = (rotulo: string, hora: string, cambiar: (h: string) => void) => (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[14px] font-semibold text-hueso/75">{rotulo}</span>
      <button type="button" aria-label={`${rotulo}: media hora antes`}
        className="boton h-12 w-12 !text-[22px] !font-bold"
        onClick={() => cambiar(moverHora(hora, -PASO_HORARIO))}>−</button>
      <span className="w-20 text-center text-[22px] font-bold tabular-nums">{hora}</span>
      <button type="button" aria-label={`${rotulo}: media hora después`}
        className="boton h-12 w-12 !text-[22px] !font-bold"
        onClick={() => cambiar(moverHora(hora, PASO_HORARIO))}>+</button>
    </div>
  );
  return (
    <div className="space-y-2">
      {fila('Desde', base.desde, (h) => poner(h, base.hasta))}
      {fila('Hasta', base.hasta, (h) => poner(base.desde, h))}
      {base.hasta <= base.desde && (
        <p className="text-[13px] text-hueso/70">Termina después de medianoche.</p>
      )}
      {!valor.trim() ? (
        <p className="text-[13px] text-hueso/70">El de siempre, de Configuración. Con − y + lo cambias para este evento.</p>
      ) : !propio ? (
        <p className="text-[13px] font-semibold text-ambar-texto">
          Estaba escrito a mano: “{valor}”. Con − y + queda en el formato de siempre.
        </p>
      ) : valor !== deSiempre && (
        <button type="button" className="boton min-h-[40px]" onClick={() => onCambio('')}>
          Volver al de siempre ({deSiempre})
        </button>
      )}
    </div>
  );
}

function Elegir({ opciones, valor, onElegir, etiqueta }: {
  opciones: string[]; valor: string; onElegir: (v: string) => void; etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === valor}
          onClick={() => onElegir(o === valor ? '' : o)}
          className={`boton min-h-[40px] ${o === valor ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function CotizacionDialogo({
  presupuesto, lineasIniciales, fechaInicial, clienteInicial, datos, onCambio, onCerrar,
  pasoInicial, onAbrir, alternativas = []
}: {
  /** En qué paso abrir. Por defecto, Productos si ya existe. */
  pasoInicial?: number;
  /**
   * Abrir otra cotización en esta misma ventana: una alternativa, o la que
   * se acaba de crear. La pantalla recarga y la abre ya guardada.
   */
  onAbrir?: (id: string, paso?: number) => void;
  /** Las alternativas del grupo de esta cotización, ella incluida. */
  alternativas?: Presupuesto[];
  /** Para una nueva desde la ficha de un cliente. */
  clienteInicial?: string;
  /** null es una cotización nueva. */
  presupuesto: Presupuesto | null;
  lineasIniciales: Linea[];
  /** Para una nueva desde la tarjeta de un día. */
  fechaInicial?: string;
  datos: DatosCotizar;
  /** Se guardó algo: hay que recargar la lista. */
  onCambio: () => void;
  onCerrar: () => void;
}) {
  const p = presupuesto;
  const [clientes, setClientes] = useState<Cliente[]>(datos.clientes);
  const [paso, setPaso] = useState(pasoInicial ?? (p ? 3 : clienteInicial ? 2 : 1));
  /** Lo último que dijo el servidor al guardar, para el aviso del autoguardado. */
  const ultimoError = useRef('');
  /** Si el autoguardado guardó algo: al cerrar, la lista de atrás se recarga. */
  const huboGuardado = useRef(false);
  /**
   * **Cambiar de paso empieza arriba** (2026-11-12, lo pidió el cliente): se
   * cambia con el botón del pie, y la ventana se quedaba abajo, en el
   * scroll del paso anterior.
   */
  const arriba = useRef<HTMLElement>(null);
  useEffect(() => {
    arriba.current?.closest('[role=dialog]')?.scrollTo({ top: 0 });
  }, [paso]);
  const [idCliente, setIdCliente] = useState(p?.idCliente ?? clienteInicial ?? '');
  const [fecha, setFecha] = useState(p ? p.fecha : (fechaInicial ?? ''));
  const [sinFecha, setSinFecha] = useState(p ? !p.fecha && !!p.periodo : false);
  const [periodo, setPeriodo] = useState(p?.periodo ?? '');
  const [invitados, setInvitados] = useState(p?.invitados ?? 0);
  const [tipoEvento, setTipoEvento] = useState(p?.tipoEvento ?? '');
  const [notas, setNotas] = useState(p?.notas ?? '');
  const [estado, setEstado] = useState(
    p ? (estadoVisible(p, datos.hoy) === 'Vencida' ? p.estado : estadoVisible(p, datos.hoy))
      : ESTADO_PRESUPUESTO.borrador);
  const [motivo, setMotivo] = useState(p?.motivo ?? '');
  const [descuento, setDescuento] = useState(p?.descuento ?? 0);
  /** `''` es por definir. Ver `DOCUMENTO`. */
  const [documento, setDocumento] = useState<Documento>(p?.documento ?? '');
  /**
   * Los datos de facturación **se escriben acá pero viven en la ficha**: al
   * guardar la cotización se guardan en el cliente, para no pedirlos de
   * nuevo la próxima vez. Nacen con lo que la ficha ya tenga.
   */
  const fichaInicial = datos.clientes.find((c) => c.id === (p?.idCliente ?? clienteInicial));
  /**
   * Las condiciones de pago de esta cotización, como se escriben: **en
   * blanco rige Configuración**, y "0" en el anticipo es sin anticipo.
   */
  const [anticipoTxt, setAnticipoTxt] = useState(p?.anticipo == null ? '' : String(p.anticipo));
  /** El anticipo en pesos, si se acordó un monto (manda sobre el %). */
  const [anticipoMontoTxt, setAnticipoMontoTxt] = useState(p?.anticipoMonto ? String(p.anticipoMonto) : '');
  const [saldoTxt, setSaldoTxt] = useState(p?.saldoDias == null ? '' : String(p.saldoDias));
  /**
   * **La UF de esta cotización**, fija: se pide la primera vez que se agrega
   * un producto en UF, y se cambia solo con *Usar la UF de hoy*. 0 es sin UF.
   */
  const [uf, setUf] = useState(p?.uf ?? 0);
  const [fechaUF, setFechaUF] = useState(p?.fechaUF ?? '');
  /** Lo del contrato (Fase 4): el horario, la Ley 20.393 y lo acordado aparte. */
  const [horario, setHorario] = useState(p?.horario ?? '');
  const [ley20393, setLey20393] = useState(p?.ley20393 ?? false);
  /**
   * **Las condiciones de cancelación** (2026-11-11): en blanco rige
   * Configuración, igual que el anticipo. Son las que imprime el contrato y
   * las que aplica *Cancelar evento* (`lib/cancelacion.ts`).
   */
  const [cambiosTxt, setCambiosTxt] = useState(p?.cambiosFecha == null ? '' : String(p.cambiosFecha));
  const [cancelTxt, setCancelTxt] = useState(p?.cancelacionDias == null ? '' : String(p.cancelacionDias));
  const [reembolsoTxt, setReembolsoTxt] = useState(p?.reembolso == null ? '' : String(p.reembolso));
  /** Los plazos del seguimiento de esta cotización; en blanco rige Configuración. */
  const [segTxt, setSegTxt] = useState(p?.seguimientoDias == null ? '' : String(p.seguimientoDias));
  const [avisoTxt, setAvisoTxt] = useState(p?.avisoEvento == null ? '' : String(p.avisoEvento));
  /** Por qué vía se acaba de mandar, mientras se pregunta "¿la mandaste?". */
  const [preguntaEnvio, setPreguntaEnvio] = useState<'' | 'cotizacion' | 'contrato'>('');
  /** Por dónde se intentó mandar: la pregunta ofrece abrirlo de nuevo si no se abrió. */
  const [viaEnvio, setViaEnvio] = useState<'' | 'whatsapp' | 'correo' | 'link'>('');
  /** La ventana *¿Marcarla ganada?*, abierta. */
  /** El id de la alternativa que se va a marcar ganada, o '' si no se pregunta. */
  const [confirmandoGanar, setConfirmandoGanar] = useState('');
  const [corrigiendo, setCorrigiendo] = useState(false);
  /** El día en que se le mandó el contrato (lo pone el servidor). */
  const [contratoEnviado, setContratoEnviado] = useState(p?.contratoEnviado ?? '');
  const [cancelando, setCancelando] = useState(false);
  const [acuerdos, setAcuerdos] = useState(p?.acuerdos ?? '');
  /** El contrato firmado subido: quién y cuándo. Que esté es lo que dice "firmado". */
  const [firmado, setFirmado] = useState<null | { por: string; cuando: string }>(
    p?.contrato ? { por: p.contratoSubidoPor, cuando: p.contratoSubido } : null);
  const [subiendoContrato, setSubiendoContrato] = useState(false);
  /** Pide la UF de hoy y la fija. Devuelve el valor, o 0 si no se pudo. */
  async function traerUF(): Promise<number> {
    const d = await fetch('/api/uf').then((r) => r.json()).catch(() => ({}));
    if (!d?.valor) { avisar(d?.error ?? 'No se pudo leer la UF de hoy', 'atencion'); return 0; }
    setUf(d.valor); setFechaUF(d.fecha);
    return d.valor;
  }
  /** Los cobros al cliente. Solo existen para una cotización ya guardada. */
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [medio, setMedio] = useState('');
  /** El id del cobro cuyo comprobante se está subiendo. */
  const [subiendo, setSubiendo] = useState('');
  const [otroMonto, setOtroMonto] = useState<null | { monto: string; concepto: string }>(null);
  useEffect(() => {
    if (!p) return;
    fetch(`/api/presupuestos/cobros?id=${encodeURIComponent(p.id)}`).then((r) => r.json())
      .then((d) => d.cobros && setCobros(d.cobros)).catch(() => {});
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * **Lo pagado en las otras alternativas** (2026-11-12): lo pagado es del
   * evento, así que para ofrecer *Ganó la B* cuenta también el anticipo
   * anotado en la A. Al ganar, el servidor pasa esos cobros a la ganadora.
   */
  const [cobrosOtras, setCobrosOtras] = useState<Cobro[]>([]);
  useEffect(() => {
    if (!p || alternativas.length < 2) return;
    fetch(`/api/presupuestos/cobros?id=${encodeURIComponent(p.id)}&grupo=1`).then((r) => r.json())
      .then((d) => d.cobros && setCobrosOtras(d.cobros.filter((c: Cobro) => c.presupuesto !== p.id)))
      .catch(() => {});
  }, [p?.id, alternativas.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [facturacion, setFacturacion] = useState({
    empresa: fichaInicial?.empresa ?? '', rut: fichaInicial?.rut ?? '',
    giro: fichaInicial?.giro ?? '', domicilio: fichaInicial?.domicilio ?? ''
  });
  const [lineas, setLineas] = useState<Linea[]>(lineasIniciales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState<null | {
    nombre: string; telefono: string; correo: string; empresa: string }>(null);
  const [parecidas, setParecidas] = useState<Cliente[]>([]);

  // Cambiar de cliente trae sus datos de facturación.
  useEffect(() => {
    const c = clientes.find((x) => x.id === idCliente);
    if (c) setFacturacion({ empresa: c.empresa, rut: c.rut, giro: c.giro, domicilio: c.domicilio });
  }, [idCliente]); // eslint-disable-line react-hooks/exhaustive-deps

  const ganada = !!p?.idReserva;
  const cancelada = p?.estado === ESTADO_PRESUPUESTO.cancelada;
  // Con vista gerencia y sin el permiso de cotizar, todo se ve en solo
  // lectura, igual que la cotización de otro vendedor.
  const soloMira = usarSoloMira('presupuestos');
  const puedeEditar = !soloMira
    && (!p || puedeTocarPresupuesto(datos.rol as Rol, datos.usuario, p.creadoPor));
  /** Revisar cobros es de quien hace los pagos, no de quien los anota. */
  const puedePagar = puede(datos.rol as Rol, 'pagar');
  const cliente = clientes.find((c) => c.id === idCliente);
  const fechaReal = sinFecha ? '' : fecha;
  const publico = esFecha(fechaReal) && esDiaPublico(fechaReal, datos.fechas);
  // **Lo que se ve es lo que se guarda**: la misma función del servidor.
  const vistas = useMemo(
    () => prepararLineas(lineas, datos.menus, invitados, publico, uf),
    [lineas, datos.menus, invitados, publico, uf]);
  const cuentas = cuentasDe(vistas, descuento);
  /** Cuánta gente suman los menús: tiene que calzar con los invitados. */
  const enMenus = vistas.reduce((n, l) => n + l.personas, 0);
  const cond = condicionesDe(
    { anticipo: numeroONulo(anticipoTxt, 100), anticipoMonto: montoONulo(anticipoMontoTxt),
      saldoDias: numeroONulo(saldoTxt, 365), fecha: fechaReal },
    cuentas.total, datos.condiciones ?? { anticipoPct: 30, saldoDias: 3 });
  /**
   * **Lo pagado es del evento** (2026-11-12, lo reclamó el cliente: pagó
   * $299.000 anotados en la A y la C le pedía el anticipo entero). Mientras
   * ninguna alternativa esté ganada, cuenta lo anotado en todas; al ganar,
   * el servidor lo pasa a la ganadora.
   */
  const otraGanada = alternativas.some((a) => a.id !== p?.id && !!a.idReserva);
  const cobrosEvento = otraGanada ? cobros : [...cobros, ...cobrosOtras];
  const cobrado = estadoCobros({ anticipo: cond.anticipo, total: cuentas.total }, cobrosEvento);

  /**
   * **Si hay algo sin guardar** (2026-11-10): una firma de todo lo que se
   * manda al guardar, comparada contra la de la última vez que se guardó.
   * Con eso el botón dice *Guardar* en dorado o *✓ Guardado* en gris
   * (`BotonGuardar`). Una cotización nueva siempre tiene algo sin guardar.
   */
  const firma = JSON.stringify({
    idCliente, fechaReal, periodo: sinFecha ? periodo : '', invitados, tipoEvento, notas,
    descuento, motivo, documento, anticipoTxt, anticipoMontoTxt, saldoTxt, uf, fechaUF, estado, lineas: vistas,
    horario, ley20393, acuerdos, fact: facturacion, cambiosTxt, cancelTxt, reembolsoTxt,
    segTxt, avisoTxt
  });
  const [guardada, setGuardada] = useState<string | null>(null);
  useEffect(() => { if (p) setGuardada(firma); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sucio = !p || (guardada !== null && firma !== guardada);

  /**
   * **Una cotización ya creada se guarda sola** (2026-11-10, lo pidió el
   * cliente: ahorrarle el *Guardar* donde se pueda). Es la regla del panel:
   * lo que se edita acá son valores de algo que ya existe —cantidades,
   * precios, descuentos, el documento, las condiciones—, igual que la
   * ventana del día. Espera a que dejen de escribir, y al cerrar la ventana
   * manda lo que quede.
   *
   * **Una ganada no**: guardarla reescribe su reserva, y en un día cerrado
   * eso es una corrección con motivo. Ahí sigue el botón. El botón queda
   * también en las demás, para quien quiera mandar ya: con todo guardado
   * dice *✓ Guardado* en gris.
   */
  const autoActivo = !!p && puedeEditar && !ganada;
  const auto = usarAutoguardado(firma, async () => {
    if (!(await guardar(undefined, true))) return ultimoError.current || 'No se pudo guardar';
  }, 1200, autoActivo);
  /**
   * **Si la planilla dijo "demasiadas consultas", se reintenta sola**
   * (2026-11-12). Google corta a 60 lecturas por minuto para la cuenta del
   * panel; a los 30 segundos ya hay cupo de nuevo y lo escrito se manda sin
   * que nadie tenga que apretar nada.
   */
  useEffect(() => {
    if (auto.estado !== 'error' || !/demasiadas consultas/i.test(auto.error)) return;
    const t = setTimeout(() => { void auto.reintentar(); }, 30000);
    return () => clearTimeout(t);
  }, [auto.estado, auto.error]); // eslint-disable-line react-hooks/exhaustive-deps
  const cotizables = paraCotizar(datos.menus);
  const show = showDe(datos.menus);
  const encontrados = useMemo(
    () => [...buscarClientes(clientes, busqueda)].sort(porNombreCliente).slice(0, 8),
    [clientes, busqueda]);

  const cambiarLinea = (i: number, cambio: Partial<Linea>) =>
    setLineas(vistas.map((l, k) => (k === i ? { ...l, ...cambio } : l)));

  const agregar = (m: Menu) => {
    // Una sola vez por cotización: ver `yaEstaEnLaCotizacion()`.
    if (yaEstaEnLaCotizacion(vistas, m.nombre)) return;
    // En UF, el precio en pesos lo pone `prepararLineas()` con la UF de la
    // cotización; si todavía no tiene, se pide la de hoy.
    const precio = m.moneda === MONEDA.uf ? 0 : Math.round(precioParaCotizar(m));
    setLineas([...vistas, lineaDeProducto(m, p?.id ?? '', invitados, precio, enMenus)]);
    if (m.moneda === MONEDA.uf && !uf) void traerUF();
  };
  const hayUF = vistas.some((l) => l.precioUF > 0);

  async function crearCliente(forzar = false) {
    if (!nuevoCliente) return;
    setError('');
    const r = await fetch('/api/clientes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...nuevoCliente, forzar })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    if (d.parecidos?.length) return setParecidas(d.parecidos);
    setClientes(d.clientes);
    setIdCliente(d.id);
    setNuevoCliente(null); setParecidas([]);
    avisar(`Cliente creado: ${nuevoCliente.nombre}`);
    setPaso(2);
  }

  /** Guarda. Devuelve el id, o '' si falló. */
  async function guardar(estadoForzado?: string, solo = false): Promise<string> {
    setError('');
    ultimoError.current = '';
    // Guardando solo no se salta de paso: quien está escribiendo se queda
    // donde está, y el error se lee abajo.
    if (!idCliente) { if (!solo) setPaso(1); setError('Elige o crea el cliente primero.'); return ''; }
    if (!esFecha(fechaReal) && !periodo.trim()) {
      if (!solo) setPaso(2);
      setError('Pon la fecha, o el periodo si todavía no hay día.'); return '';
    }
    setGuardando(true);
    try {
      // Lo escrito en los datos de facturación —o en el RUT y el domicilio
      // que pide el contrato— va a la ficha, para no pedirlo dos veces.
      const ficha = clientes.find((c) => c.id === idCliente);
      if (ficha && (['empresa', 'rut', 'giro', 'domicilio'] as const)
        .some((k) => facturacion[k].trim() !== ficha[k])) {
        const rc = await fetch('/api/clientes', {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: idCliente, ...facturacion })
        });
        const dc = await rc.json();
        if (dc.error) { setError(`Datos de facturación: ${dc.error}`); return ''; }
        if (dc.clientes) setClientes(dc.clientes);
      }
      const cuerpo = {
        id: p?.id, idCliente, fecha: fechaReal, periodo: sinFecha ? periodo : '',
        invitados, tipoEvento, notas, descuento, motivo, documento,
        anticipo: anticipoTxt, anticipoMonto: anticipoMontoTxt, saldoDias: saldoTxt,
        horario, ley20393, acuerdos,
        cambiosFecha: cambiosTxt, cancelacionDias: cancelTxt, reembolso: reembolsoTxt,
        seguimientoDias: segTxt, avisoEvento: avisoTxt,
        ...(uf ? { uf, fechaUF } : {}),
        estado: estadoForzado ?? estado,
        lineas: vistas
      };
      const r = await fetch('/api/presupuestos', {
        method: p ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const d = await r.json();
      if (d.error) { setError(d.error); ultimoError.current = d.error; return ''; }
      if (!solo) {
        avisar(p ? 'Cotización guardada' : (cuerpo.estado === ESTADO_PRESUPUESTO.candidato
          ? 'Candidato anotado' : 'Cotización creada'));
      }
      if (estadoForzado) setEstado(estadoForzado);
      setGuardada(JSON.stringify({ ...JSON.parse(firma), estado: estadoForzado ?? estado }));
      // **Guardando solo no se recarga la lista de atrás** (2026-11-12): cada
      // recarga son siete lecturas de la planilla, y con un autoguardado por
      // pausa al escribir se pasaba del límite de Google (60 por minuto). Se
      // recarga una vez, al cerrar la ventana (`cerrar()`).
      if (solo) huboGuardado.current = true; else onCambio();
      return p?.id ?? d.presupuesto?.id ?? '';
    } finally { setGuardando(false); }
  }

  /** Cerrar manda lo pendiente y, si se guardó algo, recarga la lista una vez. */
  async function cerrar() {
    if (autoActivo) await auto.forzar();
    if (huboGuardado.current) onCambio();
    onCerrar();
  }

  async function ganar(objetivo: string) {
    if (!p || !objetivo) return;
    // La pregunta la hizo antes la ventana *¿Marcarla ganada?* (`confirmandoGanar`).
    setConfirmandoGanar('');
    // Primero se guarda lo que esté escrito, para que la reserva salga con eso.
    if (!(await guardar())) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos/convertir', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: objetivo })
      });
      const d = await r.json();
      // Que no se pierda abajo de la ventana: un ganar que falla tiene que
      // verse en el acto (2026-11-12).
      if (d.error) { avisar(d.error, 'atencion'); return setError(d.error); }
      // **Ganar se festeja** (2026-11-11): es el hito de todo el flujo.
      const ganadora = alternativas.find((a) => a.id === objetivo);
      avisar(`🎉 Ganada${alts.length > 1 && ganadora ? ` la ${letraDe(ganadora, alternativas)}` : ''}: `
        + `la reserva de ${objetivo === p.id ? personasDelEvento : genteDe(ganadora ?? p)} personas ya está en el calendario`);
      onCambio(); onCerrar();
    } finally { setGuardando(false); }
  }

  /**
   * **Pasar de Evento a Productos guarda solo** (2026-11-10, lo pidió el
   * cliente). Con cliente y fecha (o periodo) ya hay una cotización: un
   * candidato pasa a **Borrador** y queda guardado, y una nueva se crea —
   * desde ahí ya se le pueden anotar pagos y subir comprobantes. La ventana
   * se reabre sobre la cotización guardada, en el paso pedido.
   */
  async function irA(n: number) {
    if (n <= 2 || paso >= 3 || !puedeEditar) return setPaso(n);
    const nuevoEstado = estado === ESTADO_PRESUPUESTO.candidato ? ESTADO_PRESUPUESTO.borrador : undefined;
    if (!p || sucio || nuevoEstado) {
      const id = await guardar(nuevoEstado);
      if (!id) return;
      if (!p) { onAbrir?.(id, n); return; }
    }
    setPaso(n);
  }

  /** Abre otra alternativa del grupo; lo escrito en esta se guarda antes. */
  async function abrirAlternativa(id: string) {
    if (sucio && !ganada && !(await guardar())) return;
    if (sucio && ganada && !confirm('Hay cambios sin guardar en esta alternativa. ¿Salir igual?')) return;
    onAbrir?.(id, paso);
  }

  async function duplicar(pasoNuevo = 3) {
    if (!p) return;
    // Lo escrito va también en la copia: primero se guarda.
    if (sucio && !(await guardar())) return;
    const r = await fetch('/api/presupuestos', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ duplicarDe: p.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    avisar('Alternativa creada: ajústala acá mismo');
    onCambio();
    if (onAbrir) onAbrir(d.presupuesto.id, pasoNuevo); else onCerrar();
  }

  /**
   * **"Se quedó con la B"** (2026-11-11). Elegir pasa las otras a *No
   * elegida* y el link pasa a mostrar solo esa; `deshacer` las vuelve a
   * ofrecer. La ventana se reabre con lo que quedó guardado.
   */
  async function elegirAlternativa(id: string, deshacer = false) {
    if (!p) return;
    if (sucio && !ganada && !(await guardar())) return;
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/elegir', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, deshacer })
      });
      const d = await r.json().catch(() => ({}));
      if (d.error) return setError(d.error);
      const elegida = alternativas.find((x) => x.id === id);
      avisar(deshacer ? 'Las alternativas vuelven a estar en carrera'
        : `Se quedó con la ${elegida ? letraDe(elegida, alternativas) : 'elegida'}`);
      onCambio();
      if (onAbrir) onAbrir(id, paso);
    } finally { setGuardando(false); }
  }

  /** Anota un cobro. Lo comprueba el servidor: el vendedor, solo los suyos. */
  async function cobrar(monto: number, concepto: string) {
    if (!p || !monto) return;
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/cobros', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ presupuesto: p.id, monto, concepto, medio })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      setCobros(d.cobros); setOtroMonto(null);
      avisar(`${concepto} anotado: ${enPesos(monto)}`);
      onCambio();
    } finally { setGuardando(false); }
  }

  /** Sube el comprobante de un cobro; las fotos se achican antes. */
  async function subirComprobante(c: Cobro, archivo: File) {
    setSubiendo(c.id); setError('');
    try {
      const f = await achicarFoto(archivo);
      const datosForm = new FormData();
      datosForm.set('id', c.id);
      datosForm.set('archivo', f);
      const r = await fetch('/api/presupuestos/cobros/comprobante', { method: 'POST', body: datosForm });
      const d = await r.json().catch(() => ({ error: 'No se pudo subir el comprobante.' }));
      if (d.error) return setError(d.error);
      const lista = await fetch(`/api/presupuestos/cobros?id=${encodeURIComponent(c.presupuesto)}`)
        .then((x) => x.json()).catch(() => ({}));
      if (lista.cobros) setCobros(lista.cobros);
      avisar('Comprobante guardado');
    } finally { setSubiendo(''); }
  }

  /**
   * Sube el contrato firmado (Fase 4). Se firma en papel; esto es la foto o
   * el PDF, que va a Drive junto a los comprobantes.
   */
  async function subirContrato(archivo: File) {
    if (!p) return;
    setSubiendoContrato(true); setError('');
    try {
      const datosForm = new FormData();
      datosForm.set('id', p.id);
      datosForm.set('archivo', await achicarFoto(archivo));
      const r = await fetch('/api/presupuestos/contrato', { method: 'POST', body: datosForm });
      const d = await r.json().catch(() => ({ error: 'No se pudo subir el contrato.' }));
      if (d.error) return setError(d.error);
      setFirmado({ por: d.contratoSubidoPor, cuando: d.contratoSubido });
      avisar('Contrato firmado guardado');
      onCambio();
    } finally { setSubiendoContrato(false); }
  }

  async function quitarContrato() {
    if (!p || !confirm('¿Quitar el contrato firmado de esta cotización? Es para cuando se subió '
      + 'otro archivo. El archivo queda en Drive.')) return;
    const r = await fetch('/api/presupuestos/contrato', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: p.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    setFirmado(null); avisar('Contrato firmado quitado'); onCambio();
  }

  /**
   * Marca o desmarca la revisión: solo quien hace los pagos.
   *
   * **Un error se dice al lado del cobro, no al pie de la ventana**
   * (2026-11-11): el aviso de error vive al final de una ventana larga, y
   * quien apretó *Marcar revisado* veía el botón quedarse igual sin saber
   * por qué. Una respuesta que no es JSON —un tiempo agotado— tampoco puede
   * perderse en silencio.
   */
  const [revisando, setRevisando] = useState('');
  const [errorPagos, setErrorPagos] = useState('');
  async function revisar(c: Cobro, revisado: boolean) {
    setRevisando(c.id); setErrorPagos('');
    try {
      const r = await fetch('/api/presupuestos/cobros', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: c.id, revisado })
      });
      const d = await r.json().catch(() => ({ error: `No se pudo guardar (error ${r.status}). Prueba de nuevo.` }));
      if (d.error || !Array.isArray(d.cobros)) {
        const msg = d.error || 'No se pudo guardar. Prueba de nuevo.';
        setErrorPagos(msg); avisar(msg, 'atencion'); return;
      }
      setCobros(d.cobros);
      const quedo = (d.cobros as Cobro[]).find((x) => x.id === c.id);
      if (quedo && !!quedo.revisadoPor !== revisado) {
        const msg = 'La planilla no guardó la revisión. Prueba de nuevo.';
        setErrorPagos(msg); avisar(msg, 'atencion'); return;
      }
      avisar(revisado ? 'Cobro revisado' : 'Revisión quitada'); onCambio();
    } catch {
      const msg = 'No hubo conexión con el panel. Prueba de nuevo.';
      setErrorPagos(msg); avisar(msg, 'atencion');
    } finally {
      setRevisando('');
    }
  }

  async function deshacerCobro(c: Cobro) {
    if (!confirm(`¿Deshacer el cobro de ${enPesos(c.monto)}? Es para uno anotado por error: `
      + 'se borra. Si de verdad se devolvió plata, anota un cobro en negativo.')) return;
    const r = await fetch('/api/presupuestos/cobros', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: c.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    setCobros(d.cobros); avisar('Cobro deshecho'); onCambio();
  }

  async function borrar() {
    if (!p || !confirm('¿Borrar esta cotización? No se puede deshacer.')) return;
    const r = await fetch('/api/presupuestos', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: p.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    avisar('Cotización borrada');
    onCambio(); onCerrar();
  }

  const link = p?.token && typeof window !== 'undefined'
    ? `${window.location.origin}/presupuesto/${p.token}` : '';
  /** Cuántas alternativas van en el link: todas las que siguen en carrera. */
  const enVariasAlt = p ? paraElLink(p, alternativas).length : 0;
  const linkContrato = p?.token && typeof window !== 'undefined'
    ? `${window.location.origin}/contrato/${p.token}` : '';
  const textoWhatsapp = !link || !cliente ? ''
    : enVariasAlt > 1
      ? `Hola ${cliente.nombre.split(' ')[0]}, te mando la cotización con ${enVariasAlt} alternativas para que elijas: ${link}`
      : `Hola ${cliente.nombre.split(' ')[0]}, te mando la cotización: ${link}`;
  const whatsapp = textoWhatsapp ? enlaceWhatsApp(cliente!.telefono, textoWhatsapp) : '';
  /**
   * **El correo** (2026-11-11): sin un servidor de correo, abre el programa
   * de correo de quien cotiza con todo puesto. Solo si la ficha tiene correo.
   */
  const correo = link && cliente?.correo
    ? `mailto:${cliente.correo}?subject=${encodeURIComponent(
        `Cotización N° ${folioDe({ id: grupoDe(p!) })}${enVariasAlt > 1 ? ` · ${enVariasAlt} alternativas`
          : letraDe(p!, alternativas) ? ` · Alternativa ${letraDe(p!, alternativas)}` : ''}`
        + (datos.empresa ? ` · ${datos.empresa}` : ''))}&body=${encodeURIComponent(
        `Hola ${cliente.nombre.split(' ')[0]},\n\nTe mando la cotización:\n${link}\n\nQuedo atento.`)}`
    : '';
  const nombreCorto = cliente?.nombre.split(' ')[0] ?? '';
  const folio = p ? `N° ${folioDe({ id: grupoDe(p) })}` : '';
  /** **Mandar el contrato** (2026-11-11): los mismos tres caminos que la cotización. */
  const textoWhatsappContrato = linkContrato && cliente
    ? `Hola ${nombreCorto}, te mando el contrato para firmar: ${linkContrato}` : '';
  const whatsappContrato = textoWhatsappContrato
    ? enlaceWhatsApp(cliente!.telefono, textoWhatsappContrato) : '';
  const correoContrato = linkContrato && cliente?.correo
    ? `mailto:${cliente.correo}?subject=${encodeURIComponent(
        `Contrato · Cotización ${folio}` + (datos.empresa ? ` · ${datos.empresa}` : ''))}&body=${encodeURIComponent(
        `Hola ${nombreCorto},\n\nTe mando el contrato para firmar:\n${linkContrato}\n\nSe imprime y se firma en dos ejemplares.\n\nQuedo atento.`)}`
    : '';
  const mandada = estaMandada(estado);
  /**
   * **Mandarla** (2026-11-11). Sin WhatsApp ni correo conectados al panel,
   * no hay cómo saber si de verdad se mandó: se pregunta. Copiar el link
   * también, porque casi siempre es para pegarlo en alguna parte.
   */
  function mandar(via: 'whatsapp' | 'correo' | 'link', que: 'cotizacion' | 'contrato' = 'cotizacion') {
    // WhatsApp y correo son enlaces de verdad (`BotonesMandar`): los abre el
    // navegador. Abrirlos con `window.open` los bloqueaba en el teléfono como
    // ventana emergente, y se perdía justo lo que el botón promete (2026-11-11).
    const elLink = que === 'contrato' ? linkContrato : link;
    setViaEnvio(via);
    if (via === 'link' && elLink) copiarConAviso(elLink, 'Link copiado', 'Copia este link:');
    if (!p || !puedeEditar || cancelada) return;
    // Se pregunta solo la primera vez: mandarla de nuevo no cambia nada.
    if (que === 'cotizacion' && (ganada || mandada)) return;
    if (que === 'contrato' && (contratoEnviado || firmado)) return;
    // Copiar no saca de la pantalla: se pregunta enseguida.
    if (via === 'link') return setPreguntaEnvio(que);
    // **WhatsApp y correo preguntan al volver** (lo pidió el cliente: *"cuando
    // vuelvo a la pestaña o al panel, me tiene que preguntar"*). Se espera a
    // que la página vuelva a estar a la vista o a tener el foco. Si nunca se
    // fue —un correo sin programa de correo—, pregunta igual a los 3 s.
    let salio = false;
    const listo = () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
      window.removeEventListener('blur', alSalir);
      clearTimeout(reloj);
      setPreguntaEnvio(que);
    };
    function alSalir() { salio = true; }
    function alVolver() { if (document.visibilityState === 'visible' && salio) listo(); }
    const alOcultar = () => { if (document.visibilityState === 'hidden') salio = true; };
    document.addEventListener('visibilitychange', alOcultar, { once: true });
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    window.addEventListener('blur', alSalir);
    const reloj = setTimeout(() => { if (!salio) listo(); }, 3000);
  }
  async function confirmarEnvio() {
    const que = preguntaEnvio;
    setPreguntaEnvio('');
    if (que === 'contrato') {
      if (!p) return;
      // Solo la marca: la fecha la pone el servidor, y no hace falta mandar
      // lo demás de la cotización.
      const r = await fetch('/api/presupuestos', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, seguimiento: 'contratoEnviado' })
      });
      const d = await r.json().catch(() => ({}));
      if (d.error) return setError(d.error);
      setContratoEnviado(d.contratoEnviado || datos.hoy || '');
      avisar('Contrato enviado: te recuerdo si no vuelve firmado');
      onCambio();
      return;
    }
    if (await guardar(ESTADO_PRESUPUESTO.enviado, true)) {
      avisar('Enviada: desde hoy corre su vigencia y cuenta en el calendario');
    }
  }
  /**
   * **¿Están negociando?** (2026-11-11): una cotización ya mandada a la que
   * se le cambian líneas o precios.
   *
   * **Se compara contra cómo estaba al mandarla, no al abrir la ventana**
   * (arreglado el mismo día, lo reclamó el cliente). Antes la base era la de
   * la primera vez que se dibujó la ventana, así que armar las líneas en el
   * paso 3 y después apretar *Sí, la mandé* mostraba la franja en el acto,
   * como si se hubiera cambiado algo ya enviado. Ahora la base se toma
   * cuando la cotización queda Enviada —al abrirla ya enviada, o al
   * mandarla en esta misma ventana— y se suelta si deja de estarlo.
   */
  const firmaPrecio = JSON.stringify({ l: vistas.map((l) => [l.concepto, l.cantidad, l.precio, l.descuento]), descuento });
  const enviadaAhora = !!p && estado === ESTADO_PRESUPUESTO.enviado;
  const [precioAlMandar, setPrecioAlMandar] = useState<string | null>(enviadaAhora ? firmaPrecio : null);
  useEffect(() => {
    if (!enviadaAhora) setPrecioAlMandar(null);
    else if (precioAlMandar === null) setPrecioAlMandar(firmaPrecio);
  }, [enviadaAhora]); // eslint-disable-line react-hooks/exhaustive-deps
  const renegociando = enviadaAhora && precioAlMandar !== null && firmaPrecio !== precioAlMandar;

  /**
   * **El camino** (2026-11-11): los hitos de una cotización, como trofeos.
   * Sin anticipo, ese hito se cumple al mandarla.
   */
  // Un anticipo de $0 —una cotización todavía sin productos— no está pagado.
  const anticipoPagado = cond.pct > 0 && cond.anticipo > 0 && cobrado.anticipoListo;
  const camino = [
    { nombre: 'Enviada', listo: ganada || mandada },
    { nombre: cond.pct > 0 ? 'Anticipo' : 'Sin anticipo',
      listo: cond.pct > 0 ? ganada || anticipoPagado : ganada || mandada },
    { nombre: 'Ganada', listo: ganada },
    { nombre: 'Contrato enviado', listo: !!contratoEnviado || !!firmado },
    { nombre: 'Contrato firmado', listo: !!firmado },
    { nombre: 'Pagada', listo: cobrado.completo }
  ];
  const personasDelEvento = enMenus || invitados;
  /**
   * **¿Cabe en el día?** (2026-11-11, lo pidió el cliente). Lo ya tomado ese
   * día se pide a `/api/ocupacion` cada vez que cambia la fecha; la regla es
   * la misma `cupoParaGanar()` que usa `/convertir` para rechazarlo. Una
   * ganada no se mira: su propia reserva ya está contada.
   */
  const [tomadasDia, setTomadasDia] = useState<number | null>(null);
  useEffect(() => {
    setTomadasDia(null);
    if (!esFecha(fechaReal) || ganada) return;
    let vivo = true;
    fetch(`/api/ocupacion?desde=${fechaReal}&hasta=${fechaReal}`).then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        const o = (d.ocupacion ?? []).find((x: { fecha: string }) => x.fecha === fechaReal);
        setTomadasDia(o ? o.tomadas : 0);
      }).catch(() => {});
    return () => { vivo = false; };
  }, [fechaReal, ganada]);
  const cupo = tomadasDia === null || !esFecha(fechaReal) ? null
    : cupoParaGanar(datos.fechas.find((f) => f.fecha === fechaReal), fechaReal,
        { cupoNormal: datos.cupoNormal ?? 120, horaApertura: datos.horaApertura ?? '' },
        tomadasDia, personasDelEvento);
  const sinCupo = !!cupo && !cupo.cabe && !ganada && personasDelEvento > 0;
  const avisoCupo = sinCupo && cupo ? (
    <div role="alert" className="rounded-xl border-2 border-rojo-fuerte/70 bg-rojo/10 p-3 text-[15px]">
      <p className="font-bold text-rojo-texto">
        {cupo.exclusivo
          ? 'Ese día está arrendado en exclusiva a otro cliente.'
          : `Se está excediendo el cupo del día: quedan ${Math.max(0, cupo.libres)} lugares y la cotización es de ${personasDelEvento} personas.`}
      </p>
      <p className="mt-1 text-hueso/85">
        No podemos tomar la reserva. Comunícate con la administración para ver si se pueden
        abrir más cupos, o si habrá que cancelar la cotización.
      </p>
    </div>
  ) : null;
  // **Las alternativas** (2026-11-10, rehechas el 2026-11-11): un número por
  // cotización —el del grupo— y una letra por alternativa. Se mandan juntas
  // en un solo link y, antes de ganar, se elige una.
  const alts = p ? alternativasDe(p, alternativas) : [];
  const letra = p ? letraDe(p, alternativas) : '';
  const vivas = p ? vivasDelGrupo(p, alternativas) : [];
  const grupoGanado = alts.some((a) => !!a.idReserva);
  const porElegir = !!p && !ganada && !grupoGanado && !cancelada && vivas.length > 1 && sigueViva(p);
  const noQuedo = !!p && !ganada && estadoNormal(p.estado) === ESTADO_PRESUPUESTO.noElegida;
  const laElegida = noQuedo ? vivas[0] : undefined;
  const enElLink = p ? paraElLink(p, alternativas) : [];
  const siguienteLetra = String.fromCharCode(65 + alts.length);
  const totalAlt = (a: Presupuesto) => a.id === p?.id ? cuentas.total
    : totalDe(lineasDe(datos.lineas ?? [], a.id), a.descuento);
  const resumenLink = enElLink.length > 1
    ? enElLink.map((a) => `${letraDe(a, alternativas)} ${enPesos(totalAlt(a))}`).join(' · ') : '';

  /** La gente de una alternativa: la de esta ventana es la que se ve. */
  const genteDe = (a: Presupuesto) => a.id === p?.id ? personasDelEvento
    : lineasDe(datos.lineas ?? [], a.id).reduce((n, l) => n + (l.personas || 0), 0) || a.invitados || 0;
  /**
   * **Si se puede ganar cada alternativa** (2026-11-12). Con lo pagado en
   * todo el grupo: el anticipo es del evento, aunque se haya anotado en otra.
   */
  const cobrosGrupo = [...cobros, ...cobrosOtras];
  const ganable = (a: Presupuesto): { ok: boolean; falta: number } => {
    const c = a.id === p?.id ? cond : condicionesDe(
      { anticipo: a.anticipo, anticipoMonto: a.anticipoMonto, saldoDias: a.saldoDias, fecha: a.fecha }, totalAlt(a),
      datos.condiciones ?? { anticipoPct: 30, saldoDias: 3 });
    const est = estadoCobros({ anticipo: c.anticipo, total: totalAlt(a) }, cobrosGrupo);
    const conContrato = a.id === p?.id ? !!firmado : !!String(a.contrato ?? '').trim();
    const ok = (c.pct > 0 && c.anticipo > 0 && est.anticipoListo)
      || (c.pct === 0 && estaMandada(a.id === p?.id ? estado : a.estado)) || conContrato;
    return { ok, falta: est.faltaAnticipo };
  };
  /** Para *Corregir la ganada*: a qué otra alternativa se pueden pasar los pagos. */
  const vivasParaCorregir = alts.filter((a) => a.id !== p?.id
    && !([ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.cancelada] as string[]).includes(estadoNormal(a.estado)));
  /** Con varias alternativas en carrera, alguna ya se puede ganar. */
  const grupoListo = porElegir && vivas.some((a) => ganable(a).ok);

  /** El botón grande de ganar, el mismo en los dos pasos. */
  // Con alternativas en carrera también se ofrece: ganar una es elegirla
  // (2026-11-12, lo decidió el cliente). La confirmación dice cuáles quedan
  // como No elegida.
  // **Con varias alternativas, un botón por cada una** (2026-11-12, lo pidió
  // el cliente: estaba en la A, la marcó ganada y el cliente había elegido la
  // B). Cada botón dice la letra y el total: se elige cuál ganó, no se gana
  // "esta" sin mirar.
  const botonGanar = sinCupo ? avisoCupo : esFecha(fechaReal) && puedeEditar && porElegir ? (
    <div className="space-y-2">
      <p className="text-[15px] font-semibold">¿Con cuál alternativa se quedó el cliente?</p>
      <div className={`grid gap-2 ${vivas.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {vivas.map((a) => {
          const g = ganable(a);
          const l = letraDe(a, alternativas);
          return (
            <button key={a.id} type="button" disabled={guardando || !g.ok}
              onClick={() => setConfirmandoGanar(a.id)}
              className={`tecla flex min-h-[84px] flex-col items-center justify-center rounded-xl border-2 px-4 py-2
                         disabled:cursor-not-allowed ${g.ok
                ? 'border-verde-fuerte bg-verde-fuerte text-tinta shadow-md hover:brightness-110'
                : 'border-hueso/25 text-hueso/70'}`}>
              <span className="text-[20px] font-extrabold uppercase tracking-wide">✓ Ganó la {l}</span>
              <span className="text-[15px] font-semibold">{enPesos(totalAlt(a))}{a.id === p?.id ? ' · la que estás viendo' : ''}</span>
              {!g.ok && <span className="text-[13px]">falta el anticipo: {enPesos(g.falta)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  ) : esFecha(fechaReal) && puedeEditar ? (
    <span className="flex items-center gap-1">
      <button type="button" disabled={guardando} onClick={() => setConfirmandoGanar(p?.id ?? '')}
        className="tecla min-h-[64px] w-full rounded-xl border-2 border-verde-fuerte bg-verde-fuerte
                   px-6 text-[20px] font-extrabold uppercase tracking-wide text-tinta
                   shadow-md hover:brightness-110 disabled:opacity-50">
        ✓ Marcar ganada
      </button>
      <AyudaCorta tema="marcarGanada" />
    </span>
  ) : !esFecha(fechaReal) ? (
    <button type="button" className="boton min-h-[48px]" onClick={() => setPaso(2)}>Ir al paso 2: Evento</button>
  ) : null;
  const bajadaGanar = esFecha(fechaReal)
    ? `Crea la reserva de ${personasDelEvento} personas y le toma el cupo al ${enPalabras(fechaReal)}.`
    : 'Para ganarla, ponle la fecha en el paso 2.';
  const saldo = cobrado.falta > 0 ? (
    // Solo se muestra con la cotización ganada (2026-11-12, lo pidió el
    // cliente: que el paso diga qué falta para completar la reserva y no
    // vuelva a ofrecer ganarla).
    <Hito tono="ambar" titulo={`✓ Ganada${firmado ? ' y firmada' : ''} · falta el saldo: ${enPesos(cobrado.falta)}`}
      bajada={`Lo que falta para completar la reserva. Se paga ${cond.saldoHasta
        ? `hasta el ${enPalabras(cond.saldoHasta)}` : `${cond.dias} días antes del evento`}; cuando pague, márcalo acá y la reserva queda Pagada.`}>
      {puedeEditar && (
        <button type="button" disabled={guardando} onClick={() => void cobrar(cobrado.falta, 'Saldo')}
          className="tecla min-h-[56px] w-full rounded-xl border-2 border-verde-fuerte px-5 text-[17px]
                     font-bold text-verde-texto hover:bg-verde/10 disabled:opacity-50">
          ✓ Pagó el saldo · {enPesos(cobrado.falta)}
        </button>
      )}
    </Hito>
  ) : null;

  /**
   * **El próximo paso del paso 4, Envío** (2026-11-11). Mandarla, esperar el
   * anticipo y ganarla con él. Con *Sin anticipo* también se ofrece ganar, y
   * la confirmación avisa si tampoco hay contrato firmado.
   */
  // Una alternativa que no quedó no tiene próximo paso: lo dice su franja
  // arriba, con *Abrir la elegida*.
  /** Si el próximo paso del 4 es mandarla: ese cuadro va arriba, no al final. */
  const mandarPrimero = !!p && !cancelada && !noQuedo && !ganada
    && !(anticipoPagado || (mandada && cond.pct === 0) || grupoListo) && !mandada;
  const hitoEnvio: React.ReactNode = !p || cancelada || noQuedo ? null
    : ganada ? (
      saldo && firmado ? saldo : (
        <Hito tono="verde" titulo="✓ Ganada · sigue el contrato"
          bajada="La reserva ya está en el calendario. Lo que sigue es mandarle el contrato y que vuelva firmado.">
          <button type="button" className="boton boton-relleno min-h-[52px] px-6 text-[16px]"
            onClick={() => setPaso(5)}>Ir al paso 5: Contrato →</button>
        </Hito>
      )
    ) : anticipoPagado || (mandada && cond.pct === 0) || grupoListo ? (
      <Hito tono={sinCupo ? 'ambar' : 'verde'}
        titulo={sinCupo ? 'No hay cupo para tomarla' : esFecha(fechaReal) ? 'Lista para ganar' : 'Falta el día del evento'}
        bajada={sinCupo ? 'Mientras el día no tenga lugar, no se puede marcar ganada.' : bajadaGanar}>
        {botonGanar}
      </Hito>
    ) : !mandada ? (
      <Hito tono="rosa" titulo={enElLink.length > 1 ? `Mándale las ${enElLink.length} alternativas` : 'Mándasela al cliente'}
        bajada={(enElLink.length > 1 ? `Van todas en un solo link: ${resumenLink}. ` : '')
          + 'WhatsApp y Correo abren el mensaje con el link. Al volver te pregunto si la mandaste: desde ahí corre su vigencia y aparece en el calendario de reservas.'}>
        <BotonesMandar link={link} whatsapp={whatsapp} correo={correo} onMandar={mandar} grande />
      </Hito>
    ) : (
      <Hito tono="ambar" titulo={`Esperando el anticipo: ${enPesos(cobrado.faltaAnticipo)}`}
        bajada={firmado
          ? 'Ya tiene el contrato firmado: también se puede marcar ganada en el paso 5, Contrato.'
          : 'Con el anticipo pagado se puede marcar ganada. Si pagó otro monto, anótalo arriba en El pago.'}>
        {puedeEditar && (
          <button type="button" disabled={guardando}
            onClick={() => void cobrar(cobrado.faltaAnticipo, 'Anticipo')}
            className="tecla min-h-[56px] w-full rounded-xl border-2 border-verde-fuerte px-5 text-[17px]
                       font-bold text-verde-texto hover:bg-verde/10 disabled:opacity-50">
            ✓ Anticipo recibido · {enPesos(cobrado.faltaAnticipo)}
          </button>
        )}
      </Hito>
    );

  /**
   * **El próximo paso del paso 5, Contrato** (2026-11-11). Mandar el
   * contrato, esperar el firmado y, con el firmado subido, ganarla aunque
   * falte el anticipo (`puedeGanar()`): *"en contratos obviamente solo puede
   * marcar ganado si está el contrato"*.
   */
  const hitoContrato: React.ReactNode = !p || cancelada || noQuedo ? null
    : !firmado ? (
      contratoEnviado ? (
        <Hito tono="cielo" titulo="Esperando el contrato firmado"
          bajada={`Se lo mandaste el ${enPalabras(contratoEnviado)}. Cuando te lo devuelva firmado, súbelo.`}>
          {puedeEditar && <SubirFirmado subiendo={subiendoContrato} onArchivo={(f) => void subirContrato(f)} />}
        </Hito>
      ) : (
        <Hito tono="cielo" titulo="Mándale el contrato"
          bajada="WhatsApp y Correo abren el mensaje con el link del contrato. Al volver te pregunto si lo mandaste.">
          <BotonesMandar link={linkContrato} whatsapp={whatsappContrato} correo={correoContrato}
            onMandar={(v) => mandar(v, 'contrato')} ver="Ver el contrato" grande />
          {puedeEditar && <SubirFirmado subiendo={subiendoContrato} onArchivo={(f) => void subirContrato(f)} />}
        </Hito>
      )
    ) : !ganada ? (
      <Hito tono={sinCupo ? 'ambar' : 'verde'}
        titulo={sinCupo ? 'No hay cupo para tomarla' : esFecha(fechaReal) ? '✓ Contrato firmado · lista para ganar' : 'Falta el día del evento'}
        bajada={sinCupo ? 'Mientras el día no tenga lugar, no se puede marcar ganada.' : bajadaGanar + (cobrado.faltaAnticipo > 0
          ? ` El anticipo (${enPesos(cobrado.faltaAnticipo)}) queda por cobrar.` : '')}>
        {botonGanar}
      </Hito>
    ) : saldo ?? (
      <Hito tono="verde" titulo="✓ Cerrada: ganada, firmada y pagada" bajada="No queda nada por hacer con esta cotización." />
    );

  const titulo = p
    ? `${estadoVisible(p, datos.hoy) === ESTADO_PRESUPUESTO.candidato ? 'Candidato' : 'Cotización'}`
      + ` N° ${folioDe({ id: grupoDe(p) })}${letra ? ` · Alternativa ${letra}` : ''}`
    : 'Nueva cotización';

  return (
    <Dialogo titulo={titulo} onCerrar={() => void cerrar()} ancho="max-w-3xl">
      {/* Los cinco pasos, como botones: se ve dónde se está y se puede saltar.
          Desde el 2026-11-11 son cinco: el envío y el contrato son dos
          conversaciones con el cliente, cada una con su hito al final. */}
      <nav ref={arriba} aria-label="Pasos" className="mb-4 grid grid-cols-5 gap-1">
        {PASOS.map((nombre, i) => (
          <button key={nombre} type="button" onClick={() => void irA(i + 1)}
            aria-current={paso === i + 1 ? 'step' : undefined}
            className={`tecla flex min-h-[48px] flex-col items-center justify-center rounded
                        border px-1 text-[13px] font-semibold ${paso === i + 1
              ? 'border-oro bg-oro text-tinta' : 'border-hueso/20 text-hueso/80'}`}>
            <span className="text-[16px] leading-none">{i + 1}</span>
            <span>{nombre}</span>
          </button>
        ))}
      </nav>

      {/* **Las alternativas, dentro de la cotización** (2026-11-10): una
          pestaña por alternativa y *+ Otra alternativa*, en vez de dos
          cotizaciones sueltas con dos números. */}
      {p && paso >= 2 && (
        <div className="mb-4 rounded-xl border border-hueso/15 bg-panel p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center text-[13px] font-medium uppercase tracking-wide text-hueso/60">
              {alts.length > 1 ? 'Alternativas' : 'Una sola versión'}
              <AyudaCorta tema="alternativas" />
            </span>
            {alts.length > 1 && alts.map((a) => {
              const fuera = !sigueViva(a);
              const elegidaYa = !fuera && vivas.length === 1 && alts.length > 1;
              return (
                <button key={a.id} type="button" aria-pressed={a.id === p.id}
                  onClick={() => { if (a.id !== p.id) void abrirAlternativa(a.id); }}
                  className={`boton min-h-[48px] min-w-[48px] gap-1.5 ${a.id === p.id ? '!border-oro bg-oro/15 font-semibold' : ''}
                              ${fuera ? 'opacity-60' : ''}`}>
                  <span className={`text-[17px] font-bold ${fuera ? 'line-through' : ''}`}>{letraDe(a, alternativas)}</span>
                  <span className="text-[13px] font-normal text-hueso/75">{enPesos(totalAlt(a))}</span>
                  {elegidaYa && <span className="text-[13px] font-semibold text-verde-texto">✓ elegida</span>}
                  {fuera && <span className="text-[13px]">no quedó</span>}
                </button>
              );
            })}
            {puedeEditar && !grupoGanado && !cancelada && (
              <button type="button" disabled={guardando} onClick={() => void duplicar(paso >= 3 ? 3 : 2)}
                className="boton min-h-[48px] border-dashed">+ Crear alternativa {siguienteLetra}</button>
            )}
          </div>
          {noQuedo && laElegida && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-2">
              <span className="flex-1 text-[15px] font-semibold text-ambar-texto">
                Esta alternativa no quedó: el cliente se quedó con la {letraDe(laElegida, alternativas)}.
              </span>
              <button type="button" className="boton min-h-[44px]"
                onClick={() => void abrirAlternativa(laElegida.id)}>Abrir la {letraDe(laElegida, alternativas)}</button>
              {puedeEditar && !grupoGanado && (
                <button type="button" disabled={guardando} className="boton min-h-[44px]"
                  onClick={() => void elegirAlternativa(laElegida.id, true)}>Volver a ofrecer todas</button>
              )}
            </div>
          )}
          {!noQuedo && !porElegir && !grupoGanado && vivas.length === 1 && alts.length > 1 && puedeEditar && (
            <p className="mt-2 text-[14px] text-hueso/75">
              El cliente se quedó con esta.{' '}
              <button type="button" disabled={guardando} className="font-semibold text-oro underline"
                onClick={() => void elegirAlternativa(p.id, true)}>Volver a ofrecer todas</button>
            </p>
          )}
        </div>
      )}

      {/* Para quién es, a la vista en los cuatro pasos. */}
      {cliente && paso !== 1 && (
        <p className="mb-3 text-[15px]">
          Para <strong>{cliente.nombre}</strong>
          {fechaReal && <> · <span className="first-letter:uppercase inline-block">{enPalabras(fechaReal)}</span></>}
          {!fechaReal && periodo && <> · {periodo}</>}
        </p>
      )}

      {!puedeEditar && (
        <p className="mb-3 rounded border border-hueso/25 bg-hueso/5 px-3 py-2 text-[14px]">
          {soloMira
            ? <>👁 <strong>Vista gerencia:</strong> la puedes ver, no cambiar.</>
            : <>La creó <strong>{p?.creadoPor || 'otra persona'}</strong>: la puedes ver, no cambiar.</>}
        </p>
      )}
      {cancelada && (
        <p className="mb-3 rounded border border-rojo-fuerte/60 bg-rojo/10 px-3 py-2 text-[14px]">
          <strong className="text-rojo-texto">Cancelada.</strong> Su reserva liberó el cupo. Ya no se
          edita: lo que queda es la devolución, en el paso Condiciones.
        </p>
      )}
      {ganada && !cancelada && (
        <p className="mb-3 rounded border border-verde-fuerte/60 bg-verde/10 px-3 py-2 text-[14px]">
          <strong className="text-verde-texto">Ganada.</strong> Tiene su reserva en el calendario.
          Si cambias algo acá, la reserva se actualiza sola.
        </p>
      )}

      {/* Una cancelada se ve, no se edita: solo quedan sus pagos (paso 4),
          para anotar la devolución. */}
      <fieldset disabled={!puedeEditar || (cancelada && paso !== 4)} className="min-w-0">
        {/* ---------- 1. Cliente ---------- */}
        {paso === 1 && (
          <div className="space-y-3">
            {cliente && (
              <div className="flex flex-wrap items-center gap-3 rounded border border-verde-fuerte/50
                              bg-verde/10 p-3">
                <div className="flex-1">
                  <p className="text-[16px] font-semibold">{cliente.nombre}</p>
                  <p className="text-[14px] text-hueso/70">
                    {[cliente.empresa, cliente.telefono, cliente.correo].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            )}
            {!nuevoCliente && (
              <>
                <input type="search" value={busqueda} autoFocus={!cliente}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente por nombre, empresa, teléfono o correo"
                  aria-label="Buscar cliente" className={`${ENTRADA} min-h-[48px]`} />
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {encontrados.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => { setIdCliente(c.id); setPaso(2); }}
                        className={`tecla w-full rounded border px-3 py-2 text-left min-h-[52px] ${
                          c.id === idCliente ? 'border-verde-fuerte bg-verde/10' : 'border-hueso/20'}`}>
                        <span className="block text-[15px] font-semibold">{c.nombre}</span>
                        <span className="block text-[13px] text-hueso/70">
                          {c.empresa || c.telefono || c.correo}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="boton min-h-[44px]"
                  onClick={() => setNuevoCliente({ nombre: busqueda, telefono: '', correo: '', empresa: '' })}>
                  + Cliente nuevo
                </button>
              </>
            )}
            {nuevoCliente && (
              <div className="space-y-3 rounded border border-oro/50 p-3">
                <p className="text-[14px] font-bold uppercase tracking-wide">Cliente nuevo</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Nombre" ancho="w-full">
                    <input className={ENTRADA} value={nuevoCliente.nombre} autoFocus
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Empresa (si es una)" ancho="w-full">
                    <input className={ENTRADA} value={nuevoCliente.empresa}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, empresa: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Teléfono" ancho="w-full">
                    <CampoTelefono valor={nuevoCliente.telefono} className={ENTRADA}
                      etiqueta="Teléfono del cliente nuevo"
                      onCambio={(v) => setNuevoCliente({ ...nuevoCliente, telefono: v })} />
                  </Campo>
                  <Campo etiqueta="Correo" ancho="w-full">
                    <input type="email" className={ENTRADA} value={nuevoCliente.correo}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })} />
                  </Campo>
                </div>
                {parecidas.length > 0 && (
                  <div className="rounded border border-ambar/50 bg-ambar/5 p-3">
                    <p className="text-[15px] font-semibold text-ambar-texto">
                      ¿Es alguno de estos? Ya hay un cliente con ese teléfono, correo o RUT.
                    </p>
                    {parecidas.map((c) => (
                      <button key={c.id} type="button" className="boton mt-2 mr-2"
                        onClick={() => { setIdCliente(c.id); setNuevoCliente(null);
                                         setParecidas([]); setPaso(2); }}>
                        Sí, es {c.nombre}
                      </button>
                    ))}
                    <button type="button" className="boton mt-2" onClick={() => void crearCliente(true)}>
                      No, es otro: crearlo igual
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {parecidas.length === 0 && (
                    <button type="button" className="boton boton-relleno min-h-[44px]"
                      onClick={() => void crearCliente()}>Crear y seguir</button>
                  )}
                  <button type="button" className="boton min-h-[44px]"
                    onClick={() => { setNuevoCliente(null); setParecidas([]); }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- 2. Evento ---------- */}
        {paso === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              {!sinFecha && (
                <Campo etiqueta="Fecha del evento" ancho="w-56">
                  <input type="date" value={fecha} min={ganada ? undefined : datos.hoy}
                    onChange={(e) => setFecha(e.target.value)}
                    className={`${ENTRADA} min-h-[48px]`} />
                </Campo>
              )}
              {sinFecha && (
                <Campo etiqueta="¿Cuándo, más o menos?" ancho="w-full sm:w-72">
                  <input value={periodo} onChange={(e) => setPeriodo(e.target.value)}
                    placeholder="marzo o abril, fin de año…" className={`${ENTRADA} min-h-[48px]`} />
                </Campo>
              )}
              {!ganada && (
                <button type="button" onClick={() => setSinFecha(!sinFecha)}
                  className={`boton min-h-[48px] ${sinFecha ? 'border-oro bg-oro/15' : ''}`}>
                  {sinFecha ? '✓ Todavía sin día exacto' : 'Todavía no hay día exacto'}
                </button>
              )}
              {!ganada && <span className="self-center"><AyudaCorta tema="sinFecha" /></span>}
            </div>
            {!sinFecha && fecha && (
              <p className="text-[14px] text-hueso/75">
                <span className="first-letter:uppercase inline-block">{enPalabras(fecha)}</span>.{' '}
                {estadoDelDia(fecha, datos.fechas)}
              </p>
            )}
            {avisoCupo}

            <div>
              <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Invitados, niños incluidos
              </p>
              <div className="flex items-center gap-2">
                <button type="button" className="boton h-12 w-12 text-xl"
                  onClick={() => setInvitados(Math.max(0, invitados - 1))} aria-label="Uno menos">−</button>
                <input type="number" min={0} value={invitados || ''} placeholder="0"
                  onChange={(e) => setInvitados(Math.max(0, Number(e.target.value) || 0))}
                  className={`${ENTRADA} h-12 w-28 text-center text-[20px] font-bold`}
                  aria-label="Invitados, niños incluidos" />
                <button type="button" className="boton h-12 w-12 text-xl"
                  onClick={() => setInvitados(invitados + 1)} aria-label="Uno más">+</button>
              </div>
              <p className="mt-1 text-[13px] text-hueso/60">
                La cantidad de personas completa, adultos y niños. Los menús se reparten
                este número; la once y el desayuno nacen con todos y se ajustan con − y +.
              </p>
            </div>

            <div>
              <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Tipo de evento
              </p>
              <Elegir etiqueta="Tipo de evento" opciones={TIPOS_EVENTO}
                valor={tipoEvento} onElegir={setTipoEvento} />
            </div>

            <Campo etiqueta="Notas internas" ancho="w-full">
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Lo que conviene recordar de esta conversación" className={ENTRADA} />
            </Campo>

            {!p && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={guardando} className="boton min-h-[44px]"
                  onClick={async () => { if (await guardar(ESTADO_PRESUPUESTO.candidato)) onCerrar(); }}>
                  Guardar como candidato
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- 3. Productos ---------- */}
        {paso === 3 && (
          <div className="space-y-4">
            {cotizables.length === 0 ? (
              <p className="rounded border border-ambar/50 bg-ambar/5 p-3 text-[14px]">
                Ningún producto está marcado “se puede cotizar”. Márcalos en <a href="/menus"
                  className="font-semibold text-oro underline">Productos</a>.
              </p>
            ) : (
              <div>
                <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                  Agregar <AyudaCorta tema="agregarProducto" />
                </p>
                <div className="flex flex-wrap gap-2">
                  {cotizables.map((m) => {
                    // **Ya agregado, el botón se apaga y lo dice** (2026-11-12):
                    // un producto va una sola vez; la cantidad se cambia en su línea.
                    const ya = yaEstaEnLaCotizacion(vistas, m.nombre);
                    return (
                      <button key={m.nombre} type="button" onClick={() => agregar(m)} disabled={ya}
                        title={ya ? 'Ya está en la cotización: cambia la cantidad en su línea' : undefined}
                        className={`boton min-h-[48px] text-[14px] ${ya ? 'border-verde-fuerte/50 text-verde-texto' : ''}`}>
                        {ya ? '✓' : '+'} {m.nombre}
                        <span className="ml-1 text-hueso/60">
                          {ya ? '· ya está'
                            : m.moneda === MONEDA.uf ? `${String(m.precioCotizacion).replace('.', ',')} UF`
                            : precioParaCotizar(m) ? enPesos(precioParaCotizar(m)) : ''}
                        </span>
                      </button>
                    );
                  })}
                  <button type="button" className="boton min-h-[48px] text-[14px]"
                    onClick={() => setLineas([...vistas, {
                      presupuesto: p?.id ?? '', concepto: 'Otro', cantidad: 1, precio: 0,
                      personas: 0, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0 }])}>
                    + Otra línea
                  </button>
                </div>
                {show && !publico && esFecha(fechaReal) && !vistas.some((l) => l.concepto === show.nombre) && (
                  <p className="mt-2 text-[13px] text-hueso/70">
                    Día privado: el show ecuestre es opcional y tiene costo. Agrégalo arriba si va.
                  </p>
                )}
              </div>
            )}

            {vistas.length === 0 ? (
              <p className="rounded border border-dashed border-hueso/20 p-4 text-[14px] text-hueso/60">
                Todavía no hay nada cotizado.
              </p>
            ) : (
              <ul className="space-y-2">
                {vistas.map((l, i) => {
                  const prod = productoDe(l.concepto, datos.menus);
                  const esShowIncluido = publico && prod?.tipo === TIPO_PRODUCTO.show;
                  return (
                    <li key={i} className="rounded border border-hueso/15 bg-panel p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {prod ? (
                          <span className="text-[16px] font-semibold">{l.concepto}</span>
                        ) : (
                          <input value={l.concepto} aria-label="Concepto"
                            onChange={(e) => cambiarLinea(i, { concepto: e.target.value })}
                            className={`${ENTRADA} w-56`} />
                        )}
                        {prod && (
                          <span className="rounded-full border border-hueso/25 px-2 py-0.5 text-[13px]
                                           text-hueso/70">{prod.tipo}</span>
                        )}
                        <span className="flex-1" />
                        {esShowIncluido ? (
                          <span className="rounded-full border border-verde-fuerte/60 px-2 py-0.5
                                           text-[13px] font-semibold text-verde-texto">
                            incluido: día público
                          </span>
                        ) : (
                          <button type="button" className="boton hover:border-rojo-fuerte hover:text-rojo-texto"
                            onClick={() => setLineas(vistas.filter((_, k) => k !== i))}>Quitar</button>
                        )}
                      </div>
                      {!esShowIncluido && (
                        <div className="mt-2 flex flex-wrap items-end gap-3">
                          {/* **Un monto fijo no tiene cantidad** (2026-11-11): el
                              arriendo o el show van o no van. Lo por persona —menús,
                              la once, el desayuno— se ajusta con − y +. */}
                          {(!prod || prod.cobro !== COBRO.fijo) && (
                          <Campo etiqueta="Cantidad" ancho="w-auto">
                            {/* − y + grandes, y el número se puede escribir. En un
                                menú, lo que sube se le resta al primero
                                (`cambiarCantidad()`). */}
                            <div className="flex items-center gap-2">
                              <button type="button" className="boton h-11 w-11 text-xl" aria-label="Uno menos"
                                onClick={() => setLineas(cambiarCantidad(vistas, i, l.cantidad - 1, datos.menus, invitados))}>−</button>
                              <input type="number" min={0} value={l.cantidad}
                                onChange={(e) => setLineas(cambiarCantidad(vistas, i,
                                  Number(e.target.value) || 0, datos.menus, invitados))}
                                className={`${ENTRADA} h-11 !w-20 text-center text-[17px] font-bold`} />
                              <button type="button" className="boton h-11 w-11 text-xl" aria-label="Uno más"
                                onClick={() => setLineas(cambiarCantidad(vistas, i, l.cantidad + 1, datos.menus, invitados))}>+</button>
                            </div>
                          </Campo>
                          )}
                          {l.precioUF > 0 ? (
                            <Campo etiqueta={`Precio en UF${l.ivaIncluido ? ' (con IVA)' : ' (+ IVA)'}`} ancho="w-auto" ayuda="precioLinea">
                              <input type="text" inputMode="decimal" defaultValue={String(l.precioUF).replace('.', ',')}
                                onBlur={(e) => cambiarLinea(i, { precioUF: aPrecio(e.target.value) || l.precioUF })}
                                className={`${ENTRADA} !w-28`} />
                              <p className="mt-1 text-[13px] text-hueso/70">
                                {uf ? <>= {enPesos(l.precio)} con la UF del {fechaUF}</>
                                  : <span className="font-semibold text-ambar-texto">Sin UF todavía</span>}
                              </p>
                            </Campo>
                          ) : (
                          <Campo etiqueta={`Precio${l.ivaIncluido ? ' (con IVA)' : ' (+ IVA)'}`} ancho="w-48" ayuda="precioLinea">
                            <input type="number" min={0} step={500} value={l.precio || ''} placeholder="0"
                              onChange={(e) => cambiarLinea(i, { precio: Number(e.target.value) || 0 })}
                              className={ENTRADA} />
                          </Campo>
                          )}
                          <div>
                            <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                              Descuento <AyudaCorta tema="descuentoLinea" />
                            </p>
                            <div className="flex gap-1.5">
                              {[0, ...datos.descuentos].map((d) => (
                                <button key={d} type="button" onClick={() => cambiarLinea(i, { descuento: d })}
                                  className={`boton boton-angosto min-h-[40px] ${l.descuento === d
                                    ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                                  {d ? `${d}%` : 'Sin'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <span className="ml-auto text-[16px] font-bold tabular-nums">
                            {enPesos(totalDeLinea(l))}
                            <span className="ml-1 text-[13px] font-normal text-hueso/60">
                              {l.ivaIncluido ? 'con IVA' : '+ IVA'}
                            </span>
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* **La UF de la cotización** (2026-11-10): fija, para que la cifra
                que recibió el cliente no se mueva sola. Se cambia a mano. */}
            {hayUF && (
              <div className="flex flex-wrap items-center gap-3 rounded border border-hueso/15 bg-panel
                              px-3 py-2 text-[14px]">
                {uf ? <span>UF del {fechaUF}: <strong>{enPesos(uf)}</strong></span>
                  : <span className="font-semibold text-ambar-texto">
                      No se pudo leer la UF: las líneas en UF quedan en $0.</span>}
                {fechaUF !== datos.hoy && (
                  <button type="button" className="boton" onClick={() => void traerUF()}>
                    Usar la UF de hoy
                  </button>
                )}
                <AyudaCorta tema="ufCotizacion" />
              </div>
            )}

            {/* **Los menús tienen que sumar los invitados** (2026-11-10). Cada
                menú nuevo toma solo los que faltan; si igual no calzan, se
                dice en ámbar, sin bloquear: puede que cambien los invitados. */}
            {invitados > 0 && enMenus > 0 && enMenus !== invitados && (
              <p className="rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                            font-semibold text-ambar-texto">
                Los menús suman {enMenus} {enMenus === 1 ? 'persona' : 'personas'} y los
                invitados son {invitados}.{' '}
                {enMenus > invitados ? 'Baja la cantidad de algún menú.' : `Faltan ${invitados - enMenus} en los menús.`}
              </p>
            )}
            {invitados > 0 && enMenus === invitados && (
              <p className="text-[14px] font-semibold text-verde-texto">
                ✓ Los menús suman los {invitados} invitados.
              </p>
            )}

            {/* Las cuentas, como en una cotización: neto, descuento, IVA y total. */}
            <div className="rounded border border-oro/40 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                  Descuento sobre el total
                </span>
                <AyudaCorta tema="descuentoTotal" />
                {[0, ...datos.descuentos].map((d) => (
                  <button key={d} type="button" onClick={() => setDescuento(d)}
                    className={`boton boton-angosto min-h-[40px] ${descuento === d
                      ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                    {d ? `${d}%` : 'Sin'}
                  </button>
                ))}
              </div>
              <dl className="ml-auto max-w-xs space-y-1 text-[15px] tabular-nums">
                <div className="flex justify-between"><dt>Neto</dt><dd>{enPesos(cuentas.subtotal)}</dd></div>
                {cuentas.descuento > 0 && (
                  <div className="flex justify-between text-rojo-texto">
                    <dt>Descuento {descuento}%</dt><dd>−{enPesos(cuentas.descuento)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>IVA {Math.round(IVA * 100)}%</dt><dd>{enPesos(cuentas.iva)}</dd>
                </div>
                <div className="flex justify-between border-t border-hueso/20 pt-1 text-[20px] font-bold">
                  <dt>Total</dt><dd className="text-oro">{enPesos(cuentas.total)}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {p && puedeEditar && (autoActivo
                ? <AvisoGuardado estado={auto.estado} error={auto.error} onReintentar={() => void auto.reintentar()} />
                : <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => void guardar()} />)}
            </div>

            {/* **¿Otra versión?** (2026-11-11, lo pidió el cliente: que crear
                una alternativa esté más presente). Al final de los productos,
                que es donde se decide si conviene ofrecer otra. */}
            {p && puedeEditar && !grupoGanado && !cancelada && (
              <div className="rounded-xl border-2 border-dashed border-oro/50 bg-oro/[0.05] p-4">
                <p className="text-[17px] font-bold">¿Le ofreces otra versión?</p>
                <p className="mt-1 text-[14px] text-hueso/75">
                  Copia esta tal cual —menús, precios y descuentos— para que cambies lo que difiere.
                  Se mandan todas juntas en un solo link, y el cliente elige.
                </p>
                <button type="button" disabled={guardando} onClick={() => void duplicar(3)}
                  className="boton mt-3 min-h-[52px] w-full !border-oro text-[16px] font-bold sm:w-auto">
                  + Crear alternativa {siguienteLetra}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- 4. Enviar ---------- */}
        {paso === 4 && (
          <div className="space-y-4">
            <div className="rounded border border-hueso/15 bg-panel p-3 text-[15px]">
              <p className="font-semibold">{cliente?.nombre ?? 'Sin cliente'}</p>
              <p className="text-hueso/75">
                {fechaReal ? <span className="first-letter:uppercase inline-block">{enPalabras(fechaReal)}</span>
                  : periodo || 'Sin fecha'}
                {invitados > 0 && <> · {invitados} invitados</>}
                {tipoEvento && <> · {tipoEvento}</>}
              </p>
              <p className="mt-1 text-[20px] font-bold text-oro">{enPesos(cuentas.total)}</p>
              {enElLink.length > 1 && !ganada && (
                <p className="mt-2 rounded-lg border border-oro/40 bg-oro/[0.06] px-3 py-2 text-[15px]">
                  <strong>En el link van {enElLink.length} alternativas:</strong> {resumenLink}.
                  <span className="block text-[14px] text-hueso/75">
                    Se mandan juntas; cuando el cliente decida, eliges con cuál se quedó.
                  </span>
                </p>
              )}
            </div>

            {/* **El camino y el próximo hito** (2026-11-11, lo pidió el
                cliente: *"marcar ganada debe ser un botón realmente más
                grande… aquí cumplimos un hito"*). Arriba se ve por dónde va;
                debajo, un solo bloque grande con lo que toca ahora. */}
            {p && !cancelada && <Camino pasos={camino} />}

            {cancelada && p && (
              <BloqueCancelada p={p} cobros={cobros} puedePagar={puedePagar}
                onCobros={(c) => { setCobros(c); onCambio(); }} />
            )}



            <fieldset disabled={cancelada} className="min-w-0 space-y-4">
            {/* ---------- Documento ---------- */}
            <Seccion tono="neutro" icono="🧾" titulo="Documento">
            {/* **El documento de la venta** (2026-11-10). Nace por definir;
                apretar el elegido lo vuelve a dejar por definir. Por ahora
                no cambia el precio. Con factura pide los datos de
                facturación, que se guardan en la ficha del cliente. */}
            <div>
              <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Documento de la venta <AyudaCorta tema="documento" />
              </p>
              <Elegir etiqueta="Documento de la venta" opciones={Object.values(DOCUMENTO)}
                valor={documento} onElegir={(v) => setDocumento(documentoDe(v))} />
              {!documento && <p className="mt-1.5 text-[14px] text-hueso/70">Por definir.</p>}
              {documento === DOCUMENTO.factura && (
                <div className="mt-3 rounded border border-hueso/15 bg-panel p-3">
                  <p className="mb-2 text-[14px] text-hueso/75">
                    Datos de facturación. Se guardan en la ficha del cliente.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {([
                      ['empresa', 'Razón social', 'Como aparece en el SII'],
                      ['rut', 'RUT', '76.123.456-7'],
                      ['giro', 'Giro', 'Actividad de la empresa'],
                      ['domicilio', 'Dirección', 'Calle, número, comuna']
                    ] as const).map(([k, etiqueta, ejemplo]) => (
                      <label key={k} className="block">
                        <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                          {etiqueta}
                        </span>
                        {k === 'rut' ? (
                          <CampoRut valor={facturacion.rut} placeholder={ejemplo} className={ENTRADA}
                            onCambio={(v) => setFacturacion({ ...facturacion, rut: v })} />
                        ) : (
                          <input value={facturacion[k]} placeholder={ejemplo} className={ENTRADA}
                            onChange={(e) => setFacturacion({ ...facturacion, [k]: e.target.value })} />
                        )}
                      </label>
                    ))}
                  </div>
                  {faltaParaFactura(facturacion).length > 0 && (
                    <p className="mt-3 rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                                  font-semibold text-ambar-texto">
                      Para facturarle falta: {faltaParaFactura(facturacion).join(', ')}.
                    </p>
                  )}
                </div>
              )}
            </div>


            </Seccion>
            </fieldset>

            {/* ---------- El pago: condiciones y cobros ---------- */}
            <Seccion tono="verde" icono="💰" titulo="El pago">
            <fieldset disabled={cancelada} className="min-w-0">
            {/* **Las condiciones de pago** (2026-11-10). En blanco rige
                Configuración; cada cotización las puede negociar. Las
                calcula `condicionesDe()`, la misma que usa el documento. */}
            <div>
              <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Condiciones <AyudaCorta tema="condicionesPago" />
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-[13px] text-hueso/70">Anticipo %</span>
                  <input type="number" min={0} max={100} value={anticipoTxt} className={`${ENTRADA} w-24`}
                    placeholder={String(datos.condiciones?.anticipoPct ?? 30)} disabled={cond.fijo}
                    onChange={(e) => setAnticipoTxt(e.target.value)} />
                </label>
                {/* **O un monto acordado** (2026-11-12, lo pidió el cliente:
                    *"págame 500 más"*). Si se escribe, manda sobre el %. */}
                <label className="block">
                  <span className="mb-1 block text-[13px] text-hueso/70">o un monto acordado</span>
                  <span className="flex items-center gap-1">
                    <span className="text-[15px] text-hueso/70">$</span>
                    <input inputMode="numeric" value={anticipoMontoTxt ? Number(anticipoMontoTxt).toLocaleString('es-CL') : ''}
                      className={`${ENTRADA} w-36`} placeholder="ej. 500.000"
                      onChange={(e) => setAnticipoMontoTxt(e.target.value.replace(/[^\d]/g, ''))} />
                    {cond.fijo && (
                      <button type="button" className="boton min-h-[44px]" onClick={() => setAnticipoMontoTxt('')}>
                        Volver al %
                      </button>
                    )}
                  </span>
                </label>
                <button type="button" aria-pressed={cond.pct === 0}
                  onClick={() => { setAnticipoMontoTxt(''); setAnticipoTxt(cond.pct === 0 ? '' : '0'); }}
                  className={`boton min-h-[44px] ${cond.pct === 0 ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
                  Sin anticipo
                </button>
                <label className="block">
                  <span className="mb-1 block text-[13px] text-hueso/70">Saldo, días antes</span>
                  <input type="number" min={0} max={365} value={saldoTxt} className={`${ENTRADA} w-24`}
                    placeholder={String(datos.condiciones?.saldoDias ?? 3)}
                    onChange={(e) => setSaldoTxt(e.target.value)} />
                </label>
              </div>
              <p className="mt-2 text-[15px]">
                {cond.pct > 0
                  ? <>Anticipo {cond.fijo ? 'acordado' : `${cond.pct}%`}: <strong>{enPesos(cond.anticipo)}</strong> para reservar la fecha · Saldo <strong>{enPesos(cond.saldo)}</strong></>
                  : <>Sin anticipo · Todo <strong>{enPesos(cond.saldo)}</strong></>}
                {cond.saldoHasta
                  ? <> hasta el {enPalabras(cond.saldoHasta)}.</>
                  : <>, {cond.dias} días antes del evento.</>}
              </p>
            </div>

            </fieldset>
            {/* **Los cobros al cliente**: se anotan los pagos, no una
                casilla. Lo normal es un toque —anticipo recibido, o todo—;
                otro monto abre un campo. Un cobro anotado por error se
                deshace. */}
            <div className="border-t border-verde/25 pt-3">
              <p className="text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Pagos del cliente <AyudaCorta tema="pagosCliente" />
              </p>
              {!p ? (
                <p className="mt-1 text-[14px] text-hueso/70">Guarda la cotización para anotar sus pagos.</p>
              ) : (
                <>
                  <p className="mt-1 text-[15px]">
                    Pagado <strong>{enPesos(cobrado.pagado)}</strong>
                    {cobrado.falta > 0 && <> · Falta <strong>{enPesos(cobrado.falta)}</strong></>}
                    {cobrado.completo && <span className="ml-2 rounded-full border border-verde/50 px-2 py-0.5
                      text-[13px] font-semibold text-verde-texto">✓ Pagado completo</span>}
                  </p>
                  {!otraGanada && cobrosOtras.length > 0 && (
                    <div className="mt-2 rounded-lg border border-cielo-fuerte/50 bg-cielo/10 px-3 py-2 text-[14px]">
                      <p className="font-semibold">Anotado en otra alternativa, cuenta para esta:</p>
                      <ul className="mt-1">
                        {cobrosOtras.map((c) => {
                          const a = alternativas.find((x) => x.id === c.presupuesto);
                          return (
                            <li key={c.id}>
                              {c.concepto} <strong>{enPesos(c.monto)}</strong> · {c.fecha}
                              {a ? ` · en la ${letraDe(a, alternativas)}` : ''}
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-1 text-[13px] text-hueso/75">Al marcar ganada esta alternativa, esos pagos pasan a ella.</p>
                    </div>
                  )}
                  {cobros.length > 0 && (
                    <ul className="mt-2 divide-y divide-hueso/10 border-y border-hueso/10">
                      {cobros.map((c) => (
                        <li key={c.id} className="py-2.5 text-[14px]">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold">{c.concepto}</span>
                            <span className={c.monto < 0 ? 'text-rojo-texto' : ''}>
                              {c.monto < 0 ? `−${enPesos(-c.monto)}` : enPesos(c.monto)}
                            </span>
                            <span className="text-hueso/70">{c.fecha}{c.medio && ` · ${c.medio}`}
                              {c.registradoPor && ` · ${c.registradoPor}`}</span>
                            {/* **La revisión**, por forma además de color:
                                verde relleno revisado, ámbar con borde sin revisar. */}
                            {c.revisadoPor ? (
                              <span className="rounded-full border border-verde-fuerte bg-verde/15 px-2 py-0.5
                                               text-[13px] font-semibold text-verde-texto">
                                ✓ Revisado por {c.revisadoPor}
                              </span>
                            ) : (
                              <span className="rounded-full border border-ambar/60 px-2 py-0.5 text-[13px]
                                               font-semibold text-ambar-texto">sin revisar</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {/* El comprobante: se ve a través del panel, nunca por un link público. */}
                            {c.comprobante ? (
                              <a href={`/api/presupuestos/cobros/comprobante?id=${encodeURIComponent(c.id)}`}
                                target="_blank" rel="noopener" className="boton tecla">📎 Ver comprobante</a>
                            ) : null}
                            {puedeEditar && (
                              <label className={`boton tecla cursor-pointer ${subiendo === c.id ? 'opacity-60' : ''}`}>
                                {subiendo === c.id ? 'Subiendo…'
                                  : c.comprobante ? 'Cambiar comprobante' : '📎 Subir comprobante'}
                                <input type="file" accept="image/*,application/pdf" className="sr-only"
                                  disabled={subiendo !== ''}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) void subirComprobante(c, f);
                                  }} />
                              </label>
                            )}
                            {puedePagar && (
                              <button type="button" disabled={revisando !== ''}
                                onClick={() => void revisar(c, !c.revisadoPor)}
                                className={`boton ${c.revisadoPor ? '' : '!border-verde-fuerte text-verde-texto hover:bg-verde/10'}`}>
                                {revisando === c.id ? 'Guardando…'
                                  : c.revisadoPor ? 'Quitar revisión' : '✓ Marcar revisado'}
                              </button>
                            )}
                            {/* Una devolución la deshace solo quien paga: la anotó él. */}
                            {puedeEditar && (!c.revisadoPor || puedePagar)
                              && (c.concepto !== CONCEPTO_COBRO.devolucion || puedePagar) && (
                              <button type="button" onClick={() => void deshacerCobro(c)}
                                className="boton hover:border-rojo-fuerte hover:text-rojo-texto">Deshacer</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {errorPagos && (
                    <p role="alert" className="mt-2 rounded border border-rojo-fuerte/60 bg-rojo/10 px-3 py-2
                                               text-[14px] font-semibold text-rojo-texto">{errorPagos}</p>
                  )}
                  {puedeEditar && !cancelada && cobrado.falta > 0 && (
                    <div className="mt-3 space-y-2">
                      <input value={medio} onChange={(e) => setMedio(e.target.value)}
                        placeholder="Cómo pagó: transferencia, efectivo… (opcional)"
                        className={`${ENTRADA} sm:w-96`} />
                      <div className="flex flex-wrap gap-2">
                        {cobrado.faltaAnticipo > 0 && (
                          <button type="button" disabled={guardando}
                            onClick={() => void cobrar(cobrado.faltaAnticipo, 'Anticipo')}
                            className="boton min-h-[44px] !border-verde-fuerte text-verde-texto hover:bg-verde/10">
                            ✓ Anticipo recibido · {enPesos(cobrado.faltaAnticipo)}
                          </button>
                        )}
                        <button type="button" disabled={guardando}
                          onClick={async () => {
                            // Pagar todo de una son dos cobros: el anticipo y el saldo.
                            if (cobrado.faltaAnticipo > 0) await cobrar(cobrado.faltaAnticipo, 'Anticipo');
                            const resto = cobrado.falta - cobrado.faltaAnticipo;
                            if (resto > 0) await cobrar(resto, 'Saldo');
                          }}
                          className="boton min-h-[44px] !border-verde-fuerte text-verde-texto hover:bg-verde/10">
                          ✓ Pagó todo · {enPesos(cobrado.falta)}
                        </button>
                        <button type="button" onClick={() => setOtroMonto({ monto: '', concepto: 'Otro' })}
                          className="boton min-h-[44px]">Otro monto</button>
                      </div>
                      {otroMonto && (
                        <div className="flex flex-wrap items-end gap-2">
                          <input type="text" inputMode="numeric" value={otroMonto.monto} autoFocus
                            placeholder="Monto" className={`${ENTRADA} w-36`}
                            onChange={(e) => setOtroMonto({ ...otroMonto, monto: e.target.value })} />
                          <Elegir etiqueta="Concepto" opciones={['Anticipo', 'Saldo', 'Otro']}
                            valor={otroMonto.concepto}
                            onElegir={(v) => setOtroMonto({ ...otroMonto, concepto: v || 'Otro' })} />
                          <button type="button" disabled={guardando || !montoCobro(otroMonto.monto)}
                            onClick={() => void cobrar(montoCobro(otroMonto.monto), otroMonto.concepto)}
                            className="boton min-h-[44px]">Anotar</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            </Seccion>

            {/* **Primero el documento y el pago; al final, mandarla y el seguimiento**
                (2026-11-12, lo pidió el cliente). Mientras no se mande, el cuadro
                de mandarla va antes del seguimiento, que recién corre después. */}
            {mandarPrimero && hitoEnvio}

            {/* ---------- Seguimiento ---------- */}
            {!cancelada && (
            <Seccion tono="rosa" icono="📨" titulo="Seguimiento y envío" ayuda="seguimiento">
            {/* **Sin botones de estado** (2026-11-12, lo pidió el cliente:
                *"se dobla información"*). El camino de arriba ya dice en qué
                va, y los botones *Candidato · Borrador · Enviada…* lo
                repetían; peor, apretar el marcado lo devolvía a Borrador sin
                avisar y con eso desaparecía *Marcar ganada*. Ahora el estado
                avanza solo con acciones: *Sí, la mandé* (Enviada), *Están
                negociando*, *Se perdió…* y *Marcar ganada*. */}
            {!ganada && estado === ESTADO_PRESUPUESTO.rechazado ? (
              <div className="rounded-lg border-2 border-hueso/25 p-3">
                <p className="text-[16px] font-bold">Se perdió</p>
                <p className="mb-1 mt-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                  Por qué
                </p>
                <Elegir etiqueta="Motivo" opciones={MOTIVOS_PERDIDA} valor={motivo} onElegir={setMotivo} />
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="u otro motivo" className={`${ENTRADA} mt-2 sm:w-80`} />
                {puedeEditar && (
                  <button type="button" className="boton mt-3 min-h-[44px]"
                    onClick={() => { setEstado(p?.enviada ? ESTADO_PRESUPUESTO.enviado : ESTADO_PRESUPUESTO.borrador); setMotivo(''); }}>
                    No se perdió: volver a abrirla
                  </button>
                )}
              </div>
            ) : !ganada && puedeEditar && p && (
              <div className="flex flex-wrap items-center gap-2">
                {estado === ESTADO_PRESUPUESTO.negociacion && (
                  <span className="rounded-full border-2 border-ambar/60 bg-ambar/10 px-3 py-1 text-[14px]
                                   font-semibold text-ambar-texto">En negociación</span>
                )}
                {estado === ESTADO_PRESUPUESTO.enviado && (
                  <button type="button" className="boton min-h-[44px]"
                    onClick={() => setEstado(ESTADO_PRESUPUESTO.negociacion)}>Están negociando</button>
                )}
                {/* **Deshacer un "Sí, la mandé" apretado por error** (2026-11-12,
                    lo pidió el cliente). Vuelve a Borrador, junto con las
                    alternativas del grupo, y el servidor borra la fecha de
                    envío y la vigencia: corren de nuevo cuando de verdad se
                    mande. */}
                {estado === ESTADO_PRESUPUESTO.enviado && (
                  <button type="button" className="boton min-h-[44px]"
                    onClick={() => {
                      if (confirm('¿Todavía no se mandó? Vuelve a Borrador: deja de contar en el calendario y su vigencia corre de nuevo cuando la mandes.')) {
                        setEstado(ESTADO_PRESUPUESTO.borrador);
                      }
                    }}>Todavía no se mandó</button>
                )}
                <button type="button" className="boton min-h-[44px] hover:!border-rojo-fuerte hover:text-rojo-texto"
                  onClick={() => setEstado(ESTADO_PRESUPUESTO.rechazado)}>Se perdió…</button>
                <AyudaCorta tema="estadoCotizacion" />
              </div>
            )}



              {renegociando && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ambar/50
                                bg-ambar/10 px-3 py-2 text-[15px]">
                  <span className="flex-1 font-semibold text-ambar-texto">
                    Cambiaste una cotización ya enviada. ¿Están negociando?
                    <span className="block text-[14px] font-normal text-hueso/75">
                      El cliente ve lo nuevo en el mismo link.
                    </span>
                  </span>
                  <button type="button" className="boton min-h-[44px]"
                    onClick={() => setEstado(ESTADO_PRESUPUESTO.negociacion)}>Pasar a Negociación</button>
                </div>
              )}
              {p && (p.enviada || p.validoHasta) && (
                <p className="text-[14px] text-hueso/75">
                  {p.enviada ? <>Enviada el {enPalabras(p.enviada)}. </> : null}
                  {p.validoHasta ? <>Vigente hasta el {enPalabras(p.validoHasta)}.</> : null}
                </p>
              )}
              {p && !mandada && !ganada && (
                <p className="text-[14px] text-hueso/75">
                  Todavía no se manda: no vence y no aparece en el calendario de reservas.
                </p>
              )}
              {/* Antes de mandarla, los botones están en el próximo paso, grandes;
                  acá aparecen después, para volver a mandarla. Dos veces en la
                  misma pantalla era no saber cuál apretar. */}
              {p && (mandada || ganada) && (
                <div>
                  <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                    Mandarla de nuevo
                  </p>
                  <BotonesMandar link={link} whatsapp={whatsapp} correo={correo} onMandar={mandar} />
                </div>
              )}
              {!ganada && !cancelada && (
                <div>
                  <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                    Recordarme
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    {([
                      ['Sin respuesta, a los días', segTxt, setSegTxt, datos.seguimiento?.dias ?? 5, 'seguimientoDias'],
                      ['Días antes del evento', avisoTxt, setAvisoTxt, datos.seguimiento?.antesEvento ?? 14, 'avisoEvento']
                    ] as const).map(([etiqueta, valor, poner, defecto, ayuda]) => (
                      <label key={etiqueta} className="block">
                        <span className="mb-1 block text-[13px] text-hueso/70">{etiqueta}<AyudaCorta tema={ayuda} /></span>
                        <input type="number" min={0} max={365} value={valor} className={`${ENTRADA} w-24`}
                          placeholder={String(defecto)} onChange={(e) => poner(e.target.value)} />
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[13px] text-hueso/65">En blanco rige Configuración. En 0 no pregunta.</p>
                </div>
              )}
            </Seccion>
            )}

            {/* **El próximo paso va al final** (2026-11-11, lo pidió el
                cliente: *"primero hacemos el seguimiento, los datos… y de ahí
                te ofrezco marcar como ganado"*). Cada uno de los dos pasos
                del final —Envío y Contrato— cierra con el suyo. */}
            {p && !cancelada && !mandarPrimero && hitoEnvio}

            {/* **Lo secundario va abajo, chico y separado**: guardar ya es
                solo y borrar es peligroso. Nunca al lado del hito. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-hueso/10 pt-3">
              {!cancelada && (autoActivo
                ? <AvisoGuardado estado={auto.estado} error={auto.error} onReintentar={() => void auto.reintentar()} />
                : <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => void guardar()} />)}
              <span className="flex-1" />
              {ganada && !cancelada && puedeEditar && (
                <span className="inline-flex items-center">
                  <button type="button" disabled={guardando} onClick={() => setCorrigiendo(true)}
                    className="boton">Corregir la ganada</button>
                  <AyudaCorta tema="corregirGanada" />
                </span>
              )}
              {p && !ganada && puedeEditar && (
                <button type="button" onClick={() => void borrar()}
                  className="boton hover:border-rojo-fuerte hover:text-rojo-texto">
                  Borrar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---------- 5. Contrato (2026-11-11) ----------
            Lo pidió el cliente: separar la cotización del contrato, que son
            dos conversaciones con el cliente. Termina en su propio hito. */}
        {paso === 5 && (
          <div className="space-y-4">
            <div className="rounded border border-hueso/15 bg-panel p-3 text-[15px]">
              <p className="font-semibold">{cliente?.nombre ?? 'Sin cliente'}</p>
              <p className="text-hueso/75">
                {fechaReal ? <span className="first-letter:uppercase inline-block">{enPalabras(fechaReal)}</span>
                  : periodo || 'Sin fecha'}
                {invitados > 0 && <> · {invitados} invitados</>}
                {tipoEvento && <> · {tipoEvento}</>}
              </p>
              <p className="mt-1 text-[20px] font-bold text-oro">{enPesos(cuentas.total)}</p>
            </div>

            {p && !cancelada && <Camino pasos={camino} />}

            {/* **El contrato es de la alternativa que está abierta** (2026-11-12,
                lo pidió el cliente: *"la que se eligió pasa a contrato"*). Ya
                no hay un paso aparte de elegir: mandar el contrato desde la B
                es mandar el de la B, y ganarla —con el anticipo o con ese
                contrato firmado— la elige y deja las otras No elegida. */}
            {porElegir && (
              <p className="rounded-lg border-2 border-oro/50 bg-oro/[0.06] px-3 py-2 text-[15px]">
                <strong>Este contrato es de la alternativa {letra}</strong>
                {' '}({enPesos(cuentas.total)}). Si el cliente se quedó con otra, ábrela arriba y
                manda el contrato desde esa.
              </p>
            )}

            <fieldset disabled={cancelada} className="min-w-0 space-y-4">
            {/* **El contrato** (Fase 4, 2026-11-10). Sale de la cotización:
                el precio, las condiciones de pago y el cliente de su ficha.
                Se firma en papel y se sube el firmado, que va a Drive. Lo
                único que se escribe acá es lo que la cotización no sabe. */}
            <Seccion tono="cielo" icono="📄" titulo="El contrato" ayuda="contrato">
              {!p ? (
                <p className="mt-1 text-[14px] text-hueso/70">Guarda la cotización para armar su contrato.</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {firmado ? (
                    <p className="text-[15px]">
                      <span className="rounded-full border border-verde-fuerte bg-verde/15 px-2.5 py-1
                                       font-semibold text-verde-texto">✓ Contrato firmado</span>
                      <span className="ml-2 text-[14px] text-hueso/70">
                        subido{firmado.por && ` por ${firmado.por}`}{firmado.cuando && ` el ${firmado.cuando.slice(0, 10)}`}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[15px]">
                      <span className="rounded-full border border-ambar/60 px-2.5 py-1 font-semibold
                                       text-ambar-texto">Sin firmar</span>
                      <span className="ml-2 text-[14px] text-hueso/70">
                        {contratoEnviado
                          ? <>Enviado el {enPalabras(contratoEnviado)}: falta que vuelva firmado.</>
                          : 'Se manda, se firma en dos ejemplares y se sube el firmado.'}
                      </span>
                    </p>
                  )}
                  {firmado && (
                    <p className="text-[14px] text-hueso/75">
                      Si cambias la cotización, el contrato del link deja de coincidir con el
                      firmado: el que vale es el papel.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Con factura, el RUT y la dirección ya se piden arriba:
                        son los mismos de la ficha, no se piden dos veces. */}
                    {documento !== DOCUMENTO.factura && ([
                      ['rut', 'RUT del cliente', '12.345.678-9'],
                      ['domicilio', 'Domicilio del cliente', 'Calle, número, comuna']
                    ] as const).map(([k, etiqueta, ejemplo]) => (
                      <label key={k} className="block">
                        <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                          {etiqueta}
                        </span>
                        {k === 'rut' ? (
                          <CampoRut valor={facturacion.rut} placeholder={ejemplo} className={ENTRADA}
                            onCambio={(v) => setFacturacion({ ...facturacion, rut: v })} />
                        ) : (
                          <input value={facturacion[k]} placeholder={ejemplo} className={ENTRADA}
                            onChange={(e) => setFacturacion({ ...facturacion, [k]: e.target.value })} />
                        )}
                      </label>
                    ))}
                    <div className="sm:col-span-2">
                      <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                        Horario del evento
                      </span>
                      <ElegirHorario valor={horario} onCambio={setHorario}
                        deSiempre={datos.contrato?.horario ?? '13:00 a 18:00'} />
                    </div>
                  </div>
                  <p className="text-[13px] text-hueso/60">
                    {documento === DOCUMENTO.factura
                      ? 'El RUT y el domicilio son los de los datos de facturación.'
                      : 'El RUT y el domicilio se guardan en la ficha del cliente.'}
                  </p>

                  <button type="button" aria-pressed={ley20393} onClick={() => setLey20393(!ley20393)}
                    className={`boton min-h-[44px] h-auto max-w-full !whitespace-normal py-2 text-left
                      ${ley20393 ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
                    <span>
                      {ley20393 ? '✓ ' : ''}Cláusula de la Ley 20.393{' '}
                      <span className="font-normal text-hueso/70">(la piden las empresas grandes)</span>
                    </span>
                  </button>
                  <AyudaCorta tema="ley20393" />

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                      Acuerdos adicionales <AyudaCorta tema="acuerdos" />
                    </span>
                    <textarea value={acuerdos} rows={2} className={ENTRADA}
                      placeholder="Lo acordado aparte con el cliente. Va como la última cláusula."
                      onChange={(e) => setAcuerdos(e.target.value)} />
                  </label>

                  {/* **Cambios de fecha y cancelación** (2026-11-11): lo que
                      se negocia con el cliente. En blanco rige Configuración.
                      El contrato lo imprime y *Cancelar evento* lo aplica. */}
                  <div className="rounded-lg border border-ambar/40 bg-ambar/5 p-3">
                    <p className="mb-2 text-[14px] font-bold uppercase tracking-wide text-ambar-texto">
                      Cambios de fecha y cancelación
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      {([
                        ['Cambios de fecha', cambiosTxt, setCambiosTxt, 10, datos.contrato?.tranquilidad?.cambiosFecha ?? 2, 'cambiosFecha'],
                        ['Cancela hasta, días antes', cancelTxt, setCancelTxt, 365, datos.contrato?.tranquilidad?.cancelacionDias ?? 60, 'cancelacionDias'],
                        ['Devuelve, % de lo pagado', reembolsoTxt, setReembolsoTxt, 100, datos.contrato?.tranquilidad?.reembolsoPct ?? 20, 'reembolso']
                      ] as const).map(([etiqueta, valor, poner, max, defecto, ayuda]) => (
                        <label key={etiqueta} className="block">
                          <span className="mb-1 block text-[13px] text-hueso/70">{etiqueta}<AyudaCorta tema={ayuda} /></span>
                          <input type="number" min={0} max={max} value={valor} className={`${ENTRADA} w-24`}
                            placeholder={String(defecto)} onChange={(e) => poner(e.target.value)} />
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[14px] text-hueso/75">
                      {frasesCancelacion({
                        cambiosFecha: numeroONulo(cambiosTxt, 10) ?? datos.contrato?.tranquilidad?.cambiosFecha ?? 2,
                        cancelacionDias: numeroONulo(cancelTxt, 365) ?? datos.contrato?.tranquilidad?.cancelacionDias ?? 60,
                        reembolsoPct: numeroONulo(reembolsoTxt, 100) ?? datos.contrato?.tranquilidad?.reembolsoPct ?? 20
                      })}
                      {' '}En blanco rige Configuración. Va al contrato.
                    </p>
                  </div>

                  {(faltaDelCliente(facturacion).length > 0
                    || (datos.contrato?.faltaEmpresa.length ?? 0) > 0 || !esFecha(fechaReal)) && (
                    <div className="rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                                    font-semibold text-ambar-texto">
                      {!esFecha(fechaReal) && <p>Al contrato le falta el día del evento.</p>}
                      {faltaDelCliente(facturacion).length > 0 && (
                        <p>Al cliente le falta: {faltaDelCliente(facturacion).join(' y ')}.</p>
                      )}
                      {(datos.contrato?.faltaEmpresa.length ?? 0) > 0 && (
                        <p>En Configuración falta: {datos.contrato?.faltaEmpresa.join(', ')}.</p>
                      )}
                      <p className="font-normal">Se puede imprimir igual: lo que falta sale con una raya para completar a mano.</p>
                    </div>
                  )}

                  {(contratoEnviado || firmado) ? (
                    <div>
                      <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                        Mandar el contrato de nuevo <AyudaCorta tema="mandarContrato" />
                      </p>
                      <BotonesMandar link={linkContrato} whatsapp={whatsappContrato} correo={correoContrato}
                        onMandar={(v) => mandar(v, 'contrato')} ver="📄 Ver el contrato" />
                    </div>
                  ) : linkContrato && (
                    <a href={linkContrato} target="_blank" rel="noreferrer" className="tecla boton min-h-[44px]">
                      📄 Ver el contrato
                    </a>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {firmado && (
                      <a href={`/api/presupuestos/contrato?id=${encodeURIComponent(p.id)}`}
                        target="_blank" rel="noopener" className="tecla boton min-h-[44px]">📎 Ver el firmado</a>
                    )}
                    {puedeEditar && firmado && (
                      <label className={`boton tecla min-h-[44px] cursor-pointer ${subiendoContrato ? 'opacity-60' : ''}
                        ${firmado ? '' : '!border-verde-fuerte text-verde-texto hover:bg-verde/10'}`}>
                        {subiendoContrato ? 'Subiendo…' : firmado ? 'Cambiar el firmado' : '📎 Subir contrato firmado'}
                        <input type="file" accept="image/*,application/pdf" className="sr-only"
                          disabled={subiendoContrato}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void subirContrato(f);
                          }} />
                      </label>
                    )}
                    {firmado && puedeEditar && (
                      <button type="button" onClick={() => void quitarContrato()}
                        className="boton min-h-[44px] hover:border-rojo-fuerte hover:text-rojo-texto">Quitar</button>
                    )}
                  </div>
                </div>
              )}
            </Seccion>

            </fieldset>

            {p && !cancelada && hitoContrato}

            <div className="flex flex-wrap items-center gap-2 border-t border-hueso/10 pt-3">
              {!cancelada && (autoActivo
                ? <AvisoGuardado estado={auto.estado} error={auto.error} onReintentar={() => void auto.reintentar()} />
                : <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => void guardar()} />)}
              <span className="flex-1" />
              {ganada && !cancelada && puedeEditar && (
                <span className="inline-flex items-center">
                  <button type="button" disabled={guardando} onClick={() => setCorrigiendo(true)}
                    className="boton">Corregir la ganada</button>
                  <AyudaCorta tema="corregirGanada" />
                </span>
              )}
              {ganada && !cancelada && puedeEditar && (
                <span className="inline-flex items-center">
                  <button type="button" disabled={guardando} onClick={() => setCancelando(true)}
                    className="boton hover:!border-rojo-fuerte hover:text-rojo-texto">
                    Cancelar evento
                  </button>
                  <AyudaCorta tema="cancelarEvento" />
                </span>
              )}
            </div>
          </div>
        )}
      </fieldset>

      {paso < 5 && (
        <PieDePaso paso={paso} guardando={guardando}
          puede={paso !== 1 || !!idCliente}
          porQueNo="Elige o crea el cliente para seguir."
          aviso={paso !== 2 || !puedeEditar ? ''
            : !p ? 'Al seguir, se crea la cotización.'
            : estado === ESTADO_PRESUPUESTO.candidato ? 'Al seguir, deja de ser candidato y pasa a borrador.'
            : ''}
          onVolver={() => void irA(paso - 1)} onSeguir={() => void irA(paso + 1)} />
      )}
      {paso === 5 && (
        <div className="mt-4 flex border-t border-hueso/10 pt-3">
          <button type="button" className="boton min-h-[48px]" onClick={() => void irA(4)}>
            ← 4 · {PASOS[3]}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}
      {preguntaEnvio && (
        <Dialogo titulo="¿La mandaste?" onCerrar={() => setPreguntaEnvio('')}>
          <p className="mt-3 text-[17px]">
            ¿Le mandaste {preguntaEnvio === 'contrato' ? 'el contrato' : 'la cotización'} a{' '}
            <strong>{cliente?.nombre ?? 'tu cliente'}</strong>?
          </p>
          <p className="mt-2 text-[14px] text-hueso/75">
            {preguntaEnvio === 'contrato'
              ? <>Queda anotado que se lo mandaste, y si no vuelve firmado te lo recuerdo arriba de Cotizaciones.</>
              : <>Pasa a <strong>Enviada</strong>: desde hoy corre su vigencia y aparece como posible
                  en el calendario de reservas.</>}
          </p>
          {/* **Si no se abrió, se abre de acá** (2026-11-12, lo reclamó el
              cliente: apretó WhatsApp y solo apareció esta pregunta). Pasa
              cuando el navegador no deja abrir otra pestaña; el mensaje se
              puede copiar y pegar a mano. */}
          {(viaEnvio === 'whatsapp' || viaEnvio === 'correo') && (() => {
            const contrato = preguntaEnvio === 'contrato';
            const url = viaEnvio === 'whatsapp' ? (contrato ? whatsappContrato : whatsapp)
              : (contrato ? correoContrato : correo);
            const texto = viaEnvio === 'whatsapp' ? (contrato ? textoWhatsappContrato : textoWhatsapp)
              : (contrato ? linkContrato : link);
            return (
              <div className="mt-4 rounded-lg border border-hueso/20 bg-hueso/[0.04] p-3">
                <p className="text-[15px] font-semibold">
                  ¿No se abrió {viaEnvio === 'whatsapp' ? 'WhatsApp' : 'el correo'}?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {url && (
                    <a href={url} target={viaEnvio === 'whatsapp' ? '_blank' : undefined} rel="noreferrer"
                      className="tecla boton min-h-[44px]">
                      {viaEnvio === 'whatsapp' ? '💬 Abrir WhatsApp de nuevo' : '✉️ Abrir el correo de nuevo'}
                    </a>
                  )}
                  {texto && (
                    <button type="button" className="boton min-h-[44px]"
                      onClick={() => copiarConAviso(texto, viaEnvio === 'whatsapp' ? 'Mensaje copiado: pégalo en WhatsApp' : 'Link copiado', 'Copia esto:')}>
                      📋 Copiar {viaEnvio === 'whatsapp' ? 'el mensaje' : 'el link'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="boton min-h-[48px]" onClick={() => setPreguntaEnvio('')}>
              Todavía no
            </button>
            <button type="button" autoFocus disabled={guardando} onClick={() => void confirmarEnvio()}
              className="boton boton-relleno min-h-[52px] px-6 text-[16px]">
              {preguntaEnvio === 'contrato' ? '✓ Sí, lo mandé' : '✓ Sí, la mandé'}</button>
          </div>
        </Dialogo>
      )}
      {/* **¿Marcarla ganada?** (2026-11-11). Sin anticipo pagado ni contrato
          firmado —una cotización con *Sin anticipo*— se puede igual, pero
          lo dice y ofrece ir a subir el contrato: *"¿tienes un contrato
          firmado? si es el caso, por favor, súbelo"*. */}
      {confirmandoGanar && p && (() => {
        const objetivo = alts.find((a) => a.id === confirmandoGanar) ?? p;
        const l = letraDe(objetivo, alternativas);
        const sinRespaldo = !ganable(objetivo).ok || (objetivo.id === p.id && !anticipoPagado && !firmado
          && cond.pct > 0);
        const otras = vivas.filter((a) => a.id !== objetivo.id);
        return (
          <Dialogo titulo={alts.length > 1 ? `¿Ganó la ${l}?` : '¿Marcarla ganada?'}
            onCerrar={() => setConfirmandoGanar('')}>
            {/* **La letra en grande** (2026-11-12, lo pidió el cliente): se
                marcó ganada la A cuando era la B. Acá se ve cuál es antes de
                apretar, con su total, y qué pasa con las demás. */}
            {alts.length > 1 && (
              <div className="mt-3 flex items-center gap-4 rounded-xl border-2 border-verde-fuerte bg-verde/10 p-3">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-verde-fuerte
                                 text-[36px] font-extrabold text-tinta">{l}</span>
                <span>
                  <span className="block text-[18px] font-bold">Alternativa {l} · {enPesos(totalAlt(objetivo))}</span>
                  <span className="block text-[15px] text-hueso/80">{genteDe(objetivo)} personas</span>
                </span>
              </div>
            )}
            <p className="mt-3 text-[16px]">
              Se crea la reserva de <strong>{genteDe(objetivo)} personas</strong> y le toma el cupo
              al {esFecha(fechaReal) ? enPalabras(fechaReal) : 'día del evento'}.
            </p>
            {otras.length > 0 && (
              <p className="mt-2 text-[15px] text-hueso/85">
                {otras.map((a) => `La ${letraDe(a, alternativas)} (${enPesos(totalAlt(a))})`).join(' y ')}{' '}
                pasa{otras.length > 1 ? 'n' : ''} a <strong>No elegida</strong>.
                {cobrosOtras.length > 0 || (objetivo.id !== p.id && cobros.length > 0)
                  ? ` Los pagos anotados en otra alternativa pasan a la ${l}.` : ''}
              </p>
            )}
            {sinRespaldo && (
              <div className="mt-3 rounded-lg border-2 border-ambar/60 bg-ambar/10 p-3 text-[15px]">
                <p className="font-bold text-ambar-texto">No tienes ningún anticipo ni contrato firmado.</p>
                <p className="mt-1 text-hueso/85">
                  ¿Tienes un contrato firmado? Si es así, súbelo al sistema antes de marcarla ganada.
                </p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="boton min-h-[48px]" onClick={() => setConfirmandoGanar('')}>
                Volver
              </button>
              {sinRespaldo && (
                <button type="button" className="boton min-h-[48px]"
                  onClick={() => { setConfirmandoGanar(''); setPaso(5); }}>
                  📎 Ir a subir el contrato
                </button>
              )}
              <button type="button" autoFocus disabled={guardando} onClick={() => void ganar(objetivo.id)}
                className="tecla min-h-[52px] rounded-xl border-2 border-verde-fuerte bg-verde-fuerte px-6
                           text-[16px] font-bold text-tinta disabled:opacity-50">
                {sinRespaldo ? 'Sí, marcarla ganada igual'
                  : alts.length > 1 ? `✓ Sí, ganó la ${l}` : '✓ Sí, marcarla ganada'}
              </button>
            </div>
          </Dialogo>
        );
      })()}
      {corrigiendo && p && (
        <CorregirGanada p={p} letra={letra} gente={personasDelEvento}
          otras={vivasParaCorregir.map((a) => ({ id: a.id, letra: letraDe(a, alternativas), total: totalAlt(a) }))}
          onCerrar={() => setCorrigiendo(false)}
          onCancelarEvento={() => { setCorrigiendo(false); setCancelando(true); }}
          onListo={(hacia) => { setCorrigiendo(false); onCambio(); if (onAbrir) onAbrir(hacia || p.id, 4); else onCerrar(); }} />
      )}
      {cancelando && p && (
        <CancelarEvento p={p} onCerrar={() => setCancelando(false)}
          onListo={() => { setCancelando(false); onCambio(); onCerrar(); }} />
      )}
    </Dialogo>
  );
}

/**
 * **El pie de cada paso, igual en los cuatro** (2026-11-11, lo pidió el
 * cliente: *"estás con el botón abajo, ¿qué estoy haciendo?"*). Antes cada
 * paso terminaba distinto —*Seguir →*, *Seguir: productos →*, *Seguir:
 * enviar →*, este último gris y sonando a que se mandaba algo— y ninguno
 * volvía atrás.
 *
 * - **A la derecha, siempre el dorado**, y dice a dónde va: *Ir al paso 3:
 *   Productos →*.
 * - **Debajo, una línea solo si seguir hace algo más que cambiar de paso**:
 *   pasar de Evento a Productos guarda (`irA()`), y eso se dice antes.
 * - **A la izquierda, volver**, delineado.
 */
function PieDePaso({ paso, guardando, puede, porQueNo, aviso, onVolver, onSeguir }: {
  paso: number; guardando: boolean; puede: boolean; porQueNo: string; aviso: string;
  onVolver: () => void; onSeguir: () => void;
}) {
  return (
    <div className="mt-4 border-t border-hueso/10 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {paso > 1 && (
          <button type="button" className="boton min-h-[48px]" onClick={onVolver}>
            ← {paso - 1} · {PASOS[paso - 2]}
          </button>
        )}
        <span className="flex-1" />
        <button type="button" disabled={guardando || !puede} onClick={onSeguir}
          className="boton boton-relleno min-h-[52px] px-5 text-[16px] disabled:opacity-50">
          {guardando ? 'Guardando…' : <>Ir al paso {paso + 1}: {PASOS[paso]} →</>}
        </button>
      </div>
      {(aviso || !puede) && (
        <p className={`mt-2 text-right text-[14px] ${puede ? 'text-hueso/70' : 'font-semibold text-ambar-texto'}`}>
          {puede ? aviso : porQueNo}
        </p>
      )}
    </div>
  );
}

/**
 * **Una sección del paso 4, con su color** (2026-11-11, lo pidió el
 * cliente: *"darle un distinto tono de fondo para que uno cacha: aquí estoy
 * en el pago del cliente, aquí en cambio de fecha y cancelación"*). El color
 * dice de qué se trata: verde la plata, cielo el contrato, rosado lo que
 * está por confirmarse.
 */
const TONOS = {
  verde: 'border-verde/35 bg-verde/[0.06] text-verde-texto',
  cielo: 'border-cielo/35 bg-cielo/[0.06] text-cielo-texto',
  rosa: 'border-rosa/35 bg-rosa/[0.06] text-rosa-texto',
  ambar: 'border-ambar/45 bg-ambar/[0.07] text-ambar-texto',
  neutro: 'border-hueso/15 bg-panel text-hueso/80'
} as const;
function Seccion({ tono, icono, titulo, ayuda, children }: {
  tono: keyof typeof TONOS; icono: string; titulo: string; ayuda?: string; children: React.ReactNode;
}) {
  const [borde, fondo, texto] = TONOS[tono].split(' ');
  return (
    <section className={`space-y-4 rounded-xl border-2 ${borde} ${fondo} p-4`}>
      <h3 className={`flex items-center text-[15px] font-bold uppercase tracking-wide ${texto}`}>
        <span aria-hidden className="mr-2 text-[18px]">{icono}</span>{titulo}
        {ayuda && <AyudaCorta tema={ayuda} />}
      </h3>
      {children}
    </section>
  );
}

/** El bloque del próximo hito: grande, con su color y lo que pasa al apretarlo. */
function Hito({ tono, titulo, bajada, children }: {
  tono: 'verde' | 'rosa' | 'ambar' | 'cielo'; titulo: string; bajada: string; children?: React.ReactNode;
}) {
  const [borde, fondo, texto] = TONOS[tono].split(' ');
  return (
    <div className={`space-y-3 rounded-2xl border-2 ${borde} ${fondo} p-4`}>
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">Próximo paso</p>
        <p className={`text-[22px] font-extrabold leading-tight ${texto}`}>{titulo}</p>
        <p className="mt-1 text-[15px] text-hueso/80">{bajada}</p>
      </div>
      {children}
    </div>
  );
}

/** Los hitos de la cotización, como trofeos: los cumplidos con su ✓. */
function Camino({ pasos }: { pasos: { nombre: string; listo: boolean }[] }) {
  const actual = pasos.findIndex((x) => !x.listo);
  return (
    <ol aria-label="Por dónde va" className="flex flex-wrap items-center gap-1.5">
      {pasos.map((x, i) => (
        <li key={x.nombre} className="flex items-center gap-1.5">
          <span className={`rounded-full border-2 px-3 py-1 text-[14px] font-semibold ${x.listo
            ? 'border-verde-fuerte bg-verde-fuerte text-tinta'
            : i === actual ? 'border-oro text-oro' : 'border-hueso/20 text-hueso/55'}`}>
            {x.listo ? '✓ ' : i === actual ? '● ' : ''}{x.nombre}
          </span>
          {i < pasos.length - 1 && <span aria-hidden className="text-hueso/40">→</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * **Abre WhatsApp en otra pestaña, y si el navegador no lo deja, en esta**
 * (2026-11-12). Lo reclamó el cliente: apretaba WhatsApp y solo aparecía la
 * pregunta de si la había mandado. Un navegador que bloquea la pestaña nueva
 * no avisa; `window.open` sí lo dice —devuelve `null`— y entonces se abre en
 * la misma, que en un teléfono salta directo a la aplicación.
 */
function abrirFuera(url: string) {
  const w = window.open(url, '_blank');
  if (w) { try { w.opener = null; } catch { /* sin acceso: da igual */ } }
  else window.location.href = url;
}

/** WhatsApp, correo y link: los tres preguntan "¿la mandaste?" (ver `mandar()`). */
function BotonesMandar({ link, whatsapp, correo, onMandar, grande = false, ver = 'Ver el documento' }: {
  link: string; whatsapp: string; correo: string;
  onMandar: (via: 'whatsapp' | 'correo' | 'link') => void; grande?: boolean;
  /** Qué dice el botón que abre el documento. */
  ver?: string;
}) {
  const clase = grande ? 'boton min-h-[56px] flex-1 text-[16px] font-semibold' : 'boton min-h-[44px]';
  return (
    <div className="flex flex-wrap gap-2">
      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noreferrer" className={`tecla ${clase}`}
          onClick={(e) => { e.preventDefault(); abrirFuera(whatsapp); onMandar('whatsapp'); }}>💬 WhatsApp</a>
      ) : <button type="button" className={clase} disabled>Falta su teléfono</button>}
      {correo ? (
        <a href={correo} className={`tecla ${clase}`} onClick={() => onMandar('correo')}>✉️ Correo</a>
      ) : <button type="button" className={clase} disabled>Falta su correo</button>}
      <button type="button" className={clase} disabled={!link} onClick={() => onMandar('link')}>
        📋 Copiar link
      </button>
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className={`tecla ${clase}`}>{ver}</a>
      )}
    </div>
  );
}

/** El botón grande de subir el contrato firmado, para el bloque del próximo paso. */
function SubirFirmado({ subiendo, onArchivo }: { subiendo: boolean; onArchivo: (f: File) => void }) {
  return (
    <label className={`tecla block min-h-[56px] w-full cursor-pointer rounded-xl border-2 border-verde-fuerte
                       px-5 text-center text-[17px] font-bold leading-[52px] text-verde-texto hover:bg-verde/10
                       ${subiendo ? 'opacity-60' : ''}`}>
      {subiendo ? 'Subiendo…' : '📎 Subir contrato firmado'}
      <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={subiendo}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onArchivo(f); }} />
    </label>
  );
}
