/**
 * **El contrato, armado desde la cotización** (Fase 4, 2026-11-10).
 *
 * El texto es **el del contrato del CRM del socio**, que es el que los
 * clientes ya firmaban: no se redactó ninguna cláusula nueva. Lo que cambió
 * es de dónde salen los datos, que es donde el CRM se equivocaba:
 *
 * | Del contrato | De dónde sale |
 * |---|---|
 * | El prestador | Configuración, la misma de la cotización |
 * | El cliente | Su ficha: no se vuelve a escribir el RUT ni el domicilio |
 * | El precio | Las líneas de la cotización **con sus descuentos y el IVA** (el CRM perdía el descuento) |
 * | Anticipo y saldo | `condicionesDe()`, la misma de la cotización (el CRM decía 30% en una y 20% en la otra) |
 *
 * Tres arreglos sobre el texto del CRM, decididos con el cliente:
 * - **El precio va línea por línea**, no partido en adulto, niño y "después
 *   de la comida": un arriendo o un show no tenían dónde ir.
 * - **El "Asados y Corderos no responderá…" de la cláusula sexta** estaba
 *   escrito fijo aunque el prestador fuera Brasas: ahora dice el prestador.
 * - **El anticipo se paga al firmar** (lo decidió el cliente), en vez de
 *   "en N días desde la firma": el panel ya exige el anticipo pagado para
 *   marcar la cotización ganada, y un segundo plazo sería otra cosa que
 *   configurar sin necesidad.
 *
 * **Se firma en papel**, en dos ejemplares, y el firmado se sube a Drive
 * (`/api/presupuestos/contrato`). El link sigue vivo, como el de la
 * cotización: si se corrige algo antes de firmar, el mismo link ya lo
 * muestra.
 *
 * Es puro —sin planilla ni red— para poder probarlo.
 */
import { enPesos } from './ocupacion.ts';
import { enPalabras, esFecha, type Fecha } from './fechas.ts';
import type { Condiciones } from './cobros.ts';
import type { Empresa } from './config.ts';

/** La raya para lo que se completa a mano en el papel. */
export const RAYA = '____________';

/**
 * El texto de la Ley 20.393, tal cual lo traía el CRM. Va solo si se marca
 * en la cotización: *"las empresas grandes lo exigen"*.
 */
export const LEY_20393 =
  'El PRESTADOR declara que ha tomado conocimiento de las disposiciones de la Ley N° 20.393 '
  + 'y sus normas complementarias sobre Responsabilidad Penal de las Personas Jurídicas y que ha '
  + 'diseñado e implementado un modelo de prevención de delitos en los términos establecidos en '
  + 'la misma Ley, o ha establecido los mecanismos de control y monitoreo necesarios para '
  + 'asegurar que su empresa, sus trabajadores, contratistas y subcontratistas cumplen los '
  + 'estándares de probidad, buenas prácticas y orden público exigidos por ésta y el presente '
  + 'Contrato. El incumplimiento de cualquiera de los compromisos recogidos en esta cláusula o '
  + 'falta a la verdad en las declaraciones aquí vertidas constituye una falta grave del '
  + 'Contrato y es motivo suficiente para la terminación unilateral del mismo por parte de la '
  + 'Empresa.';

const ORDINALES = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO',
  'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO', 'UNDÉCIMO', 'DUODÉCIMO'];

/** "sábado 5 de diciembre de 2026". */
export function fechaLarga(f: Fecha | ''): string {
  return esFecha(f) ? `${enPalabras(f)} de ${f.slice(0, 4)}` : RAYA;
}

/** Lo que el contrato necesita del cliente, de su ficha. */
export interface ClienteContrato {
  nombre: string;
  /** La razón social, si el cliente es una empresa. */
  empresa: string;
  rut: string;
  domicilio: string;
  telefono: string;
}

/**
 * Lo que le falta a la ficha del cliente para que el contrato salga
 * completo. **Avisa, no bloquea**, igual que los datos de la factura: el
 * contrato se puede imprimir con la raya y completarse a mano.
 */
export function faltaDelCliente(c: Pick<ClienteContrato, 'rut' | 'domicilio'>): string[] {
  const falta: string[] = [];
  if (!c.rut.trim()) falta.push('RUT');
  if (!c.domicilio.trim()) falta.push('domicilio');
  return falta;
}

/** Lo que le falta a Configuración para el encabezado del contrato. */
export function faltaDeEmpresa(
  e: Pick<Empresa, 'razonSocial' | 'rut' | 'representante' | 'ciRepresentante'>
): string[] {
  const falta: string[] = [];
  if (!e.razonSocial.trim()) falta.push('razón social');
  if (!e.rut.trim()) falta.push('RUT');
  if (!e.representante.trim()) falta.push('representante legal');
  if (!e.ciRepresentante.trim()) falta.push('cédula del representante');
  return falta;
}

/** El horario del evento: el de la cotización, o el de Configuración. */
export function horarioDe(
  p: { horario: string },
  cfg: { horaApertura: string; horaCierre: string }
): string {
  return p.horario.trim() || `${cfg.horaApertura} a ${cfg.horaCierre}`;
}

/**
 * Un párrafo del contrato. Lo que va entre `**` sale en negrita: los montos
 * y los nombres, como en el contrato del CRM.
 */
export type Parrafo = string;

export interface Clausula {
  titulo: string;
  parrafos: Parrafo[];
  /** Los puntos de una lista, si la cláusula la tiene. */
  puntos?: Parrafo[];
  /** Lo que va después de la lista. */
  despues?: Parrafo[];
  /** Si es la del precio: ahí va la tabla de la cotización. */
  tabla?: boolean;
  /** Si después de los párrafos van los datos para transferir. */
  cuenta?: boolean;
}

export interface DatosContrato {
  empresa: Pick<Empresa, 'nombre' | 'razonSocial' | 'rut' | 'representante' | 'ciRepresentante'>;
  cliente: ClienteContrato;
  folio: string;
  /** "un cumpleaños", "Matrimonio"… El tipo de evento de la cotización. */
  tipoEvento: string;
  lugar: string;
  fecha: Fecha | '';
  horario: string;
  invitados: number;
  total: number;
  condiciones: Condiciones;
  ley20393: boolean;
  acuerdos: string;
  /** Las medidas de tranquilidad, de Configuración. */
  tranquilidad: Tranquilidad;
}

/** Cuántos cambios de fecha, hasta cuántos días antes se cancela, y qué % se devuelve. */
export interface Tranquilidad {
  cambiosFecha: number;
  cancelacionDias: number;
  reembolsoPct: number;
}

const VECES = ['', 'una vez', 'dos veces', 'tres veces', 'cuatro veces', 'cinco veces'];

/**
 * Los párrafos de las medidas de tranquilidad. **Un 0 saca la frase**: sin
 * cambios de fecha no se promete ninguno, y sin días de cancelación no se
 * promete poder cancelar. Sin ninguna de las dos, no hay cláusula.
 */
export function tranquilidadDe(t: Tranquilidad): Parrafo[] {
  const salida: Parrafo[] = [];
  if (t.cambiosFecha > 0) {
    salida.push(`El Cliente tendrá la opción de cambiar ${VECES[t.cambiosFecha] ?? `${t.cambiosFecha} veces`} `
      + 'la fecha del Evento, siempre que la nueva fecha no choque con fechas ya reservadas y solo '
      + 'por motivos de fuerza mayor.');
  }
  if (t.cancelacionDias > 0) {
    salida.push(`El Cliente tendrá la opción de cancelar el Evento hasta con ${t.cancelacionDias} días `
      + 'de anticipación' + (t.reembolsoPct > 0
        ? ` y con un reembolso del ${t.reembolsoPct}% de la reserva.`
        : ', sin reembolso de la reserva.'));
  }
  return salida;
}

/**
 * El tipo de evento dentro de la frase "planea la celebración de …". Los
 * tipos de la cotización son rótulos ("Empresa"), no frases: "celebración
 * de empresa" no se lee. Lo escrito a mano va tal cual.
 */
const FRASES: Record<string, string> = {
  cumpleanos: 'un cumpleaños', matrimonio: 'un matrimonio', empresa: 'un evento de empresa',
  paseo: 'un paseo', otro: 'un evento'
};
export function eventoEnFrase(tipo: string): string {
  const t = tipo.trim();
  if (!t) return 'un evento';
  const clave = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return FRASES[clave] ?? t.toLowerCase();
}

/** Cómo se llama al prestador en el texto: su nombre comercial. */
export const aliasDe = (e: DatosContrato['empresa']) =>
  e.nombre.trim() || e.razonSocial.trim() || 'el Prestador';

/** El encabezado: quiénes firman. */
export function comparecencia(d: DatosContrato, ciudad: string): Parrafo {
  const e = d.empresa;
  const c = d.cliente;
  const prestador = `**${e.razonSocial || RAYA}**, rol único tributario N° ${e.rut || RAYA}, `
    + `representada por ${e.representante || RAYA}, cédula de identidad N° `
    + `${e.ciRepresentante || RAYA} (el «Prestador» o «${aliasDe(e)}»)`;
  // Una empresa firma por su razón social, representada por la persona de
  // la ficha. Una persona firma por sí misma.
  const cliente = c.empresa.trim()
    ? `**${c.empresa}**, RUT ${c.rut || RAYA}, representada por ${c.nombre || RAYA}`
      + `${c.telefono ? `, teléfono ${c.telefono}` : ''}, con domicilio en ${c.domicilio || RAYA}`
    : `**${c.nombre || RAYA}**, RUT ${c.rut || RAYA}`
      + `${c.telefono ? `, teléfono ${c.telefono}` : ''}, con domicilio en ${c.domicilio || RAYA}`;
  return `En ${ciudad.trim() || RAYA}, a ${RAYA}, entre ${prestador}; y ${cliente} `
    + '(en adelante el «Cliente»), se ha convenido el siguiente contrato:';
}

/**
 * Las cláusulas, numeradas solas: la de la Ley 20.393 y la de acuerdos
 * adicionales van solo si corresponde, y la numeración se corre sola en vez
 * de quedar "NOVENO" escrito a mano.
 */
export function clausulasDe(d: DatosContrato): Clausula[] {
  const alias = aliasDe(d.empresa);
  const c = d.condiciones;
  const evento = eventoEnFrase(d.tipoEvento);

  const lista: (Omit<Clausula, 'titulo'> & { nombre: string })[] = [];
  const agregar = (nombre: string, resto: Omit<Clausula, 'titulo'>) =>
    lista.push({ nombre, ...resto });

  agregar('Antecedentes', {
    parrafos: [
      `${alias} es una empresa que se especializa en prestar servicios de banquetería por medio `
      + 'de parrilladas y asados, los cuales realiza en las fechas, lugares y en las condiciones '
      + 'que acuerda con sus clientes.',
      `El Cliente planea la celebración de ${evento} (el «Evento») y para el mismo se han `
      + 'considerado los siguientes puntos:'
    ],
    puntos: [
      `Lugar: ${d.lugar || RAYA}`,
      `Fecha: ${fechaLarga(d.fecha)}`,
      `Horario: ${d.horario || RAYA}`,
      `Número aproximado de invitados: ${d.invitados || RAYA}`
    ],
    despues: [
      `En consideración a los antecedentes planteados, el Cliente y ${alias} vienen a convenir `
      + 'el presente contrato de prestación de servicios de banquetería.'
    ]
  });

  agregar('Servicios de Banquetería', {
    parrafos: [
      `Por el presente acto, ${alias}, actuando representada en la forma ya indicada, se obliga `
      + 'para con el Cliente a la prestación de un servicio de banquetería (el «Servicio») cuyas '
      + `características y alcances están fijados en la Cotización N° ${d.folio}, elaborada por `
      + 'el Prestador, pero conocida y aprobada por ambas partes, cuyo detalle se transcribe en '
      + 'la cláusula Tercera.',
      `Adicionalmente, ${alias} se obliga a encomendar la realización del Evento a un `
      + 'coordinador de la celebración, quien se hará cargo de la dirección y ejecución de cada '
      + 'uno de los aspectos del Servicio el mismo día del Evento.'
    ]
  });

  agregar('Precio', {
    tabla: true,
    parrafos: [
      `El Precio Total asciende a la cantidad de **${enPesos(d.total)}** IVA incluido.`,
      'Sin perjuicio de la determinación del Precio Total, las partes acuerdan que éste podrá '
      + 'variar en la misma proporción en que varíen los invitados cuya asistencia al Evento esté '
      + 'efectivamente confirmada, circunstancia que deberá ser comunicada por el Cliente al '
      + `Prestador, por medio de correo electrónico, con ${c.dias} días de anticipación al Evento.`
    ]
  });

  const pagos: Parrafo[] = c.pct > 0
    ? [
        `La cantidad de **${enPesos(c.anticipo)}** (IVA incluido), representativa aproximadamente `
        + `del ${c.pct}% del Precio Total, se pagará al Prestador al firmar el presente contrato.`,
        `El saldo restante, equivalente a la cantidad de **${enPesos(c.saldo)}** (IVA incluido), `
        + `se pagará al Prestador con ${c.dias} días de anticipación a la fecha del Evento`
        + (c.saldoHasta ? `, esto es, a más tardar el ${fechaLarga(c.saldoHasta)}.` : '.')
      ]
    : [
        `El Precio Total, equivalente a la cantidad de **${enPesos(c.saldo)}** (IVA incluido), se `
        + `pagará al Prestador con ${c.dias} días de anticipación a la fecha del Evento`
        + (c.saldoHasta ? `, esto es, a más tardar el ${fechaLarga(c.saldoHasta)}.` : '.')
      ];
  agregar('Forma de pago', {
    cuenta: true,
    parrafos: [
      'Por medio de la presente, el Cliente y el Prestador convienen en que el pago del precio, '
      + 'referido en la cláusula Tercera anterior, se efectúe del siguiente modo:'
    ],
    puntos: pagos
  });

  agregar('Reunión de coordinación', {
    parrafos: [
      'Para definir los detalles del Evento se efectuará una reunión de coordinación entre el '
      + 'Cliente y el Prestador, la cual se realizará en la fecha que sea fijada entre éstos de '
      + 'común acuerdo. En la referida reunión de coordinación se definirán: a) detalles del menú; '
      + 'y b) número de invitados definitivo.'
    ]
  });

  agregar('Eximición de responsabilidad', {
    parrafos: [
      `${alias} no se hace responsable de la calidad del Servicio en caso de que el número de `
      + 'invitados al Evento sea mayor al número de invitados efectivamente confirmado a la fecha '
      + 'del pago indicado en la cláusula Cuarta precedente.',
      `${alias} dispondrá de todo su personal para entregar el mejor servicio. Sin perjuicio de `
      + 'lo anterior, en caso de ocurrir algún imprevisto el día del Evento, el Cliente será '
      + 'responsable de comunicarlo al Coordinador a la brevedad, con el objeto de que sea '
      + `solucionado rápidamente. ${alias} no responderá por inconvenientes ocurridos en el `
      + 'Evento que no hayan sido informados al Coordinador.'
    ]
  });

  agregar('', {
    parrafos: ['El cliente podrá llevarse lo que quede en postres y alcohol comprado por él para la casa.']
  });

  const tranquilidad = tranquilidadDe(d.tranquilidad);
  if (tranquilidad.length) agregar('Medidas de tranquilidad', { parrafos: tranquilidad });

  if (d.ley20393) {
    agregar('Responsabilidad Penal Ley 20.393', { parrafos: [LEY_20393] });
  }
  if (d.acuerdos.trim()) {
    agregar('Acuerdos adicionales', {
      parrafos: d.acuerdos.split(/\n+/).map((t) => t.trim()).filter(Boolean)
    });
  }

  return lista.map(({ nombre, ...resto }, i) => ({
    ...resto,
    titulo: nombre ? `${ORDINALES[i]}: ${nombre}` : ORDINALES[i]
  }));
}
