'use client';

/**
 * El campo de un teléfono, con la regla a la vista.
 *
 * Existe para que la regla —**el celular va con el 9 y sin el +56**— se
 * diga en el mismo lugar donde se escribe, y no en un instructivo que nadie
 * lee. Es el mismo campo en las cinco pantallas que guardan un teléfono, y
 * por eso vive aparte: cinco copias de la misma validación es lo que queda
 * desalineado cuando la regla cambie.
 *
 * **Normaliza al salir del campo, no mientras se escribe.** Un `+56` que
 * aparece solo bajo los dedos, y espacios que se mueven mientras uno teclea,
 * son desconcertantes; al terminar, en cambio, ver el número ordenado
 * confirma que quedó bien. Es el mismo criterio del RUT en `DatosBancarios`.
 *
 * **Avisa, no corrige ni bloquea.** Un fijo o un número extranjero se
 * guardan tal cual con su marca en ámbar: el panel no está para discutirle
 * a nadie el teléfono de su primo.
 */
import { telefonoNormal, avisoTelefono, FORMATO_TELEFONO } from '@/lib/contacto';

export default function CampoTelefono({
  valor, onCambio, className, etiqueta, ancho
}: {
  valor: string;
  onCambio: (v: string) => void;
  className: string;
  /** Para lectores de pantalla: "Teléfono de Ana Soto". */
  etiqueta: string;
  /** Clase del contenedor, cuando va dentro de una celda angosta. */
  ancho?: string;
}) {
  const aviso = avisoTelefono(valor);
  return (
    <div className={ancho}>
      <input type="tel" value={valor} className={className}
        placeholder={FORMATO_TELEFONO} aria-label={etiqueta}
        inputMode="tel"
        onChange={(e) => onCambio(e.target.value)}
        onBlur={(e) => onCambio(telefonoNormal(e.target.value))} />
      {aviso && (
        <p className="mt-0.5 text-[11px] leading-tight text-ambar-texto/80">{aviso}</p>
      )}
    </div>
  );
}
