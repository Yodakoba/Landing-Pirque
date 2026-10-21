# `backend/` — lo que queda

**El backend de Google Apps Script se jubiló el 2026-10-21.** Lo reemplazó
`panel/`, una aplicación Next.js desplegada en Vercel. Acá quedó solo la
prueba de concepto de Postgres, en `pg/`.

Si buscas cómo funciona el sistema de reservas hoy, está en
**`panel/DESPLIEGUE.md`** y en los comentarios de `panel/src/lib/`.

## Qué hacía y dónde quedó cada cosa

| Lo que hacía el Apps Script | Dónde está hoy |
|---|---|
| Entregarle las fechas abiertas al sitio | `panel/src/app/api/publico/fechas/` |
| Preguntarle a Shopify por pedidos nuevos | El webhook, más una tarea diaria de reconciliación |
| Escribir las reservas en la planilla | `panel/src/lib/datos.ts` |
| Crear el evento en Google Calendar | `panel/src/lib/calendario.ts` |
| El panel de administración, dentro de la planilla | El panel entero, en `panel/` |
| Abrir y cerrar días | La ventana de editar, en el propio calendario del panel |

## Por qué se fue

No fue por gusto. Tres razones, en orden de peso:

**Había dos planillas que no se hablaban.** El Apps Script usaba una, con
pestañas `Reservas` y `Excepciones`; el panel otra, con `Reservas` y
`Fechas Hábiles`. El sitio obedecía al Apps Script. O sea que cerrar un día
en el panel no llegaba al cliente final, y las reservas de Shopify no
aparecían en el panel. Se decidió que sobreviviera uno solo.

**La interfaz costaba mucho.** Un panel dentro de una planilla no puede
tener botones en una pestaña, los diálogos HTML daban problemas, y hubo
funciones que nunca llegaron a aparecer en el menú de Sheets sin que se
supiera por qué.

**Y lo que lo hacía distinto dejó de serlo.** El Apps Script consultaba a
Shopify en vez de recibir webhooks porque sus Web Apps **no dan acceso a las
cabeceras** de la petición: sin eso es imposible verificar la firma HMAC, y
cualquiera que descubriera la URL podría inventar reservas. Ese impedimento
era de la plataforma, no de la idea. En Vercel sí hay cabeceras.

## Lo que se perdió, dicho para que no sorprenda

- **El historial de versiones del script** y su registro de ejecuciones.
- **La planilla vieja**, que sigue existiendo con sus datos de prueba. No se
  migró nada: las reservas que había eran pruebas.
- Las pruebas del dominio en `prueba.js`, cubiertas hoy por las de
  `panel/src/lib/prueba.ts`, que son más.

## `pg/` — la prueba de concepto en Postgres

No está conectada a nada y no se usa. Existe para dejar contestada la
pregunta "¿cuánto costaría salir de una planilla?", y lo que muestra es que
la lógica de reservas no depende de la plataforma: la regla de días hábiles
más excepciones, que en Apps Script eran unas 90 líneas, es una consulta.

Se mantiene porque esa pregunta vuelve, no porque haya un plan de usarla.
