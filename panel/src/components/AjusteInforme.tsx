'use client';

/**
 * **Un ajuste desde el informe** (2026-11-21, lo pidió el cliente: *"el
 * encargado de pagos, y para arriba… en informe en la tarjeta del trabajador
 * también agregar un ajuste. Mismo ajuste que se puede agregar en turnos. Y
 * claramente con su fecha"*).
 *
 * Las mismas piezas del ajuste de Turnos —*− Descontar* / *+ Sumar*, el monto
 * sin signo, el motivo y cómo se pagó con botones, una nota— más **el día**,
 * que elige en qué turno queda y por eso en qué periodo suma. Es plata, así
 * que **no se guarda solo**: el botón relleno dice lo que va a pasar y recién
 * ahí se anota (`/api/equipo/ajuste`). Lo de abajo de la ventana dice cómo
 * queda el sueldo del periodo antes de apretarlo.
 */
import { useState } from 'react';
import { MOTIVOS_AJUSTE, MEDIOS_AJUSTE, ajusteDelCuerpo, type TipoAjuste, type Turno } from '@/lib/equipo';
import { enCorto, enPalabras, type Fecha } from '@/lib/fechas';
import { enPesos } from '@/lib/ocupacion';

const ROTULO = 'mb-1.5 block text-[13px] font-semibold uppercase tracking-wide text-hueso/65';
const ELEGIDO = 'border-oro bg-oro/15 font-semibold';

export default function AjusteInforme({ nombre, dias, tipoInicial, sueldo, periodo, onListo, onCancelar }: {
  nombre: string;
  /** Los días que vino en el periodo (`diasParaAjustar()`), en orden. */
  dias: Fecha[];
  tipoInicial: TipoAjuste;
  /** El sueldo del periodo hoy, para decir en cuánto queda. */
  sueldo: number;
  /** *"2 – 8 de noviembre"*. */
  periodo: string;
  onListo: (turno: Turno) => void;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoAjuste>(tipoInicial);
  const [dia, setDia] = useState<Fecha>(dias[dias.length - 1] ?? '');
  const [monto, setMonto] = useState('');
  const [razon, setRazon] = useState('');
  const [medio, setMedio] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const resta = tipo === 'resta';
  const cuerpo = { fecha: dia, trabajador: nombre, tipo, monto, razon, medio, nota };
  const valido = ajusteDelCuerpo(cuerpo);
  const listo = 'ajuste' in valido && !!dia;
  const cuanto = 'ajuste' in valido ? valido.ajuste.monto : 0;

  const cambiarTipo = (t: TipoAjuste) => {
    setTipo(t);
    // Un motivo de descuento no es un motivo de suma: se suelta al cambiar.
    if (razon && !MOTIVOS_AJUSTE[t].includes(razon)) setRazon('');
  };

  async function guardar() {
    if (!listo || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/equipo/ajuste', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error ?? `Error ${r.status}`);
      onListo(d.turno as Turno);
    } catch (e) {
      setError((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Descontar o sumar: dos botones grandes, por forma y por color. */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Descontar o sumar">
        {(['resta', 'suma'] as const).map((t) => (
          <button key={t} type="button" aria-pressed={tipo === t} onClick={() => cambiarTipo(t)}
            className={`tecla flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2
                        text-[16px] font-bold ${t === 'resta'
              ? (tipo === t ? 'border-rojo-fuerte bg-rojo/10 text-rojo-texto' : 'border-rojo-fuerte/40 text-rojo-texto/80')
              : (tipo === t ? 'border-verde-fuerte bg-verde/10 text-verde-texto' : 'border-verde-fuerte/40 text-verde-texto/80')}`}>
            <span aria-hidden className="text-[22px] leading-none">{t === 'resta' ? '−' : '+'}</span>
            {t === 'resta' ? 'Descontar' : 'Sumar'}
          </button>
        ))}
      </div>

      <div>
        <span className={ROTULO}>¿De qué día?</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="De qué día">
          {dias.map((f) => (
            <button key={f} type="button" aria-pressed={dia === f} onClick={() => setDia(f)}
              className={`boton boton-angosto min-h-[40px] ${dia === f ? ELEGIDO : ''}`}>
              {dia === f && '✓ '}{enCorto(f)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[13px] text-hueso/65">Los días que vino en este periodo. Queda en su turno de ese día.</p>
      </div>

      <label className="block">
        <span className={ROTULO}>Monto</span>
        <span className="flex items-center gap-2">
          <span aria-hidden className={`text-[22px] font-bold ${resta ? 'text-rojo-texto' : 'text-verde-texto'}`}>
            {resta ? '−' : '+'}
          </span>
          <span className="text-[17px] font-bold">$</span>
          <input type="number" min={0} step={1000} inputMode="numeric" autoFocus
            value={monto} placeholder="4000" onChange={(e) => setMonto(e.target.value)}
            aria-label={resta ? 'Monto a descontar' : 'Monto a sumar'}
            className="w-36 min-w-0 rounded-lg border-2 border-hueso/20 bg-tinta px-2.5 py-1.5
                       text-[17px] tabular-nums focus:border-oro focus:outline-none" />
        </span>
      </label>

      <div>
        <span className={ROTULO}>Por qué</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Por qué">
          {MOTIVOS_AJUSTE[tipo].map((m) => (
            <button key={m} type="button" aria-pressed={razon === m} onClick={() => setRazon(razon === m ? '' : m)}
              className={`boton boton-angosto min-h-[40px] ${razon === m ? ELEGIDO : ''}`}>
              {razon === m && '✓ '}{m}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Cómo">
          <span className="text-[13px] font-semibold text-hueso/65">Cómo:</span>
          {MEDIOS_AJUSTE.map((m) => (
            <button key={m} type="button" aria-pressed={medio === m} onClick={() => setMedio(medio === m ? '' : m)}
              className={`boton boton-angosto min-h-[40px] ${medio === m ? ELEGIDO : ''}`}>
              {medio === m && '✓ '}{m}
            </button>
          ))}
        </div>
        <input type="text" value={nota} maxLength={200} onChange={(e) => setNota(e.target.value)}
          placeholder={razon === 'Otro' ? 'qué fue' : 'nota (opcional)'}
          aria-label="Nota del ajuste"
          className="mt-2 w-full rounded-lg border-2 border-hueso/20 bg-tinta px-2.5 py-1.5 text-[15px]
                     focus:border-oro focus:outline-none" />
      </div>

      {/* Lo que va a pasar, dicho antes de apretar. */}
      <p className="rounded-xl border-2 border-hueso/15 px-3 py-2.5 text-[14px] text-hueso/85">
        {listo ? (
          <>
            Se anota en su turno del <strong>{enPalabras(dia)}</strong>. Su sueldo de {periodo} pasa
            de <strong className="tabular-nums">{enPesos(sueldo)}</strong> a{' '}
            <strong className="tabular-nums">{enPesos(sueldo + cuanto)}</strong>.
            {' '}Queda en la bitácora a tu nombre; si el día ya está cerrado, como corrección.
          </>
        ) : (
          <>Escribe el monto y elige el motivo{razon === 'Otro' ? ', y qué fue' : ''}.</>
        )}
      </p>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-rojo-fuerte/50 px-3 py-2 text-[14px] text-rojo-texto">
          {error}
        </p>
      )}

      <div className="flex flex-wrap-reverse items-center justify-end gap-2">
        <button type="button" onClick={onCancelar} className="boton min-h-[44px]">Cancelar</button>
        <button type="button" disabled={!listo || enviando} onClick={() => void guardar()}
          className={`tecla flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-4
                      text-[15px] font-bold disabled:opacity-40 ${resta
            ? 'border-rojo-fuerte bg-rojo-fuerte text-white' : 'border-verde-fuerte bg-verde-fuerte text-tinta'}`}>
          {enviando ? 'Guardando…'
            : `${resta ? '− Descontar' : '+ Sumar'}${listo ? ' ' + enPesos(Math.abs(cuanto)) : ''}`}
        </button>
      </div>
    </div>
  );
}
