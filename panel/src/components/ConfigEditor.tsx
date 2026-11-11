'use client';

/**
 * La configuración del negocio.
 *
 * Cada campo guarda al salir de él, como el resto del panel: no hay un botón
 * "Guardar" que se pueda olvidar. Lo que se escribe se valida en el servidor
 * antes de escribirse —ver /api/config— así que la respuesta trae los valores
 * ya corregidos y el formulario se redibuja con ellos. Si escribes un cupo en
 * cero, vas a ver que vuelve a 60: eso no es un error, es la validación.
 */
import { useEffect, useState } from 'react';
import Ayuda from './Ayuda';
import { usarSoloMira } from './SesionCliente';
import { Aviso } from './CalendarView';
import { deDiasSemana, idDeDrive, type Config } from '@/lib/config';

/**
 * Lo que se le manda a /api/config. `diasAbiertos` va como TEXTO, tal como
 * se escribe en el campo ("sáb,dom"), y la ruta lo interpreta: así la
 * tolerancia a tildes y abreviaturas vive en un solo lugar, el servidor, y
 * no duplicada acá.
 */
type Cambio = Partial<Omit<Config, 'diasAbiertos'>> & { diasAbiertos?: string };

const ENTRADA =
  'w-full min-h-[44px] rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

export default function ConfigEditor() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [guardando, setGuardando] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [resumen, setResumen] = useState('');
  /** Vista gerencia sin `configurar`: se mira y no se toca. */
  const soloMira = usarSoloMira('configurar');

  /**
   * Le pide a Shopify los pedidos recientes y anota lo que falte.
   *
   * Es la misma reconciliación que corre sola una vez al día, y vive acá y
   * no en el calendario porque **no es una herramienta de gestión**: la
   * gestión pasa por el panel y las reservas llegan solas por el webhook.
   * Esto se aprieta cuando se sospecha que algo falta, que es de vez en
   * cuando y no todos los días.
   *
   * Es seguro apretarlo de más: guardarPedido() es idempotente.
   */
  async function revisarShopify() {
    setRevisando(true);
    setResumen('');
    try {
      const r = await fetch('/api/shopify/sincronizar');
      const d = await r.json();
      setResumen(d.error
        ? d.error
        : `${d.revisados} pedidos revisados · ${d.creadas} nuevas · ${d.actualizadas} al día`);
    } catch (e) {
      setResumen(String(e));
    } finally {
      setRevisando(false);
    }
  }

  async function cargar() {
    const r = await fetch('/api/config');
    const d = await r.json();
    if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); }
    else setConfig(d.config);
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(cambio: Cambio, campo: string) {
    setGuardando(campo);
    try {
      const r = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cambio)
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); }
      else { setConfig(d.config); setError(''); }
    } finally {
      setGuardando('');
    }
  }

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!config) return <p className="text-hueso/50">Cargando…</p>;

  /**
   * Un campo: el título y su explicación a la izquierda, la caja a la
   * derecha. A la regla del panel: 15px el título y 13px la ayuda, nada más
   * chico.
   */
  const campo = (
    nombre: string, titulo: string, ayuda: string, entrada: React.ReactNode
  ) => (
    <div key={nombre} className="border-t border-hueso/10 py-4 first:border-t-0
                                 sm:grid sm:grid-cols-[1fr_14rem] sm:gap-6">
      <div>
        <div className="text-[15px] font-semibold">{titulo}</div>
        {ayuda && <p className="mt-1 max-w-xl text-[13px] text-hueso/65">{ayuda}</p>}
      </div>
      <div className="mt-2 sm:mt-0">
        {entrada}
        {guardando === nombre && (
          <span className="mt-1 block text-[13px] text-hueso/60">guardando…</span>
        )}
      </div>
    </div>
  );

  const numerico = (
    nombre: string, valor: number, aplicar: (n: number) => Cambio,
    rango?: { min: number; max: number; unidad?: string }
  ) => (
    <div className="flex items-center gap-2">
      <input type="number" defaultValue={valor} min={rango?.min} max={rango?.max}
        className={ENTRADA}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (n === valor) return;
          guardar(aplicar(n), nombre);
        }} />
      {rango?.unidad && <span className="shrink-0 text-[14px] text-hueso/70">{rango.unidad}</span>}
    </div>
  );

  const textoLibre = (
    nombre: string, valor: string, aplicar: (t: string) => Cambio, ejemplo = ''
  ) => (
    <input type="text" defaultValue={valor} placeholder={ejemplo} className={ENTRADA}
      onBlur={(e) => e.target.value !== valor && guardar(aplicar(e.target.value), nombre)} />
  );

  const empresa = (k: keyof Config['empresa'], titulo: string, ayuda: string, ejemplo = '') =>
    campo(`empresa-${k}`, titulo, ayuda, textoLibre(`empresa-${k}`, config.empresa[k],
      (t) => ({ empresa: { [k]: t } }) as unknown as Cambio, ejemplo));

  /**
   * **Las secciones de la página** (2026-11-10, lo pidió el cliente: *"ya
   * estamos ampliando mucho esa parte"*). Cada una es una tarjeta con su
   * título y una línea que dice para qué sirve, y arriba hay un índice con
   * un botón por sección. Ordenadas por quién las usa: primero lo que ve el
   * cliente del sitio, después el panel, después la venta de eventos.
   */
  const secciones: { id: string; titulo: string; para: string; cuerpo: React.ReactNode }[] = [
    {
      id: 'sitio', titulo: 'Reservas del sitio',
      para: 'Qué días y a qué hora se abre, cuánta gente cabe y qué fechas ofrece el sitio público.',
      cuerpo: <>
        {campo('dias', 'Días que se abre',
          'Separados por coma: “sáb,dom” y “sabado domingo” son lo mismo. Es lo que el panel ' +
          'propone al cargar fechas nuevas.',
          textoLibre('dias', deDiasSemana(config.diasAbiertos), (t) => ({ diasAbiertos: t })))}
        {campo('apertura', 'Hora de apertura',
          'Una sola jornada por día, sin bloques.',
          textoLibre('apertura', config.horaApertura, (t) => ({ horaApertura: t }), '13:00'))}
        {campo('cierre', 'Hora de cierre',
          'También es el horario que propone el contrato si la cotización no dice otro.',
          textoLibre('cierre', config.horaCierre, (t) => ({ horaCierre: t }), '18:00'))}
        {campo('cupo', 'Cupo normal de un día',
          'Las personas que caben en una jornada, niños incluidos. Es el valor de un día nuevo; ' +
          'cada día se puede cambiar aparte.',
          numerico('cupo', config.cupoNormal, (n) => ({ cupoNormal: n }), { min: 1, max: 5000, unidad: 'personas' }))}
        {campo('futuro', 'Días hacia adelante',
          'Hasta cuántos días en el futuro se ofrecen fechas en el sitio, para no tomar ' +
          'reservas a un año plazo.',
          numerico('futuro', config.diasAFuturo, (n) => ({ diasAFuturo: n }), { min: 1, max: 730, unidad: 'días' }))}
        {campo('pocos', 'Aviso de “últimos lugares”',
          'Desde cuántos lugares libres el sitio avisa que quedan pocos. Más arriba el ' +
          'visitante no ve ningún número.',
          numerico('pocos', config.avisoPocosLugares, (n) => ({ avisoPocosLugares: n }), { min: 0, max: 1000, unidad: 'lugares' }))}
      </>
    },
    {
      id: 'calendario', titulo: 'Calendario del panel',
      para: 'Los colores y avisos que ve el equipo. El visitante del sitio no los ve.',
      cuerpo: <>
        {campo('amarillo', 'Semáforo: pasa a amarillo',
          'Porcentaje de ocupación desde el que un día se ve amarillo.',
          numerico('amarillo', Math.round(config.cortes.amarillo * 100),
            (n) => ({ cortes: { ...config.cortes, amarillo: n / 100 } }), { min: 1, max: 100, unidad: '%' }))}
        {campo('rojo', 'Semáforo: pasa a rojo',
          'Tiene que ser mayor que el amarillo; si no, vuelven los dos a 60 y 85.',
          numerico('rojo', Math.round(config.cortes.rojo * 100),
            (n) => ({ cortes: { ...config.cortes, rojo: n / 100 } }), { min: 1, max: 100, unidad: '%' }))}
        {campo('grupo', 'Grupo grande',
          'Desde cuántas personas una reserva se avisa en la línea de la semana. En 0 no avisa.',
          numerico('grupo', config.grupoGrande, (n) => ({ grupoGrande: n }), { min: 0, max: 1000, unidad: 'personas' }))}
      </>
    },
    {
      id: 'cotizaciones', titulo: 'Cotizaciones',
      para: 'Lo que propone cada cotización nueva. Los descuentos y las condiciones de pago ' +
            'se pueden cambiar en cada una.',
      cuerpo: <>
        {campo('vigencia', 'Vigencia',
          'Cuántos días vale una cotización desde que se manda al cliente. En 0 no vence.',
          numerico('vigencia', config.vigenciaPresupuesto, (n) => ({ vigenciaPresupuesto: n }), { min: 0, max: 365, unidad: 'días' }))}
        {campo('descuentos', 'Descuentos con botón',
          'Los que se ofrecen con un toque, por línea y sobre el total. Separados por coma.',
          textoLibre('descuentos', config.descuentos.join(', '),
            (t) => ({ descuentos: t }) as unknown as Cambio, '5, 10, 15'))}
        {campo('anticipoPct', 'Anticipo',
          'El % del total que se paga al firmar para reservar la fecha. Sin él pagado la ' +
          'cotización no pasa a ganada. En 0 no hay anticipo.',
          numerico('anticipoPct', config.anticipoPct, (n) => ({ anticipoPct: n }), { min: 0, max: 100, unidad: '%' }))}
        {campo('saldoDias', 'Saldo',
          'Hasta cuántos días antes del evento se paga el resto.',
          numerico('saldoDias', config.saldoDias, (n) => ({ saldoDias: n }), { min: 0, max: 365, unidad: 'días antes' }))}
        {campo('seguimientoDias', 'Seguimiento: sin respuesta',
          'A cuántos días de mandada una cotización, sin moverse, el panel pregunta "¿y?". ' +
          'Cada cotización lo puede cambiar. En 0 no pregunta.',
          numerico('seguimientoDias', config.seguimientoDias, (n) => ({ seguimientoDias: n }), { min: 0, max: 365, unidad: 'días' }))}
        {campo('avisoEvento', 'Seguimiento: antes del evento',
          'Cuántos días antes del evento pregunta si se ganó o se perdió. Cada cotización lo ' +
          'puede cambiar. En 0 no pregunta.',
          numerico('avisoEvento', config.avisoEvento, (n) => ({ avisoEvento: n }), { min: 0, max: 365, unidad: 'días antes' }))}
        {campo('driveComprobantes', 'Carpeta de comprobantes',
          'La unidad compartida de Google Drive donde se guardan los comprobantes y los ' +
          'contratos firmados. Pega el link de la unidad. La cuenta del panel tiene que ser ' +
          'miembro con rol Gestor de contenido.',
          <input type="text" defaultValue={config.driveComprobantes} className={ENTRADA}
            placeholder="https://drive.google.com/drive/folders/…"
            onBlur={(e) => e.target.value.trim() !== config.driveComprobantes &&
              guardar({ driveComprobantes: idDeDrive(e.target.value) }, 'driveComprobantes')} />)}
      </>
    },
    {
      id: 'contrato', titulo: 'Contrato',
      para: 'Lo que propone el contrato de cada cotización nueva. Cada cotización lo puede ' +
            'cambiar en su bloque Contrato, y eso es lo que se imprime y lo que se aplica al ' +
            'cancelar. Los contratos ya firmados no cambian.',
      cuerpo: <>
        {empresa('ciudadFirma', 'Ciudad de firma', 'El contrato empieza “En …, a”.', 'Pirque')}
        {campo('cambiosFecha', 'Cambios de fecha',
          'Cuántas veces el cliente puede cambiar la fecha del evento, por fuerza mayor y si ' +
          'la nueva está libre. En 0 el contrato no ofrece cambios.',
          numerico('cambiosFecha', config.cambiosFecha, (n) => ({ cambiosFecha: n }), { min: 0, max: 10, unidad: 'veces' }))}
        {campo('cancelacionDias', 'Cancelación',
          'Hasta cuántos días antes del evento el cliente puede cancelar. En 0 el contrato ' +
          'no ofrece cancelar.',
          numerico('cancelacionDias', config.cancelacionDias, (n) => ({ cancelacionDias: n }), { min: 0, max: 365, unidad: 'días antes' }))}
        {campo('reembolsoPct', 'Reembolso al cancelar',
          'Qué % de lo que el cliente ya pagó se le devuelve si cancela a tiempo. En 0, sin reembolso.',
          numerico('reembolsoPct', config.reembolsoPct, (n) => ({ reembolsoPct: n }), { min: 0, max: 100, unidad: '% de lo pagado' }))}
      </>
    },
    {
      id: 'empresa', titulo: 'La empresa',
      para: 'Quién vende: sale en el encabezado de la cotización y del contrato. Este panel ' +
            'es de una sola empresa; la otra tendrá el suyo.',
      cuerpo: <>
        {empresa('nombre', 'Nombre comercial', 'Como la conocen los clientes.')}
        {empresa('razonSocial', 'Razón social', 'Como figura en el SII.')}
        {empresa('rut', 'RUT de la empresa', '')}
        {empresa('domicilio', 'Domicilio', '')}
        {empresa('representante', 'Representante legal', 'Su nombre completo, como firma el contrato.')}
        {empresa('ciRepresentante', 'Cédula del representante', 'Su RUT, para el contrato.')}
        {empresa('whatsapp', 'WhatsApp de ventas', 'El que va al pie de la cotización.')}
        {empresa('transferencia', 'Datos para transferir',
          'Banco, tipo y número de cuenta, para el anticipo y el saldo de los clientes.')}
      </>
    },
    {
      id: 'mantencion', titulo: 'Mantención',
      para: 'Lo que se toca cuando algo parece faltar, no a diario.',
      cuerpo: (
        <div className="py-4">
          <p className="max-w-2xl text-[14px] text-hueso/75">
            Las reservas llegan solas apenas se paga en Shopify, y una vez al día se revisa
            que no falte ninguna. Este botón hace esa revisión ahora: sirve si sospechas que
            una reserva no apareció. Apretarlo de más no duplica nada.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={revisarShopify} disabled={revisando} className="boton min-h-[44px]">
              {revisando ? 'Revisando…' : 'Revisar Shopify ahora'}
            </button>
            {resumen && <span className="text-[14px] text-hueso/70">{resumen}</span>}
          </div>
        </div>
      )
    }
  ];

  return (
    <section>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">
        Configuración<Ayuda tema="configuracion" />
      </h1>
      <p className="mb-4 max-w-2xl text-[14px] text-hueso/70">
        Cada campo se guarda solo al salir de él. Estos valores viven en la pestaña{' '}
        <code className="text-hueso/80">Config</code> de la planilla, así que cambiarlos no
        necesita un despliegue.
      </p>

      {/* El índice: un botón por sección, para no recorrer la página entera. */}
      <nav aria-label="Secciones" className="mb-6 flex flex-wrap gap-2">
        {secciones.map((x) => (
          <a key={x.id} href={`#${x.id}`} className="boton tecla min-h-[40px]">{x.titulo}</a>
        ))}
      </nav>

      <div className="space-y-6">
        {secciones.map((x) => (
          <section key={x.id} id={x.id} aria-labelledby={`t-${x.id}`}
            className="scroll-mt-4 rounded-lg border border-hueso/15 bg-panel px-4 pt-4 sm:px-5">
            <h2 id={`t-${x.id}`} className="text-base font-bold uppercase tracking-wide text-oro">
              {x.titulo}
            </h2>
            <p className="mt-1 max-w-2xl text-[14px] text-hueso/70">{x.para}</p>
            {/* Con vista gerencia, los campos se ven apagados: `fieldset
                disabled` los apaga todos de una vez. */}
            <fieldset disabled={soloMira} className="m-0 mt-2 min-w-0 border-0 border-t border-hueso/15 p-0">
              {x.cuerpo}
            </fieldset>
          </section>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-[13px] text-hueso/60">
        La clave del panel no se cambia acá: vive en Vercel como variable de
        entorno. Guardarla en la planilla sería dejar la contraseña del panel en
        un documento compartido.
      </p>
    </section>
  );
}
