'use client';
/**
 * **Agregar un vendedor o un socio comercial, con sus datos de pago de una
 * vez** (2026-11-20, lo pidió el cliente: *"agregar al tiro los datos
 * necesarios para el pago… en los dos, boleta o factura"*).
 *
 * Una ventana con tres bloques, en el orden en que se piensa:
 *
 * 1. **Quién.** Un vendedor es una cuenta del panel con el rol Vendedor:
 *    nombre, usuario y clave (con *Generar una clave*). Un socio, el nombre.
 * 2. **Con qué documento se le paga** (`CamposDocumento`): boleta o factura,
 *    si lo que gana trae el impuesto, y los datos de la factura.
 * 3. **La transferencia** (`DatosBancarios`, la pieza de siempre).
 *
 * Crear un vendedor **pregunta antes**, porque crea una cuenta (regla 7).
 * Creada, muestra el usuario y la clave para copiárselos: la clave no se
 * vuelve a ver. El trato se escribe después, en *Cambiar el trato*.
 *
 * El vendedor también agrega socios —desde la cotización—: entonces el
 * trato queda **por confirmar** y le llega a pagos (lo pidió el cliente).
 */
import { useState } from 'react';
import AyudaCorta from './AyudaCorta';
import Dialogo from './Dialogo';
import DatosBancarios from './DatosBancarios';
import CamposDocumento, { type CambioDocumento } from './CamposDocumento';
import { copiarConAviso } from './AvisoFlotante';
import { bancoVacio, type Banco } from '@/lib/banco';
import { facturaVacia, type DatosFactura } from '@/lib/vendedores';
import type { Documento } from '@/lib/boletas';

const ENTRADA = 'min-h-[44px] w-full rounded-lg border-2 border-hueso/25 bg-tinta px-3 text-[16px] focus:border-oro focus:outline-none';
/** El largo mínimo de una clave, el mismo de *Cuentas* (`LARGO_MINIMO_CLAVE`). */
const LARGO_CLAVE = 12;

/** El usuario que se propone: el primer nombre, en minúsculas y sin tildes. */
const usuarioDe = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/\s+/)[0]?.replace(/[^a-z0-9.]/g, '') ?? '';

/** Una clave de 14 caracteres fácil de dictar: sin 0/O ni 1/l. */
function claveNueva(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyz23456789';
  const r = new Uint32Array(12);
  crypto.getRandomValues(r);
  const t = Array.from(r, (n) => letras[n % letras.length]).join('');
  return `${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8, 12)}`;
}

export default function AgregarVendedor({ tipo, desdeCotizacion = false, onCerrar, onCreado }: {
  tipo: 'vendedor' | 'socio';
  /** Desde la cotización, el vendedor: su trato queda por confirmar. */
  desdeCotizacion?: boolean;
  onCerrar: () => void;
  /** El id de lo creado (usuario del vendedor, `S-0001` del socio) y su nombre. */
  onCreado: (id: string, nombre: string, porConfirmar: boolean) => void;
}) {
  const esVendedor = tipo === 'vendedor';
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [usuarioEscrito, setUsuarioEscrito] = useState(false);
  const [clave, setClave] = useState('');
  const [documento, setDocumento] = useState<Documento>(esVendedor ? 'boleta' : 'factura');
  const [incluido, setIncluido] = useState(true);
  const [factura, setFactura] = useState<DatosFactura>(facturaVacia());
  const [banco, setBanco] = useState<Banco>(bancoVacio());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  /** El vendedor ya creado: se muestran su usuario y su clave para copiárselos. */
  const [creado, setCreado] = useState<{ usuario: string; clave: string } | null>(null);

  const usuarioFinal = usuarioEscrito ? usuario : usuarioDe(nombre);
  const listo = !!nombre.trim() && (!esVendedor || (!!usuarioFinal && clave.length >= LARGO_CLAVE));
  const cambiarDoc = (c: CambioDocumento) => {
    if (c.documento) setDocumento(c.documento);
    if (c.incluido !== undefined) setIncluido(c.incluido);
    if (c.factura) setFactura(c.factura);
  };

  async function crear() {
    setError('');
    if (esVendedor && !confirm(`¿Crear la cuenta de vendedor de ${nombre.trim()} con el usuario ${usuarioFinal}? `
      + 'Podrá entrar al panel con esa clave y ver lo suyo.')) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/vendedores', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipo, nombre: nombre.trim(), usuario: usuarioFinal, clave, documento, incluido, factura, banco })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { setError(d.error || 'No se pudo crear.'); return; }
      if (esVendedor) setCreado({ usuario: d.ficha.usuario, clave });
      else onCreado(d.ficha.usuario, d.ficha.nombre, !!d.ficha.porConfirmar);
    } finally {
      setGuardando(false);
    }
  }

  if (creado) {
    const texto = `Tu cuenta del panel de Brasas de Lo Pirque\nUsuario: ${creado.usuario}\nClave: ${creado.clave}\nEntra en ${window.location.origin}/login`;
    return (
      <Dialogo titulo={`✓ Cuenta creada para ${nombre.trim()}`} onCerrar={() => onCreado(creado.usuario, nombre.trim(), false)} ancho="max-w-xl">
        <div className="space-y-4">
          <p className="text-[15px]">
            Mándale su usuario y su clave: con eso entra al panel y ve <b>Mi resumen</b>. <b>La clave no se vuelve a ver</b>;
            si se pierde, se pone otra en Cuentas.
          </p>
          <dl className="space-y-1 rounded-xl border-2 border-verde/50 bg-verde/[0.05] p-3 text-[16px]">
            <div className="flex justify-between gap-3"><dt className="text-hueso/70">Usuario</dt><dd className="font-bold">{creado.usuario}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-hueso/70">Clave</dt><dd className="font-mono font-bold">{creado.clave}</dd></div>
          </dl>
          <p className="text-[14px] text-hueso/75">Falta escribir su trato: ábrelo en su tarjeta, <b>Cambiar el trato</b>.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="boton !min-h-[48px] !text-[15px]"
              onClick={() => copiarConAviso(texto, 'Usuario y clave copiados', 'Usuario y clave:')}>📋 Copiar usuario y clave</button>
            <button type="button" className="boton boton-relleno !min-h-[48px] !px-6 !text-[15px]"
              onClick={() => onCreado(creado.usuario, nombre.trim(), false)}>Listo</button>
          </div>
        </div>
      </Dialogo>
    );
  }

  return (
    <Dialogo titulo={esVendedor ? 'Agregar vendedor' : 'Agregar socio comercial'} onCerrar={onCerrar}
      ancho="max-w-2xl lg:max-w-6xl">
      {/* En el computador, los tres pasos van lado a lado (2026-11-21, regla
          *una tarjeta abierta cabe en una pantalla*): apilados medían 870px. */}
      <form className="space-y-6 lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-8 lg:gap-y-3 lg:space-y-0" onSubmit={(e) => { e.preventDefault(); if (listo && !guardando) void crear(); }}>
        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-oro">1 · Quién</h3>
          <label className="block text-[14px] font-semibold">
            {esVendedor ? 'Nombre del vendedor' : 'Nombre del socio comercial'}
            <input autoFocus className={ENTRADA} value={nombre} placeholder={esVendedor ? 'Daniela Rojas' : 'Turismo Valle del Maipo'}
              onChange={(e) => setNombre(e.target.value)} />
          </label>
          {esVendedor && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[14px] font-semibold">
                Usuario para entrar
                <input className={ENTRADA} value={usuarioFinal} placeholder="daniela" autoCapitalize="none" spellCheck={false}
                  onChange={(e) => { setUsuarioEscrito(true); setUsuario(e.target.value.replace(/\s+/g, '')); }} />
              </label>
              <div className="text-[14px] font-semibold">
                Clave para entrar
                <div className="flex gap-2">
                  <input className={`${ENTRADA} font-mono`} value={clave} placeholder={`${LARGO_CLAVE} caracteres o más`}
                    autoCapitalize="none" spellCheck={false} aria-label="Clave para entrar" onChange={(e) => setClave(e.target.value)} />
                  <button type="button" className="boton !min-h-[44px] shrink-0" onClick={() => setClave(claveNueva())}>Generar</button>
                </div>
                {clave && clave.length < LARGO_CLAVE && (
                  <p className="mt-1 text-[13px] font-semibold text-ambar-texto">Faltan {LARGO_CLAVE - clave.length} caracteres.</p>
                )}
              </div>
            </div>
          )}
          {esVendedor && <p className="text-[13px] text-hueso/70">Se crea su cuenta con el rol Vendedor: cotiza y ve lo suyo.</p>}
          {!esVendedor && desdeCotizacion && (
            <p className="flex flex-wrap items-center gap-1.5 rounded-lg border-2 border-dashed border-ambar/60 px-3 py-2 text-[14px] text-ambar-texto">
              Nace con el trato de los socios, y <b>lo confirma el encargado de pagos</b>. <AyudaCorta tema="tratoSocio" />
            </p>
          )}
          {!esVendedor && !desdeCotizacion && (
            <p className="flex items-center gap-1.5 text-[13px] text-hueso/70">Nace con el trato de los socios. <AyudaCorta tema="tratoSocio" /></p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-oro">2 · Con qué documento se le paga</h3>
          <CamposDocumento documento={documento} incluido={incluido} factura={factura} onCambio={cambiarDoc} />
        </section>

        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-oro">3 · La transferencia</h3>
          <p className="text-[13px] text-hueso/70">Se puede completar después.</p>
          <DatosBancarios banco={banco} nombre={nombre.trim()} onCambio={setBanco} />
        </section>

        {error && <p className="rounded border border-rojo-fuerte/60 bg-rojo/10 p-3 text-[15px] lg:col-span-3">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-3">
          <button type="button" className="boton !min-h-[48px] !text-[15px] lg:!min-h-[44px]" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={!listo || guardando}
            className="boton boton-relleno !min-h-[56px] !px-8 !text-[17px] !font-bold lg:!min-h-[48px]">
            {guardando ? 'Creando…' : esVendedor ? 'Crear el vendedor' : 'Crear el socio'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
