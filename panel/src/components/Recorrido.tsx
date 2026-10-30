'use client';

/**
 * El recorrido de bienvenida: cuatro pantallas de texto, una tras otra.
 *
 * **Se ofrece, no se impone, y se ofrece dos veces.** La tira de arriba
 * aparece la primera vez que alguien entra y, si contesta "Ahora no", vuelve
 * a aparecer una segunda vez y nunca más. Una sola oferta se la pierde quien
 * entró apurado; una oferta eterna se vuelve parte del fondo y deja de
 * verse. Dos es el punto donde todavía se agradece.
 *
 * Quien lo cierra o lo termina no lo ve nunca más, y de todas formas se puede
 * volver a ver desde el `?` del calendario.
 *
 * **Se recuerda en `localStorage`**, o sea por navegador: si el equipo
 * comparte un teléfono, la tira aparece una vez para ese teléfono y no una
 * por persona. No hay forma de hacerlo por persona sin guardarlo en la
 * planilla, y una escritura por cada vez que alguien mira un cartel no vale
 * lo que cuesta.
 *
 * Si `localStorage` está bloqueado, la tira aparece siempre: molesto, no
 * roto, y sin lanzar errores.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Dialogo from './Dialogo';
import { RECORRIDO } from '@/lib/ayudas';

const LLAVE = 'brasas-recorrido';
/** Cuántas veces se ofrece antes de no molestar más. */
const OFRECIDAS = 2;

const leer = (): string => {
  try { return localStorage.getItem(LLAVE) ?? ''; } catch { return ''; }
};
const anotar = (v: string) => {
  try { localStorage.setItem(LLAVE, v); } catch { /* sin memoria, paciencia */ }
};

/** Abre el recorrido desde otro lado (el `?` del calendario). */
export function verRecorrido() {
  window.dispatchEvent(new CustomEvent('brasas:recorrido'));
}

export default function Recorrido() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [ofrecer, setOfrecer] = useState(false);

  useEffect(() => {
    const v = leer();
    if (v !== 'listo') setOfrecer(Number(v || 0) < OFRECIDAS);
    const abrir = () => { setPaso(0); setAbierto(true); };
    window.addEventListener('brasas:recorrido', abrir);
    return () => window.removeEventListener('brasas:recorrido', abrir);
  }, []);

  // Ni la página del trabajador, ni la planilla del grupo, ni la entrada:
  // las tres las abre gente que no administra nada, y un recorrido por el
  // panel sería ofrecerle una visita a una casa en la que no vive.
  const fuera = ruta.startsWith('/mi/') || ruta.startsWith('/semana/')
             || ruta === '/login';
  if (fuera) return null;

  const cerrarYa = () => {
    anotar('listo');
    setOfrecer(false);
    setAbierto(false);
  };

  const ahoraNo = () => {
    anotar(String(Number(leer() || 0) + 1));
    setOfrecer(false);
  };

  const p = RECORRIDO[paso];
  const ultimo = paso === RECORRIDO.length - 1;

  return (
    <>
      {ofrecer && !abierto && (
        <div className="border-b border-oro/30 bg-oro/5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4
                          gap-y-2 px-5 py-2.5 text-sm">
            <span>
              <strong>¿Primera vez acá?</strong>{' '}
              <span className="text-hueso/70">
                Te muestro el panel en un minuto.
              </span>
            </span>
            <span className="flex-1" />
            <button onClick={() => { setPaso(0); setAbierto(true); }}
              className="rounded bg-oro px-3 py-1 text-sm font-semibold text-tinta">
              Ver cómo funciona
            </button>
            <button onClick={ahoraNo}
              className="text-sm text-hueso/55 hover:text-hueso">
              Ahora no
            </button>
          </div>
        </div>
      )}

      {abierto && p && (
        <Dialogo titulo={p.titulo} onCerrar={cerrarYa}>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-hueso/80">
            {p.cuerpo.map((t, i) => <p key={i}>{t}</p>)}
          </div>

          {p.ir && (
            <a href={p.ir.url}
              className="mt-4 inline-block rounded border border-oro/50 px-3 py-1.5
                         text-sm font-semibold text-oro hover:bg-oro/10">
              {p.ir.texto} →
            </a>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Los puntos dicen cuánto falta. Sin eso, "Siguiente" podría ser
                el segundo de cuatro o el segundo de veinte, y la diferencia
                es si alguien sigue o se sale. */}
            <span className="flex gap-1.5" aria-label={`Paso ${paso + 1} de ${RECORRIDO.length}`}>
              {RECORRIDO.map((_, i) => (
                <span key={i} aria-hidden
                  className={`h-2 w-2 rounded-full ${
                    i === paso ? 'bg-oro' : 'bg-hueso/20'}`} />
              ))}
            </span>
            <span className="flex-1" />
            {paso > 0 && (
              <button onClick={() => setPaso(paso - 1)}
                className="rounded border border-hueso/20 px-3 py-1.5 text-sm
                           hover:border-hueso/40">
                Atrás
              </button>
            )}
            <button onClick={() => (ultimo ? cerrarYa() : setPaso(paso + 1))}
              className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta">
              {ultimo ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
