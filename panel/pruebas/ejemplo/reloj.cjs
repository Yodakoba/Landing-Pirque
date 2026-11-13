// Las capturas de la ayuda: corre el reloj del servidor a la hora de las capturas
// (RELOJ_EJEMPLO, p. ej. 2026-11-13T17:25:00Z = 14:25 en Chile), y desde ahí avanza normal.
const destino = Date.parse(process.env.RELOJ_EJEMPLO || '');
if (Number.isFinite(destino) && !globalThis.__relojEjemplo) {
  globalThis.__relojEjemplo = true;
  const Real = Date;
  const desfase = destino - Real.now();
  class Falso extends Real {
    constructor(...a) { if (a.length === 0) super(Real.now() + desfase); else super(...a); }
    static now() { return Real.now() + desfase; }
  }
  globalThis.Date = Falso;
}
