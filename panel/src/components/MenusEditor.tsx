'use client';

/**
 * Qué menús existen.
 *
 * Vive en la planilla, así que agregar uno no necesita un despliegue.
 *
 * **El aviso amarillo es la pieza importante de esta pantalla**, no la
 * tabla. Sin alias, lo único que mantiene alineados a Shopify, al sitio y al
 * panel es enterarse cuando dejan de estarlo. Ver src/lib/menus.ts.
 */
import { useEffect, useMemo, useState } from 'react';
import { Aviso } from './CalendarView';
import { desconocidos, type Menu } from '@/lib/menus';
import { menusConocidos } from '@/lib/shopify';
import type { Reserva } from '@/lib/tipos';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function MenusEditor() {
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);

  useEffect(() => {
    fetch('/api/menus').then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setMenus(d.menus)))
      .catch((e) => setError(String(e)));
    fetch('/api/reservas').then((r) => r.json())
      .then((d) => d.reservas && setReservas(d.reservas))
      .catch(() => {});
  }, []);

  // Lo que se está vendiendo y no está en la lista. Es lo que permite que la
  // lista crezca sola en vez de que alguien lo descubra cuando los totales
  // del día no cuadren.
  const sinRegistrar = useMemo(() => {
    if (!menus) return [];
    // Sin la lista: así los nombres salen crudos y se puede ver cuál falta.
    return desconocidos(menusConocidos(reservas, []), menus);
  }, [menus, reservas]);

  async function guardar(lista: Menu[]) {
    setGuardando(true);
    try {
      const r = await fetch('/api/menus', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ menus: lista })
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setMenus(d.menus); setError(''); setSucio(false); }
    } finally { setGuardando(false); }
  }

  if (error) return <Aviso error={error} />;
  if (!menus) return <p className="text-hueso/50">Cargando…</p>;

  const cambiar = (i: number, valor: string) => {
    const copia = menus.map((m) => ({ ...m }));
    copia[i].nombre = valor;
    setMenus(copia);
    setSucio(true);
  };

  return (
    <section>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">Menús</h1>
      <p className="text-hueso/60 text-sm mb-6 max-w-2xl">
        Qué menús existen. <strong>El nombre tiene que ser exactamente el
        mismo acá, en Shopify y en el sitio</strong>: no hay equivalencias.
        Solo se perdonan mayúsculas, tildes y espacios de sobra, que es el
        mismo nombre escrito con descuido y no otro menú.
      </p>

      {sinRegistrar.length > 0 && (
        <div className="mb-6 rounded border border-amber-500/50 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            Hay {sinRegistrar.length === 1 ? 'un menú vendido' : 'menús vendidos'} que
            no está{sinRegistrar.length === 1 ? '' : 'n'} en esta lista.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            O Shopify está vendiendo algo que no está registrado acá, o alguien
            renombró un producto en la tienda. Agrégalo abajo con ese nombre
            exacto, o arregla el nombre en Shopify para que vuelvan a calzar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sinRegistrar.map((m) => (
              <code key={m} className="rounded bg-hueso/10 px-2 py-1 text-sm">{m}</code>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
            <tr className="border-b border-hueso/10">
              <th className="py-2 pr-3">Menú</th>
              <th className="py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {menus.map((m, i) => (
              <tr key={i} className="border-b border-hueso/5">
                <td className="py-2 pr-3">
                  <input type="text" value={m.nombre} className={ENTRADA}
                    placeholder="Como se llama en Shopify"
                    onChange={(e) => cambiar(i, e.target.value)} />
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button onClick={() => { setMenus(menus.filter((_, k) => k !== i)); setSucio(true); }}
                    className="text-hueso/60 hover:text-red-400">Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setMenus([...menus, { nombre: '' }]); setSucio(true); }}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          Agregar menú
        </button>
        <span className="flex-1" />
        {sucio && <span className="text-xs text-hueso/50">Hay cambios sin guardar.</span>}
        <button onClick={() => guardar(menus)} disabled={guardando || !sucio}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-hueso/50">
        Quitar un menú de acá no borra ninguna reserva: solo deja de ofrecerse
        al anotar a mano, y vuelve a aparecer en el aviso de arriba si todavía
        se está vendiendo.{' '}
        <strong>Ojo al renombrar en Shopify:</strong> los pedidos ya hechos
        guardan el nombre que tenían, así que sus reservas van a contarse
        aparte hasta que se corrijan esas filas en la planilla.
      </p>
    </section>
  );
}
