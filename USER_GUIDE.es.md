# Pool Tables Manager - Guía del usuario

## Te damos la bienvenida a Pool Tables Manager

Pool Tables Manager es una solución integral para gestionar las operaciones de un salón de billar. Esta guía te ayudará a comprender y usar todas las funciones disponibles en la aplicación.

---

## Primeros pasos

### Acceder a la aplicación

Abre tu navegador web y ve a `http://localhost:3000` (o a la dirección de tu servidor).

La primera vez, se te pedirá que definas la contraseña local de administrador (o que inicies sesión si ya hay una contraseña o OIDC configurados). Después de iniciar sesión, el panel muestra todas las mesas agrupadas por tipo.

### Menú principal

El encabezado tiene tres opciones, además del selector de tema y el botón para cerrar sesión:

- **Panel** - Mesas activas, sesiones y pedidos pendientes
- **Admin** - Menú, inventario de mesas, suscripciones, informes y ajustes
- **Estado público** - Abre en una pestaña nueva el panel de disponibilidad para clientes (no requiere iniciar sesión)
- **Ayuda** - Guía del usuario dentro de la aplicación (este documento), con un índice; incluye un enlace a la referencia de la API
- **Selector de idioma** - Disponible en el encabezado (escritorio), Ajustes → Localización y precios, la página de mesa para jugadores y el panel de estado público. La selección se guarda en el dispositivo; los nombres de las bebidas siguen las traducciones del menú (actualmente inglés y francés)
- **Cerrar sesión** (arriba a la derecha) - Finaliza la sesión de administrador. Si OIDC está habilitado, también se cierra la sesión del proveedor de identidad cuando es compatible; luego se vuelve a la página de inicio de sesión

---

## Descripción general del panel

El panel es el centro de control para gestionar todas las mesas.

### Visualización de las mesas

Las mesas se agrupan por tipo (Americana, Pool, Snooker, Francesa, …) y se muestran en mosaicos con indicadores de bandera y colores:
- **Mosaicos verdes** = Mesas disponibles
- **Mosaicos rojos** = Sesiones activas
- Las mesas en mantenimiento no aparecen en el panel (gestiónalas en Admin → Tipos de mesa e inventario)

Hay dos diseños disponibles (selecciona uno en **Ajustes → Diseño del panel**):

- **Secciones** (predeterminado) — todos los tipos se muestran en grupos plegables. Una fila de **banderas en la parte superior** permite ir a un tipo (y expandirlo); usa la flecha de un grupo para plegarlo. El estado plegado se recuerda en este dispositivo.
- **Pestañas** — un tipo de mesa por pestaña; arrastra el **control de arrastre** junto a una pestaña para reordenarlas.

En ambos diseños puedes reordenar los grupos de tipos de mesa: en el modo Secciones, arrastra el **control ⋮⋮** a la izquierda del encabezado de un grupo. El orden se guarda para todos los dispositivos del personal y también se usa en el panel de estado público.

### Información de las mesas

Cada mosaico muestra:
- Número y tipo de mesa
- PIN de la sesión (cuando está activa) - aparece junto al número de mesa, por ejemplo, «#5 (1234)»
- Duración de la sesión actual
- Número actual de jugadores
- Total de la cuenta (cargos acumulados)
- Botones de acciones rápidas

### Acciones rápidas

**Mesas disponibles:**
- **Iniciar sesión** - Comenzar una sesión nueva
- **Mantenimiento** - Retirar la mesa del servicio (al volver a ponerla en servicio, se restablece el contador de uso)

**Mesas activas:**
- **Bebida** - Añadir bebidas a la cuenta (agrupadas por categoría del menú)
- **Transferir** - Mover la sesión a otra mesa
- **Cobrar** - Aplicar un descuento, imprimir una estimación de la cuenta, completar el pago e imprimir la factura
- **−** junto al número de jugadores - Liquidación de un jugador (un jugador paga su parte y se retira)
- **+** - Añadir un jugador — pregunta si tiene suscripción (esto afecta al descuento)
- **Miniatura de código QR** - Ampliar el código QR para jugadores

---

## Iniciar una sesión

1. Haz clic en **▶ Iniciar** en una mesa disponible
2. Define la cantidad de jugadores (predeterminado: 1)
3. (Opcional) Selecciona abonados de tu lista
   - Los abonados reciben descuentos cuando juegan; se permiten **sesiones solo de abonados** (0 jugadores no abonados) y no pagan el tiempo de mesa
   - Se requiere al menos un jugador, abonado o no
4. Haz clic en **Iniciar sesión**

**Qué sucede:**
- Se genera un PIN único de 4 dígitos para la sesión
- La mesa se marca como ocupada
- Los cargos empiezan a acumularse según el tiempo transcurrido
- El PIN aparece en el mosaico de la mesa para que los jugadores accedan a su cuenta

---

## Gestionar sesiones activas

### Actualizaciones en tiempo real

Las sesiones activas muestran:
- **Duración** - Se actualiza cada segundo (por ejemplo, «1 h 23 min 45 s»)
- **Horas cobradas** - Se redondean a la hora siguiente
- **Total de la cuenta** - Cargo de mesa + cargos por artículos

### Cargos por mesa

Los cargos se calculan por hora según el tipo de mesa:
- **Pool americano:** €30/hora
- **Pool:** €25/hora
- **Snooker:** €40/hora
- **Billar francés:** €35/hora

El tiempo siempre se redondea a la hora siguiente (por ejemplo, 1 hora y 1 minuto = 2 horas cobradas).

### Descuentos para abonados

Cuando los abonados juegan con personas no abonadas:
- **Predeterminado:** 50 % de descuento en el cargo de mesa
- **Todos son abonados:** Sin cargo
- **Nadie está abonado:** Precio completo

*El porcentaje de descuento se puede modificar en Ajustes.*

---

## Añadir artículos a las cuentas

### Añadir bebidas rápidamente

1. Haz clic en **Bebida** en el mosaico de una mesa activa
2. Explora el menú de bebidas — usa las **categorías** (Frías / Calientes / Alcohólicas) y el **campo de búsqueda** para encontrar artículos rápidamente
3. Usa los botones **+** y **-** para seleccionar las cantidades
4. Haz clic en **Añadir a la cuenta**

### Cargos personalizados

Desde los detalles de la sesión:
1. Haz clic en la mesa activa para ver los detalles
2. Desplázate hasta «Añadir cargo personalizado»
3. Introduce una descripción y un importe
4. Haz clic en **Añadir cargo**

**Casos de uso:**
- Alimentos
- Alquiler de equipo
- Cargos especiales
- Servicios adicionales

---

## Pedidos pendientes (autoservicio para jugadores)

Los jugadores pueden pedir bebidas desde su teléfono en la [Vista pública de la mesa](#public-table-view), sin que el personal tenga que acercarse a tomar el pedido.

### Cómo funciona

1. El jugador abre la página específica de la mesa, introduce su **código PIN** y selecciona bebidas del menú.
2. El pedido se envía y aparece al instante en el panel principal, en una nueva sección **«Pedidos pendientes»** en la parte superior de la pantalla, encima de la cuadrícula de mesas.
3. Cada vez que llega un pedido nuevo, se reproduce un sonido («Bright Triangle») en el panel de administración, para que el personal no tenga que vigilar la pantalla.
4. Cada pedido pendiente muestra el número de mesa, los artículos pedidos y el total.
5. El personal revisa el pedido y hace clic en **✓ Entregado** una vez que lleva las bebidas.
6. Al marcarlo como entregado, los artículos del pedido se añaden automáticamente a la cuenta de esa mesa — no hace falta volver a introducirlos manualmente.

**Seguridad:** El requisito del PIN impide que otros jugadores o alguien que no esté en la mesa haga pedidos a tu cuenta.

**Avisos de audio:** El sonido de llegada de pedidos respeta el ajuste **Señales de audio** de la página Ajustes.

---

## Liquidaciones de jugadores

Cuando un jugador quiere irse mientras los demás siguen jugando:

1. Haz clic en **🧾 Liquidar** en el mosaico de la mesa
2. Revisa la cuenta actual y el cargo de mesa
3. **Selecciona una opción de cargo de mesa:**
   - **Parte del jugador** - División equitativa entre los jugadores originales
   - **Cargo completo de mesa** - El jugador paga todo el cargo de mesa
   - **Omitir cargo de mesa** - Solo paga los artículos

4. **Selecciona los artículos:**
   - Usa los controles de cantidad para seleccionar los artículos que consumió el jugador
   - Se pueden liquidar cantidades parciales (por ejemplo, 1 de 3 cervezas)

5. Haz clic en **💰 Liquidar**

**Qué sucede:**
- Los artículos seleccionados se quitan de la cuenta o se reduce su cantidad
- El número de jugadores disminuye en 1
- La vista de los jugadores restantes se actualiza automáticamente
- Se puede imprimir un recibo

**Importante:** Los importes de la liquidación se calculan a partir del cargo de mesa *original*, antes de cualquier liquidación anterior.

---

## Finalizar sesiones (cobro)

Cuando todos los jugadores hayan terminado:

1. Haz clic en **✓ Cobrar** en el mosaico de la mesa
2. Revisa los cargos finales:
   - Cargo de mesa (según la duración total)
   - Todos los artículos de la cuenta
   - Cualquier liquidación anterior (se muestra como deducción)
3. **Opcional:** Haz clic en **🖨 Imprimir recibo** para obtener una copia en papel
4. Haz clic en **Finalizar sesión** para completarla

**Qué sucede:**
- Se calcula el total final
- La sesión se marca como completada
- La mesa queda disponible para la siguiente sesión
- Los datos se guardan para los informes

---

## Suscripciones

### ¿Qué son las suscripciones?

Las suscripciones son membresías prepagadas que ofrecen descuentos en los cargos de mesa.

### Ver las suscripciones

1. Abre el menú (☰)
2. Haz clic en **Suscripciones**
3. Consulta todas las suscripciones activas, con:
   - Nombre del jugador
   - Fecha de inicio
   - Fecha de finalización
   - Estado actual

### Usar las suscripciones

Al iniciar una sesión:
1. Define la cantidad de jugadores
2. Marca las casillas junto a los nombres de los abonados
3. El sistema aplica el descuento automáticamente

**Beneficios:**
- Cargos de mesa reducidos o eliminados
- Uso registrado para análisis
- Incentiva a los clientes habituales

---

## Vista pública de la mesa

Los jugadores pueden consultar su cuenta en tiempo real desde cualquier dispositivo y pedir bebidas directamente.

### Acceder a la vista de la mesa

**Formato de URL:** `http://[server]/table.html?number=[table_number]`

Ejemplo: `http://localhost:3000/table.html?number=5`

### Primer acceso

1. El jugador abre la URL
2. Introduce el PIN de 4 dígitos (que aparece en el panel)
3. El PIN se guarda durante la sesión

### Lo que ven los jugadores

- Número y tipo de mesa
- Duración actual
- Número de jugadores
- Todos los artículos de la cuenta, con cantidades y precios
- Cargo de mesa (horas e importe)
- Total acumulado
- Un menú de bebidas del que pueden pedir directamente (se requiere PIN) — consulta [Pedidos pendientes](#pending-orders-player-self-service)

**Actualización automática:** La vista se actualiza automáticamente (cada ~10 segundos y de inmediato cuando vuelves a la pestaña), así que los pedidos entregados y los cambios en la cuenta aparecen rápidamente.

### Códigos QR

El mosaico de cada mesa activa del panel muestra un **código QR** que enlaza directamente con la vista de esa mesa y lleva el PIN rellenado. Así, el jugador solo tiene que escanearlo con la cámara del teléfono para consultar su sesión — no hace falta escribir la URL ni el PIN manualmente. Haz clic en el código QR del panel para ampliarlo (útil para imprimirlo o mostrarlo en la mesa).

**Controlar el nombre de host usado en los códigos QR:** De forma predeterminada, los códigos QR apuntan a la dirección que se usó en el navegador para abrir el panel de administración (por ejemplo, `http://localhost:3000`), que solo funciona en el mismo equipo. Para que los jugadores puedan escanear los códigos QR con sus teléfonos, configura **URL base pública** en Admin → Ajustes con el nombre de host/IP o FQDN al que puedan acceder los teléfonos; por ejemplo, `http://[IP_ADDRESS]:3000` o `https://pool.example.com`. Déjalo en blanco para usar la dirección actual del navegador.

---

## Funciones de administración

Accede desde el menú (☰) → **Panel de administración**

### Tipos de mesa e inventario

**Gestionar los tipos de mesa:**
- Añadir tipos de mesa nuevos (por ejemplo, «Billar», «Carambola»)
- Definir tarifas por hora en tu moneda
- Definir el **tipo de IVA** aplicado a los cargos por tiempo de ese tipo de mesa (20 %, 10 % o 0 % — consulta [Informes de IVA (TVA)](#vat-tva-reporting--france))
- Editar o eliminar tipos existentes

**Gestionar las mesas:**
- **Añadir mesas:** indica una cantidad para crear varias mesas de una vez (se numeran automáticamente en orden)
- **Renumerar:** haz clic en el **lápiz** junto al número de mesa, escribe el nuevo número y pulsa Enter (si el número ya está en uso, se rechaza y aparece un mensaje explicativo)
- **Eliminar mesas:** elimina las mesas que no se usen
- **Activar el modo de mantenimiento:** desactiva temporalmente las mesas; al volver a poner una mesa en servicio, se restablece el contador de uso desde el último mantenimiento
- **Ordenar los tipos:** usa los botones **↑/↓** de cada tipo para cambiar el orden que aparece en el panel, las pestañas y el navegador de banderas, así como en el panel de estado público

**Operaciones en lote:**
- Añadir varias mesas del mismo tipo (de 1 a 50 a la vez)
- Las mesas reciben automáticamente los siguientes números disponibles

### Gestión del menú de bebidas

1. Haz clic en **Carta de bebidas**
2. **Añadir un artículo nuevo:**
   - Nombre
   - Precio
   - Tipo de IVA (20 % estándar, 10 % reducido o 0 % exento — consulta [Informes de IVA (TVA)](#vat-tva-reporting--france))
   - **Categoría** — Frías, Calientes, Alcohólicas, Otros (o ninguna). Las categorías organizan el menú en la pantalla de pedidos para jugadores y en el cuadro de diálogo «Añadir bebida» del panel.
3. **Editar o eliminar:** usa los botones de lápiz y papelera junto a cada artículo

**Compatibilidad con varios idiomas:**
- Los artículos pueden tener nombres en inglés y francés
- El idioma de visualización se puede cambiar en Ajustes

### Pagos (POS opcional)

Los pagos están **desactivados de forma predeterminada**. Actívalos en **Ajustes → General → «Pagos (POS)»** (consulta también [Configurar pagos con tarjeta](#setting-up-card-payments-administrator) para los terminales de tarjeta).

Una vez activados:

- En **Cobrar**, se recauda el dinero antes de emitir la factura:
  - **Efectivo:** introduce el importe recibido en efectivo y haz clic en **Añadir pago** (se muestra el cambio). Usa **Importe exacto** para pagar exactamente el saldo pendiente.
  - **Tarjeta (terminal):** haz clic en **Tarjeta (terminal) — €X**. Aparecerá el aviso «Presenta la tarjeta en el terminal…»; el cliente acerca o inserta su tarjeta y el pago se añade automáticamente. **Cancelar** detiene la operación del terminal.
  - **Pagos divididos:** añade varios pagos (en efectivo o con tarjeta, o ambos) hasta que el saldo pendiente llegue a cero. **Finalizar cobro** solo se habilita cuando se ha pagado toda la cuenta.
  - Los descuentos quedan bloqueados una vez añadido un pago (para evitar que cambie el importe).
- Los **recibos** (en pantalla y en la factura impresa) indican los métodos de pago y cualquier cambio que se deba devolver.
- **Admin → Caja y pagos** (solo se muestra cuando está habilitado):
  - **Caja:** abre un turno con un fondo inicial al comienzo del día; al cerrar, introduce el efectivo contado — se calculan el total esperado (fondo + efectivo neto) y la **diferencia**. Si la diferencia no es cero, se envía un correo a la dirección de mantenimiento configurada (si se configuró SMTP).
  - **Reembolsos:** por pago, con un importe (se permiten reembolsos parciales) y un motivo opcional. Si se reembolsa un pago facturado, se emite una **nota de crédito (avoir)** numerada; el aviso muestra su número.
  - **Notas de crédito:** aparecen en una lista con un botón **Imprimir** (añade la referencia del recibo original y el desglose del IVA; guárdala como PDF desde el cuadro de impresión).
  - **Cierre y conciliación del día:** elige una fecha para ver los pagos por método, las notas de crédito y el efectivo esperado/contado/diferencia; **Exportar CSV** descarga el registro de pagos; **Cerrar día** bloquea el día (no se permite mientras haya una caja abierta).
- **Admin → Informes → Financiero** muestra las filas **Pagado en efectivo/tarjeta** y **Reembolsos (notas de crédito)** (también en las exportaciones PDF y Excel). El informe de **IVA / TVA** resta las notas de crédito e incluye la categoría *Reembolsos (notas de crédito)*.

### Ajustes

Accede desde el menú (☰) → **Ajustes**

**Ajustes disponibles:**

- **Nombre de la aplicación:** nombre que aparece en el encabezado (por ejemplo, «Joe's Pool Hall»)
- **URL base pública:** nombre de host/IP o FQDN que se usa al generar los códigos QR de las mesas (consulta [Códigos QR](#qr-codes)); déjalo en blanco para usar la dirección desde la que estás navegando
- **Diseño del panel:** Secciones (grupos plegables + navegador de banderas) o Pestañas (un tipo por pestaña)
- **Idioma:** English, Français, Deutsch, Español o Italiano — cambia la interfaz en este dispositivo (también se puede seleccionar desde el encabezado, la página de mesa para jugadores y el panel de estado público)
- **Moneda:** $ (USD), € (EUR) o £ (GBP)
- **Descuento para abonados:** porcentaje de descuento (0-100 %)
- **Señales de audio:** activa o desactiva los sonidos de clic de la interfaz y el aviso de llegada de pedidos
- **Información fiscal / legal:** razón social, SIRET, SIREN, número de IVA intracomunitario, domicilio social, régimen de IVA y periodicidad de declaración — se usa en el informe de IVA y para tus propios registros (consulta [Informes de IVA (TVA)](#vat-tva-reporting--france))

**Zona de peligro:**
- **Borrar todo el historial de sesiones:** elimina permanentemente las sesiones completadas
  - Requiere doble confirmación
  - Las sesiones activas NO se ven afectadas
  - Las sesiones de un **periodo de IVA cerrado** también están protegidas y no se eliminarán

---

## Configurar pagos con tarjeta (administrador)

### Qué necesitas

- La aplicación en ejecución (Docker) en un equipo con acceso a Internet.
- Una **cuenta de Stripe** (con los datos de empresa verificados). Empieza en modo de prueba.
- Un **lector Stripe Terminal** (por ejemplo, WisePOS E) conectado al wifi del local — o, para hacer pruebas, un **lector simulado** de Stripe.
- **Stripe debe poder acceder** a tu servidor en `https://<your-domain>/api/webhooks/stripe` (HTTPS público, proxy inverso o un túnel durante la prueba piloto). La aplicación puede seguir usando HTTP dentro de la LAN.
- Los locales que solo aceptan efectivo no necesitan nada de esto: basta con activar los pagos y usar efectivo.

### Pasos

1. **Stripe (modo de prueba)**
   - Empareja o registra el lector (Dashboard → Terminal → Readers); anota su id (`tmr_…`).
   - En Developers → Webhooks, añade `https://<your-domain>/api/webhooks/stripe` con los eventos `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`; copia el secreto de firma (`whsec_…`).
2. **Configuración del servidor** (entorno de compose / `.env`), luego reinicia (`docker compose up -d`):
   - `STRIPE_SECRET_KEY=sk_test_…` (más adelante, la clave activa)
   - `STRIPE_TERMINAL_READER_ID=tmr_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `COOKIE_SECURE=true` cuando la aplicación se sirve mediante HTTPS
3. **Ajustes de la aplicación**
   - **Ajustes → General → «Pagos (POS)» → activado**.
   - La moneda debe ser `€`, `$` o `£` (se envía a Stripe como eur/usd/gbp).
   - Define el nombre de la aplicación y la información fiscal / legal (se usa en los informes y tus registros).
   - Opcional: configura SMTP y el correo de alertas de mantenimiento para avisos de diferencias de caja.
4. **Probar sin comprar equipo**
   - `PAYMENT_PROVIDER=fake` en el entorno: los pagos se procesan al instante (sin terminal ni conexión de red) — ideal para capacitar y probar la interfaz.
   - O usa Stripe en modo de prueba con un **lector simulado** para probar el flujo real de pago con tarjeta.
5. **Lista de verificación antes de publicar**
   - Venta en efectivo con pago dividido y cambio; venta con tarjeta; tarjeta rechazada y luego reintento; cancelar en el terminal; reembolso parcial (imprimir la nota de crédito); cerrar la caja; cerrar el día y exportar el CSV.
   - Cambia Stripe a claves activas solo cuando la prueba piloto haya sido satisfactoria.

### Solución de problemas y operaciones

- **El webhook no llega** (el terminal muestra que se pagó, pero la aplicación sigue indicando «presentando»): comprueba la URL del endpoint, el secreto de firma y las suscripciones a eventos; la aplicación también consulta el estado del pago y vuelve a sincronizar pagos con tarjeta obsoletos cada vez que se carga la página Caja. Si se abandona el pago, pulsa **Cancelar** junto a él en Admin → Caja y pagos.
- **Los totales del terminal y la aplicación no coinciden** en la tarjeta de cierre del día: la fila «Terminal (Stripe)» proviene de las transacciones de saldo de Stripe (importe bruto menos reembolsos, más las comisiones indicadas). Revisa la visualización de comisiones, los reembolsos en el panel de Stripe y que el límite del día coincida con el de tu contabilidad. La fila solo se muestra cuando hay datos de liquidación de Stripe.
- **Desactivar los pagos rápidamente:** desactiva **Ajustes → General → «Pagos (POS)»** — el cobro vuelve al comportamiento anterior al POS, desaparecen las opciones de tarjeta y se oculta la página Caja. Los recibos, las notas de crédito y el historial existentes no se modifican.
- **Cambiar claves o lector:** actualiza `STRIPE_SECRET_KEY` / `STRIPE_TERMINAL_READER_ID` / `STRIPE_WEBHOOK_SECRET` en el entorno y reinicia (`docker compose up -d`). Deja de usar el lector anterior en el panel de Stripe.
- **Pasar a producción:** sustituye las claves y secretos de prueba por los activos, y luego repite la lista de verificación con un pago real pequeño antes de anunciar que se aceptan tarjetas.
- **Locales que solo aceptan efectivo:** no hace falta configurar Stripe; activa los pagos y usa efectivo. Las cajas, los reembolsos, las notas de crédito, el cierre del día y los CSV funcionan sin terminal.

### Aspectos que debes tener en cuenta

- **Un lector por implementación:** el id del lector se configura en el entorno. Para usar varios puestos se tendría que poder seleccionar el lector (función no implementada).
- **Dependencia de Internet:** los pagos con tarjeta necesitan conexión; si se interrumpe durante un pago, este puede quedarse en estado «presentando» — cancélalo o reembólsalo desde la página Caja. El efectivo siempre funciona.
- **Un solo inicio de sesión para el personal:** actualmente, la aplicación tiene un único inicio de sesión de administrador; los pagos y las notas de crédito registran ese usuario.
- **NF525 (Francia):** la aplicación registra ventas y pagos con recibos secuenciales, líneas inmutables, notas de crédito y cierres de periodos, pero la certificación es un proceso de validación legal. Consulta a tu *expert-comptable* antes de afirmar que cumples la normativa o activar pagos con tarjeta en producción.
- Esta integración incluye **pagos**, no un sistema POS externo para el bar (sincronización de menú o pedidos), ni el pago por cuenta propia del cliente desde el teléfono.

## Informes

Accede desde **Admin → Informes**. La página tiene dos pestañas: **Financiero** e **IVA / TVA**.

### Informes financieros

Genera informes detallados de ingresos para cualquier periodo.

**Tipos de periodo:**
- **Día:** fecha específica con detalles de las sesiones
- **Semana:** periodo de 7 días que empieza el lunes
- **Mes:** mes calendario completo
- **Trimestre:** T1, T2, T3 o T4
- **Año:** resumen anual

**Contenido del informe:**

1. **Ingresos totales** - Todas las fuentes combinadas

2. **Ingresos por tipo de mesa**
   - Pool americano: €X
   - Pool: €X
   - Snooker: €X
   - Francesa: €X

3. **Ingresos por bebidas y artículos** - Ventas de alimentos y bebidas

4. **Ingresos por suscripciones** - Suscripciones activas durante el periodo

5. **Análisis de series temporales** (informes de semana/mes/trimestre/año)
   - Tendencias de ingresos a lo largo del tiempo
   - Análisis por día de la semana
   - Identificación de las horas de mayor actividad

6. **Detalles diarios** (solo informes diarios)
   - Desglose de cada sesión
   - Uso de las mesas por sesión
   - Detalles por artículo
   - Posibilidad de editar o eliminar cargos

### Comprender los informes

**Qué se incluye:**
- Cargos de mesa de las sesiones completadas
- Todos los artículos del menú y cargos personalizados
- Ingresos por suscripciones

**Qué se excluye:**
- Sesiones activas (en curso)
- Asientos contables de liquidaciones (son ajustes internos)
- Mesas en mantenimiento o en pausa

**Carga automática:** El informe del día actual se genera automáticamente al abrir la página Informes.

---

## Informes de IVA (TVA) — Francia

> ⚠️ **Esto no es asesoramiento legal ni fiscal.** Consulta a tu *expert-comptable* para confirmar que estas cifras y procedimientos se ajustan al régimen de IVA específico de tu negocio antes de presentar la declaración. Consulta [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md) para ver las notas completas sobre conformidad.

La pestaña **IVA / TVA** de la página Informes prepara tu declaración periódica de IVA (CA3/CA12).

### Generar un informe de IVA

1. Elige un **tipo de periodo** (mes, trimestre, año o día) y el periodo específico.
2. Haz clic en **Cargar informe de IVA** para ver el desglose por tipo de IVA:
   - Total HT (sin IVA)
   - TVA (importe de IVA)
   - Total TTC (con IVA)
3. Debajo de la tabla aparece un desglose por categoría (tiempo de mesa, bebidas, descuentos y otros).

### Cerrar un periodo

Cuando hayas presentado la declaración de un periodo ante las autoridades fiscales, haz clic en **Cerrar periodo**. Esto:
- Guarda una instantánea de los totales del periodo para tus registros.
- Impide que **Borrar todo el historial de sesiones** elimine alguna vez las ventas de ese periodo, para que las cifras presentadas siempre puedan rastrearse en la base de datos.

Los periodos cerrados aparecen en una lista histórica debajo del informe, con el periodo, los totales y quién lo cerró.

### Exportar para tu contador

Haz clic en **Exportar libro CSV** para descargar cada línea de venta del periodo seleccionado (fecha, mesa/sesión, descripción, cantidad, precio unitario, tipo de IVA, importe del IVA e importe HT) — útil para compartirlo con tu contador o archivarlo a largo plazo.

### Mantener la precisión de los informes de IVA

- Define correctamente en Admin el tipo de IVA de cada bebida y tipo de mesa (consulta [Gestión del menú de bebidas](#drink-menu-management) y [Tipos de mesa e inventario](#table-types--inventory)).
- **Usa siempre «✓ Cobrar» → Completar pago** para finalizar las sesiones que generaron ingresos — así se registra el cargo por tiempo de mesa y se emite un recibo secuencial. Si finalizas una sesión de otra manera, ese cargo por tiempo de mesa no se incluirá en el informe de IVA.
- Completa la **Información fiscal / legal** en Ajustes (SIRET, número de IVA, régimen de IVA, etc.) para tenerla disponible al presentar la declaración.

---

## Consejos y buenas prácticas

### Para las operaciones diarias

1. **Inicio del día:**
   - Comprueba si hay mesas «ocupadas» sin sesión
   - Revisa el informe del día anterior
   - Asegúrate de que todas las mesas estén marcadas como «disponibles»

2. **Durante el servicio:**
   - Usa los botones rápidos de bebidas para agilizar el trabajo
   - Comprueba el PIN con los jugadores cuando necesiten acceder a la cuenta
   - Vigila las sesiones de larga duración

3. **Cierre del día:**
   - Cobra todas las sesiones que sigan activas
   - Genera el informe diario
   - Revisa si hay problemas o ajustes

### Para las liquidaciones

- Comprueba siempre el número de jugadores antes de liquidar
- Imprime recibos para los registros de los clientes
- Verifica que los artículos seleccionados coincidan con lo que consumió el jugador

### Para mantener la precisión

- Añade los artículos a las cuentas de inmediato (no esperes hasta el cobro)
- Usa cargos personalizados para artículos que no estén en el menú
- Verifica que el número de jugadores sea correcto al iniciar la sesión

### Para la atención al cliente

- Comparte las URL de las mesas con los jugadores al inicio de la sesión
- Coloca códigos QR cerca de las mesas para facilitar el acceso
- Explica los beneficios de las suscripciones para animar a los clientes a abonarse

---

## Atajos de teclado

Actualmente, la aplicación se controla con el mouse o la pantalla táctil y no tiene atajos de teclado. Todas las acciones requieren hacer clic en los botones.

---

## Acceso desde dispositivos móviles

La aplicación es totalmente adaptable y funciona en:
- Navegadores de escritorio
- Tabletas
- Teléfonos inteligentes

**Recomendaciones:**
- Personal: computadora o tableta para el panel
- Jugadores: teléfonos inteligentes para la vista de la mesa

---

## Solución de problemas

### Problemas frecuentes

**«No se pudo iniciar la sesión»**
- Comprueba que la mesa esté realmente disponible
- Asegúrate de que la cantidad de abonados no supere el total de jugadores
- Actualiza la página e inténtalo de nuevo
- Si el problema persiste, contacta con el administrador

**El PIN no funciona**
- Verifica que el PIN coincida con el que aparece en el panel
- Comprueba que el número de mesa sea correcto
- El PIN caduca cuando termina la sesión

**Los artículos no aparecen en la cuenta**
- Confirma que se haya añadido el artículo (comprueba si aparece un mensaje de éxito)
- Espera ~10 segundos a que se actualice automáticamente (vista pública) o vuelve a la pestaña para actualizarla de inmediato
- Actualiza el panel manualmente

**Se muestran importes incorrectos**
- Verifica que la moneda configurada sea la correcta
- Comprueba si se aplicaron liquidaciones
- Revisa los artículos individuales en los detalles de la sesión

### Obtener ayuda

Si el problema persiste:
1. Anota el número de mesa y la hora
2. Toma una captura de pantalla, si es posible
3. Contacta con el administrador del sistema
4. Revisa los registros de Docker (para administradores)

---

## Preguntas frecuentes

**P: ¿Puedo editar una sesión después de iniciarla?**
R: Sí, puedes añadir o quitar artículos y ajustar el número de jugadores durante la sesión.

**P: ¿Qué pasa si finalizo una sesión por accidente?**
R: Las sesiones finalizadas no se pueden volver a abrir. Tendrías que iniciar una sesión nueva.

**P: ¿Los jugadores pueden añadir artículos por su cuenta?**
R: No, solo el personal puede añadir artículos. Los jugadores solo pueden consultar su cuenta.

**P: ¿Cómo gestiono las sesiones de cortesía (gratis)?**
R: Inicia una sesión con 1 jugador, añade los artículos y luego cobra sin solicitar el pago.

**P: ¿Puedo cambiar la tarifa por hora durante una sesión?**
R: No, los cambios de tarifa solo afectan a las sesiones nuevas. Las sesiones activas mantienen la tarifa original.

**P: ¿Qué pasa si se cae Internet?**
R: El sistema requiere acceso a la red. Las sesiones activas continúan, pero las actualizaciones se pausan hasta que se restablezca la conexión.

**P: ¿Puedo exportar los datos de los informes?**
R: Actualmente, los informes son solo de consulta. Usa la función de impresión del navegador o guarda una copia en PDF.

**P: ¿Hasta cuándo puedo consultar los informes?**
R: Mientras se conserve el historial de sesiones (hasta que se borre manualmente desde Ajustes).

---

## Resumen de funciones

### Funciones principales
✓ Seguimiento de sesiones en tiempo real
✓ Cobro automático según el tiempo
✓ Compatibilidad con varios jugadores y liquidaciones
✓ Vistas para jugadores protegidas con PIN
✓ Gestión de bebidas y artículos
✓ Compatibilidad con cargos personalizados
✓ Transferencia de mesas
✓ Impresión de recibos
✓ Pedidos de bebidas de autoservicio para jugadores con cola de pedidos pendientes y avisos de audio
✓ Códigos QR para acceder a una mesa con un solo toque desde el teléfono del jugador

### Funciones de administración
✓ Gestión de tipos de mesa e inventario
✓ Creación de mesas en lote
✓ Configuración del menú de bebidas con tipos de IVA
✓ Gestión de suscripciones
✓ Informes financieros (varios periodos)
✓ Informes de IVA (TVA), exportación CSV y cierres de periodos para cumplir con la normativa francesa
✓ Compatibilidad con varias monedas
✓ Sistema de descuentos para abonados
✓ Gestión del historial de sesiones
✓ URL base pública configurable para los códigos QR
✓ Información fiscal/legal de la empresa

### Funciones para jugadores
✓ Consulta de la cuenta en tiempo real
✓ Visualización con actualización automática
✓ Interfaz adaptada a dispositivos móviles
✓ Acceso protegido con PIN
✓ Pedidos de bebidas de autoservicio mediante código QR

---

## Soporte

Para recibir soporte técnico o solicitar funciones, contacta con el administrador del sistema.

---

**Versión:** 1.0  
**Última actualización:** diciembre de 2025

---

¡Gracias por usar Pool Tables Manager! Esperamos que esta guía te ayude a aprovechar al máximo la aplicación. Para consultar la documentación técnica, los desarrolladores deben consultar `DEVELOPER_README.md`.
