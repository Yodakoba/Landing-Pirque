/**
 * La página del trabajador: sus turnos y **su plata**, con filtro por semana
 * o por mes.
 *
 * Entra con un link personal, sin contraseña ni correo. Se eligió sobre una
 * clave compartida de solo lectura por una razón concreta: con una clave
 * compartida cualquier trabajador vería lo que gana y lo que le descontaron
 * a todos los demás.
 *
 * **Es un componente de servidor y lee la planilla directamente, sin pasar
 * por una ruta de API.** Así no existe ningún endpoint nuevo que alguien
 * pueda llamar con un token prestado para sacar datos en bruto: lo único que
 * sale de acá es el HTML ya recortado de una persona.
 *
 * ## Para qué es esta página (2026-11-03)
 *
 * Lo dijo el cliente, y cambió el orden de todo: *"la idea de crear link
 * personal tiene que ser que cada trabajador ve de forma fácil el resumen de
 * lo que ganó, que pueda filtrar por cada semana, mensual… eso es su
 * herramienta para controlar: oye, se ingresó todo el dato correcto de
 * cuándo trabajé, cuánta propina gané y qué me han pagado a la cuenta"*.
 *
 * O sea que esto no es una agenda con un apéndice de montos: es **un estado
 * de cuenta**, y los turnos que vienen son el apéndice. Hasta ese día era al
 * revés y en la práctica la plata no se veía — y había un caso en que
 * directamente no existía: el bloque se dibujaba solo si había días con
 * asistencia marcada, así que a quien nadie le hubiera cerrado sus días la
 * página le salía **sin una sola cifra y sin nada que explicara por qué**.
 *
 * Las tres preguntas que vino a contestar, y dónde:
 *
 * | Pregunta | Dónde se contesta |
 * |---|---|
 * | ¿Cuándo trabajé, y quedó bien anotado? | el día por día, **con los días sin marcar a la vista** |
 * | ¿Cuánta propina gané? | su azulejo, y su línea en cada día |
 * | ¿Qué me pagaron a la cuenta? | el bloque de pagos, con lo que falta |
 *
 * **Los días sin marcar se muestran**, y es parte del punto: la página
 * sirve para controlar que el dato esté bien, y un sábado que nadie cerró es
 * justamente lo que hay que poder ver para ir a reclamarlo. Antes se
 * filtraban y desaparecían.
 *
 * ## Dos pestañas, y semanas con nombre (2026-11-04)
 *
 * Arriba, **💰 Lo que gané** y **📅 Lo que viene** (`?v=viene`), como dos
 * botones grandes: son las dos preguntas con que se abre este link. En lo
 * ganado, la semana elegida va en grande con su etiqueta —*Semana pasada*,
 * *En curso*, *Próxima semana*— y **flechas a los lados, sin tope**; debajo,
 * la escalera de semanas, cada una diciendo si tuvo actividad. Lo que viene
 * son los turnos asignados en tarjetas grandes, con cuánta gente y cuántas
 * reservas hay, y el pronóstico del día.
 *
 * ## El filtro no usa una línea de JavaScript
 *
 * El periodo viaja en la URL (`?p=2026-11-10` una semana, `?p=2026-11` un
 * mes) y las flechas, las filas y las pastillas son enlaces. Es un componente de servidor, así que no
 * hacía falta nada más — misma idea que el selector de idiomas del sitio
 * público, que es un `<details>`.
 *
 * **No muestra reservas, ni nombres de clientes, ni a los demás
 * trabajadores, ni las actividades extras.** Los totales por menú son cuánto
 * hay que cocinar; quién lo pidió y cuánto pagó no es dato de un turno.
 */
import { leerTrabajadores, leerTurnos, leerFechas, leerConfig, leerReservas,
         leerMenus, leerPagosEquipo, leerColaboradores, leerExtras, leerVendedores,
         leerPresupuestos, leerLineasPresupuesto, leerCobros, leerClientes } from '@/lib/datos';
import { colaboradorPorToken } from '@/lib/extras';
import VistaColaborador from './Colaborador';
import VistaSocio from './Socio';
import { HOJA_VENDEDORES, socioPorToken, ventasDe } from '@/lib/vendedores';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS, folioDe } from '@/lib/presupuestos';
import { HOJA_COBROS } from '@/lib/cobros';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { conCliente } from '@/lib/cotizar';
import { conLecturas } from '@/lib/sheets';
import { HOJA_TRABAJADORES, HOJA_TURNOS } from '@/lib/equipo';
import { HOJA_FECHAS, HOJA_RESERVAS } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_PAGOS } from '@/lib/remuneraciones';
import { HOJA_COLABORADORES, HOJA_ACTIVIDADES } from '@/lib/extras';
import { menusDe } from '@/lib/shopify';
import { trabajadorPorToken, turnosDe, pagoDe, esContratado, esPreparacion,
         totalAjustes, informeDelPeriodo, rangoDelPeriodo, semanaPorDefecto,
         periodosDelLink, esPeriodo, VINO, etiquetaSemana, escaleraDeSemanas,
         type Turno } from '@/lib/equipo';
import { pagosEnPeriodo, pagosQueNoCaben, aTransferirDe, faltaDe,
         estadoDePago } from '@/lib/remuneraciones';
import { enPesos, ocupaLugar } from '@/lib/ocupacion';
import { enPalabras, mesEnPalabras, rangoEnPalabras, hoy, diaSemana, semanaDe,
         sumarDias, type Fecha } from '@/lib/fechas';
import { climaDe, urlPronostico, IDENTIFICACION, iconoDe, FUENTE,
         type Clima } from '@/lib/clima';
import { estaCerrado } from '@/lib/columnas';
import { vistaPrevia } from '@/lib/vistaPrevia';

/** El título al llegar el link: ver `lib/vistaPrevia.ts`. */
export const metadata = vistaPrevia('Tu resumen', 'Tus días, lo que ganaste y lo que ya se te pagó.');

export const dynamic = 'force-dynamic';

/** Desde cuándo mirar para tener "todos sus turnos". */
const SIEMPRE = '0000-01-01';

/**
 * Una línea del desglose: qué es a la izquierda, cuánto a la derecha.
 *
 * **Va al nivel del módulo y no dentro de la página**, que es la regla del
 * proyecto: un componente declarado adentro de otro es un tipo nuevo en cada
 * dibujado, y React lo desmonta y lo vuelve a montar.
 *
 * `conSigno` pone el **−** o el **+** adelante —`−$5.000`, no `$-5.000`—,
 * que es la convención del panel: el signo pegado al peso se lee como un
 * error de tipeo justo donde importa saber si se suma o se resta.
 */
function Linea({ que, monto, conSigno = false, fuerte = false, nota }: {
  que: string;
  monto: number;
  conSigno?: boolean;
  fuerte?: boolean;
  /** Para decir por qué una línea vale cero, en vez de dejar el cero solo. */
  nota?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${
      fuerte ? 'mt-1.5 border-t border-hueso/15 pt-1.5' : ''}`}>
      <dt className={fuerte ? 'font-semibold text-hueso/85' : 'text-hueso/70'}>
        {que}
        {nota && <span className="text-hueso/60"> · {nota}</span>}
      </dt>
      <dd className={`shrink-0 tabular-nums ${fuerte
        ? 'text-base font-bold text-oro'
        : monto < 0 ? 'text-rojo-texto' : 'text-hueso/85'}`}>
        {conSigno && (monto < 0 ? '−' : '+')}
        {enPesos(Math.abs(monto))}
      </dd>
    </div>
  );
}

/**
 * Un azulejo: número grande arriba, qué es debajo.
 *
 * **La misma forma para las dos filas**, igual que en la página del día del
 * panel, y por el mismo motivo: son los números por los que se abre esta
 * página, y repetir la forma es lo que los deja leerse sin aprender dos
 * diseños. El número va grande porque es lo que se mira primero —regla
 * PlayStation— y no un dato de 12px al costado de una palabra.
 */
function Azulejo({ que, monto, color = 'oro', nota, grande = false }: {
  que: string;
  monto: number;
  color?: 'oro' | 'verde' | 'ambar' | 'hueso';
  nota?: string;
  /** El dato principal, que se lee de lejos. Uno por pantalla. */
  grande?: boolean;
}) {
  const tono = {
    oro: 'border-oro/30 bg-oro/[0.06] text-oro',
    verde: 'border-verde/40 bg-verde/[0.06] text-verde-texto',
    ambar: 'border-ambar/40 bg-ambar/[0.06] text-ambar-texto',
    hueso: 'border-hueso/20 bg-panel text-hueso/85'
  }[color];
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${tono}`}>
      <p className={`font-bold leading-none tabular-nums ${
        grande ? 'text-[34px]' : 'text-[24px]'}`}>{enPesos(monto)}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-hueso/70">{que}</p>
      {nota && <p className="text-[13px] text-hueso/60">{nota}</p>}
    </div>
  );
}

/**
 * Una pastilla del filtro. El periodo elegido va **relleno de dorado**, que
 * es el único relleno de la pantalla: se distingue por forma y no solo por
 * color, que es lo que pide la regla del panel.
 */
function Pastilla({ token, periodo, actual, children }: {
  token: string;
  periodo: string;
  actual: string;
  children: React.ReactNode;
}) {
  const elegida = periodo === actual;
  return (
    <a href={`/mi/${encodeURIComponent(token)}?p=${periodo}`}
       aria-current={elegida ? 'page' : undefined}
       className={`boton tecla boton-angosto first-letter:uppercase ${
         elegida ? 'boton-relleno' : ''}`}>
      {children}
    </a>
  );
}

/**
 * El pronóstico de un día, para quien va a trabajar: si hay que venir con
 * bloqueador o con parka. Lo pide el servidor a MET Norway, igual que el
 * panel, y se guarda una hora. **Si MET no responde, la página sale igual**,
 * sin el ícono: nada de esto depende del tiempo.
 */
async function pronostico(): Promise<Clima[]> {
  try {
    const r = await fetch(urlPronostico(), {
      headers: { 'User-Agent': IDENTIFICACION },
      next: { revalidate: 60 * 60 }
    });
    return r.ok ? climaDe(await r.json()) : [];
  } catch { return []; }
}

/**
 * La etiqueta de una semana: *En curso*, *Semana pasada*, *Próxima semana*…
 *
 * **Cada una con su color**, que es lo que la hace reconocible sin leerla:
 * la en curso va **rellena de dorado y con un punto que late** —es la que
 * corre—, la pasada en verde porque es la que te pagan, las que vienen en
 * celeste. Y con borde, para que se distingan por forma y no solo por color.
 */
function EtiquetaSemana({ texto }: { texto: string }) {
  const tono = texto === 'En curso'
    ? 'border-oro bg-oro text-tinta'
    : texto === 'Semana pasada'
      ? 'border-verde-fuerte/60 bg-verde/10 text-verde-texto'
      : texto.startsWith('En ') || texto === 'Próxima semana'
        ? 'border-cielo-fuerte/60 bg-cielo/10 text-cielo-texto'
        : 'border-hueso/25 text-hueso/70';
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full
                      border-2 px-2.5 py-0.5 text-[13px] font-bold ${tono}`}>
      {texto === 'En curso' && (
        <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-tinta" />
      )}
      {texto}
    </span>
  );
}

/** Lo que la tarjeta de un turno que viene necesita saber de su día. */
interface DatosDelTurno {
  fecha: Fecha;
  puesto: string;
  apertura: string;
  personas: number;
  reservas: number;
  preparando: boolean;
  menus: { menu: string; cantidad: number }[];
  notas: string;
  clima?: Clima;
  esHoy: boolean;
}

/**
 * **Un turno que viene, como tarjeta grande** (2026-11-04, lo pidió el
 * cliente: *"ayuda al trabajador a identificar: ok, eso es lo que se me
 * viene"*). Lo que se mira de lejos va grande —el día, el puesto, el sol—
 * y lo que se lee de cerca va debajo: a qué hora, cuánta gente, qué se
 * prepara.
 *
 * **Cuánta gente y cuántas reservas, y nada más de ellas**: ni nombres ni
 * montos. Es cuánto trabajo viene, no de quién.
 */
function TarjetaTurno({ d }: { d: DatosDelTurno }) {
  const cielo = d.clima ? iconoDe(d.clima.simbolo) : null;
  return (
    <li className={`rounded-2xl border-2 bg-panel p-4 ${
      d.esHoy ? 'border-oro shadow-lg' : 'border-hueso/20'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {d.esHoy && (
            <span className="mb-1 inline-block rounded-full bg-oro px-2.5 py-0.5
                             text-[13px] font-bold text-tinta">Hoy</span>
          )}
          <p className="text-lg font-bold leading-tight first-letter:uppercase">
            {enPalabras(d.fecha)}
          </p>
          <p className="mt-1.5 inline-block rounded-lg border-2 border-oro/60 bg-oro/10
                        px-2.5 py-1 text-[15px] font-bold text-oro">
            {d.puesto || 'Sin puesto definido'}
          </p>
        </div>
        {cielo && d.clima && (
          <div title={`Pronóstico de ${FUENTE.texto}`}
               className="flex shrink-0 flex-col items-center rounded-xl border-2
                          border-hueso/15 px-3 py-2 text-center">
            <span aria-hidden className="text-[30px] leading-none">{cielo.icono}</span>
            {d.clima.max !== null && (
              <span className="mt-1 text-[17px] font-bold tabular-nums">
                {Math.round(d.clima.max)}°
              </span>
            )}
            <span className="text-[13px] text-hueso/70">{cielo.texto}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[14px]">
        <span className="rounded-lg border border-hueso/20 px-2.5 py-1">
          🕐 Desde las <strong>{d.apertura}</strong>
        </span>
        {d.preparando ? (
          <span className="rounded-lg border border-oro/50 bg-oro/10 px-2.5 py-1 text-oro">
            🔧 Día de preparación, no abre al público
          </span>
        ) : (
          <span className="rounded-lg border border-hueso/20 px-2.5 py-1">
            👥 <strong className="tabular-nums">{d.personas}</strong>{' '}
            {d.personas === 1 ? 'persona' : 'personas'}
            <span className="text-hueso/60"> · {d.reservas}{' '}
              {d.reservas === 1 ? 'reserva' : 'reservas'}</span>
          </span>
        )}
      </div>

      {d.menus.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {d.menus.map(({ menu, cantidad }) => (
            <li key={menu}
                className="rounded border border-hueso/15 px-2 py-1 text-[13px]">
              <strong className="tabular-nums text-oro">{cantidad}</strong>
              <span className="text-hueso/60"> × </span>
              <span className="text-hueso/80">{menu}</span>
            </li>
          ))}
        </ul>
      )}
      {d.notas && <p className="mt-2 text-[13px] text-hueso/70">{d.notas}</p>}
    </li>
  );
}

/**
 * Las dos pestañas de arriba: **lo que gané** y **lo que viene**. Son las dos
 * preguntas con que se abre este link, y por eso van como dos botones
 * grandes y no como un enlace al pie. La elegida va rellena de dorado.
 */
function Pestana({ href, elegida, children }: {
  href: string; elegida: boolean; children: React.ReactNode;
}) {
  return (
    <a href={href} aria-current={elegida ? 'page' : undefined}
       className={`tecla flex min-h-[56px] flex-1 items-center justify-center gap-1.5
                   whitespace-nowrap rounded-xl border-2 px-2 text-center text-[15px] font-bold ${
         elegida ? 'border-oro bg-oro text-tinta'
                 : 'border-hueso/25 bg-panel text-hueso/85 hover:border-oro'}`}>
      {children}
    </a>
  );
}

/** Una flecha del navegador de semanas: 48px, para el dedo. */
function Flecha({ href, children, etiqueta }: {
  href: string; children: React.ReactNode; etiqueta: string;
}) {
  return (
    <a href={href} aria-label={etiqueta} title={etiqueta}
       className="tecla flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
                  border-2 border-hueso/25 bg-panel text-xl font-bold text-hueso/85
                  hover:border-oro hover:text-oro">
      {children}
    </a>
  );
}

export default async function Pagina({ params, searchParams }: {
  params: { token: string };
  searchParams: { p?: string; v?: string };
}) {
  // **Todo en una tanda** (2026-11-12): eran siete consultas a Google por
  // visita, una por pestaña; ahora es una sola, con los extras incluidos.
  const [gente, turnos, fechas, cfg, reservas, catalogo, pagos, clima, colaboradores, extras, fichasV] = await conLecturas(
    [HOJA_TRABAJADORES, HOJA_TURNOS, HOJA_FECHAS, HOJA_CONFIG, HOJA_RESERVAS, HOJA_MENUS, HOJA_PAGOS,
     HOJA_COLABORADORES, HOJA_ACTIVIDADES, HOJA_VENDEDORES],
    async () => Promise.all([
    leerTrabajadores(), leerTurnos(),
    // Igual que las reservas: la hora de apertura y las notas del día son un
    // extra. `leerFechas()` no atrapa sus errores —las pantallas del panel
    // quieren verlos— así que se atrapan acá.
    leerFechas().catch(() => []), leerConfig(),
    // Cuánta gente se espera es un extra: si no se puede leer, la página
    // igual tiene que decirle a la persona qué día y en qué puesto trabaja.
    // Sin esto, una falla al leer las reservas le devolvía un error 500.
    leerReservas().catch(() => []),
    // El catálogo solo sirve para escribir bien los nombres de los menús.
    // Si no se puede leer, los totales salen igual con el nombre crudo.
    leerMenus().catch(() => []),
    // Y si no se pueden leer los pagos, lo peor que pasa es que se vea todo
    // sin pagar — que es exactamente lo que se ve cuando nadie ha pagado.
    leerPagosEquipo().catch(() => []),
    pronostico(),
    // **El link de un colaborador extra** (2026-11-12): si el token no es de
    // un trabajador, se busca en las fichas de las actividades extras.
    leerColaboradores().catch(() => []),
    leerExtras().catch(() => []),
    // **El link de un socio comercial** (2026-11-12): su ficha viaja en la
    // misma tanda; sus ventas, en una segunda, solo si el token es suyo.
    leerVendedores().catch(() => [])
  ]))();

  // La lista vacía no es "tu link no sirve": no existe el caso de un token
  // válido con la lista en cero. Es la planilla que no respondió, y decirle
  // a la persona que su link está malo la manda a pedir uno nuevo que
  // tampoco va a funcionar.
  if (gente.length === 0 && colaboradores.length === 0 && fichasV.length === 0) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">No se pudo cargar</h1>
        <p className="mt-3 text-sm text-hueso/70">
          Tu link está bien; el problema es nuestro. Vuelve a intentarlo en un
          rato, y si sigue igual avísale a quien organiza los turnos.
        </p>
      </section>
    );
  }

  const quien = trabajadorPorToken(gente, decodeURIComponent(params.token));
  const colaborador = quien ? undefined : colaboradorPorToken(colaboradores, decodeURIComponent(params.token));
  if (colaborador) {
    const porDia = new Map(fechas.map((f) => [f.fecha, f]));
    return (
      <VistaColaborador quien={colaborador} extras={extras} pagos={pagos} token={params.token}
        p={searchParams?.p} v={searchParams?.v}
        apertura={(f) => porDia.get(f)?.apertura || cfg.horaApertura} />
    );
  }

  const socio = quien || colaborador ? undefined : socioPorToken(fichasV, decodeURIComponent(params.token));
  if (socio) {
    // Una tanda más, solo para un socio: las cotizaciones que lo nombran.
    const [presupuestos, lineas, cobros, clientes] = await conLecturas(
      [HOJA_PRESUPUESTOS, HOJA_LINEAS, HOJA_COBROS, HOJA_CLIENTES],
      async () => Promise.all([leerPresupuestos(), leerLineasPresupuesto(), leerCobros(), leerClientes().catch(() => [])])
    )();
    const ventas = ventasDe(socio.usuario, presupuestos.map((x) => conCliente(x, clientes)), lineas, cobros, socio, catalogo)
      .map((x) => ({ ...x, folio: folioDe({ id: x.grupo }) }));
    return <VistaSocio socio={socio} ventas={ventas} pagos={pagos} token={params.token}
      p={searchParams?.p} v={searchParams?.v} />;
  }

  // **El mismo mensaje para un link inventado y para uno revocado.** Decir
  // "ese link ya no sirve" confirmaría que existió, y no le sirve de nada a
  // quien sí es trabajador: para él la salida es la misma, pedir uno nuevo.
  if (!quien) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">Este link no sirve</h1>
        <p className="mt-3 text-sm text-hueso/70">
          Puede estar mal copiado, o puede que te hayan dado uno nuevo.
          Pídele el link a quien organiza los turnos.
        </p>
      </section>
    );
  }

  const ahora = hoy();
  const suyos = turnosDe(turnos, quien.nombre, SIEMPRE);
  const mios = suyos.filter((t) => t.fecha >= ahora);
  // Solo lo ya trabajado entra en las cuentas. Un turno de hoy o de mañana
  // todavía no se pagó, y contarlo como "sin marcar" convertiría el aviso
  // —"hay un día que nadie cerró"— en algo que aparece siempre.
  const trabajados = suyos.filter((t) => t.fecha < ahora);

  /**
   * El periodo que se está mirando. Llega en la URL y **se comprueba**:
   * `?p=` con basura se ignora en vez de armar un rango con `NaN` y
   * mostrar una página vacía sin decir por qué.
   */
  const pedido = String(searchParams?.p ?? '');
  const periodo = esPeriodo(pedido) ? pedido : semanaPorDefecto(ahora);
  const esMes = periodo.length === 7;
  const { desde, hasta } = rangoDelPeriodo(periodo);
  const comoSeLlama = esMes ? mesEnPalabras(periodo) : rangoEnPalabras([desde, hasta]);

  const { meses } = periodosDelLink(trabajados, ahora);
  /**
   * La escalera de semanas: la que viene, la en curso, la pasada y las
   * anteriores con turnos. Si alguien llegó con las flechas a una que no
   * está, se le agrega: sin esto estaría mirando una semana y ninguna fila
   * se vería marcada, que se lee como que el filtro está roto. Lo mismo con
   * los meses.
   */
  const escalera = escaleraDeSemanas(suyos, ahora);
  const lista = esMes ? meses : escalera;
  if (!lista.includes(esMes ? periodo : desde)) {
    lista.push(esMes ? periodo : desde);
    lista.sort().reverse();
  }

  /**
   * Las cuentas del periodo salen de `informeDelPeriodo()`, la misma función
   * con la que quien paga arma su planilla. **Es a propósito que sea la
   * misma**: si la persona y quien le paga vieran números calculados por
   * caminos distintos, el día que no coincidan nadie sabría cuál creer.
   */
  const l = informeDelPeriodo(trabajados, desde, hasta)[0];
  const cuenta = l ?? {
    dias: 0, noVino: 0, sinMarcar: 0, jornadas: 0, horasExtra: 0,
    montoHorasExtra: 0, ajustes: 0, propina: 0, total: 0
  };
  const aTransferir = aTransferirDe(cuenta.total, cuenta.propina);
  const recibidos = pagosEnPeriodo(pagos, quien.nombre, desde, hasta);
  const pagado = recibidos.reduce((s, p) => s + p.monto, 0);
  const falta = faltaDe(aTransferir, pagado);
  const estado = estadoDePago(aTransferir, pagado);
  // Los pagos que cubren un periodo más largo que el que se está mirando.
  // Lo normal es que no haya ninguno; cuando hay, callarlo se leería como
  // "no me pagaron".
  const aMedias = pagosQueNoCaben(pagos, quien.nombre, desde, hasta);

  /**
   * Si los pedazos no suman el total, es porque **algún día quedó en cero**:
   * `pagoDe()` nunca baja de cero, así que un descuento mayor que la jornada
   * se come el resto y deja de cuadrar. Es raro, pero callarlo haría que la
   * persona sumara con la calculadora y le diera otra cosa — que es
   * exactamente lo que esta página viene a evitar.
   */
  const cuadra = cuenta.jornadas + cuenta.montoHorasExtra + cuenta.ajustes === cuenta.total;

  const delPeriodo = trabajados
    .filter((t) => t.fecha >= desde && t.fecha <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
  const delDia = (fecha: string) => reservas.filter((r) => r.fecha === fecha && ocupaLugar(r));
  const personasDe = (fecha: string) =>
    delDia(fecha).reduce((s, r) => s + (Number(r.personas) || 0), 0);

  const rotulo = 'text-[13px] font-semibold uppercase tracking-widest text-hueso/60';
  const enlace = (q: string) => `/mi/${encodeURIComponent(params.token)}${q}`;
  const vista = searchParams?.v === 'viene' ? 'viene' : 'gane';
  const estaSemana = semanaDe(ahora);
  const climaPorFecha = new Map(clima.map((c) => [c.fecha, c]));

  /** Lo que la tarjeta de un turno que viene muestra de su día. */
  const datosDe = (t: Turno): DatosDelTurno => {
    const dia = porFecha.get(t.fecha);
    const personas = personasDe(t.fecha);
    return {
      fecha: t.fecha,
      puesto: t.puesto,
      apertura: dia?.apertura || cfg.horaApertura,
      personas,
      reservas: delDia(t.fecha).length,
      // Un día sin público y con equipo es preparación: quien lo lee tiene
      // que saber si va a atender o a montar.
      preparando: esPreparacion({
        conEquipo: true,
        abierto: dia ? !estaCerrado(dia.estado) : cfg.diasAbiertos.includes(diaSemana(t.fecha)),
        personas
      }),
      menus: menusDe(delDia(t.fecha), catalogo),
      notas: dia?.notas || '',
      clima: climaPorFecha.get(t.fecha),
      esHoy: t.fecha === ahora
    };
  };

  /**
   * Lo que dice cada fila de la escalera a la derecha: **si esa semana tuvo
   * actividad**. Una semana ya trabajada dice cuántos días y cuánto; una que
   * viene, cuántos turnos tiene; una vacía lo dice con palabras.
   */
  const actividadDe = (lunes: Fecha): { texto: string; hay: boolean } => {
    const hasta = sumarDias(lunes, 6);
    const porVenir = mios.filter((t) => t.fecha >= lunes && t.fecha <= hasta).length;
    const hecho = informeDelPeriodo(trabajados, lunes, hasta)[0];
    const partes: string[] = [];
    if (hecho && hecho.dias > 0) {
      partes.push(`${hecho.dias} ${hecho.dias === 1 ? 'día' : 'días'} · `
        + enPesos(aTransferirDe(hecho.total, hecho.propina)));
    } else if (hecho && hecho.sinMarcar > 0) {
      partes.push(`${hecho.sinMarcar} sin cerrar`);
    }
    if (porVenir > 0) partes.push(`${porVenir} ${porVenir === 1 ? 'turno' : 'turnos'} por venir`);
    return partes.length ? { texto: partes.join(' · '), hay: true } : { texto: 'sin turnos', hay: false };
  };

  // La semana que se mira **todavía no empieza**: no hay nada que cobrar, y
  // lo que sirve mostrar son sus turnos.
  const futura = !esMes && desde > estaSemana;
  const porVenirDelPeriodo = esMes ? [] : mios.filter((t) => t.fecha >= desde && t.fecha <= hasta);

  // Lo que viene, agrupado por semana para la pestaña "Lo que viene".
  const semanasQueVienen = [...new Set(mios.map((t) => semanaDe(t.fecha)))].sort();

  return (
    <section className="mx-auto max-w-md">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-oro">
        Tu resumen
      </p>
      <h1 className="mt-1 text-xl font-bold uppercase tracking-wide">{quien.nombre}</h1>

      {/* **Las dos preguntas con que se abre este link, como dos botones
          grandes** (2026-11-04, lo pidió el cliente: *"un poco más presente
          un botón futuras semanas"*). Antes lo que viene estaba al final de
          la página, debajo de todas las cuentas, y había que saber que
          existía para bajar a buscarlo. */}
      <nav className="mt-4 flex gap-2">
        <Pestana href={enlace('')} elegida={vista === 'gane'}>
          <span aria-hidden>💰</span> Lo que gané
        </Pestana>
        <Pestana href={enlace('?v=viene')} elegida={vista === 'viene'}>
          <span aria-hidden>📅</span> Lo que viene
          {mios.length > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[13px] tabular-nums ${
              vista === 'viene' ? 'bg-tinta/15' : 'bg-oro text-tinta'}`}>
              {mios.length}
            </span>
          )}
        </Pestana>
      </nav>

      {vista === 'viene' ? (
        /* ====================== LO QUE VIENE ====================== */
        <>
          {mios.length === 0 ? (
            <p className="mt-6 rounded-2xl border-2 border-hueso/20 bg-panel p-4 text-[15px] text-hueso/80">
              No tienes turnos asignados por ahora. Cuando te asignen uno,
              aparece acá — este mismo link sigue sirviendo, no hace falta
              pedir otro.
            </p>
          ) : (
            semanasQueVienen.map((lunes) => (
              <div key={lunes} className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <EtiquetaSemana texto={etiquetaSemana(lunes, ahora)} />
                  <span className="text-[15px] font-semibold first-letter:uppercase">
                    {rangoEnPalabras([lunes, sumarDias(lunes, 6)])}
                  </span>
                </div>
                <ul className="mt-2 space-y-3">
                  {mios.filter((t) => semanaDe(t.fecha) === lunes).map((t) => (
                    <TarjetaTurno key={t.fecha + t.puesto} d={datosDe(t)} />
                  ))}
                </ul>
              </div>
            ))
          )}
          {clima.length > 0 && mios.length > 0 && (
            <p className="mt-4 text-[13px] text-hueso/60">
              El pronóstico llega a unos 9 días y es de {FUENTE.texto}. Más
              adelante todavía no hay.
            </p>
          )}
        </>
      ) : (
        /* ====================== LO QUE GANÉ ====================== */
        <>
          {/* ---------- La semana que se mira, con flechas ---------- */}

          {!esMes && (
            /* **La semana elegida en grande, con flechas a los lados**
               (2026-11-04). Se lee qué semana es —*Semana pasada*, *En
               curso*— y no solo sus fechas, y las flechas llevan a la
               anterior o a la siguiente sin tope: se puede ir próxima,
               próxima, próxima. Son enlaces, así que no hay JavaScript. */
            <div className="mt-5 flex items-center gap-2 rounded-2xl border-2 border-oro/60
                            bg-oro/[0.06] p-2.5">
              <Flecha href={enlace(`?p=${sumarDias(desde, -7)}`)} etiqueta="Semana anterior">◀</Flecha>
              <div className="min-w-0 flex-1 text-center">
                <EtiquetaSemana texto={etiquetaSemana(desde, ahora)} />
                <p className="mt-1 text-[17px] font-bold leading-tight first-letter:uppercase">
                  {comoSeLlama}
                </p>
              </div>
              <Flecha href={enlace(`?p=${sumarDias(desde, 7)}`)} etiqueta="Semana siguiente">▶</Flecha>
            </div>
          )}

          {/* ---------- Los números del periodo ---------- */}

          {esMes && (
            <h2 className="mt-7 text-base font-bold first-letter:uppercase">{comoSeLlama}</h2>
          )}

          {/* Los turnos que todavía vienen en esta semana: en la semana en
              curso y en las que vienen, es lo primero que hay que ver. */}
          {porVenirDelPeriodo.length > 0 && (
            <>
              <h3 className={`${rotulo} mt-5`}>Por trabajar</h3>
              <ul className="mt-2 space-y-3">
                {porVenirDelPeriodo.map((t) => (
                  <TarjetaTurno key={t.fecha + t.puesto} d={datosDe(t)} />
                ))}
              </ul>
            </>
          )}

          {futura ? (
            porVenirDelPeriodo.length === 0 && (
              <p className="mt-4 text-sm text-hueso/70">
                No tienes turnos asignados esta semana todavía.
              </p>
            )
          ) : delPeriodo.length === 0 && recibidos.length === 0
              && porVenirDelPeriodo.length > 0 ? (
            // En la semana en curso, con turnos que todavía no llegan, el
            // aviso de "no hay nada anotado" sobra: arriba ya están los
            // turnos, y debajo de ellos se lee como que algo falló.
            null
          ) : (
      delPeriodo.length === 0 && recibidos.length === 0 ? (
        // **Antes acá no se dibujaba nada**, y una pantalla en blanco se lee
        // como que la página está mala. Decir que no hay nada anotado, y
        // cuándo aparece, manda a reclamar al lugar correcto.
        <p className="mt-2 text-sm text-hueso/70">
          No hay nada anotado en {esMes ? 'este mes' : 'esta semana'}. Un día
          aparece acá cuando quien organiza los turnos lo cierra, así que si
          trabajaste y no lo ves, dilo.
        </p>
      ) : (
        <>
          {/* **El total va solo y arriba**, no de tercero en una fila de
              tres: es el número por el que se abre esta página, y los otros
              dos son su desglose. Con tres columnas a 393px además no
              cabía —un `$100.000` a 26px se sale de su azulejo— que es la
              misma lección de la tarjeta del calendario: si una medida
              tiene que respetarse, hay que declararla.

              **La propina va sumada acá**, al revés que en las cuentas del
              negocio: para quien la recibe es una sola plata que llega a
              una sola cuenta. Mostrada aparte debajo, eso sí, para que
              pueda revisar cada cosa. */}
          <div className="mt-3">
            <Azulejo que="Total" monto={aTransferir} color="oro" grande />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Azulejo que="Turnos" monto={cuenta.total} color="hueso"
              nota={`${cuenta.dias} ${cuenta.dias === 1 ? 'día trabajado' : 'días trabajados'}`} />
            <Azulejo que="Propina" monto={cuenta.propina} color="hueso" />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Azulejo que="Te pagaron" monto={pagado}
              color={estado === 'pagado' ? 'verde' : 'hueso'} />
            {/* El azulejo de lo que falta **solo si falta algo**, igual que
                el de "ya no vienen" en la página del día: un "$0 falta" es
                ruido justo en la fila que se mira para saber si está todo. */}
            {falta > 0
              ? <Azulejo que="Te falta" monto={falta} color="ambar" />
              : (
                <div className="flex items-center rounded-lg border border-verde/40
                                bg-verde/[0.06] p-3 text-[13px] font-semibold text-verde-texto">
                  ✓ {aTransferir > 0 ? 'Está todo pagado' : 'Nada por cobrar'}
                </div>
              )}
          </div>


          {/* **Va acá arriba, pegado a los azulejos, y no al final de la
              lista de pagos.** Al mirar un mes con un pago quincenal, los
              azulejos dicen "Te pagaron $0 · Te falta $68.000" — que es
              cierto para ese periodo y se lee como un error. La explicación
              tiene que estar donde está la duda, no una pantalla más abajo.

              **Y no dice a dónde ir a buscarlo**, que es lo que decía
              antes: una quincena que cruza de mes no cabe en NINGÚN periodo
              que las pastillas ofrezcan, así que "míralo en el mes" habría
              sido un consejo que no funciona justo en el caso que lo
              dispara. Dice qué es y que no está sumado, que sí es siempre
              verdad. */}
          {aMedias.length > 0 && (
            <div className="mt-2 rounded-lg border border-hueso/25 bg-panel p-3
                            text-[13px] text-hueso/70">
              <p>
                {aMedias.length === 1
                  ? 'Hay un pago que no está sumado arriba, porque cubre un periodo distinto del que estás mirando:'
                  : `Hay ${aMedias.length} pagos que no están sumados arriba, porque cubren un periodo distinto del que estás mirando:`}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {aMedias.map((x) => (
                  <li key={x.id || x.fila} className="text-hueso/85">
                    <strong className="tabular-nums">{enPesos(x.monto)}</strong>
                    {' '}del {rangoEnPalabras([x.desde, x.hasta])}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cuenta.sinMarcar > 0 && (
            <p className="mt-2 rounded-lg border border-ambar/40 bg-ambar/[0.06]
                          p-3 text-[13px] text-ambar-texto">
              {cuenta.sinMarcar === 1
                ? 'Hay un día que nadie cerró todavía, así que no está contado acá. Si trabajaste ese día, avísale a quien organiza los turnos.'
                : `Hay ${cuenta.sinMarcar} días que nadie cerró todavía, así que no están contados acá. Si trabajaste esos días, avísale a quien organiza los turnos.`}
            </p>
          )}

          {!cuadra && (
            <p className="mt-2 text-[13px] text-hueso/70">
              Algún día quedó en cero porque el descuento era mayor que la
              jornada: un día nunca baja de cero.
            </p>
          )}

          {/* ---------- Qué te pagaron ---------- */}

          <h3 className={`${rotulo} mt-7`}>Lo que te pagaron</h3>
          {recibidos.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-hueso/70">
              {aTransferir > 0
                ? 'Todavía no hay ningún pago anotado por este periodo.'
                : 'No hay pagos anotados por este periodo.'}
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {recibidos.map((p) => (
                <li key={p.id || p.fila}
                    className="flex items-baseline justify-between gap-3 rounded border
                               border-hueso/15 bg-panel px-3 py-2 text-[13px]">
                  <span>
                    <span className="text-hueso/85 first-letter:uppercase">
                      {p.fecha ? enPalabras(p.fecha) : 'Sin fecha'}
                    </span>
                    {p.nota && <span className="text-hueso/60"> · {p.nota}</span>}
                  </span>
                  <strong className={`shrink-0 text-[15px] tabular-nums ${
                    p.monto < 0 ? 'text-rojo-texto' : 'text-hueso/85'}`}>
                    {p.monto < 0 && '−'}{enPesos(Math.abs(p.monto))}
                  </strong>
                </li>
              ))}
            </ul>
          )}

          {/* ---------- El día por día ---------- */}

          {delPeriodo.length > 0 && (
            <>
              <h3 className={`${rotulo} mt-7`}>Día por día</h3>
              {/* **Un día es una tarjeta con su desglose, no una línea con
                  un monto** (2026-11-01, lo pidió el cliente: que la persona
                  vea *"cuánto por turno, cuánto propina, cuánto se le restó
                  por alguna razón, los extras"*).

                  Antes acá iba una sola cifra por día, que es justo la que no
                  se puede revisar: quien ve $35.000 y esperaba $40.000 no
                  tiene cómo saber si le descontaron algo, si le pagaron horas
                  extra o si está mal. Con la jornada, las horas, cada ajuste
                  **con su motivo** y la propina a la vista, la pregunta se
                  contesta sola — y si queda algo que reclamar, se reclama
                  nombrando la línea. */}
              <ul className="mt-1.5 space-y-2">
                {delPeriodo.map((t) => {
                  const jornada = esContratado(t.modalidad) ? 0 : (t.pagoJornada || 0);
                  const horasExtra = (t.horasExtra || 0) * (t.valorHora || 0);
                  const total = pagoDe(t);
                  return (
                    <li key={t.fecha + t.puesto}
                        className="rounded border border-hueso/15 bg-panel p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-sm font-semibold text-hueso/85 first-letter:uppercase">
                          {enPalabras(t.fecha)}
                        </span>
                        <span className="text-[13px] text-hueso/70">{t.puesto}</span>
                      </div>

                      {t.asistencia === VINO.no ? (
                        <p className="mt-1.5 text-[13px] text-hueso/70">No viniste ese día.</p>
                      ) : t.asistencia !== VINO.si ? (
                        // **Un día sin cerrar se muestra**, y es la mitad del
                        // punto de esta página: es lo que hay que poder ver
                        // para ir a reclamarlo. Antes se filtraba y
                        // desaparecía sin dejar rastro.
                        <p className="mt-1.5 inline-block rounded-full border border-ambar/50
                                      px-2 py-0.5 text-[13px] font-semibold text-ambar-texto">
                          sin cerrar todavía
                        </p>
                      ) : (
                        <dl className="mt-2 space-y-1 text-[13px]">
                          {esContratado(t.modalidad) ? (
                            <Linea que="Jornada" nota="va en tu sueldo, no acá" monto={0} />
                          ) : (
                            <Linea que="Jornada" monto={jornada} />
                          )}
                          {horasExtra > 0 && (
                            <Linea monto={horasExtra}
                              que={`Horas extra (${t.horasExtra} × ${enPesos(t.valorHora)})`} />
                          )}
                          {/* Cada ajuste por separado y con su motivo:
                              sumarlos en una línea sería volver a esconder
                              el porqué, que es lo único que explica un
                              descuento un mes después. */}
                          {t.ajustes.map((a, k) => (
                            <Linea key={k} monto={a.monto} conSigno
                              que={a.motivo || (a.monto < 0 ? 'Descuento' : 'Extra')} />
                          ))}
                          {t.propina > 0 && <Linea que="Propina" monto={t.propina} />}
                          {/* El total del día va ARRIBA de nada: la propina
                              se dice antes, porque un total seguido de otra
                              cifra se lee como si esa otra no estuviera
                              contada. */}
                          <Linea que="Total del día" monto={total + (t.propina || 0)} fuerte />
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <p className="mt-3 text-[13px] text-hueso/70">
            {esContratado(quien.modalidad)
              ? 'Tu sueldo no sale de acá: lo que aparece son tus horas extra y los ajustes del día.'
              : 'Es lo que quedó anotado al cerrar cada día. Si ves algo raro, dilo.'}
          </p>
        </>
      )
          )}

          {/* ---------- La escalera de semanas ---------- */}

          {/* **Todas las semanas en orden, de la que viene a las anteriores**,
              cada una con su etiqueta y con si tuvo actividad. La elegida va
              marcada con borde dorado. Antes eran pastillas sueltas con
              fechas, y había que leerlas para saber cuál era la que pagan. */}
          <h3 className={`${rotulo} mt-9`}>Tus semanas</h3>
          <nav className="mt-2 space-y-2">
            {escalera.map((lunes) => {
              const elegida = !esMes && lunes === desde;
              const act = actividadDe(lunes);
              return (
                <a key={lunes} href={enlace(`?p=${lunes}`)}
                   aria-current={elegida ? 'page' : undefined}
                   className={`tecla flex min-h-[52px] items-center gap-3 rounded-xl border-2
                               px-3 py-2 ${elegida
                     ? 'border-oro bg-oro/10'
                     : 'border-hueso/15 bg-panel hover:border-oro/60'}`}>
                  <span className="w-[8.5rem] shrink-0">
                    <EtiquetaSemana texto={etiquetaSemana(lunes, ahora)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold first-letter:uppercase">
                      {rangoEnPalabras([lunes, sumarDias(lunes, 6)])}
                    </span>
                    <span className={`block text-[13px] ${act.hay ? 'text-hueso/75' : 'text-hueso/50'}`}>
                      {act.texto}
                    </span>
                  </span>
                  <span aria-hidden className={`text-lg ${elegida ? 'text-oro' : 'text-hueso/40'}`}>
                    {elegida ? '●' : '›'}
                  </span>
                </a>
              );
            })}
          </nav>

          <p className={`${rotulo} mt-6`}>O mira un mes entero</p>
          <nav className="mt-1.5 flex flex-wrap gap-1.5">
            {meses.map((m) => (
              <Pastilla key={m} token={params.token} periodo={m} actual={periodo}>
                {mesEnPalabras(m)}
              </Pastilla>
            ))}
          </nav>
        </>
      )}

      <p className="mt-8 text-[13px] text-hueso/60">
        Esta página es solo tuya. Si te cambian el turno, cambia sola: no
        hace falta que vuelvan a mandarte nada.
      </p>
    </section>
  );
}
