# Sitio LT Real Estate

Sitio estático (HTML, CSS y JS sin dependencias) con una función en Vercel que manda los formularios a GoHighLevel. Es el diseño del canvas V3 (dirección A) convertido a código, sin cambios visuales.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `comercializacion.html`, `tecnologia.html`, `proyectos.html`, `brokers.html`, `evaluar.html` | Las 6 páginas del sitio |
| `gracias.html` | Página de confirmación después de agendar en el calendario de GHL (dispara el evento `cita_agendada`) |
| `privacidad.html` | Política de privacidad (plantilla con campos por completar) |
| `404.html` | Página de error |
| `assets/js/config.js` | **El único archivo que hay que tocar para conectar el sitio** (GTM, calendario, WhatsApp, login) |
| `assets/js/site.js` | Menú móvil, filtros, formularios, flujo de evaluación, UTM y eventos de GTM |
| `assets/css/site.css` | Estilos compartidos y ajustes para móvil |
| `api/lead.js` | Función de Vercel que recibe los formularios y los reenvía al webhook de GHL |
| `vercel.json` | URLs limpias (`/comercializacion` en vez de `/comercializacion.html`) y caché |

## 1. Publicar en Vercel

**Opción A, con GitHub (recomendada):**
1. Crea un repositorio vacío en GitHub (por ejemplo `lt-web`) y sube todo el contenido de esta carpeta.
2. En Vercel: **Add New → Project → Import** el repositorio.
3. Framework Preset: **Other**. No hace falta comando de build ni carpeta de salida.
4. Antes de dar **Deploy**, agrega la variable de entorno del paso 2.

**Opción B, desde la terminal:** dentro de esta carpeta corre `npx vercel` y sigue las preguntas.

## 2. Conectar los formularios con GoHighLevel

Los dos formularios del sitio (Evaluar mi proyecto y Agendar visita) llegan a GHL por un webhook. El webhook queda guardado en Vercel y nunca se ve en el navegador.

1. En GHL: **Automation → Workflows → Create Workflow → Start from scratch**.
2. Trigger: **Inbound Webhook**. Copia la URL que te da. (Según tu plan de GHL, este trigger puede tener costo por ejecución.)
3. En Vercel: **Settings → Environment Variables** → `GHL_WEBHOOK_URL` = la URL del paso anterior. Vuelve a desplegar (Deployments → Redeploy).
4. Envía un formulario de prueba desde el sitio publicado. Así GHL captura un ejemplo y puedes mapear los campos.
5. Acciones sugeridas en el workflow:
   - **Create/Update Contact**: `first_name`, `last_name`, `email`, `phone`.
   - **Add Tag**: el valor de `form` (`evaluacion_proyecto` o `visita_proyecto`) y, en evaluaciones, `perfil`.
   - **If/Else** por `form`:
     - `evaluacion_proyecto` → oportunidad en el pipeline de comercialización de LT, con las respuestas (`etapa`, `unidades_disponibles`, `ventas_mes`, `atencion_visitas`, etc.) en notas o campos personalizados.
     - `visita_proyecto` → asignar al setter del proyecto (`proyecto`) y mandar el WhatsApp automático. Si `modo_contacto` es `explorando`, enviar información y no agendar.
   - Guardar `utm_source`, `utm_campaign`, `gclid`, `fbclid` y `landing_page` en campos personalizados para saber qué campaña trajo cada lead.

Si prefieres workflows separados, crea dos webhooks y usa `GHL_WEBHOOK_URL_EVALUACION` y `GHL_WEBHOOK_URL_VISITA`. Si no existen, se usa `GHL_WEBHOOK_URL` para todo.

**Campos que llegan a GHL:** `form`, `nombre`, `first_name`, `last_name`, `email`, `phone`, `whatsapp`, `empresa`, `perfil`, las respuestas de calificación, `proyecto`, `proyecto_id`, `tipologia`, `presupuesto`, `modo_contacto`, `utm_*`, `gclid`, `fbclid`, `landing_page`, `referrer`, `page`, `source` y `submitted_at`.

## 3. Conectar el calendario de GHL

En **Evaluar mi proyecto**, después de calificar y dejar sus datos, la persona agenda en tu calendario real de GHL.

1. En GHL: **Calendars → tu calendario → Share / Embed** y copia el link del widget. Tiene esta forma: `https://api.leadconnectorhq.com/widget/booking/XXXX`.
2. Pégalo en `assets/js/config.js` → `calendarUrl`.
3. En la configuración del calendario, en la acción después de agendar, elige **redirigir a una URL** y pon `https://TU-DOMINIO/gracias`. Así se mide la cita agendada.

Mientras `calendarUrl` esté vacío, el último paso dice "Te escribimos por WhatsApp para agendar" y el lead igual entra a GHL por el webhook.

## 4. Google Tag Manager

`config.js` ya trae el contenedor de la web actual: `GTM-K74P4P22`. El sitio envía estos eventos al `dataLayer`:

| Evento | Cuándo |
|---|---|
| `lead_evaluacion` | Se enviaron los datos en Evaluar mi proyecto (incluye `perfil`) |
| `lead_visita` | Se envió una solicitud de visita (incluye `proyecto` y `modo_contacto`) |
| `cita_agendada` | Se cargó `/gracias` después de agendar en el calendario |
| `filtro_proyectos` | Alguien filtró proyectos por país |

En GTM, crea un trigger de **Custom Event** para cada uno y conéctalo a GA4, al Pixel de Meta (Lead / Schedule) y a las conversiones de Google Ads. Optimizar campañas a `cita_agendada` en vez de a formularios es lo que alinea la pauta con citas.

## 5. Datos de contacto

En `assets/js/config.js`:
- `whatsappNumber`: código de país más número, solo dígitos (ej. `50688887777`). Activa el link de WhatsApp del pie de página y el respaldo cuando un formulario falla.
- `loginUrl`: link de acceso al CRM para clientes. Si queda vacío, el botón "Ingresar" se oculta.

## 6. Dominio

En Vercel: **Settings → Domains → Add** con tu dominio. Vercel te muestra los registros DNS exactos que hay que poner donde compraste el dominio.

Hoy `ltmarketing.co` apunta a GHL. Al cambiar el DNS, el sitio nuevo reemplaza al funnel actual. Si tienes otros funnels de GHL en ese dominio, muévelos antes a un subdominio (por ejemplo `go.ltmarketing.co`).

Si cambias de dominio, reemplaza `https://ltmarketing.co` en los `<head>` de las páginas, en `sitemap.xml` y en `robots.txt`.

## 7. Antes de lanzar

Busca `class="ph"` o corchetes `[` en los HTML. Esto es lo que falta completar:

- [ ] **Home:** `[X]` minutos de respuesta de los setters (bloque Setting), `[Validar esquema]` del modelo a comisión, `[Nombre]` del líder de setting.
- [ ] **Comercialización:** `[Validar esquema y porcentajes]`.
- [ ] **Proyectos:** `[X] minutos` y confirmar qué proyectos se pueden mostrar como "en venta". Cambiar las imágenes referenciales por renders reales (las fotos van en `assets/img/`).
- [ ] **Brokers:** `[X] minutos`, `[por cita o mensual]`, `[Duración]`, `[Modalidad]`, `Próxima cohorte: [fecha]`, `[X meses]` de LetsRealty incluidos.
- [ ] **Privacidad:** completar los campos entre corchetes y pedir revisión legal.
- [ ] `config.js`: `calendarUrl`, `whatsappNumber` y `loginUrl`.
- [ ] Validar las afirmaciones "CRM propio" y "Trabajamos a comisión".
- [ ] Probar ambos formularios en el sitio publicado y confirmar que el contacto aparece en GHL.
- [ ] Revisar el sitio en el celular.

Las vistas del CRM (pipeline, inventario, ficha de compradora, reporte semanal) usan datos de ejemplo del proyecto ficticio "Residencias Mirador" y están marcadas como DEMO. Cuando el CRM tenga tu marca, conviene reemplazarlas por capturas reales anonimizadas.

## Editar textos

Cada página es un HTML con los estilos en línea, igual que en el diseño. Para cambiar un texto, búscalo en el archivo correspondiente y edítalo. Al subir el cambio a GitHub, Vercel publica la nueva versión sola.
