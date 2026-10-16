/**
 * Exportar a CSV.
 *
 * Con BOM y con punto y coma: Excel en español abre un CSV separado por comas
 * metiendo toda la fila en la primera celda, y sin BOM se come las tildes.
 * El CSV es para que alguien lo abra, no para que lo parsee una máquina.
 */

const SEP = ';';

function campo(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Comillas, separador o saltos de línea obligan a entrecomillar, y las
  // comillas de adentro se duplican. Es el formato, no una preferencia.
  return /["\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function aCSV(encabezado: string[], filas: unknown[][]): string {
  const lineas = [encabezado, ...filas].map((f) => f.map(campo).join(SEP));
  return '﻿' + lineas.join('\r\n') + '\r\n';
}
