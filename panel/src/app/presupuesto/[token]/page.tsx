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
import { porToken, lineasDe, gentePosible, netoDeLinea, cuentasDe,
         estadoVisible, folioDe, IVA, DOCUMENTO } from '@/lib/presupuestos';
import { clienteDe } from '@/lib/cotizar';
import { condicionesDe } from '@/lib/cobros';
import { enUF } from '@/lib/uf';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, hoy } from '@/lib/fechas';
import BotonImprimir from '@/components/BotonImprimir';

export const dynamic = 'force-dynamic';

/**
 * Los datos del negocio, que son los confirmados del proyecto.
 *
 * **El WhatsApp es el de Eventos**, no el de Reservas, y eso es deliberado:
 * un presupuesto se cotiza conversando —agencias, empresas, matrimonios— y
 * ese es justamente el canal de ese público. Los dos números son distintos
 * a propósito; ver CLAUDE.md.
 */
const NEGOCIO = {
  nombre: 'Brasas de Lo Pirque',
  direccion: 'Casas de San Vicente, lote 4, Pirque, Región Metropolitana',
  email: 'contacto@lopirque.cl',
  whatsapp: '+56 9 3385 8575'
};

export default async function Pagina({ params }: { params: { token: string } }) {
  const [lista, todas, clientes, cfg] = await Promise.all([
    leerPresupuestos(), leerLineasPresupuesto(),
    leerClientes().catch(() => []), leerConfig()
  ]);
  // **Quién es el negocio sale de Configuración** cuando está escrito (Fase
  // 1); si no, los datos de siempre de este archivo.
  const negocio = {
    nombre: cfg.empresa.nombre || NEGOCIO.nombre,
    direccion: cfg.empresa.domicilio || NEGOCIO.direccion,
    email: NEGOCIO.email,
    whatsapp: cfg.empresa.whatsapp || NEGOCIO.whatsapp,
    razonSocial: cfg.empresa.razonSocial,
    rut: cfg.empresa.rut
  };
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
  const tasaIVA = Math.round(IVA * 100);
  const personas = gentePosible(p, lineas);
  const cliente = clienteDe(p, clientes);
  const cond = condicionesDe(p, cuentas.total, cfg);
  // Con factura, los datos de facturación de la ficha van en la hoja.
  const ficha = p.documento === DOCUMENTO.factura
    ? clientes.find((c) => c.id === p.idCliente) : undefined;
  const estado = estadoVisible(p, hoy());
  const vencido = estado === 'Vencida';
  const precioNeto = (precio: number, ivaIncluido: boolean) =>
    Math.round(ivaIncluido ? precio / (1 + IVA) : precio);

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
          N° {folioDe(p)}
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

      {/* **La tabla se desplaza de lado dentro de su caja**, como las del
          panel, y lleva `relative` por lo mismo: sin eso la página entera se
          corría 11px a 393px —venía así de antes— y un documento que se
          abre en un teléfono no puede empezar movido. Al imprimir la caja
          deja de recortar: la hoja es mucho más ancha y la tabla entra. */}
      <div className="relative mt-7 overflow-x-auto caja-tabla">
      <table className="w-full text-sm">
        <thead className="text-left text-[13px] font-semibold uppercase
                          tracking-wide text-hueso/60">
          <tr className="border-b border-hueso/20">
            <th className="py-2 pr-3">Concepto</th>
            <th className="py-2 pr-3 text-right">Cantidad</th>
            <th className="py-2 pr-3 text-right">Precio neto</th>
            <th className="py-2 text-right">Subtotal neto</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i} className="border-b border-hueso/10">
              <td className="py-2.5 pr-3">
                {l.concepto}
                {l.precioUF > 0 && (
                  <span className="ml-1 text-hueso/60">({enUF(l.precioUF)} c/u)</span>
                )}
                {l.precio === 0 && <span className="text-hueso/60"> · incluido</span>}
                {l.descuento > 0 && <span className="text-hueso/60"> · {l.descuento}% de descuento</span>}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{l.cantidad}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{enPesos(precioNeto(l.precio, l.ivaIncluido))}</td>
              <td className="py-2.5 text-right tabular-nums">{enPesos(Math.round(netoDeLinea(l)))}</td>
            </tr>
          ))}
          {lineas.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-hueso/60">
              Todavía no hay nada cotizado.
            </td></tr>
          )}
        </tbody>
        {/* **El desglose va sobre el total y no línea por línea**: la suma
            de los netos de cada línea no da el neto del total, y dos netos
            distintos en una misma hoja es justo lo que no puede pasar en un
            documento que va a la contabilidad de una empresa. El total es el
            que manda —es lo que se cobra— y por eso sigue siendo el número
            grande y en dorado. */}
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 pr-3 text-right text-sm text-hueso/70">
              Neto
            </td>
            <td className="pt-4 text-right text-sm tabular-nums text-hueso/70">
              {enPesos(cuentas.subtotal)}
            </td>
          </tr>
          {cuentas.descuento > 0 && (
            <>
              <tr>
                <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
                  Descuento {p.descuento}%
                </td>
                <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
                  −{enPesos(cuentas.descuento)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
                  Neto con descuento
                </td>
                <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
                  {enPesos(cuentas.neto)}
                </td>
              </tr>
            </>
          )}
          <tr>
            <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
              IVA {tasaIVA}%
            </td>
            <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
              {enPesos(cuentas.iva)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="border-t border-hueso/20 pr-3 pt-2 text-right
                                       text-sm font-semibold">
              Total
            </td>
            <td className="border-t border-hueso/20 pt-2 text-right text-xl
                           font-bold tabular-nums text-oro">
              {enPesos(cuentas.total)}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {/* **Que los precios incluyen IVA se dice con palabras, no solo con el
          desglose.** Un presupuesto que va a una empresa lo lee alguien que,
          si no está dicho, le suma 19% encima por costumbre — y nos deja
          fuera de presupuesto por un impuesto que ya estaba cobrado. */}
      <p className="mt-3 text-[13px] font-semibold text-hueso/70">
        Los precios de cada línea son netos: el IVA se suma al final.
      </p>
      {p.uf > 0 && lineas.some((l) => l.precioUF > 0) && (
        <p className="mt-1 text-[13px] text-hueso/70">
          Los valores en UF se convirtieron con la UF del {p.fechaUF}: {enPesos(p.uf)}.
        </p>
      )}

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
