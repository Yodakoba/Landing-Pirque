/**
 * La comprobación de la credencial, aparte del middleware para poder
 * probarla con node sin levantar Next.
 */

/**
 * Comparación en tiempo constante.
 *
 * No corta al primer carácter distinto: si lo hiciera, el tiempo de
 * respuesta diría cuántos caracteres se acertaron, y una clave se puede
 * adivinar letra por letra midiendo eso.
 *
 * La diferencia de largo sí se nota —se devuelve antes—, pero eso solo
 * revela el LARGO de la clave, no su contenido.
 */
export function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distintos = 0;
  for (let i = 0; i < a.length; i++) {
    distintos |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return distintos === 0;
}

/**
 * Valida una cabecera `Authorization: Basic <base64>` contra el usuario y
 * la clave esperados.
 */
export function credencialValida(cabecera: string, usuario: string, clave: string): boolean {
  const m = /^Basic\s+(.+)$/i.exec(String(cabecera).trim());
  if (!m) return false;

  let plano: string;
  try {
    plano = atob(m[1]);
  } catch {
    return false;                       // base64 inválido
  }

  // El usuario no puede llevar ":", así que el primero separa. La clave sí
  // puede llevarlos, y por eso NO se usa split.
  const corte = plano.indexOf(':');
  if (corte === -1) return false;

  // Las dos comparaciones se hacen SIEMPRE, sin cortocircuito: con `&&`,
  // un usuario equivocado respondería sin llegar a comparar la clave, y
  // ese atajo también se mide.
  const okUsuario = iguales(plano.slice(0, corte), usuario);
  const okClave = iguales(plano.slice(corte + 1), clave);
  return okUsuario && okClave;
}

/* ---------- Los tres roles ---------- */

/**
 * Quién es quien entra.
 *
 * Cada uno es **una relación distinta con el negocio**, y por eso existe:
 * quien lo administra, quien hace el turno, quien paga, quien vende y quien
 * trabaja en él. Un nivel que no corresponda a una de esas relaciones sería
 * inventar una distinción que nadie pidió.
 */
export const ROL = {
  /** Todo, incluida la plata y la configuración. */
  admin: 'admin',
  /** El día a día: reservas, días, asistencia, equipo. */
  encargado: 'encargado',
  /**
   * **Encargado de operaciones: el administrador del restaurante**
   * (2026-11-12, lo pidió el cliente; nació como "gerente de operaciones" y
   * se renombró el mismo día). Está sobre el encargado: puede todo lo suyo y
   * además **aprueba descuentos**, **sube cupos**, **corrige un día
   * cerrado**, ve el informe y marca boletas. No ve sueldos, configuración
   * ni cuentas del panel.
   *
   * **El valor guardado sigue siendo `gerente`**: es lo que ya está escrito
   * en la columna `Rol` de `Usuarios`. Cambiarlo dejaría sin rol a quien ya
   * lo tiene; lo que cambió es el nombre que se ve (`NOMBRE_ROL`).
   */
  operaciones: 'gerente',
  /**
   * **Gerencia general** (2026-11-12, lo pidió el cliente, preparado para
   * afinarlo después). Por ahora puede **lo mismo que quien paga**; el
   * cliente va a definir un par de derechos y vistas distintas. Es el rol
   * que debería reemplazar a la *vista gerencia* (ver `panel/CLAUDE.md`).
   */
  gerencia: 'gerencia',
  /**
   * Quien hace los pagos: **el encargado, más la plata.**
   *
   * Nació el 2026-10-22 como una cuenta mínima —una sola acción, leer el
   * informe— con el argumento de que juntar las cuentas no necesita ver el
   * calendario. **El cliente lo corrigió el 2026-11-01**, y tenía razón:
   * *"el encargado de pagos en verdad tiene que ver y tiene los mismos
   * derechos que el encargado, pero él sí tiene adicionalmente los derechos
   * de configurar o reescribir montos en estas filas y columnas de pago"*.
   *
   * O sea que no es un rol más chico que el encargado: **es el encargado
   * más la plata**, y ese mismo día el cliente lo terminó de ubicar como el
   * segundo rol más poderoso del panel. Puede todo **menos dos cosas**: las
   * cuentas del panel (`usuarios`) y la mantención técnica (`mantencion`).
   * Ahí entran los pagos, los sueldos de las fichas, **los links
   * personales**, los puestos, la bitácora, la configuración y corregir un
   * día cerrado. La prueba se escribe como la lista de lo que NO puede.
   */
  pagos: 'pagos',
  /**
   * **Vende, y solo eso** (2026-11-05, lo pidió el cliente): *"el vendedor
   * solo tiene que ver el calendario para poder agregar reservas, quitar
   * reservas. Reservas que el vendedor mismo ha hecho. No puede quitar
   * otras reservas que no él mismo está gestionando. Pero ver todo. Y en
   * verdad no necesita ver nada más que esto."*
   *
   * Son dos permisos y ninguno más: `ver` y `reservas`. En la barra le
   * aparece **solo el calendario**, porque el menú se dibuja desde esta
   * misma tabla.
   *
   * **Lo que lo distingue de los otros tres no es un permiso, es un
   * límite dentro de uno**: con `reservas` cualquiera edita y borra
   * cualquier fila, y un vendedor solo las suyas. Eso no cabe en la tabla
   * —que contesta *qué acciones*, no *sobre qué filas*— así que vive en
   * `puedeTocarReserva()`, al lado de `puede()`, y lo comprueba cada ruta
   * que escribe una reserva.
   *
   * **Ve todas**, que es lo que el cliente pidió: el límite es sobre lo que
   * toca, no sobre lo que mira.
   */
  vendedor: 'vendedor',
  /**
   * **Recibe a los clientes en la entrada** (2026-11-11, lo pidió el
   * cliente: *"solo tiene que poder ver las reservas y decir vino o no vino.
   * Por ahora"*). Un solo permiso, `asistencia`, y una sola
   * pantalla, `/recepcion`: las reservas de hoy, en grande para una tablet.
   * No ve el calendario ni otros días: el rol se usa solo el día de apertura.
   */
  anfitrion: 'anfitrion',
  /** Solo mira, y solo lo suyo. Entra por un link personal, sin contraseña. */
  trabajador: 'trabajador',
  /** No identificado. */
  ninguno: ''
} as const;

export type Rol = (typeof ROL)[keyof typeof ROL];

export interface Credenciales {
  adminUsuario?: string;
  adminClave?: string;
  encargadoUsuario?: string;
  encargadoClave?: string;
}

/**
 * Qué rol trae una cabecera `Authorization`.
 *
 * **Se vuelve a calcular en cada ruta, a partir de la cabecera, en vez de
 * confiar en algo que ponga el middleware.** Un middleware que escribe el rol
 * en una cabecera y rutas que la leen es cómodo, pero deja abierta una
 * pregunta incómoda: ¿y si alguien manda esa cabecera él mismo? Derivarlo de
 * la credencial en cada ruta borra esa clase entera de error, y cuesta
 * comparar dos strings.
 *
 * El middleware sigue existiendo y sigue cerrando el panel completo: eso
 * autentica. Esto otro autoriza. Son dos preguntas distintas y conviene que
 * las conteste código distinto.
 */
export function rolDe(cabecera: string, c: Credenciales): Rol {
  // Un rol sin usuario o sin clave configurados NO existe. Si no, dejar la
  // variable en blanco abriría la puerta en vez de cerrarla, que es
  // exactamente al revés de lo que hay que hacer.
  if (c.adminUsuario && c.adminClave &&
      credencialValida(cabecera, c.adminUsuario, c.adminClave)) {
    return ROL.admin;
  }
  if (c.encargadoUsuario && c.encargadoClave &&
      credencialValida(cabecera, c.encargadoUsuario, c.encargadoClave)) {
    return ROL.encargado;
  }
  return ROL.ninguno;
}

/**
 * Qué puede hacer cada rol.
 *
 * Está como tabla y no como `if`s repartidos por las rutas **para poder
 * leerla de una vez y para poder probarla**. Una regla de permisos escrita
 * en quince lugares es quince lugares donde se puede olvidar una.
 *
 * El trabajador no aparece en ninguna fila: su acceso no pasa por acá, entra
 * por su link personal a una página que solo lee lo suyo. Que no figure es
 * el punto — no hay ninguna acción del panel que pueda ejecutar.
 */
export const PERMISOS = {
  /**
   * Ver el calendario, los días y las reservas.
   *
   * **Esto es el calendario y las reservas, y nada más** — y desde el
   * 2026-11-05 eso hay que decirlo, porque antes no era verdad. Cuatro
   * rutas que no devuelven reservas se contentaban con `ver`: el equipo
   * (`/api/equipo`), las actividades extras, los presupuestos y los eventos
   * del socio. Para los tres roles que había daba lo mismo —los tres tenían
   * todo— pero al entrar el vendedor se volvió la diferencia entre "ve el
   * calendario" y "ve los teléfonos del equipo y lo que cobra cada jinete".
   * Cada una de esas cuatro pide ahora el permiso de su propia pantalla.
   */
  ver: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia, ROL.vendedor],
  /**
   * **Marcar si una reserva vino o no** (2026-11-11), y nada más de la
   * reserva. Existe aparte de `reservas` por la anfitriona: ella marca a los
   * clientes en la entrada pero no anota, edita ni borra reservas. La ruta
   * deja pasar con este permiso solo un cambio que sea únicamente la
   * asistencia. El vendedor no lo tiene: marcar no es vender.
   */
  asistencia: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia, ROL.anfitrion],
  /**
   * Anotar, editar y borrar reservas.
   *
   * **Un vendedor lo tiene, pero solo sobre las suyas.** Ver
   * `puedeTocarReserva()`: el permiso dice que puede anotar y borrar
   * reservas; sobre cuáles es otra pregunta, y se contesta aparte.
   */
  reservas: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia, ROL.vendedor],
  /** Abrir, cerrar y editar días. */
  dias: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /** Asignar turnos y administrar la lista de trabajadores. */
  equipo: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /**
   * Contratar actividades extras y anotar sus montos.
   *
   * Va con el encargado y no solo con el administrador porque **cerrar el
   * día incluye decir si el jinete llegó y cuánto se le pagó**, igual que
   * pasar lista. Lo que el encargado no ve son los montos habituales ni las
   * cuentas bancarias de las fichas, que se filtran en la respuesta.
   */
  extras: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /**
   * Ver y editar **los montos habituales y la cuenta bancaria** de una
   * ficha: la modalidad, la jornada, el valor hora, si entra en la propina
   * y los datos de la transferencia.
   *
   * **Existe porque `esAdmin` estaba haciendo de dos cosas a la vez**
   * (2026-11-01). La misma condición escondía los sueldos de la ficha **y**
   * los links personales, que no tienen nada que ver: uno es plata y el
   * otro es una credencial. Cuando el cliente pidió que quien paga viera
   * los sueldos, abrir `esAdmin` le habría dado de paso los tokens de todo
   * el equipo.
   *
   * Entonces se partió en dos. Esto es la plata; los links van aparte, en
   * `links`. Hoy los dos los tienen el administrador y quien paga —el
   * cliente terminó dando los dos—, pero siguen separados porque uno es
   * plata y el otro una credencial, y algún día un rol puede necesitar lo
   * uno sin lo otro.
   *
   * **Los dos encargados lo tienen desde el 2026-11-12** (lo pidió el
   * cliente: primero el de operaciones, *"debería poder ingresar el perfil
   * completo del equipo y también de los extras"*, y el mismo día el de
   * turno: *"tiene todo el sentido. Solo ella no puede ver el informe"*).
   * Los links no van con esto: siguen en `links`. El informe tampoco: el de
   * turno no lo ve.
   */
  sueldos: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /** Cambiar los puestos y su regla de "uno cada N personas". */
  puestos: [ROL.admin, ROL.pagos, ROL.gerencia],
  /**
   * Crear, copiar, renovar y quitar los links personales de los
   * trabajadores. **Lo tiene quien paga** además del administrador: es quien
   * gestiona al equipo, y a quien le van a pedir el link.
   */
  links: [ROL.admin, ROL.pagos, ROL.gerencia],
  /**
   * La planilla semanal: mandarla al grupo, crear su link y **renovarlo**.
   *
   * **Va con el encargado** (2026-10-29, lo pidió el cliente) porque mandar
   * la planilla es parte de organizar la semana, que es justamente su
   * trabajo. Y no le abre nada: esa página muestra **menos** de lo que el
   * encargado ya ve en el panel —quién trabaja cada día, a qué hora, cuánta
   * gente se espera, sin un peso y sin menús—, así que el link no es un
   * permiso nuevo, es la forma de mandar lo que ya tiene delante.
   *
   * **Renovar entró acá ese mismo día**, también por decisión del cliente.
   * El argumento del primer rato era que renovar invalida las copias de
   * todo el equipo y eso suena a administrar una credencial; pero quien se
   * entera de que alguien dejó el equipo —y quien va a tener que volver a
   * mandar el link— es el mismo encargado. Dejarle mandar la planilla y no
   * cerrarla cuando hace falta era partir el trabajo en dos personas.
   *
   * **Quitarlo sigue siendo de `links`** —el administrador y quien paga, no
   * el encargado—: renovar
   * deja la planilla andando con un link nuevo, quitarlo la apaga hasta que
   * alguien la vuelva a encender. Lo primero es seguir trabajando; lo
   * segundo es cerrar una puerta del panel.
   */
  planilla: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /**
   * Crear, editar y mandar presupuestos.
   *
   * **Va con el encargado** (2026-11-01, lo pidió el cliente): cotizar es
   * parte de atender una consulta, y es el encargado quien la recibe. Si no
   * pudiera, cada agencia que escribe un sábado tendría que esperar al
   * administrador.
   *
   * Y no le abre nada que no tenga: los precios siguen saliendo de la
   * pestaña `Menús`, que él no puede cambiar. Lo único que decide acá es qué
   * precio ofrecer en **esta** cotización, que es justamente la negociación.
   */
  //
  // **El vendedor cotiza desde el 2026-11-10** (Fase 2 de las cotizaciones):
  // es su trabajo. **Ve todas, edita solo las suyas** —lo decidió el
  // cliente—, igual que con las reservas: ver `puedeTocarPresupuesto()`.
  presupuestos: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia, ROL.vendedor],
  /**
   * **Las fichas de clientes** (2026-11-10): verlas, crearlas y editarlas.
   *
   * **Va con el vendedor**, al revés que casi todo lo demás: es quien
   * atiende al cliente y quien va a cotizar. Y no le abre nada que no sea
   * suyo de oficio: nombres y contactos de quienes cotizan, no plata ni
   * equipo. Borrar una ficha con cotizaciones lo impide la ruta.
   */
  clientes: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia, ROL.vendedor],
  /** Las cuentas del panel y sus contraseñas. */
  usuarios: [ROL.admin],
  /** Leer la bitácora. */
  bitacora: [ROL.admin, ROL.pagos, ROL.gerencia],
  /**
   * El informe del equipo: cuánto se le debe y se le pagó a cada persona.
   *
   * **Se afinó el 2026-11-12** (lo decidió el cliente): el encargado dejó de
   * verlo —lo había liberado el 2026-11-01 como provisorio—, y lo ve el
   * gerente de operaciones, **solo para mirar y marcar la boleta**
   * (`boleta`). Registrar pagos y los datos de la transferencia siguen
   * siendo de `pagar`: `/api/informe` ni siquiera le manda las cuentas
   * bancarias a quien no paga.
   */
  informe: [ROL.admin, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /** Marcar que llegó la boleta de alguien en el informe (2026-11-12). */
  boleta: [ROL.admin, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /**
   * Registrar que a alguien ya se le pagó, entero o en parte.
   *
   * **Es lo único que distingue a `pagos` de `encargado`** (2026-11-01, lo
   * fijó el cliente). Los dos ven el informe; solo uno puede escribir en la
   * parte de los pagos. Leer cuánto se le debe a alguien y declarar que esa
   * plata salió son dos cosas distintas: lo segundo es un hecho con nombre
   * y hora, como cerrar un día, y lo hace quien hizo la transferencia.
   */
  pagar: [ROL.admin, ROL.pagos, ROL.gerencia],
  /**
   * **Cerrar el día** (2026-11-05).
   *
   * Lo cierra también el encargado, que es quien lo vivió. El cliente lo
   * pensó dos veces el mismo día: primero quiso dejárselo solo a quien
   * paga, y lo corrigió —*"es más fácil que el encargado cierre el día, y
   * que le alarme: hey, estás cerrando el día, ¿controlaste que todos los
   * detalles están ingresados?"*—. Por eso cerrar pasa por
   * `ConfirmarCierre`, una ventana con la lista de lo que se declara, y no
   * por un `confirm()` que se acepta sin leer.
   *
   * Es un permiso propio y no `equipo` para que el día que cambie de
   * manos sea tocar esta línea. Lo que viene después de cerrar —corregir
   * con motivo— sigue siendo solo de quien paga: ver `corregir`.
   */
  cerrar: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /**
   * **Corregir un día ya cerrado**: el equipo, las reservas o las
   * actividades extras de ese día (2026-11-03, lo decidió el cliente).
   *
   * El encargado cierra el día (ver `cerrar`); corregirlo después **no**:
   * desde ahí cualquier problema pasa por quien paga. Un día cerrado es lo que se paga, y cambiarlo cuando ya
   * se revisó es justamente lo que tiene que pasar por alguien de arriba.
   * Si el encargado se equivocó, le pide la corrección al administrador o a
   * quien paga. Cada corrección lleva motivo: ver `corregirDiaCerrado()`.
   */
  corregir: [ROL.admin, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /** Precios, menús y configuración del negocio. */
  configurar: [ROL.admin, ROL.pagos, ROL.gerencia],
  /**
   * **Rectificar una reserva el día del servicio** (2026-11-12, lo pidió el
   * cliente): anotar lo que de verdad pasó en la mesa —cuántos llegaron,
   * qué menús, un descuento— con un motivo obligatorio, para que el panel
   * cuadre con Fudo. Solo desde la apertura del día. Ver `rectificacion.ts`.
   */
  rectificar: [ROL.admin, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /**
   * **Aprobar un descuento sobre el estándar** (2026-11-12). El encargado da
   * los descuentos de Configuración; uno mayor queda por aprobar hasta que
   * lo confirme el gerente, quien paga o el administrador.
   */
  aprobar: [ROL.admin, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /**
   * **Subir el cupo de un día** (2026-11-12, lo pidió el cliente): el
   * gerente de operaciones o más arriba. El encargado abre, cierra y baja
   * cupos con `dias`, pero para subirlo lo pide, y le llega al gerente a la
   * bandeja de aprobaciones. Ver `lib/cupo.ts`.
   */
  cupo: [ROL.admin, ROL.operaciones, ROL.pagos, ROL.gerencia],
  /** Consultar Shopify a mano y ver el diagnóstico de la planilla. */
  mantencion: [ROL.admin]
} as const;

export type Accion = keyof typeof PERMISOS;

export function puede(rol: Rol, accion: Accion): boolean {
  return (PERMISOS[accion] as readonly Rol[]).includes(rol);
}

/**
 * **Lo que la vista gerencia NO abre** (2026-11-11): las cuentas y sus
 * contraseñas, la mantención técnica y los links personales. No es
 * información: es acceso. Todo lo demás se puede **mirar** con ella.
 */
export const NO_SE_LEE_CON_GERENCIA: readonly Accion[] = ['usuarios', 'mantencion', 'links'];

/**
 * **Si una cuenta puede VER algo** (2026-11-11, idea del cliente). Con su rol,
 * o con la **vista gerencia**, que es un agregado de la cuenta y no un rol:
 * ve todo menos `NO_SE_LEE_CON_GERENCIA`, y **edita solo lo de su rol** —para
 * escribir sigue mandando `puede()`—. Es la regla "rol para lo que se hace,
 * alcance para dónde": el rol dice qué hace; la gerencia amplía qué ve.
 */
export function puedeVer(rol: Rol, accion: Accion, gerencia = false): boolean {
  if (puede(rol, accion)) return true;
  return gerencia && rol !== ROL.ninguno && !NO_SE_LEE_CON_GERENCIA.includes(accion);
}

/** Compara nombres de usuario sin distinguir mayúsculas ni tildes. */
const mismoUsuario = (a: string, b: string) => {
  const limpio = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();
  const x = limpio(a);
  return !!x && x === limpio(b);
};

/**
 * Si esta cuenta puede **editar o borrar esta reserva en concreto**.
 *
 * La tabla de permisos contesta *qué acciones* puede un rol; esto contesta
 * *sobre qué filas*, que es una pregunta distinta y por eso vive aparte.
 * Hasta el 2026-11-05 no hacía falta: los tres roles que entraban al panel
 * podían tocar cualquier reserva.
 *
 * Lo pidió el cliente al crear el vendedor: *"no puede quitar otras
 * reservas que no él mismo está gestionando"*. Un vendedor anota las suyas
 * y las corrige; las de los demás **las ve y no las toca**.
 *
 * **Una reserva sin dueño no es de nadie, y por lo tanto tampoco suya.** Lo
 * están todas las de Shopify —las anota el webhook, no una persona— y todas
 * las que ya estaban en la planilla antes de que existiera la columna. Es
 * el valor por defecto correcto: un vendedor no tomó ninguna de ésas, así
 * que no le toca borrarlas. El error contrario —que un vendedor nuevo
 * pudiera borrar el historial completo— es mucho más caro.
 *
 * **Vale para editar y para borrar.** El cliente nombró agregar y quitar,
 * pero dejarlo editar la reserva de otro sin poder borrarla sería media
 * regla: podría cambiarle el nombre y las personas a cualquiera.
 *
 * Lo comprueba **la ruta**, no la pantalla: una llamada directa a la API
 * tiene que obedecer lo mismo que un clic, que es la regla de este panel.
 */
export function puedeTocarReserva(
  rol: Rol, usuario: string, anotadaPor: string
): boolean {
  if (!puede(rol, 'reservas')) return false;
  // **El encargado tampoco toca la de otro** (2026-11-12, lo pidió el
  // cliente): quien la anotó es quien habla con el cliente. La de otro la
  // rectifica desde la apertura del día (`rectificar`). Una sin dueño —las de
  // Shopify y las de antes— la sigue editando como siempre.
  if (rol === ROL.encargado) return !String(anotadaPor ?? '').trim() || mismoUsuario(usuario, anotadaPor);
  if (rol !== ROL.vendedor) return true;
  return mismoUsuario(usuario, anotadaPor);
}

/**
 * Si esta cuenta puede **cambiar** una cotización (2026-11-10): el vendedor
 * solo las que creó él; los demás roles con `presupuestos`, todas. Mismo
 * criterio y misma regla que `puedeTocarReserva()`, y por lo mismo: ver todo
 * es útil para no cotizar dos veces al mismo cliente; tocar lo de otro no.
 */
/**
 * Si la cotización la hizo esta cuenta. Para el filtro *Mías / De todos* de
 * Cotizaciones (2026-11-12); la regla de quién puede tocarla es la de abajo.
 */
export function esSuya(usuario: string, creadoPor: string): boolean {
  return !!usuario && mismoUsuario(usuario, creadoPor);
}

export function puedeTocarPresupuesto(
  rol: Rol, usuario: string, creadoPor: string
): boolean {
  if (!puede(rol, 'presupuestos')) return false;
  if (rol !== ROL.vendedor) return true;
  return mismoUsuario(usuario, creadoPor);
}

/**
 * Las credenciales del entorno.
 *
 * `PANEL_USUARIO` y `PANEL_CLAVE` siguen siendo las del administrador, con
 * los mismos nombres de antes: cambiárselos habría dejado al cliente fuera
 * de su propio panel en el primer despliegue, que es la peor forma de
 * estrenar un sistema de permisos.
 */
export function credencialesDelEntorno(env: Record<string, string | undefined>): Credenciales {
  return {
    adminUsuario: env.PANEL_USUARIO,
    adminClave: env.PANEL_CLAVE,
    encargadoUsuario: env.PANEL_ENCARGADO_USUARIO,
    encargadoClave: env.PANEL_ENCARGADO_CLAVE
  };
}

/* ---------- Lo que la pantalla de cuentas necesita saber ---------- */

/**
 * Estas tres cosas viven acá y no en `usuarios.ts` **porque las usa un
 * componente de navegador**, y `usuarios.ts` importa `node:crypto` para
 * hashear contraseñas. Un `import` desde el cliente arrastra el módulo
 * entero al bundle y el build se cae con "Reading from node:crypto is not
 * handled" — pasó al escribir la pantalla de cuentas.
 *
 * La regla que deja esto: **lo que toque el navegador no puede importar
 * `node:crypto`**, ni directo ni a través de otro archivo.
 */

/**
 * Los roles que pueden entrar al panel.
 *
 * El trabajador no está: él entra por su link personal, no por acá. Una
 * cuenta con rol `trabajador` sería una puerta que no lleva a ninguna parte.
 */
export const ROLES_DE_CUENTA: Rol[] = [ROL.admin, ROL.gerencia, ROL.operaciones, ROL.encargado, ROL.pagos, ROL.vendedor, ROL.anfitrion];

export function esRolDeCuenta(v: unknown): v is Rol {
  return ROLES_DE_CUENTA.includes(
    String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().toLowerCase() as Rol
  );
}

/**
 * Con qué nombre queda anotada la clave compartida de encargado.
 *
 * **Dice que es compartida a propósito.** Una línea de bitácora firmada así
 * no identifica a nadie, y es mejor que eso se lea de corrido a que parezca
 * una persona llamada "encargado".
 */
export const ENCARGADO_COMPARTIDO = 'encargado (clave compartida)';

/**
 * El largo mínimo de una contraseña nueva.
 *
 * **Es el único freno real contra probar claves a lo bruto**, porque el
 * panel no tiene límite de intentos: Vercel no trae uno y montarlo con
 * funciones sin estado compartido daría una falsa sensación de protección.
 * Doce caracteres hacen que adivinar por la red deje de ser realista.
 *
 * Largo antes que raro: tres o cuatro palabras pegadas aguantan más que
 * ocho caracteres con símbolos, y se pueden dictar por teléfono.
 */
export const LARGO_MINIMO_CLAVE = 12;
