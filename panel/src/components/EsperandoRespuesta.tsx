'use client';

/**
 * **Esperando respuesta** (2026-11-11, lo pidió el cliente: *"¿qué pasa con
 * esta cotización enviada? ¿Aún está en negociación o ya se perdió?"*).
 *
 * Arriba de Cotizaciones, una tarjeta por cotización mandada a la que le
 * toca seguimiento (`seguimientoDe()`), con los tres botones a la vista: se
 * contesta sin abrir nada. *Se perdió* pide el motivo ahí mismo, con los
 * mismos botones de la ventana de cotizar.
 *
 * Los cambios van por el `PATCH` de siempre: el servidor pone las fechas
 * (`Último seguimiento`) y comprueba que la cotización sea de quien la toca.
 */
import { useState } from 'react';
import AyudaCorta from './AyudaCorta';
import { avisar } from './AvisoFlotante';
import { ESTADO_PRESUPUESTO, estadoNormal, folioDe, type Presupuesto } from '@/lib/presupuestos';
import { MOTIVOS_PERDIDA } from '@/lib/cotizar';
import { enPalabras } from '@/lib/fechas';

export interface PorSeguir {
  p: Presupuesto;
  motivo: 'eventoCerca' | 'sinRespuesta';
  dias: number;
  puedeTocar: boolean;
}

export default function EsperandoRespuesta({ lista, onCambio, onAbrir }: {
  lista: PorSeguir[];
  onCambio: () => void;
  onAbrir: (p: Presupuesto) => void;
}) {
  const [perdiendo, setPerdiendo] = useState('');
  const [enviando, setEnviando] = useState('');
  if (lista.length === 0) return null;

  async function cambiar(p: Presupuesto, cuerpo: Record<string, unknown>, aviso: string) {
    setEnviando(p.id);
    try {
      const r = await fetch('/api/presupuestos', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, ...cuerpo })
      });
      const d = await r.json().catch(() => ({}));
      if (d.error) return avisar(d.error, 'atencion');
      avisar(aviso); setPerdiendo(''); onCambio();
    } finally { setEnviando(''); }
  }

  return (
    <div className="rounded-xl border-2 border-rosa/40 bg-rosa/[0.06] p-3">
      <p className="flex items-center text-[16px] font-bold text-rosa-texto">
        📨 Esperando respuesta · {lista.length}
        <AyudaCorta tema="esperandoRespuesta" />
      </p>
      <ul className="mt-2 space-y-2">
        {lista.map(({ p, motivo, dias, puedeTocar }) => (
          <li key={p.id} className="rounded-lg border border-hueso/15 bg-panel p-3">
            <button type="button" onClick={() => onAbrir(p)} className="text-left">
              <span className="text-[16px] font-semibold">{p.cliente || 'Sin cliente'}</span>
              <span className="ml-2 text-[14px] text-hueso/65">N° {folioDe(p)} · {estadoNormal(p.estado)}</span>
              <span className={`mt-0.5 block text-[15px] ${motivo === 'eventoCerca'
                ? 'font-semibold text-ambar-texto' : 'text-hueso/80'}`}>
                {motivo === 'eventoCerca'
                  ? `Faltan ${dias === 0 ? 'hoy' : dias === 1 ? '1 día' : `${dias} días`} para el evento: ¿se ganó o se perdió?`
                  : `Mandada hace ${dias} días sin respuesta.`}
                {p.fecha && motivo !== 'eventoCerca' && (
                  <span className="text-hueso/60"> · evento {enPalabras(p.fecha)}</span>
                )}
              </span>
            </button>
            {puedeTocar && perdiendo !== p.id && (
              <div className="mt-2 flex flex-wrap gap-2">
                {motivo === 'eventoCerca' && (
                  <button type="button" onClick={() => onAbrir(p)}
                    className="boton min-h-[44px] !border-verde-fuerte font-semibold text-verde-texto">
                    ✓ Se ganó
                  </button>
                )}
                {estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.negociacion && (
                  <button type="button" disabled={enviando === p.id}
                    onClick={() => void cambiar(p, { estado: ESTADO_PRESUPUESTO.negociacion }, 'Pasó a Negociación')}
                    className="boton min-h-[44px]">Está negociando</button>
                )}
                <button type="button" onClick={() => setPerdiendo(p.id)}
                  className="boton min-h-[44px] hover:!border-rojo-fuerte hover:text-rojo-texto">Se perdió</button>
                <button type="button" disabled={enviando === p.id}
                  onClick={() => void cambiar(p, { seguimiento: 'esperando' }, 'Te pregunto de nuevo más adelante')}
                  className="boton min-h-[44px]">Sigue esperando</button>
              </div>
            )}
            {perdiendo === p.id && (
              <div className="mt-2">
                <p className="mb-1 text-[14px] font-semibold">¿Por qué se perdió?</p>
                <div className="flex flex-wrap gap-2">
                  {MOTIVOS_PERDIDA.map((m) => (
                    <button key={m} type="button" disabled={enviando === p.id}
                      onClick={() => void cambiar(p, { estado: ESTADO_PRESUPUESTO.rechazado, motivo: m }, 'Marcada perdida')}
                      className="boton min-h-[44px]">{m}</button>
                  ))}
                  <button type="button" onClick={() => setPerdiendo('')} className="boton min-h-[44px]">Volver</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
