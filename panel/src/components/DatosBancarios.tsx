'use client';

/**
 * Los campos de una transferencia, en una línea.
 *
 * Es el mismo bloque en `/equipo` y en `/extras`, y por eso vive aparte:
 * son dos pantallas que piden exactamente lo mismo, y dos copias de seis
 * campos es lo que termina desalineado cuando alguien agregue el séptimo.
 *
 * **Avisa lo que falta, no lo corrige.** Si no se puede transferir con lo
 * que hay, lo dice al lado en ámbar y nombra los campos; no bloquea el
 * guardado, porque una ficha a medio llenar es un paso normal —alguien
 * entra el nombre hoy y los datos del banco cuando la persona los mande—.
 */
import { TIPOS_CUENTA, BANCOS, faltaParaTransferir, rutLimpio,
         type Banco } from '@/lib/banco';
import { correoNormal, avisoCorreo } from '@/lib/contacto';

const CAMPO =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function DatosBancarios({
  banco, nombre, onCambio
}: {
  banco: Banco;
  /** Para el marcador del titular: en blanco se le paga a esta persona. */
  nombre: string;
  onCambio: (b: Banco) => void;
}) {
  const falta = faltaParaTransferir(banco);
  const set = (campo: keyof Banco, valor: string) =>
    onCambio({ ...banco, [campo]: valor });

  const etiqueta = (texto: string, hijo: React.ReactNode) => (
    <label className="block">
      <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-hueso/35">
        {texto}
      </span>
      {hijo}
    </label>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start gap-2">
        <div className="w-44">
          {etiqueta('Titular', (
            <input type="text" value={banco.titular} className={CAMPO}
              placeholder={nombre || 'la misma persona'}
              aria-label={`Titular de la cuenta de ${nombre || 'esta persona'}`}
              onChange={(e) => set('titular', e.target.value)} />
          ))}
        </div>
        <div className="w-32">
          {etiqueta('RUT', (
            <input type="text" value={banco.rut} className={CAMPO}
              placeholder="12.345.678-9"
              aria-label={`RUT del titular de ${nombre || 'esta persona'}`}
              // Se ordena al salir del campo, no mientras se escribe: un
              // guion que aparece solo bajo los dedos es desconcertante.
              onBlur={(e) => set('rut', rutLimpio(e.target.value))}
              onChange={(e) => set('rut', e.target.value)} />
          ))}
        </div>
        <div className="w-40">
          {etiqueta('Banco', (
            <input type="text" value={banco.banco} className={CAMPO}
              list="bancos-conocidos" placeholder="—"
              aria-label={`Banco de ${nombre || 'esta persona'}`}
              onChange={(e) => set('banco', e.target.value)} />
          ))}
        </div>
        <div className="w-40">
          {etiqueta('Tipo', (
            <select value={banco.tipo} className={CAMPO}
              aria-label={`Tipo de cuenta de ${nombre || 'esta persona'}`}
              onChange={(e) => set('tipo', e.target.value)}>
              <option value="">—</option>
              {TIPOS_CUENTA.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ))}
        </div>
        <div className="w-40">
          {etiqueta('N° de cuenta', (
            <input type="text" value={banco.numero} className={CAMPO}
              inputMode="numeric" placeholder="—"
              aria-label={`Número de cuenta de ${nombre || 'esta persona'}`}
              onChange={(e) => set('numero', e.target.value)} />
          ))}
        </div>
        <div className="w-48">
          {etiqueta('Correo del comprobante', (
            <input type="email" value={banco.correo} className={CAMPO}
              placeholder="opcional" inputMode="email"
              aria-label={`Correo para el comprobante de ${nombre || 'esta persona'}`}
              onChange={(e) => set('correo', e.target.value)}
              onBlur={(e) => set('correo', correoNormal(e.target.value))} />
          ))}
          {avisoCorreo(banco.correo) && (
            <p className="mt-0.5 text-[11px] leading-tight text-ambar-texto/80">
              {avisoCorreo(banco.correo)}
            </p>
          )}
        </div>
        <div className="min-w-[10rem] flex-1">
          {etiqueta('Nota', (
            <input type="text" value={banco.nota} className={CAMPO}
              placeholder="lo que no cabe en los campos"
              aria-label={`Nota de pago de ${nombre || 'esta persona'}`}
              onChange={(e) => set('nota', e.target.value)} />
          ))}
        </div>
      </div>

      {falta.length > 0 && (banco.titular || banco.rut || banco.banco
        || banco.tipo || banco.numero || banco.nota) && (
        <p className="mt-1 text-[11px] text-ambar-texto/80">
          Falta {falta.join(', ')} para poder transferirle.
        </p>
      )}

      {/* Una sola lista para toda la tabla: el navegador la comparte entre
          todos los campos que la nombran. */}
      <datalist id="bancos-conocidos">
        {BANCOS.map((b) => <option key={b} value={b} />)}
      </datalist>
    </div>
  );
}
