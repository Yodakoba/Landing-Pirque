/**
 * Verificar que un webhook viene de verdad de Shopify.
 *
 * **Es lo único que separa un webhook real de una reserva inventada.** La
 * URL del endpoint es pública: sin esta comprobación, cualquiera que la
 * descubra puede mandar un POST y meter una reserva que descuente cupo de un
 * día real.
 *
 * Por eso existía la decisión documentada de NO usar webhooks en el backend
 * viejo: los Web Apps de Apps Script no dan acceso a las cabeceras de la
 * petición, así que esta función era imposible de escribir ahí. En Vercel sí
 * hay cabeceras, y por eso acá el webhook es una opción.
 *
 * Shopify firma el cuerpo con el client secret de la app y manda el
 * resultado en base64 en `X-Shopify-Hmac-Sha256`.
 */
import { createHmac } from 'node:crypto';
// La misma comparación de tiempo constante que usa la contraseña del panel.
// Con `===` el tiempo de respuesta depende de cuántos caracteres coinciden, y
// eso se puede medir a lo largo de muchos intentos para ir adivinando la
// firma de a un carácter. Acá importa más que en el login: el cuerpo lo
// controla quien ataca, así que puede probar cuantas veces quiera.
import { iguales } from './auth.ts';

/**
 * Si el cuerpo crudo corresponde a la firma.
 *
 * `cuerpo` tiene que ser **el texto exacto** que llegó, sin pasar por
 * JSON.parse y volver a serializar: un espacio de diferencia cambia el
 * hash y la firma deja de calzar.
 *
 * Sin secreto configurado devuelve `false`, nunca `true`. Es la misma
 * decisión que el panel toma con su contraseña: **sin credencial se cierra,
 * no se abre.** Un despliegue al que se le olvidó la variable no puede
 * quedar aceptando cualquier POST.
 */
export function firmaValida(
  cuerpo: string, firma: string | null, secreto: string | undefined
): boolean {
  if (!secreto || !firma) return false;
  const esperada = createHmac('sha256', secreto).update(cuerpo, 'utf8').digest('base64');
  return iguales(esperada, firma);
}
