'use client';

/**
 * Las cuentas del panel.
 *
 * Existen para que la bitácora pueda decir **quién**. Con una clave
 * compartida por rol, cada línea decía "un encargado" y no servía para
 * preguntarle a nadie.
 *
 * **Poner la contraseña es una acción aparte de guardar la lista.** No es
 * un capricho de la interfaz: separadas, guardar un cambio de nombre no
 * puede dejar a alguien sin poder entrar.
 */
import { useEffect, useState } from 'react';
import { Aviso } from './CalendarView';
import Dialogo from './Dialogo';
import { LARGO_MINIMO_CLAVE, ROLES_DE_CUENTA } from '@/lib/auth';

interface Fila {
  nombre: string;
  usuario: string;
  rol: string;
  activo: boolean;
  tieneClave: boolean;
}

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function UsuariosEditor() {
  const [lista, setLista] = useState<Fila[] | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [poniendoClave, setPoniendoClave] = useState<string | null>(null);
  const [clave, setClave] = useState('');

  useEffect(() => {
    fetch('/api/usuarios').then((r) => r.json())
      .then((d) => {
        if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
        setLista(d.usuarios);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function guardar() {
    setGuardando(true);
    setAviso('');
    try {
      const r = await fetch('/api/usuarios', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuarios: lista })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); }
      else { setLista(d.usuarios); setSucio(false); setError(''); }
    } finally { setGuardando(false); }
  }

  async function ponerClave() {
    const r = await fetch('/api/usuarios', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ usuario: poniendoClave, clave })
    });
    const d = await r.json();
    if (d.error) return setAviso(d.error);
    setLista((antes) => (antes ?? []).map(
      (u) => (u.usuario === poniendoClave ? { ...u, tieneClave: true } : u)
    ));
    setAviso(`Contraseña puesta para ${poniendoClave}. Mándasela por un canal privado.`);
    setPoniendoClave(null);
    setClave('');
  }

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!lista) return <p className="text-hueso/50">Cargando…</p>;

  const cambiar = (i: number, campo: keyof Fila, valor: string | boolean) => {
    const copia = lista.map((u) => ({ ...u }));
    if (campo === 'activo') copia[i].activo = Boolean(valor);
    else (copia[i] as unknown as Record<string, string>)[campo] = String(valor);
    setLista(copia);
    setSucio(true);
  };

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">Cuentas</h1>
      <p className="mb-6 max-w-2xl text-sm text-hueso/60">
        Quién entra al panel y con qué permisos. <strong>Cada acción queda
        firmada con el nombre de esta lista</strong>, así que conviene una
        cuenta por persona y no una compartida — una línea de bitácora que
        diga "encargado" no sirve para preguntarle a nadie.
      </p>
      <p className="mb-6 max-w-2xl text-sm text-hueso/60">
        <strong>Tu cuenta de administrador de Vercel sigue funcionando</strong>{' '}
        aunque esta lista quede vacía: es la puerta de emergencia para el día
        en que la planilla no responda.
      </p>

      {aviso && (
        <p className="mb-5 rounded border border-hueso/20 bg-hueso/5 px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
            <tr className="border-b border-hueso/10">
              <th className="py-2 pr-3">Nombre</th>
              <th className="w-40 py-2 pr-3">Usuario</th>
              <th className="w-36 py-2 pr-3">Rol</th>
              <th className="w-20 py-2 pr-3">Activo</th>
              <th className="w-44 py-2 pr-3">Contraseña</th>
              <th className="w-20 py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.map((u, i) => (
              <tr key={i} className="border-b border-hueso/5">
                <td className="py-2 pr-3">
                  <input type="text" value={u.nombre} className={ENTRADA}
                    placeholder="Nombre y apellido"
                    onChange={(e) => cambiar(i, 'nombre', e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  <input type="text" value={u.usuario} className={ENTRADA}
                    placeholder="sin espacios"
                    onChange={(e) => cambiar(i, 'usuario', e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  <select value={u.rol} className={ENTRADA}
                    onChange={(e) => cambiar(i, 'rol', e.target.value)}>
                    {ROLES_DE_CUENTA.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input type="checkbox" checked={u.activo}
                    aria-label={`${u.usuario || 'Sin usuario'} puede entrar`}
                    className="h-4 w-4 accent-oro"
                    onChange={(e) => cambiar(i, 'activo', e.target.checked)} />
                </td>
                <td className="py-2 pr-3 text-xs">
                  {sucio ? (
                    <span className="text-hueso/40">Guarda la lista primero</span>
                  ) : (
                    <>
                      <span className={u.tieneClave ? 'text-hueso/55' : 'text-amber-300'}>
                        {u.tieneClave ? 'Puesta' : 'Sin poner'}
                      </span>
                      <button
                        onClick={() => { setPoniendoClave(u.usuario); setClave(''); setAviso(''); }}
                        className="ml-2 text-oro hover:underline">
                        {u.tieneClave ? 'Cambiar' : 'Poner'}
                      </button>
                    </>
                  )}
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  <button
                    onClick={() => { setLista(lista.filter((_, k) => k !== i)); setSucio(true); }}
                    className="text-hueso/60 hover:text-red-400">Quitar</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-sm text-hueso/50">
                Todavía no hay cuentas. Apreta <strong>Agregar cuenta</strong>.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setLista([...lista, { nombre: '', usuario: '', rol: 'encargado',
                                  activo: true, tieneClave: false }]);
            setSucio(true);
          }}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          Agregar cuenta
        </button>
        <span className="flex-1" />
        {sucio && <span className="text-xs text-hueso/50">Hay cambios sin guardar.</span>}
        <button onClick={guardar} disabled={guardando || !sucio}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-hueso/50">
        <strong>Desmarcar "activo" cierra la puerta, quitar borra la cuenta.</strong>{' '}
        Lo primero es lo que corresponde cuando alguien deja el equipo: sus
        líneas de la bitácora siguen diciendo quién fue.{' '}
        <strong>Ojo:</strong> una sesión abierta sigue viva hasta que caduca
        (7 días). Para echar a alguien ya mismo hay que cambiar{' '}
        <code>PANEL_CLAVE</code> en Vercel, que cierra todas las sesiones.
      </p>

      {poniendoClave && (
        <Dialogo titulo={`Contraseña de ${poniendoClave}`}
                 onCerrar={() => setPoniendoClave(null)}>
          <p className="mt-3 text-sm text-hueso/60">
            Al menos {LARGO_MINIMO_CLAVE} caracteres. <strong>Larga antes que
            rara</strong>: tres o cuatro palabras pegadas aguantan más que ocho
            caracteres con símbolos, y se pueden dictar por teléfono.
          </p>
          <input type="password" value={clave} autoFocus className={`${ENTRADA} mt-4`}
            placeholder="nueva contraseña"
            onChange={(e) => setClave(e.target.value)} />
          <p className="mt-2 text-xs text-hueso/45">
            No queda guardada en ninguna parte legible, ni siquiera para ti:
            la planilla solo guarda una huella. Si se pierde, se pone una nueva.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex-1" />
            <button onClick={() => setPoniendoClave(null)}
              className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-hueso/40">
              Cancelar
            </button>
            <button onClick={ponerClave} disabled={clave.length < LARGO_MINIMO_CLAVE}
              className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                         disabled:opacity-40">
              Guardar contraseña
            </button>
          </div>
        </Dialogo>
      )}
    </section>
  );
}
