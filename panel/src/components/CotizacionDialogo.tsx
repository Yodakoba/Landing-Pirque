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
 *   dibujado, así que la cantidad que sigue a los invitados y la regla del
 *   show ecuestre se ven mientras se escribe.
 * - **Un candidato** es una cotización que se guarda en el paso 2, con
 *   cliente, fecha e invitados. Después se sigue cotizando desde ahí mismo.
 * - **Lo que no es de esta cuenta se ve y no se toca**: el vendedor ve las
 *   cotizaciones de otros en solo lectura (`<fieldset disabled>`).
 */
import { useEffect, useMemo, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import BotonGuardar from './BotonGuardar';
import { usarAutoguardado } from './usarAutoguardado';
import Dialogo from './Dialogo';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import { avisar, copiarConAviso } from './AvisoFlotante';
import {
  cuentasDe, totalDeLinea, folioDe, estadoVisible, ESTADO_PRESUPUESTO, IVA,
  DOCUMENTO, documentoDe, numeroONulo, totalDe, lineasDe, type Documento, type Presupuesto, type LineaPresupuesto
} from '@/lib/presupuestos';
import {
  prepararLineas, esDiaPublico, lineaDeProducto, productoDe, showDe, cambiarCantidad,
  alternativasDe, letraDe, grupoDe,
  ESTADOS_A_MANO, MOTIVOS_PERDIDA
} from '@/lib/cotizar';
import { paraCotizar, precioParaCotizar, aPrecio, TIPO_PRODUCTO, MONEDA, COBRO, type Menu } from '@/lib/menus';
import {
  condicionesDe, estadoCobros, montoCobro, CONCEPTO_COBRO, type Cobro
} from '@/lib/cobros';
import { buscarClientes, porNombreCliente, faltaParaFactura, type Cliente } from '@/lib/clientes';
import { puedeTocarPresupuesto, puede, type Rol } from '@/lib/auth';
import { achicarFoto } from '@/lib/achicarFoto';
import { faltaDelCliente } from '@/lib/contrato';
import { frasesCancelacion } from '@/lib/cancelacion';
import CancelarEvento from './CancelarEvento';
import BloqueCancelada from './BloqueCancelada';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, esFecha } from '@/lib/fechas';
import { estaCerrado, esPrivada, esExclusiva } from '@/lib/columnas';
import { enlaceWhatsApp } from '@/lib/contacto';

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
  /** Para el contrato: el horario de siempre y qué le falta a la empresa. */
  contrato?: { horario: string; faltaEmpresa: string[];
    tranquilidad?: { cambiosFecha: number; cancelacionDias: number; reembolsoPct: number } };
  hoy: string;
  usuario: string;
  rol: string;
}

const PASOS = ['Cliente', 'Evento', 'Productos', 'Enviar'] as const;
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
  const puedeEditar = !p || puedeTocarPresupuesto(datos.rol as Rol, datos.usuario, p.creadoPor);
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
    { anticipo: numeroONulo(anticipoTxt, 100), saldoDias: numeroONulo(saldoTxt, 365), fecha: fechaReal },
    cuentas.total, datos.condiciones ?? { anticipoPct: 30, saldoDias: 3 });
  const cobrado = estadoCobros({ anticipo: cond.anticipo, total: cuentas.total }, cobros);

  /**
   * **Si hay algo sin guardar** (2026-11-10): una firma de todo lo que se
   * manda al guardar, comparada contra la de la última vez que se guardó.
   * Con eso el botón dice *Guardar* en dorado o *✓ Guardado* en gris
   * (`BotonGuardar`). Una cotización nueva siempre tiene algo sin guardar.
   */
  const firma = JSON.stringify({
    idCliente, fechaReal, periodo: sinFecha ? periodo : '', invitados, tipoEvento, notas,
    descuento, motivo, documento, anticipoTxt, saldoTxt, uf, fechaUF, estado, lineas: vistas,
    horario, ley20393, acuerdos, fact: facturacion, cambiosTxt, cancelTxt, reembolsoTxt
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
  const auto = usarAutoguardado(firma, async () => {
    if (!(await guardar(undefined, true))) return 'No se pudo guardar';
  }, 1200, !!p && puedeEditar && !ganada);
  const cotizables = paraCotizar(datos.menus);
  const show = showDe(datos.menus);
  const encontrados = useMemo(
    () => [...buscarClientes(clientes, busqueda)].sort(porNombreCliente).slice(0, 8),
    [clientes, busqueda]);

  const cambiarLinea = (i: number, cambio: Partial<Linea>) =>
    setLineas(vistas.map((l, k) => (k === i ? { ...l, ...cambio } : l)));

  const agregar = (m: Menu) => {
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
        anticipo: anticipoTxt, saldoDias: saldoTxt,
        horario, ley20393, acuerdos,
        cambiosFecha: cambiosTxt, cancelacionDias: cancelTxt, reembolso: reembolsoTxt,
        ...(uf ? { uf, fechaUF } : {}),
        estado: estadoForzado ?? estado,
        lineas: vistas
      };
      const r = await fetch('/api/presupuestos', {
        method: p ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return ''; }
      if (!solo) {
        avisar(p ? 'Cotización guardada' : (cuerpo.estado === ESTADO_PRESUPUESTO.candidato
          ? 'Candidato anotado' : 'Cotización creada'));
      }
      if (estadoForzado) setEstado(estadoForzado);
      setGuardada(JSON.stringify({ ...JSON.parse(firma), estado: estadoForzado ?? estado }));
      onCambio();
      return p?.id ?? d.presupuesto?.id ?? '';
    } finally { setGuardando(false); }
  }

  async function ganar() {
    if (!p) return;
    if (!confirm('¿Marcarla ganada? Se crea la reserva y toma el cupo de ese día. '
      + 'Las otras alternativas de este cliente pasan a "No elegida".')) return;
    // Primero se guarda lo que esté escrito, para que la reserva salga con eso.
    if (!(await guardar())) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos/convertir', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      avisar('Ganada: la reserva ya está en el calendario');
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
    if (n <= 2 || paso >= 3) return setPaso(n);
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

  async function duplicar() {
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
    if (onAbrir) onAbrir(d.presupuesto.id, 3); else onCerrar();
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
  const linkContrato = p?.token && typeof window !== 'undefined'
    ? `${window.location.origin}/contrato/${p.token}` : '';
  const whatsapp = link && cliente
    ? enlaceWhatsApp(cliente.telefono,
        `Hola ${cliente.nombre.split(' ')[0]}, te mando la cotización: ${link}`)
    : '';

  // Un número por cotización —el del grupo— y una letra por alternativa.
  const alts = p ? alternativasDe(p, alternativas) : [];
  const letra = p ? letraDe(p, alternativas) : '';
  const titulo = p
    ? `${estadoVisible(p, datos.hoy) === ESTADO_PRESUPUESTO.candidato ? 'Candidato' : 'Cotización'}`
      + ` N° ${folioDe({ id: grupoDe(p) })}${letra ? ` · Alternativa ${letra}` : ''}`
    : 'Nueva cotización';

  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar} ancho="max-w-3xl">
      {/* Los cuatro pasos, como botones: se ve dónde se está y se puede saltar. */}
      <nav aria-label="Pasos" className="mb-4 grid grid-cols-4 gap-1.5">
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
      {p && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {alts.length > 1 && (
            <span className="text-[13px] font-medium uppercase tracking-wide text-hueso/60">Alternativas</span>
          )}
          {alts.length > 1 && alts.map((a, i) => (
            <button key={a.id} type="button" aria-pressed={a.id === p.id}
              onClick={() => { if (a.id !== p.id) void abrirAlternativa(a.id); }}
              className={`boton min-h-[44px] min-w-[44px] ${a.id === p.id ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
              {String.fromCharCode(65 + i)}
              <span className="text-[13px] font-normal text-hueso/70">
                {enPesos(totalDe(lineasDe(datos.lineas ?? [], a.id), a.descuento))}
              </span>
            </button>
          ))}
          {puedeEditar && !ganada && (
            <button type="button" disabled={guardando} onClick={() => void duplicar()}
              className="boton min-h-[44px]">+ Otra alternativa</button>
          )}
          <AyudaCorta tema="alternativas" />
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
          La creó <strong>{p?.creadoPor || 'otra persona'}</strong>: la puedes ver, no cambiar.
        </p>
      )}
      {cancelada && (
        <p className="mb-3 rounded border border-rojo-fuerte/60 bg-rojo/10 px-3 py-2 text-[14px]">
          <strong className="text-rojo-texto">Cancelada.</strong> Su reserva liberó el cupo. Ya no se
          edita: lo que queda es la devolución, en el paso Enviar.
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
                <button type="button" className="boton boton-relleno min-h-[44px]"
                  onClick={() => setPaso(2)}>Seguir →</button>
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
                este número; la once, el desayuno y lo que toman todos lo siguen solos.
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

            <div className="flex flex-wrap gap-2 border-t border-hueso/10 pt-3">
              {!p && (
                <button type="button" disabled={guardando} className="boton min-h-[44px]"
                  onClick={async () => { if (await guardar(ESTADO_PRESUPUESTO.candidato)) onCerrar(); }}>
                  Guardar como candidato
                </button>
              )}
              <button type="button" className="boton boton-relleno min-h-[44px]"
                onClick={() => void irA(3)}>Seguir: productos →</button>
            </div>
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
                  {cotizables.map((m) => (
                    <button key={m.nombre} type="button" onClick={() => agregar(m)}
                      className="boton min-h-[48px] text-[14px]">
                      + {m.nombre}
                      <span className="ml-1 text-hueso/60">
                        {m.moneda === MONEDA.uf ? `${String(m.precioCotizacion).replace('.', ',')} UF`
                          : precioParaCotizar(m) ? enPesos(precioParaCotizar(m)) : ''}
                      </span>
                    </button>
                  ))}
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
                          <Campo etiqueta={l.sigue ? 'Cantidad (= invitados)' : 'Cantidad'} ancho="w-auto">
                            {/* − y + grandes, y el número se puede escribir. En un
                                menú, lo que sube se le resta al primero
                                (`cambiarCantidad()`). */}
                            <div className="flex items-center gap-2">
                              {!l.sigue && (
                                <button type="button" className="boton h-11 w-11 text-xl" aria-label="Uno menos"
                                  onClick={() => setLineas(cambiarCantidad(vistas, i, l.cantidad - 1, datos.menus, invitados))}>−</button>
                              )}
                              <input type="number" min={0} value={l.cantidad} disabled={l.sigue}
                                onChange={(e) => setLineas(cambiarCantidad(vistas, i,
                                  Number(e.target.value) || 0, datos.menus, invitados))}
                                className={`${ENTRADA} h-11 !w-20 text-center text-[17px] font-bold`} />
                              {!l.sigue && (
                                <button type="button" className="boton h-11 w-11 text-xl" aria-label="Uno más"
                                  onClick={() => setLineas(cambiarCantidad(vistas, i, l.cantidad + 1, datos.menus, invitados))}>+</button>
                              )}
                            </div>
                          </Campo>
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
                          {/* Solo lo que se cobra por persona y no es un menú —la
                              once, el desayuno— puede seguir a los invitados. El
                              show o el arriendo son uno, no uno por invitado. */}
                          {prod && prod.tipo !== TIPO_PRODUCTO.menu && prod.cobro === COBRO.porPersona && (
                          <button type="button" onClick={() => cambiarLinea(i, { sigue: !l.sigue })}
                            className={`boton min-h-[40px] ${l.sigue ? 'border-oro bg-oro/15' : ''}`}>
                            {l.sigue ? '✓ Sigue a los invitados' : 'Seguir a los invitados'}
                          </button>
                          )}
                          {prod && prod.tipo !== TIPO_PRODUCTO.menu && prod.cobro === COBRO.porPersona && (
                            <span className="-ml-2 self-center"><AyudaCorta tema="sigueInvitados" /></span>
                          )}
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
              {p && puedeEditar && (
                <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => void guardar()} />
              )}
              <button type="button" className="boton min-h-[44px]"
                onClick={() => setPaso(4)}>Seguir: enviar →</button>
            </div>
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
            </div>

            {!ganada && (
              <div>
                <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                  En qué va <AyudaCorta tema="estadoCotizacion" />
                </p>
                <Elegir etiqueta="Estado" opciones={ESTADOS_A_MANO} valor={estado}
                  onElegir={(v) => setEstado(v || ESTADO_PRESUPUESTO.borrador)} />
                {estado === ESTADO_PRESUPUESTO.rechazado && (
                  <div className="mt-3">
                    <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                      Por qué se perdió
                    </p>
                    <Elegir etiqueta="Motivo" opciones={MOTIVOS_PERDIDA} valor={motivo} onElegir={setMotivo} />
                    <input value={motivo} onChange={(e) => setMotivo(e.target.value)}
                      placeholder="u otro motivo" className={`${ENTRADA} mt-2 sm:w-80`} />
                  </div>
                )}
              </div>
            )}


            {cancelada && p && (
              <BloqueCancelada p={p} cobros={cobros} puedePagar={puedePagar}
                onCobros={(c) => { setCobros(c); onCambio(); }} />
            )}

            <fieldset disabled={cancelada} className="min-w-0 space-y-4">
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
                        <input value={facturacion[k]} placeholder={ejemplo} className={ENTRADA}
                          onChange={(e) => setFacturacion({ ...facturacion, [k]: e.target.value })} />
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


            {/* **Las condiciones de pago** (2026-11-10). En blanco rige
                Configuración; cada cotización las puede negociar. Las
                calcula `condicionesDe()`, la misma que usa el documento. */}
            <div>
              <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Condiciones de pago <AyudaCorta tema="condicionesPago" />
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-[13px] text-hueso/70">Anticipo %</span>
                  <input type="number" min={0} max={100} value={anticipoTxt} className={`${ENTRADA} w-24`}
                    placeholder={String(datos.condiciones?.anticipoPct ?? 30)}
                    onChange={(e) => setAnticipoTxt(e.target.value)} />
                </label>
                <button type="button" aria-pressed={cond.pct === 0}
                  onClick={() => setAnticipoTxt(cond.pct === 0 ? '' : '0')}
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
                  ? <>Anticipo {cond.pct}%: <strong>{enPesos(cond.anticipo)}</strong> para reservar la fecha · Saldo <strong>{enPesos(cond.saldo)}</strong></>
                  : <>Sin anticipo · Todo <strong>{enPesos(cond.saldo)}</strong></>}
                {cond.saldoHasta
                  ? <> hasta el {enPalabras(cond.saldoHasta)}.</>
                  : <>, {cond.dias} días antes del evento.</>}
              </p>
            </div>

            {/* **El contrato** (Fase 4, 2026-11-10). Sale de la cotización:
                el precio, las condiciones de pago y el cliente de su ficha.
                Se firma en papel y se sube el firmado, que va a Drive. Lo
                único que se escribe acá es lo que la cotización no sabe. */}
            <div className="rounded border border-hueso/15 bg-panel p-3">
              <p className="text-[13px] font-medium uppercase tracking-wide text-hueso/60">Contrato <AyudaCorta tema="contrato" /></p>
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
                        Se imprime, se firma en dos ejemplares y se sube el firmado.
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
                        <input value={facturacion[k]} placeholder={ejemplo} className={ENTRADA}
                          onChange={(e) => setFacturacion({ ...facturacion, [k]: e.target.value })} />
                      </label>
                    ))}
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                        Horario del evento
                      </span>
                      <input value={horario} className={ENTRADA}
                        placeholder={datos.contrato?.horario ?? '13:00 a 18:00'}
                        onChange={(e) => setHorario(e.target.value)} />
                    </label>
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
                  <div>
                    <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
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

                  <div className="flex flex-wrap gap-2">
                    {linkContrato && (
                      <a href={linkContrato} target="_blank" rel="noreferrer"
                        onClick={() => { if (sucio && !ganada) void guardar(undefined, true); }}
                        className="tecla boton min-h-[44px]">📄 Ver el contrato</a>
                    )}
                    {firmado && (
                      <a href={`/api/presupuestos/contrato?id=${encodeURIComponent(p.id)}`}
                        target="_blank" rel="noopener" className="tecla boton min-h-[44px]">📎 Ver el firmado</a>
                    )}
                    {puedeEditar && (
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
            </div>

            </fieldset>

            {/* **Los cobros al cliente**: se anotan los pagos, no una
                casilla. Lo normal es un toque —anticipo recibido, o todo—;
                otro monto abre un campo. Un cobro anotado por error se
                deshace. */}
            <div className="rounded border border-hueso/15 bg-panel p-3">
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

            <div className="flex flex-wrap gap-2">
              {!cancelada && (
                <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => void guardar()} />
              )}
              {/* **Cancelar el evento** (2026-11-11): solo una ganada. Lo
                  hace quien puede tocar la cotización, el vendedor incluido. */}
              {ganada && !cancelada && puedeEditar && (
                <button type="button" disabled={guardando} onClick={() => setCancelando(true)}
                  className="boton min-h-[48px] hover:!border-rojo-fuerte hover:text-rojo-texto">
                  Cancelar evento
                </button>
              )}
              {ganada && !cancelada && puedeEditar && <span className="self-center"><AyudaCorta tema="cancelarEvento" /></span>}
              {p && !ganada && esFecha(fechaReal) && (
                <button type="button" disabled={guardando || !cobrado.anticipoListo}
                  title={cobrado.anticipoListo ? '' : 'Falta el anticipo'}
                  onClick={() => void ganar()}
                  className="boton min-h-[48px] !border-verde-fuerte text-verde-texto hover:bg-verde/10 disabled:opacity-50">
                  ✓ Marcar ganada
                </button>
              )}
              {p && !ganada && esFecha(fechaReal) && <span className="self-center"><AyudaCorta tema="marcarGanada" /></span>}
            </div>
            {/* El motivo del botón apagado, en pantalla y no en un globito:
                en un teléfono no hay mouse que lo muestre. */}
            {p && !ganada && esFecha(fechaReal) && !cobrado.anticipoListo && (
              <p className="text-[14px] font-semibold text-ambar-texto">
                Para marcarla ganada falta el anticipo: {enPesos(cobrado.faltaAnticipo)}.
              </p>
            )}

            {p && (
              <div className="flex flex-wrap gap-2 border-t border-hueso/10 pt-3">
                {link && (
                  <button type="button" className="boton min-h-[44px]"
                    onClick={() => copiarConAviso(link, 'Link copiado', 'Copia este link:')}>
                    📋 Copiar link
                  </button>
                )}
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="tecla boton min-h-[44px]">
                    WhatsApp al cliente
                  </a>
                )}
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="tecla boton min-h-[44px]">
                    Ver el documento
                  </a>
                )}
                {!ganada && (
                  <button type="button" onClick={() => void borrar()}
                    className="boton min-h-[44px] hover:border-rojo-fuerte hover:text-rojo-texto">
                    Borrar
                  </button>
                )}
              </div>
            )}
            {p && (
              <p className="text-[13px] text-hueso/60">
                Guarda antes de mandar el link: el cliente ve lo último guardado.
              </p>
            )}
          </div>
        )}
      </fieldset>

      {error && <p className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}
      {cancelando && p && (
        <CancelarEvento p={p} onCerrar={() => setCancelando(false)}
          onListo={() => { setCancelando(false); onCambio(); onCerrar(); }} />
      )}
    </Dialogo>
  );
}
