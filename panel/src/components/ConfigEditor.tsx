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
import { Aviso } from './CalendarView';
import { deDiasSemana, type Config } from '@/lib/config';

/**
 * Lo que se le manda a /api/config. `diasAbiertos` va como TEXTO, tal como
 * se escribe en el campo ("sáb,dom"), y la ruta lo interpreta: así la
 * tolerancia a tildes y abreviaturas vive en un solo lugar, el servidor, y
 * no duplicada acá.
 */
type Cambio = Partial<Omit<Config, 'diasAbiertos'>> & { diasAbiertos?: string };

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function ConfigEditor() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [guardando, setGuardando] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [resumen, setResumen] = useState('');

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

  const campo = (
    nombre: string, titulo: string, ayuda: string, entrada: React.ReactNode
  ) => (
    <div key={nombre} className="py-4 border-b border-hueso/10 sm:grid sm:grid-cols-[1fr_12rem] sm:gap-6">
      <div>
        <div className="text-sm">{titulo}</div>
        <p className="text-xs text-hueso/50 mt-1 max-w-xl">{ayuda}</p>
      </div>
      <div className="mt-2 sm:mt-0">
        {entrada}
        {guardando === nombre && (
          <span className="block text-xs text-hueso/50 mt-1">guardando…</span>
        )}
      </div>
    </div>
  );

  const numerico = (
    nombre: string, valor: number, aplicar: (n: number) => Cambio
  ) => (
    <input type="number" defaultValue={valor} className={ENTRADA}
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (n === valor) return;
        guardar(aplicar(n), nombre);
      }} />
  );

  return (
    <section>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">Configuración</h1>
      <p className="text-hueso/60 text-sm mb-6 max-w-2xl">
        Estos valores viven en la pestaña <code className="text-hueso/80">Config</code> de
        la planilla, no en el código, así que cambiarlos no necesita un
        despliegue. Si la pestaña no existe, se crea al guardar por primera vez.
      </p>

      <div className="border-t border-hueso/10">
        {campo('pocos', 'Aviso de “últimos lugares”',
          'Desde cuántos lugares libres el sitio público avisa que quedan pocos. ' +
          'Por debajo de ese número el día lleva un punto en el calendario y, al ' +
          'elegirlo, se muestra cuántos quedan. Más arriba, el visitante no ve ' +
          'ningún número: es para apurar al que duda sin publicar qué tan vacíos ' +
          'están los demás días.',
          numerico('pocos', config.avisoPocosLugares,
            (n) => ({ avisoPocosLugares: n })))}

        {campo('cupo', 'Cupo normal de un día',
          'Las personas que caben en una jornada, niños incluidos: es lo que ' +
          'limita sillas, mesas y comida. Es el valor que se le pone a un día ' +
          'nuevo; a cada día se le puede cambiar aparte en Fechas hábiles.',
          numerico('cupo', config.cupoNormal, (n) => ({ cupoNormal: n })))}

        {campo('apertura', 'Hora de apertura',
          'La hora a la que empieza la jornada. Una sola por día, sin bloques.',
          <input type="text" defaultValue={config.horaApertura} className={ENTRADA}
            onBlur={(e) => e.target.value !== config.horaApertura &&
              guardar({ horaApertura: e.target.value }, 'apertura')} />)}

        {campo('dias', 'Días que se abre',
          'Separados por coma. Se entienden completos o abreviados, con tilde o ' +
          'sin ella: “sáb,dom” y “sabado domingo” son lo mismo. Define qué días ' +
          'propone el panel al cargar fechas nuevas.',
          <input type="text" defaultValue={deDiasSemana(config.diasAbiertos)}
            className={ENTRADA}
            onBlur={(e) => e.target.value !== deDiasSemana(config.diasAbiertos) &&
              guardar({ diasAbiertos: e.target.value }, 'dias')} />)}

        {campo('futuro', 'Días hacia adelante',
          'Hasta cuántos días en el futuro se ofrecen fechas en el sitio. Una ' +
          'fecha más lejana que esto no se muestra aunque esté abierta en la ' +
          'planilla, para no tomar reservas a un año plazo.',
          numerico('futuro', config.diasAFuturo, (n) => ({ diasAFuturo: n })))}

        {campo('amarillo', 'Semáforo: pasa a amarillo',
          'Porcentaje de ocupación desde el que un día se ve amarillo en el ' +
          'calendario del panel. No lo ve el visitante.',
          <input type="number" defaultValue={Math.round(config.cortes.amarillo * 100)}
            className={ENTRADA}
            onBlur={(e) => guardar(
              { cortes: { ...config.cortes, amarillo: Number(e.target.value) / 100 } },
              'amarillo')} />)}

        {campo('rojo', 'Semáforo: pasa a rojo',
          'Lo mismo para el rojo. Tiene que ser mayor que el amarillo: al revés, ' +
          'el amarillo nunca se vería, y en ese caso se ignoran los dos y vuelven ' +
          'a 60 y 85.',
          <input type="number" defaultValue={Math.round(config.cortes.rojo * 100)}
            className={ENTRADA}
            onBlur={(e) => guardar(
              { cortes: { ...config.cortes, rojo: Number(e.target.value) / 100 } },
              'rojo')} />)}
      </div>

      {/* Mantenimiento: lo que se toca cuando algo parece faltar, no a diario. */}
      <section className="mt-10 border-t border-hueso/10 pt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">Mantenimiento</h2>
        <p className="mt-1 max-w-2xl text-sm text-hueso/60">
          Las reservas llegan solas apenas se paga en Shopify, y una vez al día
          se revisa que no falte ninguna. Este botón hace esa revisión ahora,
          sin esperar: sirve si sospechas que una reserva no apareció.
          Apretarlo de más no duplica nada.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={revisarShopify} disabled={revisando}
            className="rounded border border-hueso/20 px-4 py-2 text-sm hover:border-oro disabled:opacity-50">
            {revisando ? 'Revisando…' : 'Revisar Shopify ahora'}
          </button>
          {resumen && <span className="text-xs text-hueso/60">{resumen}</span>}
        </div>
      </section>

      <p className="text-xs text-hueso/40 mt-6 max-w-2xl">
        La clave del panel no se cambia acá: vive en Vercel como variable de
        entorno. Guardarla en la planilla sería dejar la contraseña del panel en
        un documento compartido.
      </p>
    </section>
  );
}
