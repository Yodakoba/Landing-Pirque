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
      'La columna Asistencia dice quién vino; se marca en Turnos.',
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
      'Cerrar el día pregunta antes y muestra lo que estás declarando: '
      + 'quién vino, la propina, las actividades extras. Queda anotado con tu '
      + 'nombre y la hora, y desde ahí el día queda en solo lectura.',
      'Si un día cerrado tiene un error, el administrador o quien hace los '
      + 'pagos aprieta Corregir este día, arregla lo que haga falta y lo '
      + 'guarda con el motivo. El día sigue cerrado.'
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

  /**
   * El `?` que va al lado del botón del link, dentro de la ficha.
   *
   * No es la ayuda de una pantalla sino la de un botón, y es el único caso:
   * la pregunta —*¿qué va a ver esta persona cuando lo abra?*— se hace justo
   * antes de mandarlo por WhatsApp, y la respuesta decide si se manda.
   */
  link: {
    titulo: 'El link personal',
    cuerpo: [
      'Es una dirección propia de esa persona. Se la mandas por WhatsApp, '
      + 'ella la aprieta y ve su página. No pide contraseña ni correo.',
      'Lo que ve: sus próximos turnos —qué día, desde qué hora, en qué '
      + 'puesto, cuánta gente se espera y qué menús hay que preparar— y sus '
      + 'últimos 30 días con el detalle de lo que se le pagó cada uno: la '
      + 'jornada, las horas extra, los ajustes con su motivo y su parte de '
      + 'la propina.',
      'Lo que no ve: reservas, nombres de clientes, a los demás trabajadores '
      + 'ni lo que gana nadie más.'
    ],
    pasos: [
      'Crear link personal se lo genera y te lo copia. Pégalo en su WhatsApp.',
      'Copiar link personal vuelve a copiar el mismo, por si lo perdió.',
      'Renovar crea uno nuevo y deja el anterior inservible al instante: es '
      + 'lo que hay que hacer si alguien pierde el teléfono.'
    ],
    ojo: 'Quien tenga el link ve esa página, así que es de una sola persona '
       + 'y no se manda al grupo. Desactivarla también se lo cierra.'
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

  presupuestos: {
    titulo: 'Las cotizaciones',
    cuerpo: [
      'Acá se cotiza para un cliente —una agencia, un matrimonio, una '
      + 'empresa— y se le manda por un link. El calendario muestra cuántos '
      + 'candidatos y cotizaciones tiene cada día.',
      'Lo cotizado NO ocupa cupo. Recién al marcarla ganada se vuelve una '
      + 'reserva, y desde ahí la reserva se actualiza sola si cambias la '
      + 'cotización.',
      'Un candidato es alguien que preguntó: se anota con cliente, fecha e '
      + 'invitados, y se cotiza después.'
    ],
    pasos: [
      '“+ Cotizar” (o “Cotizar este día” en una tarjeta).',
      'Cliente: búscalo o créalo. Evento: fecha —o “todavía no hay día”—, '
      + 'invitados y tipo.',
      'Productos: agrégalos con los botones. Cada línea tiene su precio y su '
      + 'descuento; abajo va el descuento sobre el total y el IVA.',
      'Envío: en qué va, documento, condiciones de pago y los pagos; desde ahí '
      + 'se manda por WhatsApp o correo. Contrato: sus datos y condiciones, y '
      + 'se manda igual. Si el cliente '
      + 'acepta, “Ver el contrato”, imprímelo y fírmenlo en dos ejemplares.',
      'Sube la foto o el PDF del contrato firmado, anota el anticipo y '
      + '“Marcar ganada”.'
    ],
    ojo: 'En un día público el show ecuestre va incluido y no se puede '
       + 'quitar. Para ofrecer otra opción al mismo cliente usa “Hacer una '
       + 'alternativa”: cuando una gana, las otras pasan solas a “No elegida”.'
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
      'Abre en la semana pasada, que es la que se paga. Puedes elegir otra '
      + 'semana, el mes, o dos fechas sueltas.',
      'Mira arriba si quedan turnos sin cerrar: mientras los haya, el total '
      + 'está incompleto.',
      'En la línea de cada persona están los botones para copiar su sueldo y '
      + 'su propina: copian la cuenta y el monto para pegarlos en el banco.',
      'Aprieta la línea para abrirla. Si pagaste todo, aprieta Pagado '
      + 'completo; si fue una parte, Pago parcial. Ahí también marcas la '
      + 'boleta cuando llegue.',
      'Para una transferencia masiva, arriba está su tarjeta: baja la '
      + 'planilla de sueldos o de propinas, súbela al banco, y cuando esté '
      + 'pagada aprieta Todos pagados.',
      'Descarga la planilla: trae si cada pago tiene boleta.'
    ],
    ojo: 'El sueldo y la propina se pagan en dos transferencias. La propina '
       + 'tampoco se suma al costo del equipo: esa plata no sale del negocio, '
       + 'pasa por él.'
  },

  menus: {
    titulo: 'Los productos',
    cuerpo: [
      'Todo lo que se vende: los menús del sitio y lo que se cotiza, como la '
      + 'once, el desayuno, el show ecuestre o el arriendo. Un solo catálogo '
      + 'para que lo cotizado y lo reservado se llamen igual.',
      'Cada producto dice si se vende en el sitio y en las reservas, y si se '
      + 'puede cotizar. Los precios de reserva valen para las reservas anotadas '
      + 'a mano; el precio de cotización es el que propone una cotización, y '
      + 'ahí se puede cambiar.',
      'En una reserva comprada por el sitio manda lo que cobró la tienda, no '
      + 'esto: el total viene con el pedido.'
    ],
    ojo: 'Si acá aparece un menú en amarillo es que alguna reserva usa un '
       + 'nombre que no está en esta lista, y conviene revisarlo.'
  },

  clientes: {
    titulo: 'Los clientes',
    cuerpo: [
      'Una ficha por cliente, con su nombre, cómo contactarlo y, cuando haga '
      + 'falta para el contrato, su RUT y domicilio.',
      'Se escribe una vez: las cotizaciones apuntan a la ficha en vez de '
      + 'copiar los datos. Si corriges un teléfono acá, queda corregido para '
      + 'todas sus cotizaciones.'
    ],
    pasos: [
      'Busca primero: por nombre, empresa, teléfono, correo o RUT.',
      'Si no está, aprieta “+ Nuevo cliente”. Si ya hay uno con ese teléfono, '
      + 'correo o RUT, el panel te pregunta si es el mismo.',
      'Para cambiar algo, abre la ficha con “+”, corrige y aprieta “Guardar cambios”.'
    ],
    ojo: 'Una ficha con cotizaciones no se puede borrar.'
  },

  configuracion: {
    titulo: 'La configuración',
    cuerpo: [
      'Está ordenada por secciones, con un botón arriba para saltar a cada '
      + 'una: las reservas del sitio, el calendario del panel, las '
      + 'cotizaciones, el contrato, los datos de la empresa y la mantención.',
      'Reservas del sitio es lo que ven los clientes: qué días se abre, '
      + 'cuánta gente cabe y hasta cuándo se puede reservar. Cotizaciones y '
      + 'Contrato son lo que propone cada cotización nueva y lo que dice el '
      + 'contrato que se imprime.'
    ],
    ojo: 'Esto cambia lo que ve el público. Un día suelto se abre o se cierra '
       + 'desde el calendario, sin tocar esta pantalla.'
  },

  cuentas: {
    titulo: 'Las cuentas del panel',
    cuerpo: [
      'Quiénes pueden entrar y con qué rol. Una cuenta por persona: así la '
      + 'bitácora dice quién hizo qué.',
      'Qué puede cada rol se ve bajo el rol elegido, y el detalle en su signo de pregunta. '
      + 'Sale de la misma tabla de permisos que usa el panel, así que siempre '
      + 'está al día.',
      'Un trabajador no entra acá: su acceso es su link personal.'
    ],
    ojo: 'Es mejor desactivar una cuenta que borrarla: así sus líneas de la '
       + 'bitácora siguen diciendo quién hizo qué. Un cambio de rol vale cuando '
       + 'la persona sale y vuelve a entrar.'
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

/**
 * **Las ayudas chicas**: el `?` que va al lado de un campo o de un botón
 * (`AyudaCorta.tsx`), no de una pantalla entera.
 *
 * Lo pidió el cliente (2026-11-11): *"mejor un signo de interrogación más y
 * que explica esta sección específica en corto que solo un gran signo de
 * interrogación arriba y tengo que leer todo el chorizo"*. Por eso cada una
 * es **una sola cosa, en dos o tres frases**, y dice lo que pasa al tocarla
 * —qué cambia, qué no, quién la puede tocar—, que es lo que se pregunta
 * justo antes de apretar.
 *
 * Las mismas reglas que las de arriba, más una: **si una frase corta bajo el
 * campo ya lo dice, no va un `?`**. Un `?` que repite lo que está a la vista
 * enseña a no apretarlos.
 *
 * Los roles no están acá: su explicación sale de la tabla de permisos
 * (`roles.ts`), para que no pueda quedar vieja.
 */
export interface AyudaCorta {
  titulo: string;
  /** Dos o tres frases, una por elemento. */
  texto: string[];
}

export const AYUDAS_CORTAS: Record<string, AyudaCorta> = {
  // ---------- La ventana de cotizar ----------
  alternativas: {
    titulo: 'Alternativas',
    texto: [
      'Son versiones de la misma cotización para el mismo cliente: otro menú, otro precio, otro día. Cada una tiene su letra y su total.',
      'Se mandan todas juntas en un solo link. Cuando el cliente decide, eliges "Se quedó con esta": las otras pasan a "No elegida" y el link muestra solo la elegida.',
      'Antes de ganarla o de mandar el contrato hay que elegir. En el calendario cuentan una sola vez.'
    ]
  },
  sinFecha: {
    titulo: 'Sin día exacto',
    texto: [
      'Para cuando el cliente dice "marzo o abril". La cotización queda en la vista Sin fecha y no aparece en ningún día.',
      'Para marcarla ganada hay que ponerle la fecha.'
    ]
  },
  agregarProducto: {
    titulo: 'Agregar productos',
    texto: [
      'Aparecen los productos marcados "Se puede cotizar" en Productos, con el precio que proponen.',
      'Cada producto va una sola vez: ya agregado, su botón dice "ya está" y la cantidad se cambia en su línea.',
      'El precio se cambia en la línea: es parte de la negociación. "Otra línea" es para algo que no está en el catálogo.'
    ]
  },
  precioLinea: {
    titulo: 'Con IVA o + IVA',
    texto: [
      'Con IVA: el precio ya trae el IVA adentro. + IVA: el IVA se suma encima.',
      'Lo dice el catálogo de cada producto. Abajo, las cuentas muestran siempre neto, IVA y total.'
    ]
  },
  descuentoLinea: {
    titulo: 'Descuento de la línea',
    texto: [
      'Rebaja solo esta línea. Se puede usar junto con el descuento sobre el total: primero se aplica el de la línea y después el del total.',
      'Los porcentajes de los botones se cambian en Configuración.'
    ]
  },
  ufCotizacion: {
    titulo: 'La UF de la cotización',
    texto: [
      'Queda fija desde que se agregó el primer producto en UF, para que la cifra que recibió el cliente no cambie sola.',
      '"Usar la UF de hoy" la actualiza y cambia los precios en pesos: úsalo solo si vas a mandar la cotización de nuevo.'
    ]
  },
  descuentoTotal: {
    titulo: 'Descuento sobre el total',
    texto: [
      'Rebaja la cotización completa, encima de los descuentos de cada línea.',
      'Sale en la hoja del cliente, en el contrato y en el monto de la reserva al ganarla.'
    ]
  },
  vistaGerencia: {
    titulo: 'Vista gerencia',
    texto: [
      'Se suma a cualquier rol: la persona ve todo el panel —calendario, reservas, informe, bitácora, cotizaciones, equipo con sus sueldos, configuración—.',
      'Edita solo lo de su rol. En las pantallas que solo mira, arriba le aparece "acá solo miras".',
      'No ve las cuentas, las contraseñas ni los links personales. Vale desde la próxima vez que entre.'
    ]
  },
  estadoCotizacion: {
    titulo: 'En qué va',
    texto: [
      'El camino de arriba dice en qué va. Avanza con lo que haces: "Sí, la mandé" la deja Enviada, "Marcar ganada" crea la reserva.',
      '"Están negociando" y "Se perdió…" son para ordenarte y para los avisos. Una perdida se puede volver a abrir.',
      'Con varias alternativas vale para todas: van en un solo link y es una sola conversación.'
    ]
  },
  documento: {
    titulo: 'Documento de la venta',
    texto: [
      'Sin documento, boleta o factura. Por ahora no cambia el precio.',
      'Con factura pide los datos de facturación, que quedan guardados en la ficha del cliente.'
    ]
  },
  condicionesPago: {
    titulo: 'Condiciones de pago',
    texto: [
      'En blanco vale lo de Configuración; lo que escribas acá vale solo para esta cotización. Un 0 en el anticipo es "sin anticipo".',
      'Se marca ganada con el anticipo pagado, o con el contrato firmado subido. Son las mismas condiciones que imprime el contrato.'
    ]
  },
  contrato: {
    titulo: 'El contrato',
    texto: [
      'Sale de esta cotización: cliente, fecha, precio línea por línea y condiciones. No se escribe nada dos veces.',
      'Se imprime, se firma en papel y se sube el firmado. Si después cambias la cotización, el que vale es el papel.'
    ]
  },
  mandarContrato: {
    titulo: 'Mandar el contrato',
    texto: [
      'WhatsApp y Correo abren el mensaje con el link del contrato. Al volver te pregunto si lo mandaste.',
      'Si no vuelve firmado, te lo recuerdo arriba de Cotizaciones. Se sube el firmado y listo.'
    ]
  },
  ley20393: {
    titulo: 'Ley 20.393',
    texto: [
      'Agrega al contrato la cláusula de prevención de delitos que suelen pedir las empresas grandes.',
      'Si el cliente no la pidió, déjala sin marcar.'
    ]
  },
  acuerdos: {
    titulo: 'Acuerdos adicionales',
    texto: [
      'Lo que se acordó aparte con el cliente. Va como la última cláusula del contrato, tal como lo escribes.'
    ]
  },
  cambiosFecha: {
    titulo: 'Cambios de fecha',
    texto: [
      'Cuántas veces el cliente puede mover la fecha. En blanco vale Configuración; un 0 saca la frase del contrato.'
    ]
  },
  cancelacionDias: {
    titulo: 'Cancela hasta',
    texto: [
      'Hasta cuántos días antes del evento el cliente puede cancelar con devolución. Un 0 saca la frase del contrato.',
      'Al apretar "Cancelar evento", el panel mira esto para proponer cuánto devolver.'
    ]
  },
  reembolso: {
    titulo: 'Devuelve, % de lo pagado',
    texto: [
      'Qué parte de lo que el cliente ya pagó se le devuelve si cancela a tiempo.',
      'Es lo que imprime el contrato y lo que propone "Cancelar evento". Se negocia por cotización.'
    ]
  },
  pagosCliente: {
    titulo: 'Pagos del cliente',
    texto: [
      'Cada pago se anota con su monto y su comprobante. Todo lo cobrado cuenta primero para el anticipo.',
      'Quien hace los pagos revisa cada comprobante; si se cambia el archivo, vuelve a quedar sin revisar.',
      'Un pago anotado por error se deshace. Una devolución es un pago en negativo.'
    ]
  },
  marcarGanada: {
    titulo: 'Marcar ganada',
    texto: [
      'Crea la reserva en el calendario y le toma el cupo al día. Si el día no estaba abierto, lo abre como privado.',
      'Se puede con el anticipo pagado (paso Envío) o con el contrato firmado subido (paso Contrato). Sin ninguno de los dos, avisa antes.',
      'Las otras alternativas pasan a "No elegida". La cotización se sigue pudiendo editar, y su reserva se actualiza sola.'
    ]
  },
  cancelarEvento: {
    titulo: 'Cancelar evento',
    texto: [
      'Deja la reserva cancelada y libera el cupo. Propone cuánto devolver según las condiciones de esta cotización, y el monto se puede cambiar.',
      'Si el día existía solo por este evento, vuelve a como estaba. No se deshace: si el cliente vuelve, es una cotización nueva.'
    ]
  },

  seguimiento: {
    titulo: 'Seguimiento y envío',
    texto: [
      'WhatsApp y Correo abren el mensaje con el link, listo para mandar. Al volver al panel te pregunta si la mandaste y la pasa a Enviada. Desde ahí corre la vigencia y aparece como posible en el calendario de reservas.',
      'Después te recuerda preguntarle al cliente: arriba de Cotizaciones, en "Esperando respuesta".'
    ]
  },
  esperandoRespuesta: {
    titulo: 'Esperando respuesta',
    texto: [
      'Las cotizaciones mandadas que llevan días sin moverse, las que tienen el evento cerca sin estar ganadas, y los contratos mandados que no han vuelto firmados.',
      'Contesta ahí mismo: "Está negociando", "Se perdió" o "Sigue esperando", que te vuelve a preguntar más adelante. Los plazos se cambian en cada cotización o en Configuración.'
    ]
  },
  seguimientoDias: {
    titulo: 'Sin respuesta, a los días',
    texto: [
      'Cuántos días después de mandarla te pregunto "¿y?", si nada se movió. "Sigue esperando" lo posterga otro tanto.',
      'En blanco vale Configuración; en 0 no pregunta.'
    ]
  },
  avisoEvento: {
    titulo: 'Días antes del evento',
    texto: [
      'Cuántos días antes del evento te pregunto si se ganó o se perdió, si todavía no está ganada.',
      'En blanco vale Configuración; en 0 no pregunta.'
    ]
  },

  // ---------- Productos ----------
  preciosReserva: {
    titulo: 'Precios de reserva',
    texto: [
      'Se usan para el monto sugerido al anotar una reserva a mano.',
      'No cambian el precio del sitio público ni el de Shopify: esos se cambian aparte.'
    ]
  },
  cobro: {
    titulo: 'Cómo se cobra',
    texto: [
      'Por persona: el precio se multiplica por la cantidad, que se ajusta con − y + en cada cotización. Monto fijo: un solo precio, sin cantidad, como el arriendo o el show: va o no va.'
    ]
  },
  moneda: {
    titulo: 'Pesos o UF',
    texto: [
      'En UF, la cotización lo convierte a pesos con la UF del día en que se agrega, y esa UF queda fija en la cotización.'
    ]
  },
  ivaProducto: {
    titulo: 'IVA del precio',
    texto: [
      'Incluido: el precio que escribes ya trae el IVA. + IVA: el IVA se suma encima en la cotización.'
    ]
  },

  // ---------- Equipo ----------
  modalidad: {
    titulo: 'Por turno o contratado',
    texto: [
      'Por turno: se le paga la jornada de cada día que viene.',
      'Contratado: su sueldo va por liquidación, fuera del panel. Acá solo se le suman horas extra y ajustes del día.'
    ]
  },
  propinaFicha: {
    titulo: 'Entra en la propina',
    texto: [
      'La propina de un día se reparte en partes iguales entre quienes vinieron y tienen esta casilla marcada.',
      'Desmárcala solo para quien no participa del reparto.'
    ]
  },

  // ---------- El día ----------
  diaCerrado: {
    titulo: 'Un día cerrado',
    texto: [
      'Ya no se edita: lo cerró alguien que revisó quién vino y cuánto se paga.',
      'Si algo quedó mal, quien hace los pagos lo corrige con un motivo, o lo compensa con un ajuste en la semana siguiente.'
    ]
  },
  propinaDia: {
    titulo: 'Propina del día',
    texto: [
      'Se escribe el total del día. El panel lo reparte en partes iguales entre quienes vinieron y participan.',
      'No suma al costo del equipo: es plata que pasa por el negocio, no que sale de él.'
    ]
  },

  // ---------- Informe ----------
  boleta: {
    titulo: 'La boleta',
    texto: [
      'Una por semana, por su sueldo o su servicio. La propina nunca la pide, y a un contratado tampoco.',
      'Si falta, igual se puede pagar: el aviso queda en ámbar hasta que llegue.'
    ]
  },
  transferenciaMasiva: {
    titulo: 'Transferencia masiva',
    texto: [
      'La planilla trae a quien le falta pago y tiene su cuenta completa. "Todos pagados" marca exactamente a esa misma gente.',
      'Sueldos y propinas van por separado: son dos pagos.'
    ]
  },
  deshacerPago: {
    titulo: 'Deshacer o pago negativo',
    texto: [
      'Deshacer es para un pago anotado sin querer, que nunca ocurrió: borra la fila.',
      'Si se pagó de más o devolvieron plata, anota un pago en negativo: ahí sí hubo dos movimientos.'
    ]
  }
};
