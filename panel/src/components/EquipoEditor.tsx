'use client';

/**
 * Quiénes son el equipo y qué puestos existen.
 *
 * Las dos listas viven en la planilla, así que agregar a alguien no necesita
 * un despliegue. Van en la misma pantalla porque se miran juntas: un puesto
 * sin nadie que lo haga, o alguien sin puesto habitual, se ve de una sola
 * pasada.
 *
 * **La columna "uno cada N personas" es la que hace útil al planificador.**
 * Es lo que le permite al panel contestar "¿alcanza este equipo?" en vez de
 * solo mostrar una lista. Arranca vacía a propósito: cuántos garzones por
 * comensal se atiende bien es dato del negocio, y un número inventado haría
 * que el panel diera consejos que nadie dio.
 */
import { Fragment, useEffect, useState } from 'react';
import { Aviso } from './CalendarView';
import { aEntero, esContratado, MODALIDAD,
         type Puesto, type Trabajador } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import DatosBancarios from './DatosBancarios';
import { bancoVacio, sePuedeTransferir, type Banco } from '@/lib/banco';
import Dialogo from './Dialogo';
import CampoTelefono from './CampoTelefono';
import Campo from './Campo';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function EquipoEditor() {
  const [puestos, setPuestos] = useState<Puesto[] | null>(null);
  const [gente, setGente] = useState<Trabajador[]>([]);
  const [sinFicha, setSinFicha] = useState<string[]>([]);
  /**
   * Cuántos turnos guardados tiene cada persona.
   *
   * Es lo que decide si su ficha se puede quitar o solo desactivar. No se
   * recalcula al guardar porque esta pantalla no toca los turnos: lo que se
   * leyó al abrir sigue siendo cierto.
   */
  const [turnosDe, setTurnosDe] = useState<Map<string, number>>(new Map());
  // Lo manda el servidor; la interfaz no lo adivina. Los puestos y los links
  // personales son del administrador, y si el encargado viera esos controles
  // el panel le estaría mintiendo: la ruta se los va a negar igual.
  const [esAdmin, setEsAdmin] = useState(false);
  const [avisoLink, setAvisoLink] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  /**
   * Qué ficha está abierta, o `null` si ninguna.
   *
   * **Cerradas por defecto** (2026-10-29, lo pidió el cliente): con cada
   * ficha mostrando sus tres bloques —quién es, cuánto gana, dónde se le
   * paga— diez trabajadores eran una página de varias pantallas, y para
   * encontrar a alguien había que leerla entera. Cerrada, cada persona es
   * una línea: nombre, puesto, teléfono. Lo demás aparece al abrirla.
   *
   * **Una a la vez.** Se edita una ficha, no se comparan dos: dejar varias
   * abiertas devolvería la página larga de la que veníamos escapando.
   */
  const [abierta, setAbierta] = useState<number | null>(null);
  /** Si está abierta la ventana de los puestos. */
  const [verPuestos, setVerPuestos] = useState(false);

  useEffect(() => {
    fetch('/api/equipo').then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setPuestos(d.puestos);
        setGente(d.trabajadores);
        setSinFicha(d.sinFicha ?? []);
        const cuenta = new Map<string, number>();
        for (const t of (d.turnos ?? []) as { trabajador: string }[]) {
          const k = normalizar(t.trabajador);
          cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
        }
        setTurnosDe(cuenta);
        setEsAdmin(!!d.esAdmin);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function guardar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/equipo', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        // Los puestos solo viajan si quien guarda puede cambiarlos. Mandarlos
        // igual haría fallar la petición entera y se perderían también los
        // cambios de la lista de trabajadores, que sí puede hacer.
        body: JSON.stringify(esAdmin ? { puestos, trabajadores: gente }
                                     : { trabajadores: gente })
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else {
        // **Solo se reemplaza lo que el servidor dice haber guardado.** La
        // respuesta trae `puestos` únicamente si venían en la petición, o
        // sea nunca cuando guarda un encargado; tomarlo igual dejaba
        // `puestos` en `undefined` y la pantalla entera caía al "Cargando…"
        // del primer `return`, como si se hubiera roto. Un guardado que sale
        // bien no puede verse peor que uno que falla.
        if (d.puestos) setPuestos(d.puestos);
        if (d.trabajadores) setGente(d.trabajadores);
        setError('');
        setSucio(false);
      }
    } finally { setGuardando(false); }
  }

  if (error) return <Aviso error={error} />;
  if (!puestos) return <p className="text-hueso/50">Cargando…</p>;

  /**
   * Crear, renovar o quitar el link de alguien.
   *
   * **Solo con la lista guardada.** Esta llamada escribe la pestaña entera
   * desde lo que hay en la planilla, así que si quedaran ediciones sin
   * guardar en pantalla, al recargar se perderían. Por eso los botones se
   * apagan mientras haya cambios pendientes, en vez de que el trabajo
   * desaparezca sin explicación.
   */
  async function link(nombre: string, accion: 'crear' | 'renovar' | 'quitar') {
    if (accion === 'quitar' &&
        !confirm(`¿Quitarle el acceso a ${nombre}? Su link deja de servir al instante.`)) {
      return;
    }
    setAvisoLink('');
    const r = await fetch('/api/equipo/link', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre, accion })
    });
    const d = await r.json();
    if (d.error) return setAvisoLink(d.error);
    setGente((antes) => antes.map((t) => (t.nombre === d.nombre ? { ...t, token: d.token } : t)));
    if (accion !== 'quitar') copiar(d.token, nombre);
    else setAvisoLink(`${nombre} ya no tiene acceso.`);
  }

  function copiar(token: string, nombre: string) {
    const url = `${window.location.origin}/mi/${token}`;
    navigator.clipboard?.writeText(url)
      .then(() => setAvisoLink(`Link de ${nombre} copiado. Mándaselo por WhatsApp.`))
      // Sin portapapeles —pasa en algunos navegadores sin HTTPS— se muestra
      // para copiarlo a mano, en vez de no hacer nada.
      .catch(() => window.prompt(`Link de ${nombre}:`, url));
  }

  /**
   * Subir o bajar un puesto en la lista.
   *
   * **El orden de esta lista es el orden en que se planifica un día**: el
   * planificador dibuja los puestos tal como están acá, así que tenerlos en
   * el orden en que se arma el turno ahorra buscar en cada tarjeta. Antes
   * ese orden solo se podía cambiar reescribiendo los nombres de arriba
   * abajo, o editando la planilla a mano.
   *
   * **Son flechas y no arrastrar**, a propósito: arrastrar en una tabla
   * necesita o la API del navegador —que en un teléfono no funciona— o una
   * librería, y este proyecto no agrega dependencias por una comodidad. Una
   * flecha se aprieta igual con el dedo, y se puede usar con el teclado.
   */
  const moverPuesto = (i: number, hacia: -1 | 1) => {
    const j = i + hacia;
    if (j < 0 || j >= puestos.length) return;
    const copia = puestos.map((p) => ({ ...p }));
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setPuestos(copia); setSucio(true);
  };

  const cambiarPuesto = (i: number, campo: keyof Puesto, valor: string) => {
    const copia = puestos.map((p) => ({ ...p }));
    if (campo === 'nombre') copia[i].nombre = valor;
    else copia[i].cadaCuantas = aEntero(valor);
    setPuestos(copia); setSucio(true);
  };
  /**
   * El mismo botón de guardar, arriba y abajo.
   *
   * **Arriba es el que se usa de verdad**: se corrige el sueldo de alguien
   * en la primera fila y el único botón quedaba al final de la página, con
   * la tabla de puestos en medio. Lo pidió el cliente y tenía razón — un
   * guardado al que hay que irlo a buscar es un guardado que se olvida.
   *
   * Los dos hacen lo mismo porque **el panel guarda las dos listas juntas**,
   * en una sola petición: no son dos formularios, es uno con dos tablas.
   */
  const botonGuardar = (
    <>
      {sucio && <span className="text-xs text-hueso/50">Hay cambios sin guardar.</span>}
      <button onClick={guardar} disabled={guardando || !sucio}
        className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                   disabled:opacity-40">
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </>
  );

  /**
   * El mismo guardado, dentro de la tarjeta.
   *
   * Lo pidió el cliente: se corrige el teléfono de alguien arriba y el botón
   * quedaba al final de la página, con todas las demás fichas en medio. Un
   * guardado al que hay que irlo a buscar es un guardado que se olvida — y se
   * olvida con algo escrito a medias, que es la peor forma de perderlo.
   *
   * **Reemplaza el aviso en gris** que decía "Guarda para administrar el
   * link": el botón dice lo mismo y además lo hace.
   *
   * Aparece en todas las fichas y no solo en la que se editó, porque guardar
   * manda **las dos listas completas** en una sola petición: no es el
   * guardado de esta persona, es el de la pantalla. Tenerlo a mano en
   * cualquier ficha es justamente el punto.
   */
  const guardarEnTarjeta = sucio ? (
    <button onClick={guardar} disabled={guardando}
      className="rounded bg-oro px-3 py-1 text-xs font-semibold text-tinta
                 disabled:opacity-40"
      title="Guarda los cambios de esta pantalla">
      {guardando ? 'Guardando…' : 'Guardar cambios'}
    </button>
  ) : null;

  const cambiarBanco = (i: number, banco: Banco) => {
    const copia = gente.map((t) => ({ ...t }));
    copia[i].banco = banco;
    setGente(copia); setSucio(true);
  };

  const cambiarPersona = (i: number, campo: keyof Trabajador, valor: string | boolean) => {
    const copia = gente.map((t) => ({ ...t }));
    if (campo === 'activo') copia[i].activo = Boolean(valor);
    else if (campo === 'propina') copia[i].propina = Boolean(valor);
    else if (campo === 'pagoJornada' || campo === 'valorHora') {
      copia[i][campo] = aEntero(valor);
    } else if (campo === 'modalidad') {
      copia[i].modalidad = esContratado(valor) ? MODALIDAD.contratado : MODALIDAD.porTurno;
      // Un contratado no cobra jornada: dejar el monto escrito sería dejar un
      // número que ninguna cuenta usa, esperando a confundir a alguien.
      if (esContratado(valor)) copia[i].pagoJornada = 0;
      // `banco` no pasa por acá: es un objeto y tiene su propio cambiador.
    } else if (campo !== 'token' && campo !== 'banco') {
      copia[i][campo] = String(valor) as never;
    }
    setGente(copia); setSucio(true);
  };

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">Equipo</h1>
      <p className="mb-4 max-w-2xl text-sm text-hueso/60">
        Quiénes trabajan y en qué puestos. Para asignar a alguien a un día,
        anda al calendario y apreta <strong>Equipo</strong> en la tarjeta de
        ese día.
      </p>
      {/* Los días que no reciben público no están en el calendario de la
          portada, y hay trabajo igual: preparar, montar, cerrar. Por eso el
          enlace va acá arriba y no escondido al final. */}
      <p className="mb-6 max-w-2xl text-sm text-hueso/60">
        Para ver el <strong>mes completo</strong> y planificar también los
        días cerrados —preparación, montaje—, anda a{' '}
        <a href="/turnos" className="text-oro hover:underline">
          Turnos · calendario del equipo
        </a>.
      </p>

      {sinFicha.length > 0 && (
        <div className="mb-6 rounded border border-amber-500/50 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            Hay {sinFicha.length === 1 ? 'alguien asignado' : 'gente asignada'} a
            turnos que no está en esta lista.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Pasa al renombrar a una persona que ya tenía turnos: los turnos
            viejos siguen con el nombre anterior. Agrégala abajo con ese
            nombre exacto, o corrige el nombre en la pestaña{' '}
            <code>Turnos</code> de la planilla.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sinFicha.map((n) => (
              <code key={n} className="rounded bg-hueso/10 px-2 py-1 text-sm">{n}</code>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-xs uppercase tracking-widest text-hueso/45">
        Trabajadores
      </h2>
      {esAdmin && (
        <p className="mb-4 max-w-2xl text-sm text-hueso/60">
          <strong>El link personal</strong> le deja ver sus turnos y nada más:
          qué día, a qué hora y en qué puesto. No ve reservas, ni montos, ni a
          los demás. Se manda por WhatsApp y no necesita contraseña, así que
          quien lo tenga ve esa página — si alguien pierde el teléfono,{' '}
          <strong>Renovar</strong> deja el anterior inservible al instante.
        </p>
      )}
      {avisoLink && (
        <p className="mb-4 rounded border border-hueso/20 bg-hueso/5 px-3 py-2 text-sm">
          {avisoLink}
        </p>
      )}
      {/* **Una tarjeta por persona, no una tabla.**
          Fue tabla mientras cada trabajador era una fila. Al repartir los
          datos en tres líneas —quién es, cuánto gana, dónde se le paga— la
          tabla dejó de ayudar: las líneas de uno y las del siguiente se
          tocaban, y sin un borde que las separe no se ve dónde termina cada
          persona. Esto además no es una tabla de datos para comparar, es un
          formulario por ficha, y una tarjeta es lo que corresponde.

          Cada campo lleva su rótulo encima y su ancho propio, que es lo que
          evita el problema de siempre: el nombre cediéndole el espacio a
          todo lo demás. */}
      <ul className="space-y-3">
        {gente.map((t, i) => {
          const turnos = turnosDe.get(normalizar(t.nombre)) ?? 0;
          return (
            <li key={i}
              className={`overflow-hidden rounded border ${t.activo
                ? 'border-hueso/15 bg-hueso/[0.02]'
                : 'border-hueso/10 bg-transparent opacity-60'}`}>

              {/* **La ficha cerrada es una línea.** Nombre, puesto y teléfono
                  alcanzan para encontrar a alguien; lo demás —el sueldo, la
                  cuenta bancaria— aparece al abrirla. Con todo a la vista,
                  diez personas eran una página que había que leer entera.

                  El resumen es un botón y no un `<summary>` porque la ficha
                  que se acaba de agregar tiene que abrirse sola: con
                  `<details>` eso se controla igual desde React, y entonces el
                  elemento no aporta nada que no cueste explicar. */}
              <button type="button" aria-expanded={abierta === i}
                onClick={() => setAbierta(abierta === i ? null : i)}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1
                           px-3 py-2 text-left hover:bg-hueso/5">
                <span aria-hidden className="w-3 text-base leading-none text-hueso/40">
                  {abierta === i ? '−' : '+'}
                </span>
                <span className="font-semibold">
                  {t.nombre.trim() || <span className="text-hueso/40">Sin nombre</span>}
                </span>
                <span className="text-xs text-hueso/45">{t.puesto || 'sin puesto'}</span>
                <span className="text-xs text-hueso/35">{t.telefono}</span>
                {!t.activo && (
                  <span className="text-[10px] uppercase tracking-wide text-hueso/35">
                    inactivo
                  </span>
                )}
                {/* Lo que falta para poder pagarle se dice **con la ficha
                    cerrada**: adentro ya lo avisa `DatosBancarios`, pero
                    cerrada es donde se mira la lista antes de pagar. */}
                {esAdmin && t.nombre.trim() && !sePuedeTransferir(t.banco) && (
                  <span className="text-[11px] text-amber-300/80">falta su cuenta</span>
                )}
                <span className="flex-1" />
                <span className="text-xs text-hueso/35">
                  {abierta === i ? 'cerrar' : 'abrir'}
                </span>
              </button>

              {abierta === i && (
                <div className="border-t border-hueso/10 p-3">

                {/* Quién es, y cómo se entra a su link. */}
                <div className="flex flex-wrap items-start gap-3">
                  <Campo etiqueta="Nombre" ancho="w-56">
                    <input type="text" value={t.nombre} className={ENTRADA}
                      placeholder="Nombre y apellido"
                      aria-label={`Nombre de la persona ${i + 1}`}
                      onChange={(e) => cambiarPersona(i, 'nombre', e.target.value)} />
                  </Campo>
                  <Campo etiqueta="Teléfono" ancho="w-44">
                    <CampoTelefono valor={t.telefono} className={ENTRADA}
                      etiqueta={`Teléfono de ${t.nombre || 'esta persona'}`}
                      onCambio={(v) => cambiarPersona(i, 'telefono', v)} />
                  </Campo>
                  <Campo etiqueta="Puesto habitual" ancho="w-44">
                    {/* Un select y no texto libre: el puesto habitual solo
                        preselecciona en el planificador, y si está escrito de
                        otra forma no preselecciona nada. */}
                    <select value={t.puesto} className={ENTRADA}
                      aria-label={`Puesto habitual de ${t.nombre || 'esta persona'}`}
                      onChange={(e) => cambiarPersona(i, 'puesto', e.target.value)}>
                      <option value="">—</option>
                      {puestos.map((p) => (
                        <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                      ))}
                      {/* Si tiene uno que ya no está en la lista, igual se
                          muestra: si no, guardar lo borraría sin avisar. */}
                      {t.puesto && !puestos.some((p) => p.nombre === t.puesto) && (
                        <option value={t.puesto}>{t.puesto} (ya no existe)</option>
                      )}
                    </select>
                  </Campo>
                  <label className="flex items-center gap-2 self-center pt-4">
                    <input type="checkbox" checked={t.activo}
                      aria-label={`${t.nombre || 'Sin nombre'} sigue en el equipo`}
                      className="h-4 w-4 accent-oro"
                      onChange={(e) => cambiarPersona(i, 'activo', e.target.checked)} />
                    <span className="text-[10px] uppercase tracking-wide text-hueso/35">
                      Activo
                    </span>
                  </label>

                  <span className="flex-1" />

                  <div className="flex flex-wrap items-center gap-3 self-center pt-4 text-xs">
                    {guardarEnTarjeta}
                    {/* Los links se administran **con la lista guardada**: esta
                        llamada reescribe la pestaña entera desde la planilla,
                        así que con ediciones en pantalla se perderían. Mientras
                        haya cambios, en su lugar está el botón de guardar — que
                        es lo que hay que hacer para volver a tenerlos. */}
                    {esAdmin && (
                      !t.nombre.trim() ? (
                        <span className="text-hueso/35">Ponle nombre y guarda</span>
                      ) : sucio ? null : t.token ? (
                        <>
                          <button onClick={() => copiar(t.token, t.nombre)}
                            className="text-oro hover:underline">Copiar link</button>
                          <button onClick={() => link(t.nombre, 'renovar')}
                            className="text-hueso/55 hover:text-oro"
                            title="Crea uno nuevo; el anterior deja de servir">Renovar</button>
                          {/* "Quitar link", con la palabra completa: en esta
                              misma tarjeta hay otro botón que quita a la
                              persona, y dos "Quitar" a dos centímetros de
                              distancia son una confusión esperando a pasar. */}
                          <button onClick={() => link(t.nombre, 'quitar')}
                            className="text-hueso/55 hover:text-red-400">Quitar link</button>
                        </>
                      ) : (
                        <button onClick={() => link(t.nombre, 'crear')}
                          className="text-oro hover:underline">Crear link</button>
                      )
                    )}
                    {/* **Quitar solo a quien no tiene historia.** Borrar la
                        ficha de alguien que ya trabajó dejaría sus turnos con
                        un nombre que no está en ninguna parte, y esos turnos
                        son el registro de quién trabajó qué día. Antes esto era
                        un consejo en letra chica al pie, al lado de un botón
                        que decía lo contrario; ahora lo decide el panel. */}
                    {turnos === 0 ? (
                      <button
                        onClick={() => { setGente(gente.filter((_, k) => k !== i)); setSucio(true); }}
                        className="text-hueso/60 hover:text-red-400"
                        title="Todavía no tiene ningún turno guardado">Quitar</button>
                    ) : t.activo ? (
                      <button
                        onClick={() => cambiarPersona(i, 'activo', false)}
                        className="text-hueso/60 hover:text-oro"
                        title={`Tiene ${turnos} turnos guardados, así que su ficha `
                               + 'no se quita: se desactiva y conserva su historia'}>
                        Desactivar
                      </button>
                    ) : (
                      <span className="text-hueso/30"
                        title="Su ficha se conserva porque tiene turnos guardados">
                        Desactivado
                      </span>
                    )}
                  </div>
                </div>

                {/* Cuánto gana. Solo el administrador. */}
                {esAdmin && (
                  <div className="mt-3 border-t border-hueso/10 pt-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="w-28 pt-4 text-[10px] uppercase tracking-widest
                                       text-hueso/35">Pago</span>
                      <Campo etiqueta="Modalidad" ancho="w-40">
                        <select value={t.modalidad} className={ENTRADA}
                          aria-label={`Cómo se le paga a ${t.nombre || 'esta persona'}`}
                          onChange={(e) => cambiarPersona(i, 'modalidad', e.target.value)}>
                          <option value={MODALIDAD.porTurno}>Por turno</option>
                          <option value={MODALIDAD.contratado}>Contratado</option>
                        </select>
                      </Campo>
                      <Campo etiqueta="Jornada" ancho="w-32">
                        {/* A un contratado no se le paga por jornada, así que
                            el campo no se deja escribir: un monto ahí no se
                            usaría en ninguna cuenta y haría creer que sí. */}
                        <input type="number" min={0} step={1000} className={ENTRADA}
                          value={esContratado(t.modalidad) ? '' : (t.pagoJornada || '')}
                          placeholder={esContratado(t.modalidad) ? 'no aplica' : '—'}
                          disabled={esContratado(t.modalidad)}
                          aria-label={`Jornada de ${t.nombre || 'esta persona'}`}
                          onChange={(e) => cambiarPersona(i, 'pagoJornada', e.target.value)} />
                      </Campo>
                      <Campo etiqueta="Hora extra" ancho="w-32">
                        <input type="number" min={0} step={500} className={ENTRADA}
                          value={t.valorHora || ''} placeholder="—"
                          aria-label={`Valor de la hora extra de ${t.nombre || 'esta persona'}`}
                          onChange={(e) => cambiarPersona(i, 'valorHora', e.target.value)} />
                      </Campo>
                      <label className="flex items-center gap-2 self-center pt-4">
                        <input type="checkbox" checked={t.propina}
                          className="h-4 w-4 accent-oro"
                          aria-label={`${t.nombre || 'Esta persona'} entra en el reparto de propina`}
                          onChange={(e) => cambiarPersona(i, 'propina', e.target.checked)} />
                        <span className="text-[10px] uppercase tracking-wide text-hueso/35">
                          Entra en la propina
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Dónde se le transfiere. También solo el administrador. */}
                {esAdmin && (
                  <div className="mt-3 border-t border-hueso/10 pt-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="w-28 pt-4 text-[10px] uppercase tracking-widest
                                       text-hueso/35">Transferencia</span>
                      <div className="min-w-[20rem] flex-1">
                        <DatosBancarios
                          banco={t.banco} nombre={t.nombre}
                          onCambio={(b) => cambiarBanco(i, b)} />
                      </div>
                    </div>
                  </div>
                )}
                </div>
              )}
            </li>
          );
        })}
        {gente.length === 0 && (
          <li className="rounded border border-dashed border-hueso/15 p-6 text-sm text-hueso/50">
            Todavía no hay nadie. Apreta <strong>Agregar trabajador</strong>.
          </li>
        )}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setGente([...gente, { nombre: '', telefono: '', puesto: '', activo: true,
                                  token: '', modalidad: MODALIDAD.porTurno,
                                  pagoJornada: 0, valorHora: 0, propina: true,
                                  banco: bancoVacio() }]);
            // La ficha nueva se abre sola: agregar a alguien y que aparezca
            // una línea vacía que además hay que apretar sería pedir dos
            // pasos para uno.
            setAbierta(gente.length);
            setSucio(true);
          }}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          Agregar trabajador
        </button>
        <span className="flex-1" />
        {botonGuardar}
      </div>

      {esAdmin && (
        <p className="mt-4 max-w-2xl text-xs text-hueso/50">
          <strong>La propina se reparte en partes iguales</strong> entre
          quienes vinieron ese día y tienen esta casilla marcada. Desmarcarla
          deja a alguien en la planilla de trabajo pero fuera del reparto,
          que es la excepción que existe — por eso viene marcada por defecto.
        </p>
      )}
      {esAdmin && (
        <p className="mt-4 max-w-2xl text-xs text-hueso/50">
          <strong>Por turno</strong> se le paga por jornada trabajada, y cada
          turno suma al costo del día. <strong>Contratado</strong> tiene
          sueldo, y ese sueldo no sale de acá: sus turnos no suman jornada,
          porque contarlos sería pagar dos veces lo mismo. A un contratado sí
          se le pueden anotar horas extra y ajustes, que se pagan aparte.
        </p>
      )}

      {/* **Los puestos salen de la página y entran en una ventana**
          (2026-10-29, lo pidió el cliente). Son una tabla de diez o doce
          filas que casi nunca se toca, y estaba debajo de la lista de
          trabajadores: entre las dos, `/equipo` era una página larguísima
          que había que recorrer entera para llegar a cualquier cosa. Acá
          queda un botón, y la tabla se abre cuando de verdad hace falta. */}
      <div className="mt-10 rounded border border-hueso/15 bg-hueso/[0.02] p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button onClick={() => setVerPuestos(true)}
            className="rounded border border-hueso/25 px-4 py-2 text-sm font-semibold
                       hover:border-oro hover:text-oro">
            {esAdmin ? 'Administrar puestos' : 'Ver los puestos'}
          </button>
          <span className="text-sm text-hueso/50">
            {puestos.length} {puestos.length === 1 ? 'puesto' : 'puestos'}
            {' '}· {puestos.map((x) => x.nombre).filter(Boolean).slice(0, 4).join(' · ')}
            {puestos.length > 4 && <> …</>}
          </span>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-hueso/50">
        <strong>A quien ya trabajó se le desactiva, no se le quita.</strong>{' '}
        <em>Desactivar</em> lo saca del planificador y le cierra su link
        personal, pero conserva sus turnos, que son el registro de quién
        trabajó qué día. <em>Quitar</em> aparece solo mientras la persona no
        tenga ningún turno guardado — la fila escrita por error, básicamente.
      </p>

      {verPuestos && (
        <Dialogo titulo="Puestos" ancho="max-w-3xl"
                 onCerrar={() => setVerPuestos(false)}>
          {!esAdmin && (
            <p className="mt-3 max-w-2xl text-sm text-hueso/60">
              Los puestos y su regla los cambia el administrador. Acá se ven
              para poder asignar turnos.
            </p>
          )}
          <p className="mt-3 max-w-2xl text-sm text-hueso/60">
            <strong>Uno cada N personas</strong> es cuánta gente hace falta en
            ese puesto según cuántos comensales haya. Con 10 en garzón, un día
            de 44 personas sugiere 5. <strong>En blanco el panel no opina</strong>,
            que es lo correcto mientras el número no lo hayas puesto tú.
          </p>
          {/* **El orden de esta lista es el orden del planificador**, así que
              se puede acomodar al orden en que se arma un turno. */}
          <p className="mt-2 max-w-2xl text-xs text-hueso/45">
            El orden manda: así salen en la ventana de planificar un día.
            Muévelos con las flechas.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] table-fixed text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
                <tr className="border-b border-hueso/10">
                  {esAdmin && <th className="w-16 py-2 pr-2">Orden</th>}
                  <th className="py-2 pr-3">Puesto</th>
                  <th className="w-44 py-2 pr-3">Uno cada N personas</th>
                  <th className="w-16 py-2" />
                </tr>
              </thead>
              <tbody>
                {puestos.map((p, i) => (
                  <tr key={i} className="border-b border-hueso/5">
                    {esAdmin && (
                      <td className="whitespace-nowrap py-2 pr-2 text-hueso/50">
                        <button onClick={() => moverPuesto(i, -1)} disabled={i === 0}
                          className="rounded px-2 py-1.5 text-base hover:bg-hueso/5 hover:text-oro disabled:opacity-25"
                          title={`Subir ${p.nombre || 'este puesto'}`}>
                          <span aria-hidden>↑</span>
                          <span className="sr-only">Subir {p.nombre}</span>
                        </button>
                        <button onClick={() => moverPuesto(i, 1)}
                          disabled={i === puestos.length - 1}
                          className="rounded px-2 py-1.5 text-base hover:bg-hueso/5 hover:text-oro disabled:opacity-25"
                          title={`Bajar ${p.nombre || 'este puesto'}`}>
                          <span aria-hidden>↓</span>
                          <span className="sr-only">Bajar {p.nombre}</span>
                        </button>
                      </td>
                    )}
                    <td className="py-2 pr-3">
                      <input type="text" value={p.nombre} className={ENTRADA}
                        placeholder="Garzón, cocina, barra…" disabled={!esAdmin}
                        aria-label={`Nombre del puesto ${i + 1}`}
                        onChange={(e) => cambiarPuesto(i, 'nombre', e.target.value)} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min={0} step={1} className={ENTRADA}
                        value={p.cadaCuantas || ''} placeholder="— sin regla"
                        disabled={!esAdmin}
                        aria-label={`Uno cada cuántas personas en ${p.nombre || 'este puesto'}`}
                        onChange={(e) => cambiarPuesto(i, 'cadaCuantas', e.target.value)} />
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">
                      {esAdmin && (
                        <button
                          onClick={() => { setPuestos(puestos.filter((_, k) => k !== i)); setSucio(true); }}
                          className="text-hueso/60 hover:text-red-400">Quitar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {esAdmin && (
              <button
                onClick={() => { setPuestos([...puestos, { nombre: '', cadaCuantas: 0 }]); setSucio(true); }}
                className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
                Agregar puesto
              </button>
            )}
            <span className="flex-1" />
            <button onClick={() => setVerPuestos(false)}
              className="rounded border border-hueso/20 px-3 py-1.5 text-sm
                         hover:border-hueso/40">
              Cerrar
            </button>
            {/* Guarda las dos listas, como siempre: es una sola petición y
                un solo botón de guardar en toda la pantalla. */}
            {esAdmin && (
              <button onClick={guardar} disabled={guardando || !sucio}
                className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                           disabled:opacity-40">
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            )}
          </div>
        </Dialogo>
      )}
    </section>
  );
}
