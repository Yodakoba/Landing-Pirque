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
   * Quien hace los pagos. **Solo ve el informe del equipo.**
   *
   * Existe porque antes esa persona tenía que entrar con la cuenta de
   * administrador, que abre también precios, configuración y las cuentas
   * del panel. Juntar las cuentas del equipo no requiere nada de eso.
   *
   * No ve reservas, ni clientes, ni el calendario: lo suyo son los turnos
   * ya cerrados y cuánto suman.
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
  ver: [ROL.admin, ROL.encargado],
  /** Anotar, editar y borrar reservas. */
  reservas: [ROL.admin, ROL.encargado],
  /** Abrir, cerrar y editar días. */
  dias: [ROL.admin, ROL.encargado],
  /** Asignar turnos y administrar la lista de trabajadores. */
  equipo: [ROL.admin, ROL.encargado],
  /**
   * Contratar actividades extras y anotar sus montos.
   *
   * Va con el encargado y no solo con el administrador porque **cerrar el
   * día incluye decir si el jinete llegó y cuánto se le pagó**, igual que
   * pasar lista. Lo que el encargado no ve son los montos habituales ni las
   * cuentas bancarias de las fichas, que se filtran en la respuesta.
   */
  extras: [ROL.admin, ROL.encargado],
  /** Cambiar los puestos y su regla de "uno cada N personas". */
  puestos: [ROL.admin],
  /** Crear, renovar y quitar los links personales de los trabajadores. */
  links: [ROL.admin],
  /** Las cuentas del panel y sus contraseñas. */
  usuarios: [ROL.admin],
  /** Leer la bitácora. */
  bitacora: [ROL.admin],
  /**
   * El informe del mes: cuánto se le pagó a cada persona.
   *
   * Es del administrador, aunque el encargado sí vea los montos de un día
   * —los escribe él al pasar lista—. La línea está puesta a propósito ahí:
   * lo que necesita para cerrar un turno es el día que tiene delante, no el
   * historial de sueldos de todo el equipo.
   */
  informe: [ROL.admin, ROL.pagos],
  /** Precios, menús y configuración del negocio. */
  configurar: [ROL.admin],
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
