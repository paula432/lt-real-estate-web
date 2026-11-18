/**
 * Recibe los formularios del sitio y los reenvía a GoHighLevel.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   GHL_WEBHOOK_URL             Webhook de entrada de GHL (obligatoria).
 *   GHL_WEBHOOK_URL_EVALUACION  Opcional: webhook distinto para "Evaluar mi proyecto".
 *   GHL_WEBHOOK_URL_VISITA      Opcional: webhook distinto para visitas a proyectos.
 *
 * El webhook nunca queda expuesto en el navegador.
 */

const ALLOWED_FORMS = {
  evaluacion_proyecto: 'GHL_WEBHOOK_URL_EVALUACION',
  visita_proyecto: 'GHL_WEBHOOK_URL_VISITA'
};

const MAX_FIELD = 500;

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, MAX_FIELD);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Solicitud inválida' });
  }

  // Campo trampa para bots: si viene lleno, respondemos ok y no enviamos nada.
  if (body.website) return res.status(200).json({ ok: true });

  const form = clean(body.form);
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_FORMS, form)) {
    return res.status(400).json({ ok: false, error: 'Formulario desconocido' });
  }
  if (!clean(body.nombre) || !clean(body.phone)) {
    return res.status(400).json({ ok: false, error: 'Faltan nombre o teléfono' });
  }
  if (form === 'evaluacion_proyecto' && !clean(body.email)) {
    return res.status(400).json({ ok: false, error: 'Falta el correo' });
  }

  const url = process.env[ALLOWED_FORMS[form]] || process.env.GHL_WEBHOOK_URL;
  if (!url) {
    console.error('Falta configurar GHL_WEBHOOK_URL en Vercel');
    return res.status(500).json({ ok: false, error: 'Webhook no configurado' });
  }

  const payload = {};
  Object.keys(body).forEach(function (k) {
    if (k !== 'website') payload[k] = clean(body[k]);
  });
  payload.source = 'sitio-web';
  payload.submitted_at = new Date().toISOString();

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      console.error('GHL respondió', r.status);
      return res.status(502).json({ ok: false, error: 'No se pudo registrar' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error enviando a GHL', err);
    return res.status(502).json({ ok: false, error: 'No se pudo registrar' });
  }
};
