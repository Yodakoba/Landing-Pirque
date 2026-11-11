/**
 * Lo único de `react-dom` que el panel usa a mano: `createPortal`, para el
 * `?` chico (`AyudaCorta.tsx`). Se declara acá en vez de sumar
 * `@types/react-dom` como dependencia por una función.
 */
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';
  export function createPortal(children: ReactNode, container: Element): ReactPortal;
}
