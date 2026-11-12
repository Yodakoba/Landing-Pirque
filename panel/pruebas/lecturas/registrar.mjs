// Carga los ganchos antes que nada: `node --import ./pruebas/lecturas/registrar.mjs …`.
// Las variables las pone acá, para que la prueba corra igual en cualquier
// máquina: en desarrollo y sin usuario, las rutas entran como administrador.
import { register } from 'node:module';
process.env.NODE_ENV = 'development';
delete process.env.PANEL_USUARIO;
for (const v of ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY']) process.env[v] ||= 'prueba';
register('./ganchos.mjs', import.meta.url);
