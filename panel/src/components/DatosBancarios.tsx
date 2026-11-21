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
import Campo from './Campo';

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

  return (
    <div className="caja-campos">
      {/* **En la rejilla de los campos** (2026-11-21, regla *los formularios
          van alineados*): antes cada campo traía su ancho a mano y se
          acomodaban como cayeran. Ahora caen en las mismas columnas que las
          otras filas de la ficha. El correo ocupa dos —un correo largo no
          cabía entero— y su nombre se acortó a *Correo comprobante*: en dos
          renglones empujaba su campo hacia abajo (lo vio el cliente). */}
      <div className="rejilla-campos">
        <Campo etiqueta="Titular">
          <input type="text" value={banco.titular} className={CAMPO}
            placeholder={nombre || 'la misma persona'}
            aria-label={`Titular de la cuenta de ${nombre || 'esta persona'}`}
            onChange={(e) => set('titular', e.target.value)} />
        </Campo>
        <Campo etiqueta="RUT">
          <input type="text" value={banco.rut} className={CAMPO}
            placeholder="12.345.678-9"
            aria-label={`RUT del titular de ${nombre || 'esta persona'}`}
            onBlur={(e) => set('rut', rutLimpio(e.target.value))}
            onChange={(e) => set('rut', e.target.value)} />
        </Campo>
        <Campo etiqueta="Banco">
          <input type="text" value={banco.banco} className={CAMPO}
            list="bancos-conocidos" placeholder="—"
            aria-label={`Banco de ${nombre || 'esta persona'}`}
            onChange={(e) => set('banco', e.target.value)} />
        </Campo>
        <Campo etiqueta="Tipo">
          <select value={banco.tipo} className={CAMPO}
            aria-label={`Tipo de cuenta de ${nombre || 'esta persona'}`}
            onChange={(e) => set('tipo', e.target.value)}>
            <option value="">—</option>
            {TIPOS_CUENTA.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="N° de cuenta" ancho="campo-2">
          <input type="text" value={banco.numero} className={CAMPO}
            inputMode="numeric" placeholder="—"
            aria-label={`Número de cuenta de ${nombre || 'esta persona'}`}
            onChange={(e) => set('numero', e.target.value)} />
        </Campo>
        <div className="campo-2 min-w-0">
          <Campo etiqueta="Correo comprobante">
            <input type="email" value={banco.correo} className={CAMPO}
              placeholder="opcional" inputMode="email"
              aria-label={`Correo para el comprobante de ${nombre || 'esta persona'}`}
              onChange={(e) => set('correo', e.target.value)}
              onBlur={(e) => set('correo', correoNormal(e.target.value))} />
          </Campo>
          {avisoCorreo(banco.correo) && (
            <p className="mt-0.5 text-[13px] leading-tight text-ambar-texto">
              {avisoCorreo(banco.correo)}
            </p>
          )}
        </div>
        <Campo etiqueta="Nota" ancho="campo-resto">
          <input type="text" value={banco.nota} className={CAMPO}
            placeholder="lo que no cabe en los campos"
            aria-label={`Nota de pago de ${nombre || 'esta persona'}`}
            onChange={(e) => set('nota', e.target.value)} />
        </Campo>
      </div>
      {falta.length > 0 && (banco.titular || banco.rut || banco.banco
        || banco.tipo || banco.numero || banco.nota) && (
        <p className="mt-1 text-[13px] text-ambar-texto">
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
