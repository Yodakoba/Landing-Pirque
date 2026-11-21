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
      + 'no muestra plata ni nombres de clientes.',
      'Estadísticas (operaciones, pagos, gerencia y administración) abre los '
      + 'números de las reservas en grandes rasgos: cuántas, no-shows, plata '
      + 'y de dónde vienen.',
      'Si haces los pagos, arriba te llega lo que tienes que revisar: los '
      + 'pagos que alguien anotó a mano, los descuentos ya aplicados y las '
      + 'cuentas o tarifas que cambió otro. Ya rigen; los cierras con ✓ '
      + 'Revisado, ✓ Visto o ✓ Confirmar.'
    ],
    ojo: 'Abrir un día acá lo pone en el sitio para recibir reservas. '
       + 'Planificar equipo, en cambio, no abre nada.'
  },

  dia: {
    titulo: 'El día completo',
    cuerpo: [
      'Todo lo de una fecha en una pantalla: quiénes reservaron, quién '
      + 'trabaja y qué actividades extras hay contratadas.',
      'En la lista de reservas, el círculo de cada una dice cómo va el pago; '
      + 'ábrela con “+” para ver qué compró, cómo ingresarla en Fudo y su '
      + 'contacto. 💬 WhatsApp abre el chat directo, con el saludo ya escrito y '
      + 'firmado por ti.',
      'Una reserva que viene de una cotización con precios negociados lleva '
      + '≠ Acordado: su caja de Fudo trae cada línea acordada —el arriendo, el '
      + 'show, los descuentos— con el valor que se ingresa en Fudo, siempre con '
      + 'IVA, para cerrarla con esos precios y no con la carta. Al anotar el '
      + 'valor final, si queda bajo lo acordado, avisa antes de guardar.',
      'El teléfono y el correo de una reserva los ve quien la atiende: la '
      + 'administración, el encargado de turno de hoy en adelante y el vendedor '
      + 'solo en las suyas. Si te llega con 🔒 y tapado (···· 5678), pídeselo a '
      + 'quien la anotó.'
    ],
    pasos: [
      'La columna Asistencia dice quién vino; se marca en Turnos.',
      'Editar abre la reserva para corregir un teléfono, un menú o el estado '
      + 'del pago. Marcarla Pagada o Abonada le avisa al encargado de pagos, '
      + 'que la revisa.',
      'La mesa, en cada reserva abierta: quién se sumó en el día —con su menú '
      + 'o a la carta— y el valor final de la cuenta en Fudo. Se anota desde la '
      + 'hora de apertura. Arriba, Las mesas suma los valores finales del día y '
      + 'dice cuántas mesas faltan, para compararlo con Fudo.',
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
      + 'queda pendiente.',
      'En cada día del mes, la pastilla 👥 dice cuánta gente hay en el equipo.'
    ],
    pasos: [
      'Apreta cualquier día del mes para abrir su ventana.',
      'Elige a cada persona en el puesto que le toca.',
      'Marca Vino o No vino de cada una.',
      'Escribe la jornada, los ajustes y la propina del día. Un ajuste es '
      + '− Descontar (adelanto, llegó tarde, rompió algo) o + Sumar (hora extra, '
      + 'mérito, feriado): el monto va sin signo, el motivo con un botón y '
      + 'cómo se pagó, en efectivo o por transferencia, y se anota con ✓ '
      + 'Guardar. Guardado queda en una fila; tocarla lo vuelve a abrir.',
      'Cerrar el día pregunta antes y muestra lo que estás declarando: '
      + 'quién vino, la propina, las actividades extras. Queda anotado con tu '
      + 'nombre y la hora, y desde ahí el día queda en solo lectura.',
      'Si un día cerrado tiene un error, el administrador o quien hace los '
      + 'pagos aprieta Corregir este día y arregla lo que haga falta. Abajo '
      + 'va apareciendo la lista de lo que cambió: se marca la casilla '
      + 'Confirmo estos cambios y se guarda. Esa lista queda en la bitácora, '
      + 'con su nombre. El día sigue cerrado.'
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
      'Si cambias la cuenta bancaria o lo que se le paga a alguien y no haces '
      + 'los pagos, queda por confirmar hasta que el encargado de pagos lo mire.',
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
      + 'cada fila dice si es equipo o actividad extra.',
      'En cada día del mes, la pastilla 🎠 dice cuántas actividades hay y la '
      + 'de al lado, cuánto cuestan.'
    ],
    pasos: [
      'Apreta un día del mes para agendar a quien venga.',
      'Marca Vino o No vino cuando ya pasó el día.',
      'Con el + de su línea cambias la actividad o el monto, y con − Descontar '
      + 'o + Sumar anotas un ajuste con su motivo y cómo se pagó, y ✓ Guardar, '
      + 'igual que en el equipo.',
      'Abajo, la lista de colaboradores guarda a los que se repiten, con su '
      + 'monto habitual y su cuenta. Si cambias una cuenta o un monto y no '
      + 'haces los pagos, queda por confirmar hasta que el encargado de pagos '
      + 'lo mire.'
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
      + 'invitados, y se cotiza después.',
      '📋 Lista muestra todas las cotizaciones con sus números: cuántas siguen '
      + 'en carrera, cuánto hay cotizado, cuánto se ganó, la tasa de cierre, las '
      + 'que esperan que alguien las siga y lo que falta cobrar. Se filtra por '
      + 'periodo —por fecha del evento o por fecha en que se cotizó—, por estado '
      + 'y con el buscador; la gerencia, además, por vendedor o por socio.'
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
       + 'quitar. En un día privado o exclusivo con poca gente, si va, se cobra '
       + 'al menos el mínimo de Configuración → Extras y arriendo; si no va, se '
       + 'quita. Para ofrecer otra opción al mismo cliente usa “Hacer una '
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
      'El filtro Sin marcar dice cuántas personas tienen días sin cerrar y deja '
      + 'solo a ellas: esos días no suman, así que mientras haya, los totales '
      + 'están incompletos.',
      'En la línea de cada persona están los botones para copiar su sueldo y '
      + 'su propina. Copian solo los datos, uno por línea, en el orden del '
      + 'formulario del banco —nombre y apellido, RUT, banco, tipo de cuenta, '
      + 'número de cuenta y e-mail— y después el monto y la glosa: cada línea '
      + 'se pega tal cual en su campo.',
      'Para ver lo que costó el equipo por puesto, las propinas y cuánto fue '
      + 'de las ventas, aprieta 📊 Estadísticas del equipo, arriba.',
      'Para descontar o sumar algo sin ir a Turnos, abre su línea: − Descontar '
      + 'y + Sumar están al pie de lo que suma en el celular, y arriba de los '
      + 'pagos en el computador. Eliges el día que vino —u Hoy, para '
      + 'un adelanto pedido un día sin turno—, el monto y el motivo, y suma en el '
      + 'periodo de ese día. Uno de hoy fuera de turno aparece en su línea, con ✕ '
      + 'Quitar por si se anotó mal.',
      'Si una línea dice ⚠ Por confirmar, alguien que no hace los pagos cambió '
      + 'su cuenta o su tarifa: revísala antes de transferir y aprieta ✓ '
      + 'Confirmar.',
      'Aprieta la línea para abrirla. Si pagaste todo, aprieta Pagado '
      + 'completo; si fue una parte, Pago parcial. Ahí también está su '
      + 'boleta: el bruto que tiene que escribir en el SII y el neto que '
      + 'recibe, y el botón para marcarla cuando llegue.',
      'Para exigir las boletas, aprieta 🧾 Sin boleta: quedan solo los que '
      + 'ganaron algo en el periodo y no la han mandado.',
      'Vendedores y socios se pagan según su documento: con la retención '
      + 'incluida se transfiere el bruto menos la retención; con factura más '
      + 'IVA, el total con IVA. Su caja lo dice.',
      'La lista va en orden: arriba quien tiene plata en el periodo, después '
      + 'a quien le falta marcar si vino y al final quien no tiene nada que '
      + 'pagar. Sin marcar deja solo a los que les falta marcar.',
      'Para una transferencia masiva, ábrela arriba (va plegada): baja la '
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
      + 'todas sus cotizaciones.',
      'Si eres vendedor, ves el contacto, el RUT y el domicilio de tus '
      + 'clientes —los que creaste o a los que les cotizaste—. De los de otro '
      + 'vendedor ves el nombre y el teléfono tapado, con 🔒, y no se editan.'
    ],
    pasos: [
      'Busca primero: por nombre, empresa, teléfono, correo o RUT.',
      'Si no está, aprieta “+ Nuevo cliente”. Si ya hay uno con ese teléfono, '
      + 'correo o RUT, el panel te pregunta si es el mismo.',
      'Para cambiar algo, abre la ficha con “+” y corrige: se guarda solo. El '
      + 'nombre se confirma con su botón.'
    ],
    ojo: 'Una ficha con cotizaciones no se puede borrar.'
  },

  configuracion: {
    titulo: 'La configuración',
    cuerpo: [
      'Está ordenada por secciones, con un botón arriba para saltar a cada '
      + 'una: las reservas del sitio, el calendario del panel, las '
      + 'cotizaciones, los extras y el arriendo, el contrato, los datos de la '
      + 'empresa y la mantención.',
      'Extras y arriendo: desde cuántas personas el show ecuestre puede ir sin '
      + 'costo en un día privado, y cuánto se cobra como mínimo, más IVA, cuando '
      + 'son menos. La gerencia general, el encargado de pagos y el '
      + 'administrador pueden pasar por encima.',
      'Reservas del sitio es lo que ven los clientes: qué días se abre, '
      + 'cuánta gente cabe y hasta cuándo se puede reservar. Esos días se '
      + 'abren solos cada mañana, públicos y con el cupo normal; uno que ya '
      + 'está en el calendario, cerrado o con otro cupo, no se toca. Cotizaciones y '
      + 'Contrato son lo que propone cada cotización nueva y lo que dice el '
      + 'contrato que se imprime.',
      'En Mantención, el administrador tiene además «Dejar la base en cero»: '
      + 'borra lo que fueron pruebas —reservas, cotizaciones, clientes, pagos, '
      + 'turnos y la bitácora— y conserva el equipo, las cuentas, los productos '
      + 'y la configuración. Pide antes una copia de la planilla y escribir BORRAR. '
      + 'Al terminar, vuelve a abrir solos los días que se abre.'
    ],
    ojo: 'Esto cambia lo que ve el público. Un día suelto se abre o se cierra '
       + 'desde el calendario, sin tocar esta pantalla.'
  },

  estadisticas: {
    titulo: 'Las estadísticas',
    cuerpo: [
      'Los números de las reservas en grandes rasgos, para mirar: cuántas, '
      + 'si vinieron, cuánta plata y de dónde vienen. Acá no se cambia nada.',
      'Quien ve el informe tiene además 👥 Equipo: lo que costó el equipo por '
      + 'puesto, las propinas y su relación con las ventas, con el mismo '
      + 'periodo. Hasta dos semanas va por día; más largo, por semana. Se llega '
      + 'también desde el informe, con 📊 Estadísticas del equipo.',
      'Arriba eliges el periodo —un día, una semana, un mes o dos fechas— y '
      + 'por qué fecha se cuenta: la de la visita o la del día en que se '
      + 'reservó. Todo · Visitas · Eventos separa las reservas de Shopify y '
      + 'las anotadas a mano de los eventos que vienen de una cotización, que '
      + 'son grandes y mueven los promedios.',
      'Cada número se compara con el periodo anterior: un mes con el mes '
      + 'anterior, una semana con la semana anterior. Las tasas se comparan en '
      + 'puntos. El signo de pregunta de cada número dice cómo se calcula.'
    ],
    ojo: 'El no-show depende de que la recepción marque Vino o No vino, y la '
       + 'cuenta final, de que la mesa anote su valor final. Lo que no se anotó '
       + 'no cuenta, y la tarjeta lo dice.'
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

  // Las dos que faltaban para que cada pantalla del menú tenga la suya
  // (2026-11-12): la ayuda por rol arma un paso por pantalla desde acá.
  recepcion: {
    titulo: 'La recepción',
    cuerpo: [
      'La pantalla de la entrada: solo las reservas de hoy, en grande, para '
      + 'recibir a la gente con un tablet o el celular en la mano.',
      'Al apretar Llegó te pregunta si llegaron todos. Si llegaron menos, lo '
      + 'cuentas con − y +: eso no cambia la reserva, le avisa al jefe de turno. '
      + 'Si llegaron más, te pregunta qué come cada uno —un menú o a la carta— '
      + 'y se suman a la mesa.',
      'Al abrir una reserva que llegó está su mesa: Agregar a la mesa, para '
      + 'alguien que llegó después, y el valor final, que es el total de la '
      + 'cuenta en Fudo con lo ya pagado incluido. Las bebidas y lo de la carta '
      + 'no se anotan uno por uno: basta el total.',
      'Para el jefe de turno: una reserva de una cotización con precios '
      + 'negociados lleva ≠ Acordado, y su caja de Fudo trae lo acordado línea '
      + 'por línea, con el valor a ingresar en Fudo con IVA. Esa mesa la cierra '
      + 'él, con esos precios.'
    ],
    pasos: [
      'Busca la reserva por nombre.',
      'Aprieta Llegó o No vino: están a la vista en cada reserva. Una ya '
      + 'marcada dice qué quedó; Cambiar vuelve a ofrecer los dos botones.',
      'El círculo de cada reserva dice cómo viene el pago (✓ ya pagó, $ se '
      + 'cobra, ½ abonó, ! ojo). Con + la abres: cómo ingresarla en Fudo y '
      + 'Avisar al jefe de turno, para todo lo demás —personas, menús, pago, un '
      + 'pedido especial—.'
    ],
    ojo: 'Antes de la hora de apertura, o con el día cerrado, los botones no '
       + 'aparecen.'
  },

  vendedores: {
    titulo: 'Las ventas y lo que se le paga a cada vendedor',
    cuerpo: [
      'Por cada vendedor: lo que ganó en el periodo —comisiones de las '
      + 'cotizaciones que ganó y su sueldo fijo—, lo que ya se le pagó y lo que '
      + 'falta.',
      'La comisión cuenta cuando el cliente terminó de pagar el evento y el '
      + 'encargado de pagos revisó esos cobros. Una cotización cancelada no deja '
      + 'comisión.'
    ],
    pasos: [
      'Arriba elige qué mirar: Vendedores o Socios comerciales. Ahí mismo '
      + 'está + Agregar vendedor (crea su cuenta) o + Agregar socio comercial, '
      + 'con su documento y su transferencia de una vez.',
      'Elige mes o semana y muévete con las flechas: vale para toda la lista.',
      'Cada persona es una tarjeta: cerrada dice cuánto le toca en el periodo '
      + 'y si está pagado. Busca por nombre si son muchas.',
      'Ábrela con el +: los azulejos dicen cuánto toca, cuánto se pagó y '
      + 'cuánto falta, con Pagarle, el detalle de cada venta y su trato.',
      'En Documento: boleta o factura, y si lo que gana trae la retención o el '
      + 'IVA. Eso decide cuánto se le transfiere, aquí y en el informe.'
    ],
    ojo: 'Un socio que agrega un vendedor desde la cotización nace con el trato '
       + 'de partida y queda por confirmar: lo confirma el encargado de pagos.'
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

// El recorrido de bienvenida son las misiones de `/ayuda` (`lib/misiones.ts`).


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
  // ---------- Actividades extras ----------
  actividadesDia: {
    titulo: 'Las actividades del día',
    texto: [
      'Lo que se contrata aparte del equipo: jinetes, pintacaritas, el castillo inflable.',
      'Una actividad sin confirmar no suma: agendar no es pagar. Se marca Vino o No vino desde el mismo día.',
      'El monto se propone de la ficha y se puede corregir: lo que queda es lo que se le pagó ese día. Una diferencia por un acuerdo aparte va como ajuste, con su motivo.'
    ]
  },
  linkColaborador: {
    titulo: 'El link personal',
    texto: [
      'Una dirección propia de esa persona, sin contraseña: ve sus días, lo que ganó y lo que se le pagó. Se la mandas por WhatsApp.',
      'Renovar crea uno nuevo y el anterior deja de servir. Quitar link lo apaga.'
    ]
  },
  // ---------- El día y la recepción ----------
  cotizadoDia: {
    titulo: 'Lo cotizado del día',
    texto: [
      'Son cotizaciones en curso para este día: no ocupan cupo todavía, así que los números de arriba no las cuentan.',
      'De cada cotización cuenta una sola alternativa, la de más gente.'
    ]
  },
  contactoTapado: {
    titulo: 'Contacto reservado',
    texto: [
      'El contacto de esta reserva lo ven la administración y quien la atiende.',
      'Si te toca a ti, pídeselo a la administración.'
    ]
  },
  clienteDeOtro: {
    titulo: 'Un cliente de otro vendedor',
    texto: [
      'Su contacto lo ven la administración y quien lo atiende.',
      'Si te pide una cotización, + Cotizarle lo deja también en tu lista.'
    ]
  },
  sobrecupo: {
    titulo: 'Sobrecupo',
    texto: [
      'Entraron reservas pagadas sobre reservas sin pagar. Quien paga tiene preferencia, así que ya están adentro.',
      'Se decide en el día: ampliar el cupo y traer más equipo, o soltar una reserva sin pagar y avisarle al cliente.'
    ]
  },
  liberarDia: {
    titulo: 'Liberar el día',
    texto: [
      'A cada reserva: avísale con disculpas y ofrécele la devolución completa u otra fecha con un pisco sour de regalo.',
      'Después anota lo que eligió: cambiar de fecha o cancelar y devolver.'
    ]
  },
  agregadosMesa: {
    titulo: 'Agregar a la mesa',
    texto: [
      'Se suman a la gente del día.',
      'Un menú agregado se cobra a precio del local; a la carta, lo que consuman.'
    ]
  },
  valorFinal: {
    titulo: 'El valor final',
    texto: ['Es el total de la cuenta de esta mesa en Fudo, con lo ya pagado incluido.']
  },
  // ---------- Turnos ----------
  diasPorCerrar: {
    titulo: 'Días por cerrar',
    texto: [
      'Un día cerrado es uno donde alguien ya confirmó quién vino, anotó la propina y revisó los montos.',
      'Mientras no se cierre, el informe de ese periodo está incompleto.',
      'Después de cerrarlo, solo el encargado de operaciones, quien hace los pagos o la gerencia lo puede corregir.'
    ]
  },
  // ---------- La ventana de cotizar ----------
  alternativas: {
    titulo: 'Alternativas',
    texto: [
      'Son versiones de la misma cotización para el mismo cliente: otro menú, otro precio, otro día. Cada una tiene su letra y su total.',
      'Crear una copia esta tal cual —menús, precios y descuentos— para que cambies lo que difiere.',
      'Se mandan todas juntas en un solo link. Ganar una la elige: las otras pasan a "No elegida" y el link muestra solo la ganada.',
      'En el calendario cuentan una sola vez, la de más gente.'
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
      'Aparecen los productos marcados "Se puede cotizar" en Productos, con el precio que proponen: arriba los menús, abajo los extras y el arriendo.',
      'Cada producto va una sola vez: ya agregado, su botón queda apagado con un ✓ y la cantidad se cambia en su línea.',
      'El precio se cambia en la línea: es parte de la negociación. "Otra línea" es para algo que no está en el catálogo.',
      'En un día privado con poca gente, el show ecuestre tiene un precio mínimo (Configuración → Extras y arriendo). Si no va, quítalo.'
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
  tratoSocio: {
    titulo: 'El trato de los socios',
    texto: [
      '5% desde 22 personas, 10% desde 55 y 15% desde 77, sobre el neto.',
      'Lo confirma el encargado de pagos; mientras tanto ya se puede cotizar con él.'
    ]
  },
  sujetaAEspacio: {
    titulo: 'Sujeta a espacio',
    texto: [
      'Se ganó sin ningún pago y sin contrato firmado, así que su reserva se trata como una sin pago, igual que una de Shopify.',
      'Si el día se llena con gente que pagó, esa gente tiene preferencia. Con el primer pago deja de estar sujeta a espacio.'
    ]
  },
  ganada: {
    titulo: 'Ganada',
    texto: [
      'Tiene su reserva en el calendario.',
      'Si cambias algo acá —la fecha, la gente, los precios—, la reserva se actualiza sola.'
    ]
  },
  invitados: {
    titulo: 'Los invitados',
    texto: [
      'La cantidad de personas completa, adultos y niños.',
      'Los menús se reparten este número; la once y el desayuno nacen con todos y se ajustan con − y +.'
    ]
  },
  comisionSocio: {
    titulo: 'Con un socio comercial',
    texto: [
      'El socio cobra su comisión por esta venta, y quien la vende, la parte de la suya que diga su ficha.',
      'Un trato por confirmar lo confirma el encargado de pagos.'
    ]
  },
  exclusivo: {
    titulo: '¿Exclusivo?',
    texto: [
      'Lleva arriendo. Exclusivo: ese día no viene nadie más, y al ganarla deja de venderse.',
      'Si se negoció que pueda venir otro grupo, no lo es.'
    ]
  },
  liberarParaGanar: {
    titulo: 'Liberar el día',
    texto: [
      'Para ganarla hay que cancelar o cambiar de fecha las reservas que ya hay ese día, con disculpas a cada cliente.',
      'Eso no se hace solo: lo decide el encargado de operaciones, el de pagos o la gerencia, con Pedir liberar el día.'
    ]
  },
  contrato: {
    titulo: 'El contrato',
    texto: [
      'Sale de esta cotización: cliente, fecha, precio línea por línea y condiciones. No se escribe nada dos veces.',
      'Se manda, se imprime, se firma en dos ejemplares y se sube el firmado. Si después cambias la cotización, el que vale es el papel.',
      'Con varias alternativas, el contrato es de la que tienes abierta: si el cliente se quedó con otra, ábrela arriba y manda el contrato desde esa.'
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
  // **El resumen de vendedores y socios** (2026-11-12, lo pidió el cliente:
  // *"no te olvides de los signos de interrogación y explicar bien cómo se
  // calcula qué número"*).
  // ---------- La Lista de cotizaciones (2026-11-17) ----------
  listaEnCarrera: {
    titulo: 'En carrera',
    texto: [
      'Las cotizaciones que siguen vivas: candidatos, borradores, mandadas y en negociación, sin vencer y sin ganar.',
      'Una cotización con alternativas cuenta una vez. Abajo, cuánta gente traerían si se ganan todas.'
    ]
  },
  listaCotizado: {
    titulo: 'Cotizado',
    texto: [
      'La suma de lo que se le mandó al cliente y sigue en carrera: Enviadas y en Negociación. Es lo mismo que cuenta el calendario.',
      'Lo que todavía no se manda —candidatos y borradores— va aparte, en la línea de abajo.'
    ]
  },
  listaGanado: {
    titulo: 'Ganado',
    texto: [
      'La suma de las cotizaciones ganadas de lo que estás mirando, con su total con IVA.',
      'Si eliges un periodo, cuenta las ganadas cuyo evento cae en él, o que se cotizaron en él, según la fecha que elijas.'
    ]
  },
  // ---------- Las estadísticas de reservas (2026-11-19) ----------
  estReservas: {
    titulo: 'Reservas',
    texto: [
      'Las reservas del periodo que siguen en pie: sin las canceladas, reembolsadas, anuladas ni las que se cayeron por cupo.',
      'Se comparan en % con el periodo anterior.'
    ]
  },
  estPersonas: {
    titulo: 'Personas',
    texto: [
      'La gente de esas reservas, contada igual que en el calendario: si se rectificó, la que llegó de verdad, más la que se agregó en la mesa.'
    ]
  },
  estOcupacion: {
    titulo: 'Ocupación',
    texto: [
      'Las personas dividido por el cupo de los días que recibieron gente en el periodo (abiertos o privados, no los cerrados).',
      'Solo se calcula por fecha de la visita. Se compara en puntos: de 40% a 45% son 5 puntos.'
    ]
  },
  estGrupo: {
    titulo: 'Grupo promedio',
    texto: ['Cuántas personas trae una reserva en promedio: las personas dividido por las reservas.']
  },
  estNoShow: {
    titulo: 'No-show',
    texto: [
      'De las reservas que la recepción ya marcó, cuántas no vinieron: No vino dividido por las marcadas (Vino + No vino).',
      'Solo cuentan los días que ya pasaron. Las que quedaron sin marcar se dicen aparte y no entran en el %: si son muchas, la tasa no es confiable.'
    ]
  },
  estLlegaronMenos: {
    titulo: 'Llegaron menos',
    texto: [
      'En las reservas que sí vinieron, cuánta gente faltó: reservaron 6 y llegaron 4 son 2.',
      'Sale de lo que la recepción anota en "llegaron". Si no anotó cuántos, no cuenta.'
    ]
  },
  estCanceladas: {
    titulo: 'Cancelaciones',
    texto: [
      'De todas las reservas del periodo, cuántas liberaron su lugar: canceladas, reembolsadas, anuladas o caídas por cupo o por un evento exclusivo.',
      'Se compara en puntos.'
    ]
  },
  estPorReserva: {
    titulo: 'Valor por reserva',
    texto: [
      'El monto reservado dividido por las reservas que tienen monto. IVA incluido.',
      'Es lo que se acordó al reservar, no lo que se consumió: eso es la cuenta final.'
    ]
  },
  estPorPersona: {
    titulo: 'Valor por persona',
    texto: ['El monto reservado dividido por la gente de esas mismas reservas. IVA incluido.']
  },
  estTotal: {
    titulo: 'Total reservado',
    texto: [
      'La suma de los montos de las reservas del periodo que siguen en pie.',
      'Pagado es lo que ya entró (pagadas completas y lo abonado); por cobrar, el resto.'
    ]
  },
  estCuentaFinal: {
    titulo: 'Cuenta final por persona',
    texto: [
      'El valor final que anota la mesa (el total de la cuenta en Fudo, con lo prepagado) dividido por la gente de esas mesas.',
      'Debajo, cuánto más que lo reservado se consumió por persona: lo que se pidió de más en la mesa. Solo cuentan las mesas que anotaron su valor final.'
    ]
  },
  estEqCosto: {
    titulo: 'Costo del equipo',
    texto: [
      'Lo que costaron los turnos que vinieron —jornadas, horas extra y ajustes— y las actividades extras confirmadas. Son los mismos montos del informe.',
      'No incluye el sueldo de los contratados, las comisiones de los vendedores, la retención de las boletas ni los adelantos fuera de turno.'
    ]
  },
  estEqPropinas: {
    titulo: 'Propinas',
    texto: [
      'La propina de los turnos del periodo. Va aparte del costo: es plata de los clientes que pasa por el negocio.',
      'En el gráfico, toca una columna para ver cuánto fue por persona atendida.'
    ]
  },
  estEqPorPersona: {
    titulo: 'Por persona atendida',
    texto: [
      'El costo del equipo dividido por la gente de las reservas que siguieron en pie y ya pasaron (la rectificada, si se rectificó).',
      'Sirve para comparar semanas con distinta cantidad de gente.'
    ]
  },
  estEqPorcentaje: {
    titulo: 'Equipo sobre ventas',
    texto: [
      'Qué parte de las ventas se llevó el equipo. Las ventas son el valor final que anotó la mesa y, si no se anotó, el monto de la reserva.',
      'No es el dato de Fudo: faltan las ventas sin reserva y el detalle de la cuenta. Se compara en puntos.'
    ]
  },
  estEqPuestos: {
    titulo: 'Sueldos por puesto',
    texto: [
      'Cada columna es lo que costó el equipo ese día o esa semana; cada color, un puesto, y arriba el total en miles de pesos.',
      'Un puesto tiene siempre el mismo color, en el orden de la lista de puestos. Toca una columna para ver los montos, o abre la tabla.'
    ]
  },
  estEqVentas: {
    titulo: 'Ventas y costo del equipo',
    texto: [
      'El fondo claro son las ventas y la barra azul, lo que costó el equipo; arriba, qué porcentaje fue.',
      'Las ventas son el valor final de la mesa o, si no se anotó, el monto de la reserva.'
    ]
  },
  estSerie: {
    titulo: 'Personas por día',
    texto: [
      'Cada columna es un día que recibió gente o tuvo reservas; en un periodo de más de dos meses, una semana.',
      'La barra dorada son las personas y el fondo claro, el cupo de ese día. Toca una columna para ver los números, o abre la tabla.'
    ]
  },
  estOrigen: {
    titulo: 'De dónde vienen',
    texto: [
      'Las reservas según cómo llegaron: Shopify pagando en línea (pago directo), Shopify pagando en el local (solo reserva), anotadas a mano o nacidas de una cotización ganada.'
    ]
  },
  estMenus: {
    titulo: 'Menús',
    texto: ['Cuántas personas comieron cada menú, contando lo rectificado y lo agregado en la mesa. Es lo mismo que "Qué preparar" del día, sumado.']
  },
  estAnticipacion: {
    titulo: 'Anticipación',
    texto: [
      'Con cuántos días de anticipación se reserva: del día en que se hizo la reserva al día de la visita.',
      'La mediana es el valor del medio: la mitad reserva con menos días y la otra mitad con más.'
    ]
  },
  estPorDia: {
    titulo: 'Por día de la semana',
    texto: [
      'Las personas promedio de cada día de la semana: las personas de esos días dividido por cuántos de esos días recibieron gente en el periodo.'
    ]
  },

  listaTasa: {
    titulo: 'Tasa de cierre',
    texto: [
      'De las cotizaciones que ya se decidieron, cuántas se ganaron: ganadas dividido por ganadas más perdidas.',
      'Las que siguen en carrera, las vencidas y las alternativas no elegidas no cuentan.'
    ]
  },
  listaPorSeguir: {
    titulo: 'Por seguir',
    texto: [
      'Las que esperan que alguien las mueva: mandadas sin respuesta hace días, con el evento cerca y sin ganar, o con el contrato mandado y sin volver firmado.',
      'Son las mismas de Esperando respuesta, pero de todo lo que estás mirando.'
    ]
  },
  listaPorCobrar: {
    titulo: 'Por cobrar',
    texto: [
      'Lo que falta cobrar de las ganadas: su total menos los pagos anotados. Las devoluciones restan.',
      'Apriétala para ver cuáles son.'
    ]
  },
  listaPorMes: {
    titulo: 'Ganado por mes',
    texto: [
      'Lo ganado en cada mes, según el día en que se marcó ganada. Muestra los últimos seis meses con algo ganado.',
      'Sigue a lo que eliges en De quién, no al periodo de arriba.'
    ]
  },

  vendLeToca: {
    titulo: 'Le toca',
    texto: [
      'Las comisiones de las ventas que el cliente terminó de pagar —y pagos revisó— dentro de este periodo, más el sueldo fijo si el último día de un mes cae adentro.',
      'Una venta cuenta en el periodo en que el cliente completó el pago, no en el del evento. Una cancelada no deja comisión.'
    ]
  },
  vendPagado: {
    titulo: 'Pagado',
    texto: ['Lo que se le registró en el informe con el concepto Comisión, dentro de este periodo.']
  },
  vendFalta: {
    titulo: 'Falta',
    texto: ['Le toca menos lo pagado. Es lo que paga el botón Pagarle.']
  },
  vendEtapas: {
    titulo: 'Comisión por etapas',
    texto: [
      'El % depende de las personas del evento: rige la etapa más alta que alcance. Con 2% desde 22, 3% desde 55 y 4% desde 77, un evento de 60 personas paga el 3% y uno de 15 no paga comisión.',
      'Bajo el "desde" de la etapa 1 no hay comisión; de partida es 22, y 1 es desde la primera persona. El % va sobre el neto de la venta (sin IVA), salvo que se elija el total.',
      'Se congela cuando el cliente termina de pagar y pagos lo revisa: cambiar el trato vale para lo que se pague después.'
    ]
  },
  vendConSocio: {
    titulo: 'Cuando la venta viene con un socio',
    texto: [
      'Son dos comisiones separadas. El socio cobra su propia comisión, completa, según su trato. Aparte, el vendedor cobra este % de su propia comisión.',
      'Ejemplo: 60 personas, neto $3.000.000. El socio (10%) cobra $300.000. El vendedor (3%) cobraría $90.000; con socio al 50% cobra $45.000. En total se pagan $345.000.',
      'No es el 50% de lo que gana el socio, ni sale de su comisión.'
    ]
  },
  vendBono: {
    titulo: 'Bono en menús premium',
    texto: [
      'Puntos que se suman al % de la etapa, solo sobre las líneas de los productos marcados ★ Bono vendedor en Productos.',
      'Ejemplo: 2 puntos sobre $1.000.000 neto de Sommelier son $20.000 más.'
    ]
  },
  vendMontoEvento: {
    titulo: 'Monto por evento',
    texto: ['Un monto fijo por cada venta ganada, además del %. Cuenta cuando el cliente termina de pagar y pagos lo revisa.']
  },
  vendSueldoFijo: {
    titulo: 'Sueldo fijo',
    texto: ['Se suma una vez por mes, el último día del mes: un periodo que incluye ese día lo cuenta. Una semana que no lo incluye no suma fijo.']
  },
  vendBase: {
    titulo: 'Neto o total',
    texto: ['Sobre qué monto se calcula el %: el neto, sin IVA, que es el de partida, o el total con IVA.']
  },
  marcarGanada: {
    titulo: 'Marcar ganada',
    texto: [
      'Crea la reserva en el calendario y le toma el cupo al día. Si el día no estaba abierto, lo abre como privado.',
      'Se puede con el anticipo pagado (paso Envío) o con el contrato firmado subido (paso Contrato). Sin ninguno de los dos, avisa antes.',
      'Las otras alternativas pasan a "No elegida". La cotización se sigue pudiendo editar, y su reserva se actualiza sola.'
    ]
  },
  corregirGanada: {
    titulo: 'Corregir la ganada',
    texto: [
      'Para cuando se marcó ganada por error, o la ganada se cayó.',
      'Puedes volver a antes de ganar —la reserva sale del calendario y la cotización queda con su anticipo—, pasar a otra alternativa con sus pagos, o cancelar el evento si el cliente ya no viene.'
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
      'WhatsApp y Correo abren el mensaje con el link y tu nombre, listo para mandar: en el celular se abre la aplicación y en el computador WhatsApp Web, directo en el chat. Al volver al panel te pregunta si la mandaste y la pasa a Enviada. Desde ahí corre la vigencia y aparece como posible en el calendario de reservas.',
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
      'Contratado: su sueldo va por liquidación, fuera del panel. Acá solo se le suman horas extra y ajustes del día.',
      'Esto es lo que gana de costumbre. Lo de un día —cuántas horas extra hizo, un atraso, un adelanto, un feriado— se anota en ese día, con su motivo.'
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
      'Si algo quedó mal, el encargado de operaciones o quien hace los pagos lo corrige —lo que cambió queda en la bitácora, con su nombre—, o lo compensa con un ajuste en la semana siguiente.'
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
      'Por su sueldo o su servicio, por semana o por mes: lo arreglan entre ustedes. La propina nunca va, y un contratado no boletea.',
      'El bruto es lo que escribe en el SII; el SII retiene la tasa del año y queda el neto, que es lo que recibe. Un adelanto no baja la boleta.',
      'Marca "Boleta recibida" mirando el mismo periodo de la boleta: la de la semana en la semana, la del mes en el mes. Si falta, igual se puede pagar.'
    ]
  },
  retenciones: {
    titulo: 'Retención de boletas',
    texto: [
      'Lo que se paga a cada uno es el neto. La retención de sus boletas la paga la empresa aparte, en el F29: por eso el costo real es el bruto.',
      'Es la suma de las boletas del periodo, sin los contratados ni los socios comerciales, que facturan.'
    ]
  },
  ajusteInforme: {
    titulo: 'Descontar o sumar desde acá',
    texto: [
      'Es el mismo ajuste de Turnos: va en el turno del día que elijas, así que suma en el periodo de esa fecha, y lo ven su link y su boleta.',
      'Hoy sirve para un adelanto pedido un día sin turno: queda fuera de turno, suma en la semana de hoy y no cuenta como día trabajado. Se quita desde su línea.',
      'Si el día ya está cerrado, queda como corrección en la bitácora, a tu nombre.'
    ]
  },
  transferenciaMasiva: {
    titulo: 'Transferencia masiva',
    texto: [
      'La planilla trae a quien le falta pago y tiene su cuenta completa. "Todos pagados" marca exactamente a esa misma gente.',
      'Las columnas van con los nombres y en el orden del formulario del banco, con el RUT con puntos, y al final el monto y la glosa.',
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
