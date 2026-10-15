-- Brasas de Lo Pirque — el mismo dominio de reservas, en Postgres.
--
-- Esto es una PRUEBA DE CONCEPTO. No reemplaza a backend/Codigo.gs, que
-- sigue siendo lo que corre hoy. Existe para contestar una pregunta
-- concreta: cuánto de lo construido es lógica de negocio portable y
-- cuánto es plomería de Apps Script.
--
-- Cada tabla sale de una pestaña de la planilla. Lo interesante no es la
-- traducción, es lo que el motor pasa a sostener solo.

-- ---------------------------------------------------------------------
-- Config: pares clave/valor, igual que la pestaña.
--
-- Se deja como clave/valor a propósito y no como columnas tipadas: es la
-- tabla que el cliente edita a mano, y agregarle un parámetro no puede
-- requerir una migración.
-- ---------------------------------------------------------------------
CREATE TABLE config (
  clave text PRIMARY KEY,
  valor text NOT NULL
);

-- ---------------------------------------------------------------------
-- Excepciones: lo que se sale de la regla.
--
-- `abierta` es BOOLEAN Y ADMITE NULL, y eso es el punto entero de la
-- tabla. Los tres estados son:
--
--   true   abre un día que la regla cierra
--   false  cierra un día que la regla abre
--   NULL   "no opino sobre si abre, solo le cambio el cupo"
--
-- En la planilla ese tercer estado es una celda en blanco que hay que
-- interpretar: `txt === '' ? null : txt.charAt(0) === 's'`. Acá es el
-- tipo de la columna, y más abajo se resuelve con un COALESCE.
--
-- `fecha` es DATE y no texto. CLAUDE.md pide tratar las fechas como
-- texto AAAA-MM-DD de punta a punta para que una reserva hecha de noche
-- no caiga en el día equivocado, y tiene razón: el peligro es
-- TIMESTAMP, que arrastra zona horaria. DATE en Postgres es una fecha de
-- calendario sin hora ni zona — exactamente la semántica que se quería—,
-- y además rechaza un 31 de febrero, cosa que el texto no hace.
-- La regla se mantiene en el borde: todas las consultas devuelven
-- to_char(fecha,'YYYY-MM-DD') para que a JavaScript nunca le llegue un
-- objeto Date.
-- ---------------------------------------------------------------------
CREATE TABLE excepciones (
  fecha   date PRIMARY KEY,
  abierta boolean,
  cupo    integer CHECK (cupo IS NULL OR cupo >= 0),
  nota    text NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------------
-- Reservas.
--
-- `pedido` es UNIQUE, y eso reemplaza a pedidosYaAnotados(), que hoy lee
-- la pestaña entera para saber qué pedidos ya se anotaron. La
-- idempotencia de sincronizarPedidos() pasa de ser una comprobación que
-- hay que acordarse de hacer a ser algo que el motor no deja romper.
--
-- `estado` lleva CHECK en vez de ser texto libre. Hoy un "Pagada" con
-- mayúscula, o un "pagado", se cuenta como "por pagar" sin avisar.
-- ---------------------------------------------------------------------
CREATE TABLE reservas (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido        text UNIQUE NOT NULL,
  numero        text,
  fecha_reserva date NOT NULL,
  nombre        text,
  email         text,
  telefono      text,
  menu          text,
  modalidad     text,
  estado        text NOT NULL
                  CHECK (estado IN ('pagada', 'por pagar', 'cancelada')),
  adultos       integer NOT NULL DEFAULT 0 CHECK (adultos >= 0),
  ninos         integer NOT NULL DEFAULT 0 CHECK (ninos  >= 0),
  total         numeric(12,2),
  moneda        text,
  creado        timestamptz NOT NULL DEFAULT now(),
  evento        text
);

-- Las dos consultas calientes son por fecha: la ocupación del día y el
-- calendario del sitio.
CREATE INDEX reservas_por_fecha ON reservas (fecha_reserva)
  WHERE estado <> 'cancelada';
