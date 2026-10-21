'use client';

/**
 * La pantalla de entrada.
 *
 * Reemplaza al cuadro gris del navegador. Lo que se gana no es estética:
 * con autenticación básica no había forma de saber **con qué cuenta** estaba
 * uno adentro, ni de cerrar sesión sin cerrar el navegador entero. Las dos
 * cosas hacen falta para que la bitácora signifique algo.
 */
import { useState } from 'react';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function Entrada() {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError('');
    try {
      const r = await fetch('/api/sesion', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuario, clave })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      // A donde quería ir antes de que le pidieran entrar. Se lee acá y no
      // en el servidor para no tener que confiar en un parámetro al redirigir.
      const volver = new URLSearchParams(window.location.search).get('volver');
      window.location.href = volver && volver.startsWith('/') ? volver : '/';
    } catch (err) {
      setError(String(err));
    } finally {
      setEntrando(false);
    }
  }

  return (
    <section className="mx-auto mt-10 max-w-xs">
      <h1 className="text-lg font-bold uppercase tracking-wide">Entrar</h1>
      <p className="mt-1 text-sm text-hueso/55">Panel de Brasas de Lo Pirque.</p>

      <form onSubmit={entrar} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">Usuario</span>
          <input type="text" value={usuario} autoFocus autoCapitalize="none"
            autoComplete="username" className={`${ENTRADA} mt-1`}
            onChange={(e) => setUsuario(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">Contraseña</span>
          <input type="password" value={clave} autoComplete="current-password"
            className={`${ENTRADA} mt-1`}
            onChange={(e) => setClave(e.target.value)} />
        </label>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <button type="submit" disabled={entrando || !usuario || !clave}
          className="w-full rounded bg-oro px-4 py-2 text-sm font-semibold text-tinta
                     disabled:opacity-40">
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-xs text-hueso/40">
        Si eres parte del equipo y solo quieres ver tus turnos, no entres acá:
        usa el link personal que te mandaron.
      </p>
    </section>
  );
}
