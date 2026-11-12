'use client';

/**
 * Las fichas de clientes (2026-11-10).
 *
 * **Una ficha por cliente, y se escribe una vez.** Es el primer error que
 * reportó la vendedora en el CRM del socio, y lo que esta pantalla viene a
 * impedir: al crear un cliente, el servidor busca si ya hay uno con el mismo
 * teléfono, correo o RUT y, si lo hay, la pantalla pregunta *"¿es este
 * cliente?"* antes de crear otro.
 *
 * Mismo patrón que `/equipo`: cerrada, cada ficha es una línea; se abre una a
 * la vez con `+`, y se guarda con un botón dentro de la ficha porque lo que
 * se edita es la identidad de alguien (ver "Lo que es un valor se guarda
 * solo" en CLAUDE.md).
 */
import AvisoGuardado from './AvisoGuardado';
import { usarGuardadoPorFicha } from './usarGuardadoPorFicha';
import { useEffect, useMemo, useState } from 'react';
import Ayuda from './Ayuda';
import { usarSoloMira } from './SesionCliente';
import { Aviso } from './CalendarView';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import CampoRut from './CampoRut';
import { avisar } from './AvisoFlotante';
import {
  buscarClientes, porNombreCliente, type Cliente, type DatosCliente
} from '@/lib/clientes';
import { avisoCorreo } from '@/lib/contacto';
import { PastillaEstado } from './CotizacionesVista';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras } from '@/lib/fechas';

/** Una cotización en el historial de un cliente. */
interface EnHistorial {
  id: string; folio: string; fecha: string; periodo: string; estado: string;
  total: number; grupo: string;
}

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

const VACIO: DatosCliente = {
  nombre: '', empresa: '', rut: '', domicilio: '', giro: '', telefono: '', correo: '', notas: ''
};

const CAMPOS: (keyof DatosCliente)[] =
  ['nombre', 'empresa', 'rut', 'domicilio', 'giro', 'telefono', 'correo', 'notas'];

const NOMBRE_CAMPO: Record<keyof DatosCliente, string> = {
  nombre: 'nombre', empresa: 'empresa', rut: 'RUT', domicilio: 'domicilio', giro: 'giro',
  telefono: 'teléfono', correo: 'correo', notas: 'notas'
};

const datosDe = (c: Cliente): DatosCliente =>
  Object.fromEntries(CAMPOS.map((k) => [k, c[k]])) as DatosCliente;

export default function ClientesEditor() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Record<string, number>>({});
  const [historial, setHistorial] = useState<Record<string, EnHistorial[]>>({});
  const [sinFicha, setSinFicha] = useState(0);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  /** Qué ficha está abierta. Una a la vez, como en `/equipo`. */
  const [abierta, setAbierta] = useState<string | null>(null);
  /** Lo escrito en la ficha abierta, todavía sin guardar. */
  const [edicion, setEdicion] = useState<DatosCliente | null>(null);
  /** El formulario de un cliente nuevo, o null si no se está creando. */
  const [nuevo, setNuevo] = useState<DatosCliente | null>(null);
  /** Las fichas que se parecen al nuevo, cuando el servidor las encontró. */
  const [parecidas, setParecidas] = useState<Cliente[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  /** Vista gerencia sin `clientes`: las fichas se miran y no se tocan. */
  const soloMira = usarSoloMira('clientes');
  /** Cotizarle a alguien es del permiso de las cotizaciones. */
  const soloMiraCotizar = usarSoloMira('presupuestos');

  const cargar = () => fetch('/api/clientes').then((r) => r.json()).then((d) => {
    if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
    setClientes(d.clientes);
    setCotizaciones(d.cotizaciones ?? {});
    setHistorial(d.historial ?? {});
    setSinFicha(d.sinFicha ?? 0);
  }).catch((e) => setError(String(e)));

  useEffect(() => { void cargar(); }, []);

  const visibles = useMemo(
    () => (clientes ? [...buscarClientes(clientes, busqueda)].sort(porNombreCliente) : []),
    [clientes, busqueda]);

  /**
   * **La ficha se guarda sola** (2026-11-12, regla del cliente: autoguardado
   * por defecto): empresa, RUT, domicilio, giro, teléfono, correo y notas.
   * Solo el nombre se confirma con un botón.
   */
  const fichas = usarGuardadoPorFicha<Partial<DatosCliente>>(async (id, cambios) => {
    const r = await fetch('/api/clientes', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...cambios })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) return d.error || 'No se pudo guardar.';
    if (d.clientes) setClientes(d.clientes);
    if (d.parecidos?.length) {
      avisar(`Ojo: se parece a ${d.parecidos.map((x: Cliente) => x.nombre).join(', ')}`, 'atencion');
    }
  }, 1200);

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!clientes) return <p className="text-hueso/50">Cargando…</p>;

  const abrir = (c: Cliente) => {
    if (abierta === c.id) { setAbierta(null); setEdicion(null); return; }
    setAbierta(c.id);
    setEdicion(datosDe(c));
    setAviso('');
  };

  async function crear(forzar = false) {
    if (!nuevo) return;
    setGuardando(true); setAviso('');
    try {
      const r = await fetch('/api/clientes', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...nuevo, forzar })
      });
      const d = await r.json();
      if (d.error) return setAviso(d.error);
      if (d.parecidos?.length) return setParecidas(d.parecidos);
      setClientes(d.clientes);
      setNuevo(null); setParecidas([]);
      setAbierta(d.id);
      setEdicion(datosDe(d.clientes.find((c: Cliente) => c.id === d.id)));
      avisar(`Cliente creado: ${nuevo.nombre}`);
    } finally { setGuardando(false); }
  }


  /** El nombre: el único campo de la ficha que se confirma. */
  async function guardar(c: Cliente) {
    if (!edicion) return;
    setGuardando(true); setAviso('');
    try {
      const r = await fetch('/api/clientes', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: c.id, nombre: edicion.nombre })
      });
      const d = await r.json();
      if (d.error) return setAviso(d.error);
      setClientes(d.clientes);
      const guardado = d.clientes.find((x: Cliente) => x.id === c.id);
      if (guardado) setEdicion({ ...edicion, nombre: guardado.nombre });
      if (d.parecidos?.length) {
        avisar(`Guardado. Ojo: se parece a ${d.parecidos.map((x: Cliente) => x.nombre).join(', ')}`,
          'atencion');
      } else avisar(`Ahora se llama ${edicion.nombre}`);
    } finally { setGuardando(false); }
  }

  async function borrar(c: Cliente) {
    if (!confirm(`¿Borrar la ficha de ${c.nombre}? No tiene cotizaciones, así que no se pierde ninguna.`)) return;
    const r = await fetch(`/api/clientes?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.error) return avisar(d.error, 'atencion');
    setClientes(d.clientes);
    if (abierta === c.id) { setAbierta(null); setEdicion(null); }
    avisar(`Ficha borrada: ${c.nombre}`);
  }

  async function migrar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/clientes', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'migrar' })
      });
      const d = await r.json();
      if (d.error) return avisar(d.error, 'atencion');
      avisar(`${d.creadas} fichas nuevas · ${d.vinculados} presupuestos vinculados`);
      await cargar();
    } finally { setGuardando(false); }
  }

  /** Los campos de una ficha, iguales para crear y para editar. */
  const formulario = (d: DatosCliente, poner: (k: keyof DatosCliente, v: string) => void,
                      quien: string) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Campo etiqueta="Nombre" ancho="w-full">
        <input type="text" value={d.nombre} className={ENTRADA}
          placeholder="Nombre y apellido, o de la empresa"
          onChange={(e) => poner('nombre', e.target.value)} />
      </Campo>
      <Campo etiqueta="Empresa del cliente" ancho="w-full">
        <input type="text" value={d.empresa} className={ENTRADA}
          placeholder="Si es una empresa: su razón social"
          onChange={(e) => poner('empresa', e.target.value)} />
      </Campo>
      <Campo etiqueta="Teléfono" ancho="w-full">
        <CampoTelefono valor={d.telefono} className={ENTRADA}
          etiqueta={`Teléfono de ${quien}`} onCambio={(v) => poner('telefono', v)} />
      </Campo>
      <Campo etiqueta="Correo" ancho="w-full">
        <input type="email" value={d.correo} className={ENTRADA}
          placeholder="nombre@correo.cl"
          onChange={(e) => poner('correo', e.target.value)} />
        {avisoCorreo(d.correo) && (
          <p className="mt-0.5 text-[13px] text-ambar-texto">{avisoCorreo(d.correo)}</p>
        )}
      </Campo>
      <Campo etiqueta="RUT" ancho="w-full">
        <CampoRut valor={d.rut} className={ENTRADA} etiqueta="RUT"
          placeholder="Lo pide el contrato, no la cotización"
          onCambio={(v) => poner('rut', v)} />
      </Campo>
      <Campo etiqueta="Domicilio" ancho="w-full">
        <input type="text" value={d.domicilio} className={ENTRADA}
          placeholder="Lo pide el contrato"
          onChange={(e) => poner('domicilio', e.target.value)} />
      </Campo>
      <Campo etiqueta="Giro" ancho="w-full">
        <input type="text" value={d.giro} className={ENTRADA}
          placeholder="Lo pide la factura"
          onChange={(e) => poner('giro', e.target.value)} />
      </Campo>
      <Campo etiqueta="Notas" ancho="w-full sm:col-span-2">
        <textarea value={d.notas} rows={2} className={ENTRADA}
          placeholder="Lo que conviene saber: cómo llegó, qué le importa"
          onChange={(e) => poner('notas', e.target.value)} />
      </Campo>
    </div>
  );

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Clientes<Ayuda tema="clientes" />
      </h1>
      <p className="mb-5 max-w-2xl text-[15px] text-hueso/70">
        Una ficha por cliente. Se escribe una vez y la usan todas sus cotizaciones.
      </p>

      {sinFicha > 0 && !soloMira && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded border
                        border-ambar/50 bg-ambar/5 p-4">
          <p className="flex-1 text-[15px]">
            Hay <strong>{sinFicha}</strong> presupuesto{sinFicha === 1 ? '' : 's'} de antes
            de las fichas. Pásalos a fichas: si dos son del mismo cliente, quedan en una sola.
          </p>
          <button onClick={() => void migrar()} disabled={guardando} className="boton">
            {guardando ? 'Pasando…' : 'Crear las fichas'}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, empresa, teléfono, correo o RUT"
          aria-label="Buscar cliente"
          className={`${ENTRADA} min-h-[44px] flex-1 sm:max-w-md`} />
        {!nuevo && !soloMira && (
          <button onClick={() => { setNuevo({ ...VACIO, nombre: busqueda }); setParecidas([]);
                                   setAviso(''); }}
            className="boton boton-relleno min-h-[44px] px-5 text-[15px]">
            + Nuevo cliente
          </button>
        )}
      </div>

      {nuevo && (
        <div className="mb-5 rounded border border-oro/50 bg-panel p-4">
          <h2 className="mb-3 text-[15px] font-bold uppercase tracking-wide">Nuevo cliente</h2>
          {formulario(nuevo, (k, v) => setNuevo({ ...nuevo, [k]: v }), 'el cliente nuevo')}

          {parecidas.length > 0 && (
            <div className="mt-4 rounded border border-ambar/50 bg-ambar/5 p-3">
              <p className="text-[15px] font-semibold text-ambar-texto">
                ¿Es alguno de estos? Ya hay {parecidas.length === 1 ? 'un cliente' : 'clientes'} con
                ese teléfono, correo o RUT.
              </p>
              <ul className="mt-2 space-y-2">
                {parecidas.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3">
                    <span className="flex-1 text-[15px]">
                      <strong>{c.nombre}</strong>
                      {c.empresa && <> · {c.empresa}</>}
                      <span className="text-hueso/70"> · {c.telefono || c.correo}</span>
                    </span>
                    <button className="boton" onClick={() => {
                      setNuevo(null); setParecidas([]); setBusqueda('');
                      setAbierta(c.id); setEdicion(datosDe(c));
                    }}>Sí, es este</button>
                  </li>
                ))}
              </ul>
              <button className="boton mt-3" onClick={() => void crear(true)} disabled={guardando}>
                No, es otro: crear la ficha igual
              </button>
            </div>
          )}

          {aviso && <p className="mt-3 text-[15px] text-rojo-texto">{aviso}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {parecidas.length === 0 && (
              <button onClick={() => void crear()} disabled={guardando}
                className="boton boton-relleno min-h-[44px] px-5">
                {guardando ? 'Guardando…' : 'Guardar cliente'}
              </button>
            )}
            <button onClick={() => { setNuevo(null); setParecidas([]); setAviso(''); }}
              className="boton min-h-[44px]">Cancelar</button>
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded border border-dashed border-hueso/15 p-5 text-[15px] text-hueso/60">
          {clientes.length === 0
            ? 'Todavía no hay clientes. Crea el primero con “+ Nuevo cliente”.'
            : `Nadie calza con “${busqueda}”.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibles.map((c) => {
            const n = cotizaciones[c.id] ?? 0;
            const abiertaEsta = abierta === c.id && edicion;
            const cambiaNombre = !!abiertaEsta && edicion!.nombre.trim() !== c.nombre;
            const { estado, error: falla } = fichas.estadoDe(c.id);
            return (
              <li key={c.id} className="overflow-hidden rounded border border-hueso/15 bg-panel">
                <div className="flex items-center gap-2 pr-2">
                  <button type="button" aria-expanded={!!abiertaEsta} onClick={() => abrir(c)}
                    className="flex min-h-[52px] min-w-0 flex-1 flex-wrap items-center gap-x-3
                               gap-y-1 px-3 py-2.5 text-left hover:bg-hueso/5">
                    <span aria-hidden className="w-3 text-base leading-none text-hueso/50">
                      {abiertaEsta ? '−' : '+'}
                    </span>
                    <span className="text-[16px] font-semibold">{c.nombre}</span>
                    {c.empresa && <span className="text-[14px] text-hueso/70">{c.empresa}</span>}
                    <span className="text-[14px] text-hueso/70">{c.telefono || c.correo}</span>
                    {n > 0 && (
                      <span className="rounded-full border border-rosa/50 px-2 py-0.5
                                       text-[13px] font-semibold text-rosa-texto">
                        {n} cotizaci{n === 1 ? 'ón' : 'ones'}
                      </span>
                    )}
                  </button>
                  {n === 0 && !soloMira && (
                    <button onClick={() => void borrar(c)}
                      className="boton shrink-0 hover:border-rojo-fuerte hover:text-rojo-texto"
                      title="No tiene cotizaciones, así que se puede borrar">Borrar</button>
                  )}
                </div>

                {abiertaEsta && (
                  <div className="border-t border-hueso/10 p-4">
                    {/* **Su historial de cotizaciones** (Fase 2): todas, con la
                        ganada en verde y las alternativas marcadas. Un cliente
                        que pide varias, o dos opciones, las ve juntas acá. */}
                    <div className="mb-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
                          Cotizaciones
                        </p>
                        <span className="flex-1" />
                        {!soloMiraCotizar && (
                          <a href={`/presupuestos?cliente=${encodeURIComponent(c.id)}`}
                            className="tecla boton">+ Cotizarle</a>
                        )}
                      </div>
                      {(historial[c.id] ?? []).length === 0 ? (
                        <p className="text-[14px] text-hueso/60">Todavía ninguna.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(historial[c.id] ?? []).map((h) => {
                            const alternativas = (historial[c.id] ?? []).filter((x) => x.grupo === h.grupo).length;
                            return (
                              <li key={h.id}>
                                <a href={`/presupuestos?abrir=${encodeURIComponent(h.id)}`}
                                  className={`tecla flex flex-wrap items-center gap-x-3 gap-y-1 rounded border
                                              px-3 py-2 min-h-[48px] ${h.estado === 'Ganada'
                                    ? 'border-verde-fuerte bg-verde/10' : 'border-hueso/15'}`}>
                                  <span className="text-[14px] font-semibold">N° {h.folio}</span>
                                  <PastillaEstado estado={h.estado} />
                                  {alternativas > 1 && (
                                    <span className="text-[13px] text-hueso/60">alternativa</span>
                                  )}
                                  <span className="text-[14px] text-hueso/70">
                                    {h.fecha ? <span className="first-letter:uppercase inline-block">{enPalabras(h.fecha)}</span>
                                      : h.periodo}
                                  </span>
                                  <span className="flex-1" />
                                  <strong className="text-[15px]">{enPesos(h.total)}</strong>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <fieldset disabled={soloMira} className="m-0 min-w-0 border-0 p-0">
                    {formulario(edicion!, (k, v) => {
                      setEdicion({ ...edicion!, [k]: v });
                      // El nombre espera su botón; lo demás se guarda solo.
                      if (k !== 'nombre') fichas.programar(c.id, { [k]: v });
                    }, c.nombre)}
                    </fieldset>
                    {aviso && <p className="mt-3 text-[15px] text-rojo-texto">{aviso}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {cambiaNombre && !soloMira && (
                        <>
                          <span className="text-[14px] text-ambar-texto">Cambiaste el nombre.</span>
                          <button type="button" className="boton boton-relleno"
                            disabled={!edicion!.nombre.trim() || guardando}
                            onClick={() => {
                              if (confirm(`¿Cambiar el nombre de ${c.nombre} a ${edicion!.nombre.trim()}? `
                                + 'Se corrige también en sus cotizaciones y reservas.')) void guardar(c);
                            }}>Guardar el nombre</button>
                          <button type="button" className="boton"
                            onClick={() => setEdicion({ ...edicion!, nombre: c.nombre })}>Deshacer</button>
                        </>
                      )}
                      <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(c.id)} />
                      <span className="flex-1" />
                      <span className="text-[13px] text-hueso/60">
                        {c.id}{c.creadoPor && <> · creada por {c.creadoPor}</>}
                      </span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
