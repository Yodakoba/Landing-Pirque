import { NextResponse } from 'next/server';
import { horarioDe, faltaDeEmpresa } from '@/lib/contrato';
import { UF_MINIMA, UF_MAXIMA } from '@/lib/uf';
import { exigir, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerLineasPresupuesto, guardarPresupuesto, guardarLineas,
  borrarPresupuesto, leerMenus, leerConfig, leerClientes, leerFechas, anotar, leerCobros,
  sincronizarReserva
} from '@/lib/datos';
import {
  nuevoId, validoHastaDe, ESTADO_PRESUPUESTO, estaMandada, aEntero, folioDe, estadoNormal, lineasDe,
  documentoDe, numeroONulo, type Presupuesto, type LineaEntrante
} from '@/lib/presupuestos';
import {
  prepararLineas, esDiaPublico, conCliente, ESTADOS_A_MANO, grupoDe, otrasAlternativas
} from '@/lib/cotizar';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { nuevoToken } from '@/lib/equipo';
import { hoy, esFecha } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { guardaDelDia } from '@/lib/guardaCierre';

export const dynamic = 'force-dynamic';

/**
 * Las cotizaciones, sus líneas y todo lo que hace falta para armar una.
 *
 * **El cliente se resuelve acá, desde su ficha** (`conCliente()`): una
 * cotización nueva guarda solo el `ID Cliente`, y la pantalla recibe el
 * nombre y el contacto ya puestos. Las de antes de las fichas siguen
 * mostrando lo que tenían escrito.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const [presupuestos, lineas, menus, cfg, clientes, fechas, cobros] = await Promise.all([
      leerPresupuestos(), leerLineasPresupuesto(), leerMenus(), leerConfig(),
      leerClientes(), leerFechas(), leerCobros().catch(() => [])
    ]);
    return NextResponse.json({
      presupuestos: presupuestos.map((p) => conCliente(p, clientes)),
      lineas, menus, clientes,
      // Lo justo para los avisos de la lista: de qué cotización, cuánto y si
      // ya se revisó.
      cobros: cobros.map((c) => ({ presupuesto: c.presupuesto, monto: c.monto,
        revisadoPor: c.revisadoPor, concepto: c.concepto })),
      // Solo lo que hace falta para saber si un día es público, privado o
      // cerrado: de eso dependen la tarjeta y la regla del show ecuestre.
      fechas: fechas.map((f) => ({ fecha: f.fecha, estado: f.estado, capacidad: f.capacidad })),
      vigencia: cfg.vigenciaPresupuesto,
      descuentos: cfg.descuentos,
      condiciones: { anticipoPct: cfg.anticipoPct, saldoDias: cfg.saldoDias },
      seguimiento: { dias: cfg.seguimientoDias, antesEvento: cfg.avisoEvento },
      empresa: cfg.empresa.nombre,
      // Para avisar antes de ganar si el día ya no tiene cupo (`cupoParaGanar()`).
      cupoNormal: cfg.cupoNormal, horaApertura: cfg.horaApertura,
      // Para el contrato: el horario de siempre, y qué le falta a la empresa
      // en Configuración para que el contrato salga completo.
      contrato: {
        horario: horarioDe({ horario: '' }, cfg),
        faltaEmpresa: faltaDeEmpresa(cfg.empresa),
        // Las condiciones de cancelación por defecto: lo que rige donde la
        // cotización las deja en blanco.
        tranquilidad: { cambiosFecha: cfg.cambiosFecha, cancelacionDias: cfg.cancelacionDias,
          reembolsoPct: cfg.reembolsoPct }
      },
      hoy: hoy(),
      usuario: quien.usuario,
      rol: quien.rol
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Lo que llega del navegador, limpiado. El servidor no confía en el cliente. */
function lineasDelCuerpo(crudo: unknown, id: string): LineaEntrante[] {
  if (!Array.isArray(crudo)) return [];
  return crudo.map((x) => {
    const l = (x ?? {}) as Record<string, unknown>;
    return {
      presupuesto: id,
      concepto: String(l.concepto ?? '').trim(),
      cantidad: aEntero(l.cantidad),
      precio: aEntero(l.precio),
      personas: aEntero(l.personas),
      descuento: aEntero(l.descuento),
      ivaIncluido: l.ivaIncluido !== false,
      sigue: l.sigue === true
    };
  });
}

/** La fecha o el periodo que llegan, comprobados. */
function cuandoDelCuerpo(cuerpo: Record<string, unknown>, antes?: Presupuesto) {
  const fecha = cuerpo.fecha === undefined
    ? antes?.fecha ?? ''
    : String(cuerpo.fecha ?? '').slice(0, 10);
  const periodo = cuerpo.periodo === undefined
    ? antes?.periodo ?? ''
    : String(cuerpo.periodo ?? '').trim();
  // Con día exacto, el periodo sobra; sin día, el periodo es obligatorio.
  if (esFecha(fecha)) return { fecha, periodo: '' };
  if (periodo) return { fecha: '', periodo };
  return null;
}

const pct = (v: unknown) => Math.min(100, Math.max(0, aEntero(v)));

async function lineasListas(crudo: unknown, id: string, invitados: number, fecha: string,
  uf = 0) {
  const [menus, fechas] = await Promise.all([leerMenus(), leerFechas()]);
  return prepararLineas(lineasDelCuerpo(crudo, id), menus, invitados,
    esFecha(fecha) && esDiaPublico(fecha, fechas), uf);
}

/**
 * La UF que fija la cotización (2026-11-10). La manda la pantalla, que la
 * pidió a `/api/uf`; se acepta solo si es un valor creíble y con fecha. Sin
 * eso queda la que tenía: **la UF de una cotización no cambia sola**.
 */
function ufDelCuerpo(cuerpo: Record<string, unknown>, antes: { uf: number; fechaUF: string }) {
  const uf = Number(cuerpo.uf);
  const fecha = String(cuerpo.fechaUF ?? '').slice(0, 10);
  if (cuerpo.uf === undefined || !(uf > UF_MINIMA && uf < UF_MAXIMA) || !esFecha(fecha)) {
    return { uf: antes.uf, fechaUF: antes.fechaUF };
  }
  return { uf: Math.round(uf * 100) / 100, fechaUF: fecha };
}

/**
 * Crea una cotización (o un candidato).
 *
 * **Pide una ficha de cliente**, no un nombre suelto: es la regla que
 * evita escribir al cliente dos veces. **El token se crea acá**, porque una
 * cotización es un documento para mandar. **La vigencia la calcula el
 * servidor**, desde la planilla.
 *
 * Con `duplicarDe` es una **alternativa**: copia el cliente, la fecha, los
 * invitados y las líneas de otra, y queda en su mismo grupo.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const quien = await quienEs(req);
    const [cfg, clientes, lista] = await Promise.all([
      leerConfig(), leerClientes(), leerPresupuestos()
    ]);
    const id = nuevoId();

    // Una alternativa: la misma conversación, otras líneas.
    if (cuerpo.duplicarDe) {
      const base = lista.find((p) => p.id === String(cuerpo.duplicarDe));
      if (!base) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
      const todas = await leerLineasPresupuesto();
      const nueva: Omit<Presupuesto, 'fila'> = {
        ...base, id, grupo: grupoDe(base), token: nuevoToken(), idReserva: '',
        estado: ESTADO_PRESUPUESTO.borrador, motivo: '',
        // El contrato firmado es de la cotización que se firmó, no de una
        // alternativa: la copia nace sin firmar.
        contrato: '', contratoSubidoPor: '', contratoSubido: '',
        // Lo de la cancelación y del día es de la que se ganó, no de la copia.
        devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '',
        // Una alternativa nace sin mandar: su vigencia corre cuando se mande.
        enviada: '', ultimoSeguimiento: '', validoHasta: '', contratoEnviado: '',
        // Quien la duplica es su dueño: un vendedor que arma la opción B de
        // una cotización ajena la puede seguir editando.
        creadoPor: quien.usuario, creado: ahoraEnChile()
      };
      delete (nueva as Partial<Presupuesto>).fila;
      // La original pasa a ser parte del grupo si todavía no lo era.
      if (!base.grupo) {
        const { fila: _f, ...sinFila } = base;
        await guardarPresupuesto({ ...sinFila, grupo: base.id });
      }
      await guardarPresupuesto(nueva);
      await guardarLineas(id, lineasDe(todas, base.id).map((l) => ({ ...l, presupuesto: id })));
      await anotar({ ...quien, accion: 'Creó una alternativa de cotización',
        detalle: `${folioDe(nueva)} · alternativa de ${folioDe(base)}` });
      return NextResponse.json({ presupuesto: { ...nueva, fila: -1 } });
    }

    const idCliente = String(cuerpo.idCliente ?? '').trim();
    const cliente = clientes.find((c) => c.id === idCliente);
    if (!cliente) {
      return NextResponse.json({ error: 'Elige o crea el cliente primero.' }, { status: 400 });
    }
    const cuando = cuandoDelCuerpo(cuerpo);
    if (!cuando) {
      return NextResponse.json(
        { error: 'Falta la fecha del evento, o el periodo si todavía no hay día.' },
        { status: 400 });
    }
    const invitados = Math.max(0, aEntero(cuerpo.invitados));
    const estado = estadoNormal(cuerpo.estado) === ESTADO_PRESUPUESTO.candidato
      ? ESTADO_PRESUPUESTO.candidato : ESTADO_PRESUPUESTO.borrador;

    const p: Omit<Presupuesto, 'fila'> = {
      id, ...cuando,
      // **Del cliente se guarda solo la ficha.** Las columnas viejas quedan
      // en blanco: el nombre y el contacto se leen de `Clientes`.
      cliente: '', email: '', telefono: '', idCliente,
      estado,
      // **La vigencia corre desde que se manda, no desde que se crea**
      // (2026-11-11): un borrador que estuvo una semana armándose no puede
      // llegarle al cliente con media vigencia gastada.
      validoHasta: '',
      token: nuevoToken(),
      notas: String(cuerpo.notas ?? '').trim(),
      idReserva: '',
      invitados,
      tipoEvento: String(cuerpo.tipoEvento ?? '').trim(),
      grupo: '',
      descuento: pct(cuerpo.descuento),
      motivo: '',
      documento: documentoDe(cuerpo.documento),
      anticipo: numeroONulo(cuerpo.anticipo, 100),
      saldoDias: numeroONulo(cuerpo.saldoDias, 365),
      ...ufDelCuerpo(cuerpo, { uf: 0, fechaUF: '' }),
      horario: String(cuerpo.horario ?? '').trim(),
      ley20393: cuerpo.ley20393 === true,
      acuerdos: String(cuerpo.acuerdos ?? '').trim(),
      // El contrato firmado no se acepta del navegador: lo escribe la ruta
      // que lo sube (`/api/presupuestos/contrato`).
      contrato: '', contratoSubidoPor: '', contratoSubido: '',
      cambiosFecha: numeroONulo(cuerpo.cambiosFecha, 10),
      cancelacionDias: numeroONulo(cuerpo.cancelacionDias, 365),
      reembolso: numeroONulo(cuerpo.reembolso, 100),
      // Lo de la cancelación lo escribe solo /cancelar.
      devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '',
      // El envío no se acepta del navegador: lo marca "¿la mandaste?".
      enviada: '', ultimoSeguimiento: '', contratoEnviado: '',
      seguimientoDias: numeroONulo(cuerpo.seguimientoDias, 365),
      avisoEvento: numeroONulo(cuerpo.avisoEvento, 365),
      creadoPor: quien.usuario,
      creado: ahoraEnChile()
    };
    await guardarPresupuesto(p);
    await guardarLineas(id, await lineasListas(cuerpo.lineas, id, invitados, p.fecha, p.uf));
    await anotar({ ...quien,
      accion: estado === ESTADO_PRESUPUESTO.candidato ? 'Anotó un candidato' : 'Creó una cotización',
      detalle: `${folioDe(p)} · ${cliente.nombre} · ${p.fecha || p.periodo}` });
    return NextResponse.json({ presupuesto: { ...p, fila: -1 } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Edita una cotización. **Es parcial**: lo que no viene se conserva.
 *
 * - **El vendedor solo edita las suyas** (`puedeTocarPresupuesto()`).
 * - **No se acepta del navegador**: el token, el `ID Reserva`, quién la
 *   creó, ni el estado *Ganada* o *No elegida* —el primero se pone con
 *   "Marcar ganada", el segundo lo pone el sistema—.
 * - **Una ganada no cambia de estado**: tiene una reserva ocupando cupo. Sí
 *   se edita —más invitados, otro menú, otro precio— y **su reserva se
 *   reescribe sola** (`sincronizarReserva()`). Si el día de la reserva ya
 *   está cerrado, eso es corregirlo, con motivo.
 */
export async function PATCH(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const id = String(cuerpo.id ?? '').trim();
    const lista = await leerPresupuestos();
    const previo = lista.find((x) => x.id === id);
    if (!previo) {
      return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    }
    const quien = await quienEs(req);
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, previo.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${previo.creadoPor || 'otra persona'}, así que no es tuya para cambiarla.`,
        permiso: true
      }, { status: 403 });
    }

    // Una cancelada no se edita: su reserva ya liberó el cupo, y lo que
    // queda —la devolución— se anota en sus cobros.
    if (previo.estado === ESTADO_PRESUPUESTO.cancelada) {
      return NextResponse.json({
        error: 'Esta cotización está cancelada: ya no se edita. Si el cliente vuelve, haz una nueva.'
      }, { status: 409 });
    }

    const cuando = cuandoDelCuerpo(cuerpo, previo);
    if (!cuando) {
      return NextResponse.json(
        { error: 'Falta la fecha del evento, o el periodo si todavía no hay día.' },
        { status: 400 });
    }

    let estado = previo.estado;
    if (cuerpo.estado !== undefined) {
      const pedido = estadoNormal(cuerpo.estado);
      if (previo.idReserva && pedido !== ESTADO_PRESUPUESTO.aceptado) {
        return NextResponse.json({
          error: 'Esta cotización ya es una reserva. Si el cliente cancela, usa '
               + '"Cancelar evento": libera el cupo y anota lo que se devuelve.'
        }, { status: 409 });
      }
      if (!previo.idReserva) {
        if (!ESTADOS_A_MANO.includes(pedido)) {
          return NextResponse.json({
            error: 'Para ganarla usa "Marcar ganada": es lo que toma el cupo.'
          }, { status: 400 });
        }
        estado = pedido;
      }
    }

    // **El seguimiento** (2026-11-11). `seguimiento: 'enviada'` es el "Sí,
    // la mandé"; `'esperando'` es "sigue esperando". Las fechas las pone el
    // servidor, nunca el navegador.
    const cfgSeg = await leerConfig();
    let enviada = previo.enviada;
    let ultimoSeguimiento = previo.ultimoSeguimiento;
    let validoHasta = cuerpo.renovarVigencia
      ? validoHastaDe(hoy(), cfgSeg.vigenciaPresupuesto) : previo.validoHasta;
    if (cuerpo.seguimiento === 'enviada' && !previo.idReserva && !estaMandada(estado)) {
      estado = ESTADO_PRESUPUESTO.enviado;
    }
    if (cuerpo.seguimiento === 'esperando') ultimoSeguimiento = hoy();
    // "Sí, mandé el contrato": la fecha la pone el servidor, la primera vez.
    let contratoEnviado = previo.contratoEnviado;
    if (cuerpo.seguimiento === 'contratoEnviado') {
      if (!contratoEnviado) contratoEnviado = hoy();
      ultimoSeguimiento = hoy();
    }
    if (estado !== previo.estado) ultimoSeguimiento = hoy();
    // La primera vez que queda mandada —con el botón o eligiendo la etapa a
    // mano— se anota el día y desde ahí corre la vigencia.
    if (estaMandada(estado) && !enviada) {
      enviada = hoy();
      validoHasta = validoHastaDe(hoy(), cfgSeg.vigenciaPresupuesto);
    }

    // Una ganada que cambia de día: si el día de antes o el de después ya
    // se cerraron, es una corrección, con motivo.
    let motivoCorreccion = '';
    if (previo.idReserva) {
      const guarda = await guardaDelDia(req, [previo.fecha, cuando.fecha], cuerpo.correccion);
      if ('error' in guarda) return guarda.error;
      motivoCorreccion = guarda.motivo;
      if (!cuando.fecha) {
        return NextResponse.json(
          { error: 'Una cotización ganada tiene su reserva en un día: no puede quedar sin fecha.' },
          { status: 400 });
      }
    }

    const texto = (k: string, antes: string) =>
      cuerpo[k] === undefined ? antes : String(cuerpo[k] ?? '').trim();
    const invitados = cuerpo.invitados === undefined
      ? previo.invitados : Math.max(0, aEntero(cuerpo.invitados));

    const { fila: _f, ...sinFila } = previo;
    const p: Omit<Presupuesto, 'fila'> = {
      ...sinFila,
      ...cuando,
      idCliente: cuerpo.idCliente === undefined ? previo.idCliente
        : String(cuerpo.idCliente ?? '').trim() || previo.idCliente,
      estado,
      invitados,
      tipoEvento: texto('tipoEvento', previo.tipoEvento),
      descuento: cuerpo.descuento === undefined ? previo.descuento : pct(cuerpo.descuento),
      motivo: texto('motivo', previo.motivo),
      documento: cuerpo.documento === undefined ? previo.documento : documentoDe(cuerpo.documento),
      anticipo: cuerpo.anticipo === undefined
        ? previo.anticipo : numeroONulo(cuerpo.anticipo, 100),
      saldoDias: cuerpo.saldoDias === undefined
        ? previo.saldoDias : numeroONulo(cuerpo.saldoDias, 365),
      ...ufDelCuerpo(cuerpo, previo),
      notas: texto('notas', previo.notas),
      horario: texto('horario', previo.horario),
      ley20393: cuerpo.ley20393 === undefined ? previo.ley20393 : cuerpo.ley20393 === true,
      acuerdos: texto('acuerdos', previo.acuerdos),
      cambiosFecha: cuerpo.cambiosFecha === undefined
        ? previo.cambiosFecha : numeroONulo(cuerpo.cambiosFecha, 10),
      cancelacionDias: cuerpo.cancelacionDias === undefined
        ? previo.cancelacionDias : numeroONulo(cuerpo.cancelacionDias, 365),
      reembolso: cuerpo.reembolso === undefined
        ? previo.reembolso : numeroONulo(cuerpo.reembolso, 100),
      seguimientoDias: cuerpo.seguimientoDias === undefined
        ? previo.seguimientoDias : numeroONulo(cuerpo.seguimientoDias, 365),
      avisoEvento: cuerpo.avisoEvento === undefined
        ? previo.avisoEvento : numeroONulo(cuerpo.avisoEvento, 365),
      enviada, ultimoSeguimiento, contratoEnviado,
      // La vigencia se recalcula solo al mandarla o si lo piden. Editar una
      // línea no puede correrle el plazo al cliente.
      validoHasta
    };
    await guardarPresupuesto(p);
    // Las líneas se vuelven a preparar también cuando solo cambian los
    // invitados o la fecha: las que siguen a los invitados toman el número
    // nuevo, y la regla del show depende del día.
    if (cuerpo.lineas !== undefined || cuerpo.invitados !== undefined
        || cuerpo.fecha !== undefined || cuerpo.uf !== undefined) {
      const crudo = cuerpo.lineas !== undefined
        ? cuerpo.lineas : lineasDe(await leerLineasPresupuesto(), id);
      await guardarLineas(id, await lineasListas(crudo, id, invitados, p.fecha, p.uf));
    }
    if (p.idReserva) await sincronizarReserva(id);

    // **Las alternativas se mandan y se siguen juntas** (2026-11-11): van en
    // un solo link, así que lo que es de la conversación con el cliente —que
    // se mandó, que está negociando, que se perdió, que sigue esperando—
    // vale para todas las que siguen en carrera. Solo hacia adelante: una
    // alternativa que pasa de candidato a borrador no devuelve a las demás.
    if (!previo.idReserva) {
      const adelante: string[] = [
        ESTADO_PRESUPUESTO.enviado, ESTADO_PRESUPUESTO.negociacion, ESTADO_PRESUPUESTO.rechazado
      ];
      const estadoAdelante = p.estado !== previo.estado && adelante.includes(estadoNormal(p.estado));
      for (const otra of otrasAlternativas(previo, lista)) {
        const { fila: _fo, ...o } = otra;
        let cambio = false;
        if (estadoAdelante && estadoNormal(o.estado) !== estadoNormal(p.estado)
            && !(estadoNormal(p.estado) === ESTADO_PRESUPUESTO.enviado && estaMandada(o.estado))) {
          o.estado = p.estado;
          if (estadoNormal(p.estado) === ESTADO_PRESUPUESTO.rechazado) o.motivo = p.motivo;
          cambio = true;
        }
        // "Sí, la mandé" —también "Mandar de nuevo"— manda el link entero:
        // una alternativa nueva que todavía era borrador ya va en él.
        if (cuerpo.seguimiento === 'enviada' && !estaMandada(o.estado)) {
          o.estado = ESTADO_PRESUPUESTO.enviado; cambio = true;
        }
        if (p.enviada && !o.enviada && estaMandada(o.estado)) {
          o.enviada = p.enviada; o.validoHasta = p.validoHasta; cambio = true;
        }
        if (cuerpo.renovarVigencia && o.validoHasta !== p.validoHasta) {
          o.validoHasta = p.validoHasta; cambio = true;
        }
        if (p.ultimoSeguimiento !== previo.ultimoSeguimiento && o.ultimoSeguimiento !== p.ultimoSeguimiento) {
          o.ultimoSeguimiento = p.ultimoSeguimiento; cambio = true;
        }
        if (cambio) await guardarPresupuesto(o);
      }
    }

    await anotar({ ...quien,
      accion: motivoCorreccion ? 'Corrigió una cotización ganada de un día cerrado'
                               : 'Editó una cotización',
      detalle: `${folioDe(p)} · ${p.estado || 'Borrador'}`
             + (motivoCorreccion ? ` · motivo: ${motivoCorreccion}` : '') });
    return NextResponse.json({ ok: true, contratoEnviado: p.contratoEnviado });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Borra una cotización y sus líneas. **Una ganada no se borra**: su
 * `ID Reserva` es el rastro de dónde salió esa reserva.
 */
export async function DELETE(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const { id } = await req.json();
    const previo = (await leerPresupuestos()).find((x) => x.id === String(id ?? '').trim());
    if (!previo) return NextResponse.json({ ok: true });
    const quien = await quienEs(req);
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, previo.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${previo.creadoPor || 'otra persona'}, así que no es tuya para borrarla.`,
        permiso: true
      }, { status: 403 });
    }
    if (previo.idReserva) {
      return NextResponse.json({
        error: 'Esta cotización ya es una reserva, así que no se borra.'
      }, { status: 409 });
    }
    await borrarPresupuesto(previo.id);
    await anotar({ ...quien, accion: 'Borró una cotización', detalle: folioDe(previo) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
