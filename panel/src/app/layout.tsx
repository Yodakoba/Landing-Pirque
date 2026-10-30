import type { Metadata } from 'next';
import './globals.css';
import Cabecera from '@/components/Cabecera';
import { headers } from 'next/headers';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';

export const metadata: Metadata = {
  title: 'Reservas — Brasas de Lo Pirque',
  // Uso interno: que no lo indexe nadie aunque quede accesible.
  robots: { index: false, follow: false }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El rol se deriva acá, en el servidor, para que la barra no le ofrezca al
  // encargado enlaces que le van a devolver 403. **No es la protección**:
  // esa está en cada ruta. Esto es para no mentirle a quien mira.
  //
  // El nombre va a la barra por un motivo concreto: con cuentas compartidas
  // nadie sabía con cuál estaba entrando, y ahora cada acción queda firmada.
  // Ver quién eres antes de tocar algo es parte de que la bitácora sirva.
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  return (
    <html lang="es" data-tema="oscuro">
      <head>
        {/*
          **El tema se pinta antes de dibujar nada.** Si esperara a React, cada
          carga aparecería con el tema oscuro y pegaría un salto a blanco un
          instante después — el clásico parpadeo, que además desconcierta
          justo a quien menos maneja estos sistemas.

          Por eso es un guión bloqueante de tres líneas en el `<head>`: no hay
          forma de leer `localStorage` en el servidor, porque el tema es de
          cada navegador y el HTML de Next se sirve igual para todos.

          Va entre `try` porque en navegación privada `localStorage` lanza al
          tocarlo, y un error acá dejaría la página entera en blanco.
        */}
        <script dangerouslySetInnerHTML={{ __html:
          "try{var t=localStorage.getItem('brasas-tema');"
          + "if(t==='claro')document.documentElement.dataset.tema='claro'}catch(e){}"
        }} />
      </head>
      <body className="min-h-screen">
        <Cabecera rol={sesion?.rol ?? ''} usuario={sesion?.usuario ?? ''} />
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
