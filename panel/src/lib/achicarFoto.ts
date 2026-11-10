/**
 * Achica una foto en el navegador antes de subirla como comprobante
 * (2026-11-10). Una foto de celular pesa 3 a 6 MB y Vercel no recibe más de
 * 4,5; a 1600 px de lado y JPEG al 82% queda en unos cientos de KB y se
 * sigue leyendo cada número del comprobante.
 *
 * Un PDF, o una imagen que el navegador no sabe dibujar, se manda tal cual:
 * el servidor dirá si es muy grande.
 */
const LADO = 1600;

export async function achicarFoto(f: File): Promise<File> {
  if (!f.type.startsWith('image/') || f.size < 600 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const escala = Math.min(1, LADO / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext('2d')?.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.82));
    if (!blob) return f;
    return new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return f;
  }
}
