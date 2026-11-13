/**
 * Una cookie de sesión por rol, firmada con el secreto del panel de ejemplo
 * (`PANEL_USUARIO=jefe`, `PANEL_CLAVE=clave-de-prueba-1234`, sin
 * `SESION_SECRETO`). Las personas son las de `generar-planilla.mjs`: la
 * sesión lleva el NOMBRE, igual que en el panel de verdad.
 *
 *   node --experimental-strip-types pruebas/ejemplo/sesiones.mjs <salida.json>
 */
import fs from 'node:fs';

const { firmarSesion, secretoDeSesion } = await import(new URL('../../src/lib/sesion.ts', import.meta.url).href);
const secreto = secretoDeSesion({ PANEL_USUARIO: 'jefe', PANEL_CLAVE: 'clave-de-prueba-1234' });
const QUIEN = {
  anfitrion: 'Fernanda Muñoz', vendedor: 'Jorge', encargado: 'Tomás Herrera', gerente: 'Marcela Díaz',
  pagos: 'Verónica Lagos', gerencia: 'Rodrigo Vera', admin: 'Paula Fuentes'
};
const salida = {};
for (const [rol, usuario] of Object.entries(QUIEN)) salida[rol] = await firmarSesion({ usuario, rol }, secreto);
if (!process.argv[2]) throw new Error('Falta dónde escribir las sesiones: sesiones.mjs <salida.json>');
fs.writeFileSync(process.argv[2], JSON.stringify(salida, null, 1));
console.log('sesiones:', Object.keys(salida).join(', '));
