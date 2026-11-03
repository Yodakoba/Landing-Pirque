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
 * Son tres y no más porque son tres las relaciones distintas con el negocio:
 * quien lo administra, quien hace el turno, y quien trabaja en él. Un cuarto
 * nivel sería inventar una distinción que nadie pidió.
 */
export const ROL = {
  /** Todo, incluida la plata y la configuración. */
  admin: 'admin',
  /** El día a día: reservas, días, asistencia, equipo. */
  encargado: 'encargado',
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
  /** Ver el calendario, los días y las reservas. */
  ver: [ROL.admin, ROL.encargado, ROL.pagos],
  /** Anotar, editar y borrar reservas. */
  reservas: [ROL.admin, ROL.encargado, ROL.pagos],
  /** Abrir, cerrar y editar días. */
  dias: [ROL.admin, ROL.encargado, ROL.pagos],
  /** Asignar turnos y administrar la lista de trabajadores. */
  equipo: [ROL.admin, ROL.encargado, ROL.pagos],
  /**
   * Contratar actividades extras y anotar sus montos.
   *
   * Va con el encargado y no solo con el administrador porque **cerrar el
   * día incluye decir si el jinete llegó y cuánto se le pagó**, igual que
   * pasar lista. Lo que el encargado no ve son los montos habituales ni las
   * cuentas bancarias de las fichas, que se filtran en la respuesta.
   */
  extras: [ROL.admin, ROL.encargado, ROL.pagos],
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
   */
  sueldos: [ROL.admin, ROL.pagos],
  /** Cambiar los puestos y su regla de "uno cada N personas". */
  puestos: [ROL.admin, ROL.pagos],
  /**
   * Crear, copiar, renovar y quitar los links personales de los
   * trabajadores. **Lo tiene quien paga** además del administrador: es quien
   * gestiona al equipo, y a quien le van a pedir el link.
   */
  links: [ROL.admin, ROL.pagos],
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
  planilla: [ROL.admin, ROL.encargado, ROL.pagos],
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
  presupuestos: [ROL.admin, ROL.encargado, ROL.pagos],
  /** Las cuentas del panel y sus contraseñas. */
  usuarios: [ROL.admin],
  /** Leer la bitácora. */
  bitacora: [ROL.admin, ROL.pagos],
  /**
   * El informe del mes: cuánto se le pagó a cada persona.
   *
   * **El encargado también lo ve desde el 2026-11-01**, y es una decisión
   * del cliente tomada a propósito como provisoria: *"por ahora libéralo
   * para encargado también… luego se define más especificado cuál rol tiene
   * qué derechos de ver"*. O sea que esta línea está para volver a mirarse,
   * no para quedarse.
   *
   * El argumento que tenía antes sigue en pie y conviene no perderlo: el
   * encargado necesita **el día que tiene delante** para cerrar un turno, no
   * el historial de sueldos de todo el equipo. Y hay una consecuencia
   * concreta que no es obvia, porque no está en esta tabla: `/api/informe`
   * devuelve de cada ficha **los datos de la transferencia** —RUT, banco,
   * número de cuenta—, que en todo el resto del panel son solo del
   * administrador y de quien paga. Al abrir el informe se abren también
   * esos. Es lo que hay que decidir cuando se afine la lista.
   */
  informe: [ROL.admin, ROL.encargado, ROL.pagos],
  /**
   * Registrar que a alguien ya se le pagó, entero o en parte.
   *
   * **Es lo único que distingue a `pagos` de `encargado`** (2026-11-01, lo
   * fijó el cliente). Los dos ven el informe; solo uno puede escribir en la
   * parte de los pagos. Leer cuánto se le debe a alguien y declarar que esa
   * plata salió son dos cosas distintas: lo segundo es un hecho con nombre
   * y hora, como cerrar un día, y lo hace quien hizo la transferencia.
   */
  pagar: [ROL.admin, ROL.pagos],
  /**
   * **Corregir un día ya cerrado**: el equipo, las reservas o las
   * actividades extras de ese día (2026-11-03, lo decidió el cliente).
   *
   * Cerrar un día es del encargado, que es quien lo vive; corregirlo
   * después **no**. Un día cerrado es lo que se paga, y cambiarlo cuando ya
   * se revisó es justamente lo que tiene que pasar por alguien de arriba.
   * Si el encargado se equivocó, le pide la corrección al administrador o a
   * quien paga. Cada corrección lleva motivo: ver `corregirDiaCerrado()`.
   */
  corregir: [ROL.admin, ROL.pagos],
  /** Precios, menús y configuración del negocio. */
  configurar: [ROL.admin, ROL.pagos],
  /** Consultar Shopify a mano y ver el diagnóstico de la planilla. */
  mantencion: [ROL.admin]
} as const;

export type Accion = keyof typeof PERMISOS;

export function puede(rol: Rol, accion: Accion): boolean {
  return (PERMISOS[accion] as readonly Rol[]).includes(rol);
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
export const ROLES_DE_CUENTA: Rol[] = [ROL.admin, ROL.encargado, ROL.pagos];

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
