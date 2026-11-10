# Dejar el proyecto en manos de la empresa

Objetivo: que **Brasas de Lo Pirque pueda seguir gestionando y
desarrollando el proyecto sin depender de ninguna persona en particular**,
incluida la que lo construyó.

Todo gira en torno al correo de la empresa, **`contacto@lopirque.cl`**, que
ya es dueño de la planilla.

---

## La recomendación en una frase

**La empresa es dueña de cada cuenta. Las personas entran como miembros
invitados, con su propio usuario.** Así, cuando alguien se va, la empresa lo
saca y no se pierde nada: ni código, ni historia, ni claves.

Lo contrario —que todo viva en cuentas personales, o que varias personas
compartan la contraseña de una sola cuenta— es lo que hoy deja el proyecto
atado a una persona.

| Sistema | Dueño recomendado | Tú entras como |
|---|---|---|
| GitHub | **Una organización** creada desde una cuenta de la empresa | Miembro (dueño mientras trabajes ahí) |
| Vercel | **Un equipo (Team) Pro** creado desde una cuenta de la empresa | Miembro |
| Claude | La cuenta **Team**, administrada por la empresa | Miembro |
| Google (planilla, Cloud, Calendar) | `contacto@lopirque.cl` | Editor, si hace falta |
| Shopify | El dueño de la tienda es la empresa | Cuenta de staff (colaborador) |
| Dominio `brasasdelopirque.cl` | La empresa (en NIC Chile) | Nada |
| Contraseñas y claves | **Un gestor de contraseñas de la empresa** | Acceso compartido |

---

## Por qué una *organización* de GitHub y no solo una cuenta con el correo de la empresa

Las dos parecen lo mismo, pero no lo son:

- **Una cuenta de GitHub es de una persona.** Si el repo vive ahí, quien
  quiera trabajar tiene que usar esa misma contraseña, y la bitácora de
  cambios dice siempre el mismo nombre. Además GitHub prohíbe compartir una
  cuenta entre varias personas.
- **Una organización tiene varios dueños.** La empresa crea la organización
  con su cuenta, invita a quien desarrolle con su propio usuario, y lo saca
  con un clic cuando se va. Es gratis.

Entonces: **sí hay que crear una cuenta de GitHub con el correo de la empresa,
pero solo para que sea la dueña de la organización.** El repo vive en la
organización, no en esa cuenta.

Con Vercel pasa lo mismo: la cuenta de la empresa crea un **Team**, paga el
plan, y los demás entran como miembros.

---

## Antes de empezar: tres cosas sobre el correo

1. **¿Quién más tiene acceso a `contacto@lopirque.cl`?** Ese correo va a ser
   la llave de todo. Tiene que tenerlo al menos **una persona de la empresa
   que no seas tú** (por ejemplo, el dueño).
2. **Activa la verificación en dos pasos** en ese correo (Google → Cuenta →
   Seguridad → Verificación en dos pasos). Es un correo público, publicado en
   el sitio: le van a llegar intentos de entrar.
3. **Considera un alias aparte para las cuentas técnicas**, por ejemplo
   `sistemas@lopirque.cl` que llegue a la misma bandeja. No es obligatorio,
   pero separa los avisos de GitHub y Vercel de los correos de clientes, y
   si algún día `contacto@` cambia de manos, las cuentas técnicas no se van
   con él. Si el dominio usa Google Workspace, se crea en la consola de
   administración → Usuarios → la cuenta → Alias.

---

## Paso 1 — El gestor de contraseñas de la empresa (30 min)

Va primero porque todos los pasos siguientes crean contraseñas y códigos de
recuperación, y tienen que quedar en un lugar que la empresa controle.

1. Crea una cuenta de empresa en un gestor de contraseñas: **Bitwarden**
   (tiene plan gratuito para organizaciones de 2 personas) o **1Password
   Teams**. Con el correo de la empresa.
2. Crea una bóveda compartida, por ejemplo **"Sistemas Brasas"**.
3. Invita al dueño de la empresa y a ti.
4. Desde ahora, **cada contraseña y cada código de recuperación que crees en
   los pasos siguientes va ahí**, no en tu teléfono ni en un papel.

✅ Listo cuando: el dueño puede abrir la bóveda desde su propio teléfono.

---

## Paso 2 — La cuenta de GitHub de la empresa (15 min)

1. Abre una ventana de incógnito (para no mezclar con tu sesión) y entra a
   **github.com/signup**.
2. Correo: `contacto@lopirque.cl` (o el alias). Usuario: algo como
   `brasasdelopirque-admin`. Contraseña: genérala con el gestor y guárdala.
3. Confirma el correo.
4. **Settings → Password and authentication → Enable two-factor
   authentication.** Usa una app de autenticación (Google Authenticator,
   o el propio gestor si lo permite).
5. **Descarga los códigos de recuperación y guárdalos en el gestor.** Sin
   ellos, perder el teléfono es perder la cuenta.

✅ Listo cuando: la contraseña y los códigos están en la bóveda.

## Paso 3 — La organización de GitHub (10 min)

Con la cuenta de la empresa:

1. Arriba a la derecha, **+ → New organization → Free**.
2. Nombre: por ejemplo `brasas-de-lo-pirque`. Correo de contacto: el de la
   empresa. "Belongs to": **A business or institution** → nombre de la
   empresa.
3. Cuando ofrezca invitar gente, invita a **tu usuario personal
   (`Yodakoba`) como Owner**. Necesitas ser dueño para traer el repo.
4. Desde tu cuenta personal, acepta la invitación (te llega por correo).
5. En la organización → **Settings → Authentication security → Require
   two-factor authentication**. Así nadie entra sin segundo factor.

✅ Listo cuando: la organización tiene dos dueños, la cuenta de la empresa y
tú.

## Paso 4 — Llevar el repositorio a la organización (15 min)

Desde **tu cuenta personal**:

1. Repo `Landing-Pirque` → **Settings → General → abajo del todo, Danger
   Zone → Transfer ownership**.
2. Elige la organización y escribe el nombre del repo para confirmar.
3. Listo: el repo pasa a ser `brasas-de-lo-pirque/Landing-Pirque`, con toda
   su historia y sus 128 PRs. Los enlaces viejos redirigen solos.

Después de transferir, hay que reconectar dos cosas (los pasos 6 y 8 lo
hacen): **Vercel** y **Claude**, porque las dos estaban autorizadas sobre tu
cuenta personal, no sobre la organización.

✅ Listo cuando: `github.com/brasas-de-lo-pirque/Landing-Pirque` abre el
repo y se ven los PRs.

---

## Paso 5 — La cuenta y el equipo de Vercel (20 min)

Con la cuenta de la empresa:

1. Incógnito → **vercel.com/signup** → **Continue with GitHub** usando la
   cuenta de GitHub de la empresa (paso 2). Así no hay una contraseña más
   que guardar.
2. Crea un **Team** (arriba a la izquierda → Create Team) con el nombre de la
   empresa y plan **Pro**, pagado con la tarjeta de la empresa. Vercel cobra
   por miembro con acceso de desarrollo (hoy, alrededor de US$20 al mes cada
   uno; confírmalo en la pantalla de pago).
3. **Settings → Members → Invite**: tu correo personal, con rol
   **Owner** mientras hagas la transferencia (después se puede bajar a
   **Member**).
4. Acepta la invitación desde tu cuenta de Vercel.

✅ Listo cuando: en tu Vercel, arriba a la izquierda, puedes cambiar entre tu
cuenta personal y el equipo de la empresa.

## Paso 6 — Llevar el panel al equipo de Vercel (15 min)

Desde **tu cuenta personal de Vercel**:

1. Proyecto del panel → **Settings → General → Transfer Project** → el
   equipo de la empresa.
2. En el equipo, proyecto → **Settings → Git**. Como el repo se mudó a la
   organización, probablemente diga que está desconectado: **Connect Git
   Repository** → GitHub → si no aparece la organización, **Configure GitHub
   App** e instálala en `brasas-de-lo-pirque` con acceso a `Landing-Pirque`.
3. Revisa la lista de `variables-vercel.md` (variables, carpeta `panel`,
   tareas diarias, dominio) y haz **Redeploy**.
4. Haz un cambio mínimo en una rama, ábrelo como PR y mergéalo: el panel
   tiene que desplegarse solo.

✅ Listo cuando: un merge a `main` despliega el panel en el equipo de la
empresa, y `https://landing-pirque-alpha.vercel.app/api/publico/fechas`
responde.

---

## Paso 7 — Revisar quién es dueño de lo demás (30 min)

Estas cosas no se mueven, pero conviene confirmar que la dueña sea la
empresa y no una persona:

| Qué | Dónde se mira | Qué tiene que decir |
|---|---|---|
| La planilla | Compartir → "Propietario" | `contacto@lopirque.cl` ✅ (ya lo es) |
| Proyecto de Google Cloud (la cuenta de servicio) | console.cloud.google.com → IAM | `contacto@lopirque.cl` como **Owner**. Si estás tú como único Owner, agrega a la empresa |
| Calendario de Google | Configuración del calendario → Compartir | El dueño es la empresa |
| Tienda de Shopify (producción y desarrollo) | Shopify admin → Settings → Users → **Store owner** | La empresa. Tú, como **staff**. Ojo con la de desarrollo: si se creó desde una cuenta de Shopify Partners personal, conviene transferirla o pedirle a Shopify que la pase a la empresa |
| La app privada del panel en Shopify | Settings → Apps → Develop apps | Creada en la tienda, no en una cuenta personal |
| Dominio `brasasdelopirque.cl` | nic.cl → titular | La empresa o su dueño |
| Cuenta Team de Claude | claude.ai → Admin settings → Members | Un administrador de la empresa además de ti |
| CRM del socio | — | La clave `CRM_API_KEY` es de la empresa: guardarla en la bóveda |
| El panel | `/usuarios` | Al menos una cuenta **admin** que no sea la tuya |

Y **guarda en la bóveda** las claves del panel (`variables-vercel.md`): son
lo único que la empresa no podría recuperar sin ti.

---

## Paso 8 — Claude en la organización (5 min)

1. github.com/apps/claude → **Configure** → elige la organización →
   acceso a `Landing-Pirque`.
2. En el entorno de Claude Code (cuenta Team), cambia el repositorio al
   nombre nuevo, `brasas-de-lo-pirque/Landing-Pirque`.
3. Corre `bash migracion-team/verificar.sh` en una sesión nueva.

---

## Paso 9 — La prueba de que funciona sin ti

La única forma de saber que la empresa es independiente es probarlo.
Pídele al dueño (o a quien vaya a quedar a cargo) que, **desde sus propias
cuentas y sin tu ayuda**:

1. Abra el repo en GitHub y vea los PRs.
2. Entre a Vercel y vea el último despliegue del panel.
3. Abra la bóveda y encuentre la clave `PANEL_CLAVE`.
4. Entre al panel con su cuenta de administrador.

Si alguno de los cuatro falla, ese es el siguiente paso a arreglar.

---

## El día que te vayas (para dejarlo escrito desde ya)

En este orden, lo hace la empresa:

1. GitHub → organización → People → sacarte.
2. Vercel → Team → Members → sacarte.
3. Claude Team → Members → sacarte.
4. Shopify → Users → quitar tu cuenta de staff.
5. Google Cloud y planilla → quitarte si estabas.
6. Panel → `/usuarios` → desmarcar *Activo* en tu cuenta (no borrarla: la
   bitácora sigue diciendo qué hiciste).
7. Vercel → cambiar `PANEL_CLAVE` y `CRON_SECRET`, y **Redeploy**. Cambiar
   `PANEL_CLAVE` cierra todas las sesiones abiertas, incluida la tuya.
8. Bóveda → sacarte.

Nada de esto rompe el sitio ni el panel: todo lo demás sigue funcionando.
