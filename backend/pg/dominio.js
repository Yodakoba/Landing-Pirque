'use strict';
/**
 * El dominio de reservas, portado desde backend/Codigo.gs a Postgres.
 *
 * PRUEBA DE CONCEPTO. No reemplaza nada: Codigo.gs sigue siendo lo que
 * corre. Esto existe para medir cuánto del backend es lógica de negocio
 * portable y cuánto era plomería de Apps Script.
 *
 * Recibe un `db` con `.query(sql, params)` — PGlite, node-postgres y
 * Supabase cumplen esa forma. No importa ninguna librería a propósito:
 * así el archivo se prueba sin instalar nada.
 *
 * LAS FECHAS SIGUEN SIENDO TEXTO AAAA-MM-DD en el borde. Las consultas
 * devuelven to_char(...) para que acá nunca aparezca un objeto Date, que
 * es lo que haría caer una reserva nocturna en el día equivocado.
 */

/* ---------- Config ---------- */

const DIAS = { dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6 };

/** Para que "sáb" y "sab" sean lo mismo. Portado tal cual. */
function sinTildes(s) {
  return String(s)
    .replace(/[áàä]/gi, 'a').replace(/[éèë]/gi, 'e').replace(/[íìï]/gi, 'i')
    .replace(/[óòö]/gi, 'o').replace(/[úùü]/gi, 'u');
}

/** "sáb,dom" -> [6, 0]. Portado tal cual: esto no era plomería. */
function aDiasDeSemana(texto) {
  const dias = [];
  for (const parte of String(texto || '').split(/[,;/ ]+/)) {
    const p = sinTildes(parte).trim().toLowerCase().slice(0, 3);
    if (p && Object.prototype.hasOwnProperty.call(DIAS, p) && !dias.includes(DIAS[p])) {
      dias.push(DIAS[p]);
    }
  }
  return dias;
}

const POR_DEFECTO = {
  dias_abiertos: 'sáb,dom',
  cupo_normal: 60,
  dias_a_futuro: 60,
  aviso_pocos_lugares: 10
};

async function configuracion(db) {
  const { rows } = await db.query('SELECT clave, valor FROM config');
  const cfg = Object.assign({}, POR_DEFECTO);
  for (const f of rows) cfg[f.clave] = f.valor;
  return {
    dias_abiertos: aDiasDeSemana(cfg.dias_abiertos),
    cupo_normal: Number(cfg.cupo_normal) || POR_DEFECTO.cupo_normal,
    dias_a_futuro: Number(cfg.dias_a_futuro) || POR_DEFECTO.dias_a_futuro,
    aviso_pocos_lugares: Number(cfg.aviso_pocos_lugares) || 0
  };
}

/* ---------- Los días abiertos ---------- */

/**
 * Antes: tres lecturas de pestaña completas —Config, Excepciones y
 * Reservas— más un bucle en JavaScript que las cruzaba a mano. Unas 90
 * líneas entre diasAbiertos(), excepciones() y ocupacionPorFecha().
 *
 * Ahora: una consulta. Las tres piezas que costaba mantener sincronizadas
 * las resuelve el motor:
 *
 *   COALESCE(e.abierta, <la regla>)   los tres estados de `abierta`. El
 *                                     NULL que en la planilla era una
 *                                     celda en blanco que había que
 *                                     interpretar, acá es el tipo.
 *   FILTER (WHERE ...)                pagadas vs por pagar, sin recorrer.
 *   generate_series                   la ventana de días a futuro.
 *
 * El `hoy` entra como parámetro y no como now(): así la prueba fija el
 * día, igual que hace prueba.js con ctx.hoyAca.
 */
const SQL_DIAS = `
WITH dia AS (
  SELECT d::date AS fecha
  FROM generate_series($1::date, $1::date + ($2::int - 1), interval '1 day') AS d
),
ocupacion AS (
  SELECT fecha_reserva,
         -- Una fila SIN estado es anterior a que existiera la columna, y
         -- en esa epoca solo se anotaban pedidos pagados. El CHECK de la
         -- tabla ya no deja escribir vacio, asi que el caso no se repite;
         -- el COALESCE queda por los datos migrados.
         SUM(adultos + ninos) FILTER (WHERE estado = 'pagada')    AS pagadas,
         SUM(adultos + ninos) FILTER (WHERE estado = 'por pagar') AS por_pagar,
         SUM(adultos + ninos)                                     AS total
  FROM reservas
  WHERE estado <> 'cancelada'
  GROUP BY fecha_reserva
)
SELECT to_char(dia.fecha, 'YYYY-MM-DD')              AS fecha,
       COALESCE(NULLIF(e.cupo, 0), $3::int)          AS cupo,
       COALESCE(o.pagadas, 0)::int                   AS pagadas,
       COALESCE(o.por_pagar, 0)::int                 AS "porPagar",
       COALESCE(o.total, 0)::int                     AS tomadas,
       GREATEST(0, COALESCE(NULLIF(e.cupo, 0), $3::int) - COALESCE(o.total, 0))::int AS quedan,
       COALESCE(e.nota, '')                          AS nota,
       (e.fecha IS NOT NULL)                         AS excepcion
FROM dia
LEFT JOIN excepciones e ON e.fecha = dia.fecha
LEFT JOIN ocupacion   o ON o.fecha_reserva = dia.fecha
WHERE COALESCE(e.abierta, EXTRACT(dow FROM dia.fecha)::int = ANY($4::int[]))
ORDER BY dia.fecha
`;

async function diasAbiertos(db, hoy, tope) {
  const cfg = await configuracion(db);
  const { rows } = await db.query(SQL_DIAS, [
    hoy, cfg.dias_a_futuro, cfg.cupo_normal, cfg.dias_abiertos
  ]);
  const hasta = tope ? rows.slice(0, tope) : rows;
  // `pocos` se calcula acá y no en SQL para que el umbral viva en un solo
  // lugar, igual que hoy vive en la planilla y no en el codigo.
  return hasta.map((d) => Object.assign({}, d, {
    pocos: d.quedan <= cfg.aviso_pocos_lugares
  }));
}

/**
 * Lo que recibe el SITIO. Deliberadamente menos que diasAbiertos():
 * cuánta gente reservó, cuánto pagó y de qué tamaño es el local no son
 * datos de un visitante.
 *
 * En Postgres esto además se puede volver una política de Row Level
 * Security sobre una vista, y entonces deja de ser una promesa del
 * código para pasar a ser algo que el motor no deja violar. Acá se deja
 * en JS para que la prueba compare exactamente contra el original.
 */
async function fechasAbiertas(db, hoy) {
  const dias = await diasAbiertos(db, hoy);
  return dias
    .filter((d) => d.quedan > 0)        // un dia lleno no se ofrece
    .map((d) => ({ fecha: d.fecha, quedan: d.quedan, pocos: d.pocos }));
}

/* ---------- Abrir y cerrar días ---------- */

/**
 * Escribe EXCEPCIONES, no días. Volver un día a su estado normal BORRA
 * su fila: si la tabla crece hasta tener un día por fila, el diseño se
 * rompió. Portado con las mismas reglas que fija prueba.js.
 */
async function fijarDia(db, hoy, fecha, abrir, cupo, nota) {
  const cfg = await configuracion(db);
  const porRegla = cfg.dias_abiertos.includes(diaDeLaSemana(fecha));

  cupo = Number(cupo) || 0;
  if (cupo === cfg.cupo_normal) cupo = 0;      // un cupo igual al general no se escribe
  let abierta = abrir;
  if (abierta === porRegla) abierta = null;    // si coincide con la regla, no se opina
  nota = String(nota || '').trim();

  if (abierta === null && !cupo && !nota) {
    await db.query('DELETE FROM excepciones WHERE fecha = $1', [fecha]);
    return { borrada: true };
  }
  await db.query(
    `INSERT INTO excepciones (fecha, abierta, cupo, nota) VALUES ($1,$2,$3,$4)
     ON CONFLICT (fecha) DO UPDATE SET abierta = $2, cupo = $3, nota = $4`,
    [fecha, abierta, cupo || null, nota]
  );
  return { borrada: false };
}

/** 0 es domingo y 6 sábado, igual que getDay() y que EXTRACT(dow). */
function diaDeLaSemana(fecha) {
  const p = fecha.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay();
}

/* ---------- Anotar una reserva ---------- */

/**
 * Idempotente, pero sin pedidosYaAnotados(): el UNIQUE de la tabla lo
 * sostiene. Un pedido que vuelve a llegar no duplica la fila y sí pone
 * al día su estado, que es lo que hace sincronizarPedidos() hoy.
 */
async function anotarReserva(db, r) {
  const { rows } = await db.query(
    `INSERT INTO reservas (pedido, numero, fecha_reserva, nombre, email, telefono,
                           menu, modalidad, estado, adultos, ninos, total, moneda, evento)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (pedido) DO UPDATE SET estado = EXCLUDED.estado
     RETURNING id, (xmax = 0) AS nueva`,
    [r.pedido, r.numero || null, r.fecha, r.nombre || null, r.email || null,
     r.telefono || null, r.menu || null, r.modalidad || null, r.estado,
     r.adultos || 0, r.ninos || 0, r.total ?? null, r.moneda || null, r.evento || null]
  );
  return rows[0];
}

module.exports = {
  aDiasDeSemana, sinTildes, diaDeLaSemana,
  configuracion, diasAbiertos, fechasAbiertas, fijarDia, anotarReserva,
  SQL_DIAS
};
