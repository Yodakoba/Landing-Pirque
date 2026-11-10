/**
 * La hoja del contrato (Fase 4), aparte de la página que lee la planilla:
 * recibe los datos ya leídos, así que se puede dibujar con datos de prueba.
 * Ver `app/contrato/[token]/page.tsx` y `lib/contrato.ts`.
 */
import { gentePosible, cuentasDe, folioDe,
         type Presupuesto, type LineaPresupuesto } from '@/lib/presupuestos';
import { grupoDe, letraDe } from '@/lib/cotizar';
import { condicionesDe } from '@/lib/cobros';
import { clausulasDe, comparecencia, horarioDe, aliasDe, RAYA, type Parrafo } from '@/lib/contrato';
import { negocioDe } from '@/lib/negocio';
import type { Config } from '@/lib/config';
import type { Cliente } from '@/lib/clientes';
import BotonImprimir from '@/components/BotonImprimir';
import TablaCotizacion from '@/components/TablaCotizacion';

/** Lo que va entre `**` sale en negrita: los montos y los nombres. */
function Texto({ t }: { t: Parrafo }) {
  return <>{t.split('**').map((pedazo, i) => (i % 2 ? <strong key={i}>{pedazo}</strong> : pedazo))}</>;
}

export default function HojaContrato({ p, lista, lineas, clientes, cfg }: {
  p: Presupuesto;
  /** Todas las cotizaciones, para la letra de la alternativa. */
  lista: Presupuesto[];
  /** Las líneas de esta cotización. */
  lineas: LineaPresupuesto[];
  clientes: Cliente[];
  cfg: Config;
}) {
  const negocio = negocioDe(cfg.empresa);
  const cuentas = cuentasDe(lineas, p.descuento);
  const ficha = clientes.find((c) => c.id === p.idCliente);
  const cliente = {
    nombre: ficha?.nombre ?? p.cliente,
    empresa: ficha?.empresa ?? '',
    rut: ficha?.rut ?? '',
    domicilio: ficha?.domicilio ?? '',
    telefono: ficha?.telefono ?? p.telefono
  };
  const letra = letraDe(p, lista);
  const folio = `${folioDe({ id: grupoDe(p) })}${letra ? `-${letra}` : ''}`;
  const empresa = { ...cfg.empresa, nombre: negocio.nombre };
  const datos = {
    empresa,
    cliente,
    folio,
    tipoEvento: p.tipoEvento,
    lugar: `${negocio.nombre}, ${negocio.direccion}`,
    fecha: p.fecha,
    horario: horarioDe(p, cfg),
    invitados: gentePosible(p, lineas),
    total: cuentas.total,
    condiciones: condicionesDe(p, cuentas.total, cfg),
    ley20393: p.ley20393,
    acuerdos: p.acuerdos,
    tranquilidad: cfg
  };
  const clausulas = clausulasDe(datos);

  return (
    <section className="documento mx-auto max-w-2xl text-[15px] leading-relaxed">
      <div className="sin-imprimir mb-6 flex flex-wrap items-center gap-3">
        <BotonImprimir />
        <span className="text-[13px] text-hueso/60">
          Se abre la impresión del navegador: elige <strong>Guardar como PDF</strong>, o
          imprímelo directo. Se firma en dos ejemplares.
        </span>
      </div>

      <header className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-oro">{negocio.nombre}</p>
        <h1 className="mt-3 text-lg font-bold uppercase tracking-wide">
          Contrato de prestación de servicios de banquetería
        </h1>
        <p className="mt-1 text-[13px] text-hueso/60">Cotización N° {folio}</p>
      </header>

      <p className="mt-6"><Texto t={comparecencia(datos, cfg.empresa.ciudadFirma)} /></p>

      {clausulas.map((c) => (
        <div key={c.titulo} className="mt-5">
          <h2 className="font-bold">{c.titulo}</h2>
          {c.parrafos.map((t, i) => (
            <p key={i} className={i ? 'mt-2' : ''}><Texto t={t} /></p>
          ))}
          {c.puntos && (
            <ul className={`mt-1 pl-6 ${c.cuenta ? 'list-decimal' : 'list-disc'}`}>
              {c.puntos.map((t, i) => <li key={i} className="mt-1"><Texto t={t} /></li>)}
            </ul>
          )}
          {c.despues?.map((t, i) => (
            <p key={i} className="mt-2"><Texto t={t} /></p>
          ))}
          {c.tabla && (
            <div className="mt-3 text-sm">
              <TablaCotizacion lineas={lineas} cuentas={cuentas} descuento={p.descuento}
                uf={p.uf} fechaUF={p.fechaUF} />
            </div>
          )}
          {c.cuenta && (
            <>
              <p className="mt-2">
                Los pagos deben realizarse a la siguiente cuenta por medio de transferencia:
              </p>
              <p className="mt-1 whitespace-pre-line rounded border border-hueso/30 p-3">
                {cfg.empresa.transferencia || RAYA}
              </p>
            </>
          )}
        </div>
      ))}

      <p className="mt-5">
        <strong>Ejemplares.</strong> El presente contrato se firma en dos ejemplares,
        quedando uno en poder de cada parte.
      </p>

      <div className="firmas mt-16 grid grid-cols-2 gap-8 text-center text-sm">
        <div className="border-t border-hueso/60 pt-2">
          {cfg.empresa.representante || 'Prestador'}
          <br />p.p. {cfg.empresa.razonSocial || aliasDe(empresa)}
        </div>
        <div className="border-t border-hueso/60 pt-2">
          {cliente.empresa ? <>{cliente.nombre}<br />p.p. {cliente.empresa}</> : cliente.nombre || 'Cliente'}
        </div>
      </div>
    </section>
  );
}
