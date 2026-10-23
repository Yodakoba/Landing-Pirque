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
import { bancoVacio, type Banco } from '@/lib/banco';
import CampoTelefono from './CampoTelefono';

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
        setPuestos(d.puestos);
        setGente(d.trabajadores);
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

  const cambiarPuesto = (i: number, campo: keyof Puesto, valor: string) => {
    const copia = puestos.map((p) => ({ ...p }));
    if (campo === 'nombre') copia[i].nombre = valor;
    else copia[i].cadaCuantas = aEntero(valor);
    setPuestos(copia); setSucio(true);
  };
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
      {/* **Los anchos van declarados columna por columna**, y la tabla no baja
          de su mínimo: sin eso, el nombre —la única columna sin ancho— era la
          que cedía todo el espacio y quedaba en seis letras, mientras un
          teléfono de nueve dígitos sobraba la mitad de su caja. Si no cabe,
          la tabla se desplaza de lado dentro de su marco, que es lo que ya
          hacen las demás del panel. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[62rem] table-fixed text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
            <tr className="border-b border-hueso/10">
              <th className="w-52 py-2 pr-3">Nombre</th>
              <th className="w-32 py-2 pr-3">Teléfono</th>
              <th className="w-40 py-2 pr-3">Puesto habitual</th>
              <th className="w-16 py-2 pr-3">Activo</th>
              {esAdmin && <th className="w-32 py-2 pr-3">Modalidad</th>}
              {esAdmin && <th className="w-28 py-2 pr-3">Jornada</th>}
              {esAdmin && <th className="w-24 py-2 pr-3">Hora extra</th>}
              {esAdmin && <th className="w-20 py-2 pr-3">Propina</th>}
              {esAdmin && <th className="w-44 py-2 pr-3">Link personal</th>}
              <th className="w-20 py-2" />
            </tr>
          </thead>
          <tbody>
            {gente.map((t, i) => (
              <Fragment key={i}>
              <tr className={esAdmin ? '' : 'border-b border-hueso/5'}>
                <td className="py-2 pr-3">
                  <input type="text" value={t.nombre} className={ENTRADA}
                    placeholder="Nombre y apellido"
                    onChange={(e) => cambiarPersona(i, 'nombre', e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  <CampoTelefono valor={t.telefono} className={ENTRADA}
                    etiqueta={`Teléfono de ${t.nombre || 'esta persona'}`}
                    onCambio={(v) => cambiarPersona(i, 'telefono', v)} />
                </td>
                <td className="py-2 pr-3">
                  {/* Un select y no texto libre: el puesto habitual solo
                      preselecciona en el planificador, y si está escrito de
                      otra forma no preselecciona nada. */}
                  <select value={t.puesto} className={ENTRADA}
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
                </td>
                <td className="py-2 pr-3">
                  <input type="checkbox" checked={t.activo}
                    aria-label={`${t.nombre || 'Sin nombre'} sigue en el equipo`}
                    className="h-4 w-4 accent-oro"
                    onChange={(e) => cambiarPersona(i, 'activo', e.target.checked)} />
                </td>
                {esAdmin && (
                  <td className="py-2 pr-3">
                    <select value={t.modalidad} className={ENTRADA}
                      aria-label={`Cómo se le paga a ${t.nombre || 'esta persona'}`}
                      onChange={(e) => cambiarPersona(i, 'modalidad', e.target.value)}>
                      <option value={MODALIDAD.porTurno}>Por turno</option>
                      <option value={MODALIDAD.contratado}>Contratado</option>
                    </select>
                  </td>
                )}
                {esAdmin && (
                  <td className="py-2 pr-3">
                    {/* A un contratado no se le paga por jornada, así que el
                        campo no se deja escribir: un monto ahí no se usaría
                        en ninguna cuenta y haría creer que sí. */}
                    <input type="number" min={0} step={1000} className={ENTRADA}
                      value={esContratado(t.modalidad) ? '' : (t.pagoJornada || '')}
                      placeholder={esContratado(t.modalidad) ? 'no aplica' : '—'}
                      disabled={esContratado(t.modalidad)}
                      onChange={(e) => cambiarPersona(i, 'pagoJornada', e.target.value)} />
                  </td>
                )}
                {esAdmin && (
                  <td className="py-2 pr-3">
                    <input type="number" min={0} step={500} className={ENTRADA}
                      value={t.valorHora || ''} placeholder="—"
                      onChange={(e) => cambiarPersona(i, 'valorHora', e.target.value)} />
                  </td>
                )}
                {esAdmin && (
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={t.propina}
                      aria-label={`${t.nombre || 'Esta persona'} entra en el reparto de propina`}
                      className="h-4 w-4 accent-oro"
                      onChange={(e) => cambiarPersona(i, 'propina', e.target.checked)} />
                  </td>
                )}
                {esAdmin && (
                  <td className="whitespace-nowrap py-2 pr-3 text-xs">
                    {!t.nombre.trim() ? (
                      <span className="text-hueso/35">Ponle nombre y guarda</span>
                    ) : sucio ? (
                      <span className="text-hueso/40">Guarda para administrar el link</span>
                    ) : t.token ? (
                      <span className="flex gap-2">
                        <button onClick={() => copiar(t.token, t.nombre)}
                          className="text-oro hover:underline">Copiar</button>
                        <button onClick={() => link(t.nombre, 'renovar')}
                          className="text-hueso/55 hover:text-oro"
                          title="Crea uno nuevo; el anterior deja de servir">Renovar</button>
                        {/* "Quitar link", con la palabra completa: en esta
                            misma fila hay otro botón que quita a la persona,
                            y dos "Quitar" distintos a dos columnas de
                            distancia es una confusión esperando a pasar. */}
                        <button onClick={() => link(t.nombre, 'quitar')}
                          className="text-hueso/55 hover:text-red-400">Quitar link</button>
                      </span>
                    ) : (
                      <button onClick={() => link(t.nombre, 'crear')}
                        className="text-oro hover:underline">Crear link</button>
                    )}
                  </td>
                )}
                {/* **Quitar solo a quien no tiene historia.** Borrar la ficha
                    de alguien que ya trabajó dejaría sus turnos con un nombre
                    que no está en ninguna parte, y esos turnos son el registro
                    de quién trabajó qué día. Antes esto era un consejo en
                    letra chica al pie de la tabla, al lado de un botón que
                    decía lo contrario; ahora lo decide el panel. */}
                <td className="whitespace-nowrap py-2 text-right text-xs">
                  {(turnosDe.get(normalizar(t.nombre)) ?? 0) === 0 ? (
                    <button
                      onClick={() => { setGente(gente.filter((_, k) => k !== i)); setSucio(true); }}
                      className="text-hueso/60 hover:text-red-400"
                      title="Todavía no tiene ningún turno guardado">Quitar</button>
                  ) : t.activo ? (
                    <button
                      onClick={() => cambiarPersona(i, 'activo', false)}
                      className="text-hueso/60 hover:text-oro"
                      title={`Tiene ${turnosDe.get(normalizar(t.nombre))} turnos guardados, `
                             + 'así que su ficha no se quita: se desactiva y conserva su historia'}>
                      Desactivar
                    </button>
                  ) : (
                    <span className="text-hueso/30"
                      title="Su ficha se conserva porque tiene turnos guardados">
                      Desactivado
                    </span>
                  )}
                </td>
              </tr>

              {/* **Los datos de la transferencia van en su propia línea, no
                  en columnas más.** Con diez columnas, la once ya dejaba
                  *Crear link* y *Desactivar* fuera del borde; seis la
                  habrían mandado al otro lado del país. Y acá abajo cada
                  campo tiene el ancho que le corresponde — un número de
                  cuenta no es del mismo largo que un tipo. */}
              {esAdmin && (
                <tr className="border-b border-hueso/5">
                  <td className="pb-2 align-top text-xs uppercase tracking-wide
                                 text-hueso/40">
                    Transferencia
                  </td>
                  <td colSpan={9} className="pb-2">
                    <DatosBancarios
                      banco={t.banco} nombre={t.nombre}
                      onCambio={(b) => cambiarBanco(i, b)} />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {gente.length === 0 && (
              <tr><td colSpan={esAdmin ? 10 : 5} className="py-6 text-sm text-hueso/50">
                Todavía no hay nadie. Apreta <strong>Agregar trabajador</strong>.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => {
          setGente([...gente, { nombre: '', telefono: '', puesto: '', activo: true,
                                token: '', modalidad: MODALIDAD.porTurno,
                                pagoJornada: 0, valorHora: 0, propina: true,
                                banco: bancoVacio() }]);
          setSucio(true);
        }}
        className="mt-4 rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
        Agregar trabajador
      </button>

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

      <h2 className="mb-3 mt-10 text-xs uppercase tracking-widest text-hueso/45">
        Puestos
      </h2>
      {!esAdmin && (
        <p className="mb-4 max-w-2xl text-sm text-hueso/60">
          Los puestos y su regla los cambia el administrador. Acá se ven para
          poder asignar turnos.
        </p>
      )}
      <p className="mb-4 max-w-2xl text-sm text-hueso/60">
        <strong>Uno cada N personas</strong> es cuánta gente hace falta en ese
        puesto según cuántos comensales haya. Con 10 en garzón, un día de 44
        personas sugiere 5. <strong>En blanco el panel no opina</strong>, que
        es lo correcto mientras el número no lo hayas puesto tú.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] table-fixed text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
            <tr className="border-b border-hueso/10">
              <th className="py-2 pr-3">Puesto</th>
              <th className="w-56 py-2 pr-3">Uno cada N personas</th>
              <th className="w-20 py-2" />
            </tr>
          </thead>
          <tbody>
            {puestos.map((p, i) => (
              <tr key={i} className="border-b border-hueso/5">
                <td className="py-2 pr-3">
                  <input type="text" value={p.nombre} className={ENTRADA}
                    placeholder="Garzón, cocina, barra…" disabled={!esAdmin}
                    onChange={(e) => cambiarPuesto(i, 'nombre', e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  <input type="number" min={0} step={1} className={ENTRADA}
                    value={p.cadaCuantas || ''} placeholder="— sin regla" disabled={!esAdmin}
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
        {sucio && <span className="text-xs text-hueso/50">Hay cambios sin guardar.</span>}
        <button onClick={guardar} disabled={guardando || !sucio}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-hueso/50">
        <strong>A quien ya trabajó se le desactiva, no se le quita.</strong>{' '}
        <em>Desactivar</em> lo saca del planificador y le cierra su link
        personal, pero conserva sus turnos, que son el registro de quién
        trabajó qué día. <em>Quitar</em> aparece solo mientras la persona no
        tenga ningún turno guardado — la fila escrita por error, básicamente.
      </p>
    </section>
  );
}
