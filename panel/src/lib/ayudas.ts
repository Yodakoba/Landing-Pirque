/**
 * Los textos de ayuda del panel, **todos en este archivo**.
 *
 * Lo pidió el cliente: *"un sistema de enseñanza interactiva dentro del sitio
 * para los que lo acceden la primera vez… signo de interrogación, clic,
 * quiero aprender más y se abre y aprendo más sobre esto"*.
 *
 * **Están juntos a propósito.** Si cada pantalla escribiera su propia
 * explicación dentro de su JSX, corregir el tono o una palabra sería recorrer
 * doce archivos, y nadie podría leer de una sentada lo que el panel le está
 * enseñando a la gente. Acá se lee entero y se corrige en un lugar.
 *
 * **Cómo están escritos**, que es la parte que importa:
 *
 * - **Dicen qué se hace, no qué es.** "Acá se mira cómo viene la ocupación"
 *   sirve; "esta pantalla muestra una grilla de fechas" no le sirve a nadie.
 * - **Sin palabras del oficio.** Ni endpoint, ni registro, ni sincronizar.
 *   Quien abre esto es alguien que está aprendiendo a usar un panel por
 *   primera vez, muchas veces con el teléfono en la mano.
 * - **Cortos.** Tres párrafos y unos pasos. Una ayuda larga no se lee, y una
 *   que no se lee es peor que ninguna porque ocupa el lugar de la buena.
 * - **No inventan datos del negocio.** Ningún precio, ningún horario, ninguna
 *   capacidad: eso sale de la planilla y cambia. Acá se explica el panel.
 */

export interface Ayuda {
  /** El título de la ventana. */
  titulo: string;
  /** Un párrafo por elemento. */
  cuerpo: string[];
  /** "Cómo se usa", en pasos numerados. Opcional. */
  pasos?: string[];
  /** La advertencia que conviene leer antes de tocar algo. Opcional. */
  ojo?: string;
}

export const AYUDAS: Record<string, Ayuda> = {
  calendario: {
    titulo: 'El calendario de reservas',
    cuerpo: [
      'Acá se ve cómo viene cada día que recibe público: cuánta gente hay '
      + 'reservada, cuánto cupo queda y qué menús pidieron.',
      'El punto de color y la palabra que va debajo dicen en qué está ese '
      + 'día: público es un día normal abierto en el sitio, privado es un '
      + 'día tomado por un evento, cerrado es un día que no recibe gente, y '
      + 'sin cupo es un día al que todavía nadie le puso cuántas personas '
      + 'caben.'
    ],
    pasos: [
      'Apreta la fecha de un día para ver quiénes vienen.',
      'Apreta Equipo al pie de la tarjeta para planificar quién trabaja: la '
      + 'tarjeta se da vuelta y muestra el resumen.',
      'Agregar reserva anota a alguien que llamó o escribió por WhatsApp.',
      'Enviar planilla semanal copia un link que se manda al grupo. Ese link '
      + 'no muestra plata ni nombres de clientes.'
    ],
    ojo: 'Abrir un día acá lo pone en el sitio para recibir reservas. '
       + 'Planificar equipo, en cambio, no abre nada.'
  },

  dia: {
    titulo: 'El día completo',
    cuerpo: [
      'Todo lo de una fecha en una pantalla: quiénes reservaron, quién '
      + 'trabaja y qué actividades extras hay contratadas.',
      'En la tabla de reservas, la columna Pago dice qué compró cada quien '
      + 'y cómo va: Pagada, Por pagar, o una de las tres que liberan el '
      + 'cupo (Cancelada, Reembolsada, Anulada).'
    ],
    pasos: [
      'Marca Vino o No vino a medida que llega la gente.',
      'Editar abre la reserva para corregir un teléfono, un menú o el estado '
      + 'del pago.',
      'Equipo y cuentas del día abre la ventana donde se escriben los montos '
      + 'y la propina.'
    ],
    ojo: 'El día se cierra en Turnos, no acá.'
  },

  turnos: {
    titulo: 'El calendario del equipo',
    cuerpo: [
      'El mes completo, día por día, para asignar gente a cualquier fecha — '
      + 'incluidos los días que no reciben público, como un montaje o una '
      + 'preparación.',
      'Si un día tiene equipo asignado y no recibe gente, el panel lo llama '
      + 'día de preparación. No hay que marcarlo: se deduce solo.',
      'Arriba aparecen los días que ya pasaron y a los que les falta algo '
      + 'para poder cerrarse. Entrar acá es que la pantalla te diga qué '
      + 'queda pendiente.'
    ],
    pasos: [
      'Apreta cualquier día del mes para abrir su ventana.',
      'Elige a cada persona en el puesto que le toca.',
      'Marca Vino o No vino de cada una.',
      'Escribe la jornada, los ajustes y la propina del día.',
      'Cerrar el día deja dicho que alguien lo revisó, con tu nombre y la '
      + 'hora. Se puede reabrir después.'
    ],
    ojo: 'Planificar un día cerrado no lo abre al público: los turnos no '
       + 'tocan lo que ve el sitio.'
  },

  equipo: {
    titulo: 'La lista del equipo',
    cuerpo: [
      'Quiénes trabajan, en qué puesto y cómo se les paga. Cada persona es '
      + 'una línea; se aprieta y se abre su ficha completa.',
      'El link personal es una dirección que se le manda a cada uno por '
      + 'WhatsApp. Le muestra sus propios turnos y nada más: no ve reservas, '
      + 'ni a los demás, ni lo que gana nadie.'
    ],
    pasos: [
      'Apreta la línea de una persona para ver y corregir su ficha.',
      'Desactivar la saca del planificador y le cierra su link, pero conserva '
      + 'todos sus turnos pasados.',
      'Administrar puestos abre la lista de puestos, donde también se ordenan '
      + 'con las flechas.'
    ],
    ojo: 'A quien ya trabajó alguna vez se le desactiva, no se le quita: sus '
       + 'turnos son el registro de quién trabajó qué día.'
  },

  extras: {
    titulo: 'Las actividades extras',
    cuerpo: [
      'Lo que se contrata aparte del equipo y por día: los jinetes, las '
      + 'pintacaritas, el castillo inflable.',
      'Van separadas del equipo porque no son lo mismo: no cobran una '
      + 'jornada, no entran en el reparto de la propina, y no aparecen en la '
      + 'planilla que se le manda al grupo.',
      'Se juntan en un solo lugar: la planilla que descarga quien paga, donde '
      + 'cada fila dice si es equipo o actividad extra.'
    ],
    pasos: [
      'Apreta un día del mes para agendar a quien venga.',
      'Marca Vino o No vino cuando ya pasó el día.',
      'Abajo, la lista de colaboradores guarda a los que se repiten, con su '
      + 'monto habitual y su cuenta.'
    ],
    ojo: 'Una actividad sin confirmar no suma: agendar no es pagar.'
  },

  informe: {
    titulo: 'El informe para pagar',
    cuerpo: [
      'Por cada persona del periodo: cuántos días vino, cuánto suman sus '
      + 'jornadas, sus horas extra, sus ajustes y su total.',
      'Lo importante es el botón de descargar. El archivo trae el detalle día '
      + 'por día con el motivo de cada ajuste, y las cuentas bancarias, así '
      + 'que se puede pasar directo a la transferencia sin copiar nada a '
      + 'mano.'
    ],
    pasos: [
      'Elige la semana, el mes, o dos fechas sueltas.',
      'Mira arriba si quedan días sin confirmar: mientras los haya, el total '
      + 'está incompleto.',
      'Descarga la planilla.'
    ],
    ojo: 'La propina va en su propia columna y no se suma al costo del '
       + 'equipo: esa plata no sale del negocio, pasa por él.'
  },

  menus: {
    titulo: 'Los menús y sus precios',
    cuerpo: [
      'Los nombres y los precios que el panel usa para calcular el monto de '
      + 'una reserva anotada a mano.',
      'En una reserva comprada por el sitio manda lo que cobró la tienda, no '
      + 'esto: el total viene con el pedido.'
    ],
    ojo: 'Si acá aparece un menú en amarillo es que alguna reserva usa un '
       + 'nombre que no está en esta lista, y conviene revisarlo.'
  },

  configuracion: {
    titulo: 'La configuración',
    cuerpo: [
      'Qué días de la semana se abre, cuánta gente cabe, hasta cuántos días '
      + 'adelante se puede reservar y a partir de cuántos lugares libres el '
      + 'sitio avisa que quedan pocos.',
      'De acá sale el calendario que ven los clientes en el sitio.'
    ],
    ojo: 'Esto cambia lo que ve el público. Un día suelto se abre o se cierra '
       + 'desde el calendario, sin tocar esta pantalla.'
  },

  cuentas: {
    titulo: 'Las cuentas del panel',
    cuerpo: [
      'Quiénes pueden entrar y hasta dónde llega cada uno.',
      'Administrador ve y hace todo. Encargado organiza el día a día — '
      + 'reservas, turnos, asistencia— pero no toca sueldos ni '
      + 'configuración. Pagos solo abre el informe. Un trabajador no entra '
      + 'acá: su acceso es su link personal.'
    ],
    ojo: 'Es mejor desactivar una cuenta que borrarla: así sus líneas de la '
       + 'bitácora siguen diciendo quién hizo qué.'
  },

  bitacora: {
    titulo: 'La bitácora',
    cuerpo: [
      'Quién hizo qué y cuándo. Sirve para preguntarle a la persona que '
      + 'corresponde, no para deshacer un cambio.',
      'Las horas son de Chile.'
    ]
  },

  asistencia: {
    titulo: 'Marcar quién vino',
    cuerpo: [
      'Mientras nadie marque, esa persona queda en sin marcar y no suma nada: '
      + 'el panel no la da por venida ni da por pagada su jornada.',
      'Apretar el botón que ya está marcado lo desmarca, que es la forma de '
      + 'volver a "no sé todavía".'
    ],
    ojo: 'Un día no se puede cerrar mientras quede alguien sin marcar, '
       + 'porque el total quedaría mal.'
  }
};

/** Un paso del recorrido de bienvenida. */
export interface Paso {
  titulo: string;
  cuerpo: string[];
  /** La pantalla de la que habla, para poder ir a verla. */
  ir?: { texto: string; url: string };
}

/**
 * El recorrido de la primera vez.
 *
 * **Son cuatro pantallas de texto y no globitos flotando sobre la página**,
 * que era la otra forma de hacerlo. Un globito hay que anclarlo a un elemento
 * que esté a la vista: en un teléfono la mitad quedan fuera de pantalla, y si
 * alguien hace scroll el globito apunta al aire. Cuatro pasos leídos de
 * corrido no se rompen nunca y se entienden igual.
 *
 * **Cuatro y no diez**: esto es para orientarse, no para aprender el panel.
 * Lo demás está en el `?` de cada pantalla, que se abre cuando hace falta.
 */
export const RECORRIDO: Paso[] = [
  {
    titulo: 'Esto es el panel',
    cuerpo: [
      'Acá se administra todo lo que pasa en Brasas: las reservas que llegan, '
      + 'quién trabaja cada día y cuánto se le paga.',
      'Son cuatro pantallas y te las muestro en un minuto. Puedes salir '
      + 'cuando quieras.'
    ]
  },
  {
    titulo: 'Calendario: cómo viene cada día',
    cuerpo: [
      'La primera pantalla muestra los días que reciben público, con cuánta '
      + 'gente hay reservada y cuánto cupo queda.',
      'Apretando la fecha se ve quiénes vienen; apretando Equipo al pie de la '
      + 'tarjeta se planifica quién trabaja ese día.'
    ],
    ir: { texto: 'Ver el calendario', url: '/' }
  },
  {
    titulo: 'Turnos: quién trabaja, y cerrar el día',
    cuerpo: [
      'Acá está el mes completo, para asignar equipo a cualquier día — '
      + 'incluidos los de preparación, en que no entra nadie y se trabaja '
      + 'igual.',
      'Cuando el día ya pasó, es también donde se marca quién vino, se '
      + 'escriben los montos y la propina, y se cierra. Al entrar, la '
      + 'pantalla te dice arriba qué quedó pendiente.'
    ],
    ir: { texto: 'Ver Turnos', url: '/turnos' }
  },
  {
    titulo: 'Equipo: las fichas de cada persona',
    cuerpo: [
      'Quiénes trabajan, en qué puesto, cuánto gana cada uno y dónde se le '
      + 'transfiere.',
      'Desde acá también se le crea a cada persona su link personal, que se '
      + 'manda por WhatsApp y le muestra solo sus propios turnos.'
    ],
    ir: { texto: 'Ver Equipo', url: '/equipo' }
  },
  {
    titulo: 'Y si algo no se entiende',
    cuerpo: [
      'Cada pantalla tiene un signo de interrogación al lado del título. '
      + 'Apretándolo se abre una explicación corta de para qué sirve y cómo '
      + 'se usa.',
      'Eso es todo. Puedes volver a ver este recorrido cuando quieras, desde '
      + 'ese mismo signo en el calendario.'
    ]
  }
];
