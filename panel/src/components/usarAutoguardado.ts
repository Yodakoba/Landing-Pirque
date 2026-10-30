'use client';

/**
 * Guardar solo, sin botón.
 *
 * **Son dos cosas distintas y hasta el 2026-10-30 eran el mismo botón**
 * (lo dijo el cliente): *"una cosa es guardar un cambio que hiciste en un
 * detalle —se paga ahora 30 en vez de 28— y otra cosa es cerrar la fecha"*.
 * Cambiar un monto es un dato que se corrige; cerrar un día es declarar que
 * alguien lo revisó. Tenerlos como dos botones hermanos —*Guardar* y
 * *Guardar y cerrar*— obligaba a leer cuál era cuál justo en el momento en
 * que uno de los dos no se puede deshacer.
 *
 * Entonces: **el dato se guarda solo** y el cierre queda como la única
 * acción que se aprieta, con su confirmación.
 *
 * Cómo funciona, y por qué así:
 *
 * - **Espera a que dejen de escribir** (`espera`, unos 600ms). Sin eso, un
 *   monto de cinco dígitos serían cinco guardados, y el cuarto llegaría con
 *   un número a medio escribir.
 * - **Nunca hay dos peticiones a la vez.** Si llega un cambio mientras una
 *   está en vuelo, queda anotado y se manda apenas vuelva. Lo que se guarda
 *   es el día entero, así que el último gana y eso es justo lo correcto.
 * - **`forzar()` manda ya y espera**, para el momento antes de cerrar la
 *   ventana o antes de cerrar el día: cerrar con un cambio todavía en el
 *   reloj escribiría el cierre sobre datos viejos.
 * - **Al desmontar manda lo que quede pendiente**, sin esperar respuesta. Es
 *   el seguro para la ventana que se cierra de un escape: un valor escrito y
 *   perdido es mucho peor que una petición de más.
 *
 * ## Dónde SÍ y dónde NO
 *
 * La regla que salió de revisar las pantallas una por una, porque no es
 * "sacar todos los botones de guardar":
 *
 * **Se guarda solo lo que es un valor sobre algo que ya existe.** La ventana
 * del día y la de las actividades extras editan montos, asistencias y
 * ajustes de personas que ya están en la lista: ahí el botón no decidía
 * nada, solo se podía olvidar.
 *
 * **Se aprieta Guardar cuando lo que se edita es la lista misma** —`/equipo`,
 * `/extras` en su parte de fichas, `/menus`, `/configuración`, `/usuarios`—.
 * Ahí el nombre **es** la identidad de la fila y la pantalla reescribe la
 * pestaña entera: guardar a mitad de palabra, mientras alguien borra un
 * nombre para reescribirlo, mandaría una fila sin nombre, el servidor la
 * descartaría —hace bien— y la ficha desaparecería bajo los dedos. Esas
 * pantallas ya tienen su botón **dentro de cada ficha**, que era el problema
 * real: un guardado al final de una página larga es un guardado que se
 * olvida.
 *
 * **Y cerrar el día nunca se guarda solo**: es una declaración con nombre y
 * hora, se aprieta y además pregunta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoGuardado = 'quieto' | 'guardando' | 'guardado' | 'error';

export function usarAutoguardado<T>(
  /** Lo que hay que guardar. Cada cambio de identidad dispara el reloj. */
  valor: T,
  /** Guarda de verdad. Devuelve un texto si el servidor se quejó. */
  guardar: (v: T) => Promise<string | void>,
  espera = 600
) {
  const [estado, setEstado] = useState<EstadoGuardado>('quieto');
  const [error, setError] = useState('');

  // Por refs y no por dependencias: `guardar` es una función nueva en cada
  // dibujado, y meterla en las dependencias reiniciaría el reloj sin parar.
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  const valorRef = useRef(valor);
  valorRef.current = valor;

  const enVuelo = useRef(false);
  const pendiente = useRef(false);
  const sucio = useRef(false);
  /** Si alguna vez se guardó algo: el que cierra la ventana lo consulta. */
  const hubo = useRef(false);
  const primera = useRef(true);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const correr = useCallback(async (): Promise<void> => {
    if (enVuelo.current) { pendiente.current = true; return; }
    enVuelo.current = true;
    sucio.current = false;
    setEstado('guardando');
    setError('');
    try {
      const malo = await guardarRef.current(valorRef.current);
      if (malo) { setError(String(malo)); setEstado('error'); }
      else { hubo.current = true; setEstado('guardado'); }
    } catch (e) {
      setError(String(e));
      setEstado('error');
    } finally {
      enVuelo.current = false;
      if (pendiente.current) { pendiente.current = false; await correr(); }
    }
  }, []);

  useEffect(() => {
    // El primer dibujado no es un cambio: sin esto, abrir la ventana
    // escribiría el día entero sin que nadie tocara nada.
    if (primera.current) { primera.current = false; return; }
    sucio.current = true;
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => { void correr(); }, espera);
    return () => { if (reloj.current) clearTimeout(reloj.current); };
  }, [valor, espera, correr]);

  useEffect(() => () => {
    if (sucio.current) void guardarRef.current(valorRef.current);
  }, []);

  /** Manda ya lo que haya y espera a que termine. */
  const forzar = useCallback(async () => {
    if (reloj.current) { clearTimeout(reloj.current); reloj.current = null; }
    if (!sucio.current && !enVuelo.current && estado !== 'error') return;
    await correr();
  }, [correr, estado]);

  return { estado, error, hubo, forzar, reintentar: correr };
}
