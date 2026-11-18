/* Configuración del sitio LT Real Estate.
   Es el único archivo que hay que tocar para conectar el sitio. */
window.LT_CONFIG = {
  // Contenedor de Google Tag Manager (el mismo de la web actual).
  gtmId: 'GTM-K74P4P22',

  // Endpoint que recibe los formularios y los reenvía a GoHighLevel.
  // No cambiar: es la función api/lead.js de Vercel.
  leadEndpoint: '/api/lead',

  // Link del calendario de GoHighLevel para "Evaluar mi proyecto".
  // Ejemplo: 'https://api.leadconnectorhq.com/widget/booking/AbC123xYz'
  // Si queda vacío, el paso final muestra un mensaje de "te contactamos por WhatsApp".
  calendarUrl: '',

  // Número de WhatsApp con código de país, solo dígitos. Ejemplo: '50688887777'
  whatsappNumber: '',

  // URL de acceso al CRM para clientes (botón "Ingresar"). Vacío = se oculta.
  loginUrl: ''
};
