'use client';

/**
 * **Autoguardado por ficha** (2026-11-12, lo pidió el cliente como regla:
 * *autoguardado por defecto*). Para las listas de fichas —Equipo, Extras,
 * Clientes— donde cada ficha se guarda **sola y de a una**, por su propia
 * ruta, sin reescribir la lista entera.
 *
 * - **Espera a que dejen de escribir** (`espera`), y junta los campos que se
 *   tocaron en ese rato: un teléfono escrito dígito a dígito es un guardado.
 * - **Nunca dos guardados de la misma ficha a la vez**: lo que llega mientras
 *   uno va en camino se manda apenas vuelve, con lo último.
 * - **Cada ficha tiene su estado** —*Guardando… / ✓ Guardado / no se pudo*—,
 *   que es lo que la pantalla muestra en su lugar del botón.
 * - **`forzar()`** manda todo lo pendiente ya, y **al desmontar** se manda
 *   lo que quede, para no perder lo escrito al cambiar de página.
 *
 * Lo que **no** pasa por acá, por la regla: el nombre de una ficha (es su
 * identidad), desactivar, quitar, los links. Eso se confirma a mano.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EstadoGuardado } from './usarAutoguardado';

export function usarGuardadoPorFicha<C extends object>(
  /** Guarda los cambios de una ficha. Devuelve un texto si el servidor se quejó. */
  enviar: (clave: string, cambios: Partial<C>) => Promise<string | void>,
  espera = 1000
) {
  const [estados, setEstados] = useState<Record<string, { estado: EstadoGuardado; error: string }>>({});
  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;
  const pendientes = useRef(new Map<string, Partial<C>>());
  const relojes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const enCamino = useRef(new Map<string, Promise<void>>());
  /** Fichas cuyo último intento falló: no se reintentan solas, se aprieta *Reintentar*. */
  const fallidas = useRef(new Set<string>());

  const poner = (clave: string, estado: EstadoGuardado, error = '') =>
    setEstados((e) => ({ ...e, [clave]: { estado, error } }));

  const mandar = useCallback(async (clave: string): Promise<void> => {
    const reloj = relojes.current.get(clave);
    if (reloj) { clearTimeout(reloj); relojes.current.delete(clave); }
    const previo = enCamino.current.get(clave);
    if (previo) { await previo; }
    const cambios = pendientes.current.get(clave);
    if (!cambios || !Object.keys(cambios).length) return;
    pendientes.current.delete(clave);
    poner(clave, 'guardando');
    const vuelo = (async () => {
      try {
        const queja = await enviarRef.current(clave, cambios);
        if (queja) {
          // Lo que no se guardó vuelve a quedar pendiente, para *Reintentar*.
          pendientes.current.set(clave, { ...cambios, ...(pendientes.current.get(clave) ?? {}) });
          fallidas.current.add(clave);
          poner(clave, 'error', queja);
        } else {
          fallidas.current.delete(clave);
          if (!pendientes.current.has(clave)) poner(clave, 'guardado');
        }
      } catch (e) {
        pendientes.current.set(clave, { ...cambios, ...(pendientes.current.get(clave) ?? {}) });
        fallidas.current.add(clave);
        poner(clave, 'error', String(e));
      }
    })();
    enCamino.current.set(clave, vuelo);
    await vuelo;
    enCamino.current.delete(clave);
    // Si llegó algo mientras iba en camino, se manda ahora.
    if (pendientes.current.has(clave) && !fallidas.current.has(clave)) {
      relojes.current.set(clave, setTimeout(() => void mandarRef.current(clave), 0));
    }
  }, []);
  const mandarRef = useRef(mandar);
  mandarRef.current = mandar;

  /** Anota cambios de una ficha y arranca el reloj. */
  const programar = useCallback((clave: string, cambios: Partial<C>) => {
    pendientes.current.set(clave, { ...(pendientes.current.get(clave) ?? {}), ...cambios });
    const reloj = relojes.current.get(clave);
    if (reloj) clearTimeout(reloj);
    relojes.current.set(clave, setTimeout(() => void mandarRef.current(clave), espera));
    setEstados((e) => (e[clave]?.estado === 'guardado' ? { ...e, [clave]: { estado: 'quieto', error: '' } } : e));
  }, [mandar, espera]);

  /** Manda todo lo pendiente ya y espera. */
  const forzar = useCallback(async () => {
    await Promise.all([...new Set([...pendientes.current.keys(), ...enCamino.current.keys()])].map((c) => mandar(c)));
  }, [mandar]);

  /** Si hay algo sin guardar (en el reloj o en camino). */
  const hayPendientes = () => pendientes.current.size > 0 || enCamino.current.size > 0;

  // Al irse, lo que quede se manda igual.
  useEffect(() => () => {
    for (const [clave, cambios] of pendientes.current) void enviarRef.current(clave, cambios);
  }, []);

  return {
    programar, forzar, hayPendientes,
    reintentar: (clave: string) => { fallidas.current.delete(clave); void mandar(clave); },
    estadoDe: (clave: string) => estados[clave] ?? { estado: 'quieto' as EstadoGuardado, error: '' },
    /** Cambia la clave de una ficha (al renombrarla), con lo que tuviera pendiente. */
    renombrar: (antes: string, despues: string) => {
      const p = pendientes.current.get(antes);
      if (p) { pendientes.current.delete(antes); pendientes.current.set(despues, p); }
      setEstados((e) => { const { [antes]: v, ...resto } = e; return v ? { ...resto, [despues]: v } : resto; });
    }
  };
}
