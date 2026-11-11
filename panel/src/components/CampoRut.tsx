'use client';

/**
 * **El campo de un RUT, con su control a la vista** (2026-11-12, lo pidió el
 * cliente). Mismo criterio que `CampoTelefono`:
 *
 * - **Se ordena al salir del campo** (`rutLimpio()`): sin puntos y con guion,
 *   `12345678-9`, que es como se guarda en todas partes —la ficha del
 *   cliente, la factura, el contrato— y como lo pide una carga masiva.
 * - **Avisa en ámbar y no bloquea** (`avisoRut()`): si no tiene forma de RUT
 *   o el dígito verificador no calza. El dato puede llegar después.
 */
import { rutLimpio, avisoRut } from '@/lib/banco';

export default function CampoRut({ valor, onCambio, className, placeholder = '12.345.678-9', etiqueta }: {
  valor: string;
  onCambio: (v: string) => void;
  className: string;
  placeholder?: string;
  /** Para lectores de pantalla. */
  etiqueta?: string;
}) {
  const aviso = avisoRut(valor);
  return (
    <>
      <input type="text" value={valor} className={className} placeholder={placeholder}
        aria-label={etiqueta} autoCapitalize="characters" spellCheck={false}
        onChange={(e) => onCambio(e.target.value)}
        onBlur={(e) => onCambio(rutLimpio(e.target.value))} />
      {aviso && <p className="mt-1 text-[13px] font-semibold text-ambar-texto">{aviso}</p>}
    </>
  );
}
