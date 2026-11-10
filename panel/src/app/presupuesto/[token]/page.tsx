/**
 * El presupuesto como lo ve el cliente.
 *
 * **Es un link, y se imprime a PDF desde el navegador.** Se eligió sobre
 * generar el archivo en el servidor: sin dependencias nuevas, sale un PDF
 * de verdad, se manda por WhatsApp como los otros links del panel, y si se
 * corrige un precio el mismo link ya muestra lo corregido — un adjunto
 * viejo, en cambio, nadie sabe que lo es. Ver `BotonImprimir`.
 *
 * **Es un componente de servidor y lee la planilla directo**, igual que
 * `/mi/`: así no existe ninguna ruta de API nueva que alguien pueda llamar
 * con un token prestado para sacar datos en bruto. Lo único que sale de acá
 * es el HTML de una cotización.
 *
 * **Lo que NO tiene, a propósito: un botón de "acepto".** Sería una puerta
 * de escritura sin contraseña sobre un dato que mueve el cupo de un día. El
 * cliente responde por WhatsApp y el encargado lo marca en el panel.
 */
import { leerPresupuestos, leerLineasPresupuesto, leerClientes, leerConfig } from '@/lib/datos';
import { porToken, lineasDe, gentePosible, cuentasDe,
         estadoVisible, folioDe, DOCUMENTO } from '@/lib/presupuestos';
import { clienteDe, grupoDe, letraDe } from '@/lib/cotizar';
import { condicionesDe } from '@/lib/cobros';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, hoy } from '@/lib/fechas';
import BotonImprimir from '@/components/BotonImprimir';
import TablaCotizacion from '@/components/TablaCotizacion';
import { negocioDe } from '@/lib/negocio';

export const dynamic = 'force-dynamic';

export default async function Pagina({ params }: { params: { token: string } }) {
  const [lista, todas, clientes, cfg] = await Promise.all([
    leerPresupuestos(), leerLineasPresupuesto(),
    leerClientes().catch(() => []), leerConfig()
  ]);
  const negocio = negocioDe(cfg.empresa);
  const p = porToken(lista, decodeURIComponent(params.token ?? ''));

  // **El mismo mensaje para un link inventado y para uno que ya no está**,
  // igual que en `/mi/`: decir "ese presupuesto se borró" confirmaría que
  // existió, y a quien sí es cliente no le sirve de nada — la salida es la
  // misma, pedirlo de nuevo.
  if (!p) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">Este link no sirve</h1>
        <p className="mt-3 text-sm text-hueso/70">
          Puede estar mal copiado, o puede que te hayan mandado uno nuevo.
          Escríbenos y te lo reenviamos.
        </p>
      </section>
    );
  }

  const lineas = lineasDe(todas, p.id);
  // **Las cuentas como en una cotización** (Fase 2): cada línea en neto, el
  // descuento sobre el total, y el IVA encima. Ver `cuentasDe()`.
  const cuentas = cuentasDe(lineas, p.descuento);
  const personas = gentePosible(p, lineas);
  const cliente = clienteDe(p, clientes);
  const cond = condicionesDe(p, cuentas.total, cfg);
  // Con factura, los datos de facturación de la ficha van en la hoja.
  const ficha = p.documento === DOCUMENTO.factura
    ? clientes.find((c) => c.id === p.idCliente) : undefined;
  const estado = estadoVisible(p, hoy());
  const vencido = estado === 'Vencida';

  return (
    <section className="documento mx-auto max-w-2xl">
      {/* Lo que no va al papel: el botón. Se esconde al imprimir. */}
      <div className="sin-imprimir mb-6 flex flex-wrap items-center gap-3">
        <BotonImprimir />
        <span className="text-[13px] text-hueso/60">
          Se abre la impresión del navegador: elige <strong>Guardar como PDF</strong>.
        </span>
      </div>

      {vencido && (
        <p className="mb-6 rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-sm
                      text-ambar-texto">
          <strong>Esta cotización venció</strong> el{' '}
          <span className="first-letter:uppercase">{enPalabras(p.validoHasta)}</span>. Escríbenos
          y te lo actualizamos con los precios de hoy.
        </p>
      )}

      <header className="border-b border-hueso/20 pb-5">
        <p className="text-sm font-bold uppercase tracking-widest text-oro">
          {negocio.nombre}
        </p>
        <h1 className="mt-3 text-2xl font-bold uppercase tracking-wide">Cotización</h1>
        {(negocio.razonSocial || negocio.rut) && (
          <p className="text-[13px] text-hueso/60">
            {[negocio.razonSocial, negocio.rut && `RUT ${negocio.rut}`].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="mt-1 text-[13px] text-hueso/60">
          N° {folioDe({ id: grupoDe(p) })}{letraDe(p, lista) && <> · Alternativa {letraDe(p, lista)}</>}
          {p.creado && <> · emitido el {p.creado.slice(0, 10)}</>}
        </p>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
            Para
          </p>
          <p className="mt-1 text-base font-semibold">{cliente.nombre}</p>
          {cliente.empresa && <p className="text-sm text-hueso/70">{cliente.empresa}</p>}
          {cliente.telefono && <p className="text-sm text-hueso/70">{cliente.telefono}</p>}
          {cliente.email && <p className="text-sm text-hueso/70">{cliente.email}</p>}
          {p.documento && (
            <p className="mt-2 text-sm">
              <span className="font-semibold">{p.documento === DOCUMENTO.sin
                ? 'Sin documento' : `Con ${p.documento.toLowerCase()}`}</span>
            </p>
          )}
          {ficha && (ficha.rut || ficha.giro || ficha.domicilio) && (
            <div className="mt-1 text-sm text-hueso/70">
              {ficha.rut && <p>RUT {ficha.rut}</p>}
              {ficha.giro && <p>Giro: {ficha.giro}</p>}
              {ficha.domicilio && <p>{ficha.domicilio}</p>}
            </div>
          )}
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
            Fecha del evento
          </p>
          <p className="mt-1 text-base font-semibold first-letter:uppercase">
            {p.fecha ? enPalabras(p.fecha) : `Por definir: ${p.periodo}`}
          </p>
          {p.tipoEvento && <p className="text-sm text-hueso/70">{p.tipoEvento}</p>}
          {personas > 0 && (
            <p className="text-sm text-hueso/70">
              {personas} {personas === 1 ? 'persona' : 'personas'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-7">
        <TablaCotizacion lineas={lineas} cuentas={cuentas} descuento={p.descuento}
          uf={p.uf} fechaUF={p.fechaUF} />
      </div>

      {/* **Las condiciones de pago**, de la misma función que usa la
          pantalla (y el contrato después): no pueden decir cosas distintas. */}
      {cuentas.total > 0 && (
        <div className="mt-5 rounded border border-hueso/15 p-3 text-sm">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
            Condiciones de pago
          </p>
          {cond.pct > 0 ? (
            <p className="mt-1">
              Anticipo {cond.pct}%: <strong>{enPesos(cond.anticipo)}</strong> para reservar la fecha.
              Saldo: <strong>{enPesos(cond.saldo)}</strong>
              {cond.saldoHasta
                ? <> hasta el <span>{enPalabras(cond.saldoHasta)}</span>.</>
                : <>, {cond.dias} días antes del evento.</>}
            </p>
          ) : (
            <p className="mt-1">
              Sin anticipo. Total <strong>{enPesos(cond.saldo)}</strong>
              {cond.saldoHasta
                ? <> hasta el <span>{enPalabras(cond.saldoHasta)}</span>.</>
                : <>, {cond.dias} días antes del evento.</>}
            </p>
          )}
          {cfg.empresa.transferencia && (
            <p className="mt-1 text-hueso/70">Datos para transferir: {cfg.empresa.transferencia}</p>
          )}
        </div>
      )}

      {p.notas && (
        <p className="mt-6 rounded border border-hueso/15 bg-panel p-3 text-sm">
          {p.notas}
        </p>
      )}

      <div className="mt-7 border-t border-hueso/20 pt-5 text-[13px] text-hueso/70">
        {p.validoHasta && !vencido && (
          <p>
            <strong>Válido hasta el{' '}
              <span className="first-letter:uppercase">{enPalabras(p.validoHasta)}</span>.</strong>{' '}
            La fecha del evento se confirma al aceptar esta cotización; mientras
            tanto no está reservada.
          </p>
        )}
        {!p.validoHasta && (
          <p>
            La fecha del evento se confirma al aceptar esta cotización; mientras
            tanto no está reservada.
          </p>
        )}
        <p className="mt-3">
          ¿Lo tomamos? Escríbenos por WhatsApp al{' '}
          <strong>{negocio.whatsapp}</strong> o a {negocio.email}.
        </p>
        <p className="mt-3 text-hueso/55">
          {negocio.nombre} · {negocio.direccion}
        </p>
      </div>
    </section>
  );
}
