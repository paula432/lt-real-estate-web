/* LT Real Estate — comportamiento del sitio (sin dependencias). */
(function () {
  'use strict';

  var CFG = window.LT_CONFIG || {};

  /* ---------- Utilidades ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function track(event, data) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: event };
    if (data) { for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) payload[k] = data[k]; } }
    window.dataLayer.push(payload);
  }

  /* ---------- Atribución (UTM y click IDs) ---------- */
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  function readStore() {
    try { return JSON.parse(window.sessionStorage.getItem('lt_attr') || '{}'); } catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { window.sessionStorage.setItem('lt_attr', JSON.stringify(obj)); } catch (e) { /* sin storage */ }
  }
  (function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var stored = readStore();
    var changed = false;
    ATTR_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) { stored[k] = v; changed = true; }
    });
    if (!stored.landing_page) { stored.landing_page = window.location.href; changed = true; }
    if (!stored.referrer && document.referrer) { stored.referrer = document.referrer; changed = true; }
    if (changed) writeStore(stored);
  })();
  function attribution() {
    var a = readStore();
    a.page = window.location.href;
    return a;
  }

  /* ---------- Envío de formularios ---------- */
  function splitName(full) {
    var parts = String(full || '').trim().split(/\s+/);
    return { first: parts.shift() || '', last: parts.join(' ') };
  }

  function sendLead(data) {
    var body = {};
    var attr = attribution();
    var k;
    for (k in attr) body[k] = attr[k];
    for (k in data) body[k] = data[k];
    if (!CFG.leadEndpoint) {
      // Modo vista previa: no hay endpoint configurado.
      return Promise.resolve(true);
    }
    return fetch(CFG.leadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  function markInvalid(input, invalid) {
    if (!input) return;
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function whatsappHref(text) {
    if (!CFG.whatsappNumber) return null;
    return 'https://wa.me/' + CFG.whatsappNumber + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  /* ---------- Menú móvil ---------- */
  $all('.menu-btn').forEach(function (btn) {
    var nav = document.getElementById(btn.getAttribute('aria-controls'));
    if (!nav) return;
    function setOpen(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    $all('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  });

  /* ---------- WhatsApp e Ingresar ---------- */
  $all('[data-wa]').forEach(function (a) {
    var href = whatsappHref(a.getAttribute('data-wa-text') || '');
    if (href) {
      a.setAttribute('href', href);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      var label = $('[data-wa-label]', a);
      if (label) { label.textContent = '+' + CFG.whatsappNumber; label.classList.remove('ph'); }
    }
  });
  $all('[data-login]').forEach(function (a) {
    if (CFG.loginUrl) a.setAttribute('href', CFG.loginUrl);
    else a.setAttribute('hidden', '');
  });

  /* ---------- Página Proyectos ---------- */
  (function proyectos() {
    var grid = $('#proyectos-grid');
    if (!grid) return;

    var chips = $all('[data-country-filter]');
    var cards = $all('[data-country]', grid);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var c = chip.getAttribute('data-country-filter');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', x === chip ? 'true' : 'false'); });
        cards.forEach(function (card) {
          card.hidden = !(c === 'Todos' || card.getAttribute('data-country') === c);
        });
        track('filtro_proyectos', { pais: c });
      });
    });

    var select = $('#pv-proyecto');
    $all('[data-pick-project]').forEach(function (a) {
      a.addEventListener('click', function () {
        if (select) select.value = a.getAttribute('data-pick-project');
        showForm();
      });
    });

    var mode = 'visita';
    var modeBtns = $all('[data-mode]');
    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      });
    });

    var form = $('#visita-form');
    var done = $('#visita-done');
    var err = $('#visita-error');
    function showForm() { if (form && done) { form.hidden = false; done.hidden = true; } }

    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.website && form.website.value) return; // honeypot
      var nombre = form.nombre.value.trim();
      var wa = form.whatsapp.value.trim();
      markInvalid(form.nombre, !nombre);
      markInvalid(form.whatsapp, !wa);
      if (!nombre || !wa) { err.textContent = 'Completa tu nombre y tu WhatsApp.'; err.hidden = false; return; }
      err.hidden = true;
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      var opt = select.options[select.selectedIndex];
      var projectName = opt ? opt.text : '';
      var n = splitName(nombre);
      sendLead({
        form: 'visita_proyecto',
        proyecto_id: select.value,
        proyecto: projectName,
        tipologia: form.tipologia.value,
        presupuesto: form.presupuesto.value,
        modo_contacto: mode,
        nombre: nombre,
        first_name: n.first,
        last_name: n.last,
        phone: wa,
        whatsapp: wa
      }).then(function (ok) {
        btn.disabled = false;
        if (!ok) {
          var href = whatsappHref('Hola, me interesa ' + projectName);
          err.innerHTML = 'No pudimos enviar tu solicitud. ' + (href ? '<a href="' + href + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Escríbenos por WhatsApp</a>.' : 'Intenta de nuevo en unos minutos.');
          err.hidden = false;
          return;
        }
        var exploring = mode === 'explorando';
        $('#visita-done-label').textContent = exploring ? 'RECIBIDO' : 'SOLICITUD RECIBIDA';
        $('#visita-done-title').textContent = exploring
          ? 'Te enviamos la información de ' + projectName + '.'
          : 'Listo. Un asesor te escribe por WhatsApp para confirmar tu visita a ' + projectName + '.';
        $('#visita-done-body').textContent = exploring
          ? 'Cuando quieras conocer el proyecto en persona, responde a ese mensaje y coordinamos la visita.'
          : 'Ten a mano tus fechas disponibles. La visita queda confirmada cuando respondes al mensaje del asesor.';
        form.hidden = true;
        done.hidden = false;
        track('lead_visita', { proyecto: projectName, modo_contacto: mode });
      });
    });
    var reset = $('#visita-reset');
    if (reset) reset.addEventListener('click', function () { form.reset(); showForm(); });
  })();

  /* ---------- Página Evaluar ---------- */
  (function evaluar() {
    var app = $('#eval-app');
    if (!app) return;

    var QS = {
      dev: [
        { key: 'etapa', q: '¿En qué etapa está el proyecto?', o: ['Preventa', 'En construcción', 'Entrega inmediata'] },
        { key: 'unidades_disponibles', q: '¿Cuántas unidades quedan por vender?', o: ['Menos de 20', '20 a 60', 'Más de 60'] },
        { key: 'ventas_mes', q: '¿Cuántas unidades vendes al mes hoy?', o: ['0 a 1', '2 a 4', '5 o más'] },
        { key: 'atencion_visitas', q: '¿Quién atiende las visitas?', o: ['Equipo propio', 'Brokers externos', 'Todavía nadie'] }
      ],
      agencia: [
        { key: 'brokers', q: '¿Cuántos brokers tiene tu agencia?', o: ['2 a 5', '6 a 15', 'Más de 15'] },
        { key: 'interes', q: '¿Qué te interesa más?', o: ['Setting', 'LetsRealty', 'Formación'] }
      ],
      broker: [
        { key: 'leads_mes', q: '¿Cuántos leads recibes al mes?', o: ['Menos de 30', '30 a 100', 'Más de 100'] },
        { key: 'interes', q: '¿Qué te interesa más?', o: ['Setting', 'LetsRealty', 'Formación'] }
      ],
      formacion: [
        { key: 'experiencia', q: '¿Cuánto tiempo llevas en real estate?', o: ['Estoy empezando', '1 a 3 años', 'Más de 3 años'] },
        { key: 'modalidad_trabajo', q: '¿Cómo trabajas hoy?', o: ['Independiente', 'En una agencia'] }
      ]
    };
    var NAMES = ['PERFIL', 'TU CASO', 'DATOS', 'AGENDA'];

    var state = { step: 1, role: null, roleLabel: '', ans: {} };

    var panels = $all('[data-step]', app);
    var prog = $all('[data-prog]', app);
    var stepLabel = $('#eval-step-label');
    var btnNext = $('#eval-next');
    var btnBack = $('#eval-back');
    var controls = $('#eval-controls');
    var qWrap = $('#eval-questions');
    var form = $('#eval-form');
    var err = $('#eval-error');

    $all('[data-role]', app).forEach(function (b) {
      b.addEventListener('click', function () {
        state.role = b.getAttribute('data-role');
        state.roleLabel = b.getAttribute('data-role-label');
        state.ans = {};
        $all('[data-role]', app).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        renderQuestions();
        update();
      });
    });

    function renderQuestions() {
      qWrap.innerHTML = '';
      (QS[state.role] || []).forEach(function (qq) {
        var fs = document.createElement('fieldset');
        fs.setAttribute('style', 'border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:10px');
        var lg = document.createElement('legend');
        lg.setAttribute('style', 'font-size:15px;font-weight:600;padding:0;margin-bottom:10px');
        lg.textContent = qq.q;
        fs.appendChild(lg);
        var row = document.createElement('div');
        row.setAttribute('style', 'display:flex;gap:8px;flex-wrap:wrap');
        qq.o.forEach(function (opt) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'sel sel-lt sel-accent';
          b.setAttribute('aria-pressed', 'false');
          b.textContent = opt;
          b.addEventListener('click', function () {
            state.ans[qq.key] = opt;
            $all('button', row).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
            update();
          });
          row.appendChild(b);
        });
        fs.appendChild(row);
        qWrap.appendChild(fs);
      });
    }

    function canNext() {
      if (state.step === 1) return !!state.role;
      if (state.step === 2) {
        var qs = QS[state.role] || [];
        return qs.length > 0 && qs.every(function (qq) { return !!state.ans[qq.key]; });
      }
      if (state.step === 3) return true;
      return false;
    }

    function update() {
      panels.forEach(function (p) { p.hidden = Number(p.getAttribute('data-step')) !== state.step; });
      prog.forEach(function (bar, i) { bar.style.background = i < state.step ? '#6352F0' : '#ECECF0'; });
      stepLabel.textContent = 'PASO ' + state.step + ' DE 4 · ' + NAMES[state.step - 1];
      btnBack.hidden = state.step === 1 || state.step === 4;
      controls.hidden = state.step === 4;
      btnNext.disabled = !canNext();
      btnNext.firstChild.nodeValue = state.step === 3 ? 'Continuar a la agenda ' : 'Continuar ';
    }

    btnBack.addEventListener('click', function () { state.step = Math.max(1, state.step - 1); update(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); btnNext.click(); });

    btnNext.addEventListener('click', function () {
      if (!canNext()) return;
      if (state.step < 3) { state.step += 1; update(); return; }
      submitData();
    });

    function submitData() {
      if (form.website && form.website.value) return; // honeypot
      var nombre = form.nombre.value.trim();
      var email = form.email.value.trim();
      var wa = form.whatsapp.value.trim();
      markInvalid(form.nombre, !nombre);
      markInvalid(form.email, !email);
      markInvalid(form.whatsapp, !wa);
      if (!nombre || !email || !wa) { err.textContent = 'Completa nombre, correo y WhatsApp.'; err.hidden = false; return; }
      err.hidden = true;
      btnNext.disabled = true;
      var n = splitName(nombre);
      var data = {
        form: 'evaluacion_proyecto',
        perfil: state.roleLabel,
        nombre: nombre,
        first_name: n.first,
        last_name: n.last,
        empresa: form.empresa.value.trim(),
        email: email,
        phone: wa,
        whatsapp: wa
      };
      for (var k in state.ans) data[k] = state.ans[k];
      sendLead(data).then(function (ok) {
        btnNext.disabled = false;
        if (!ok) {
          var href = whatsappHref('Hola, quiero evaluar mi proyecto con LT');
          err.innerHTML = 'No pudimos enviar tus datos. ' + (href ? '<a href="' + href + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Escríbenos por WhatsApp</a>.' : 'Intenta de nuevo en unos minutos.');
          err.hidden = false;
          return;
        }
        track('lead_evaluacion', { perfil: state.roleLabel });
        state.step = 4;
        showAgenda(n, email, wa);
        update();
      });
    }

    function showAgenda(n, email, wa) {
      var cal = $('#eval-calendar');
      var fallback = $('#eval-fallback');
      if (CFG.calendarUrl) {
        var url = CFG.calendarUrl + (CFG.calendarUrl.indexOf('?') > -1 ? '&' : '?') +
          'first_name=' + encodeURIComponent(n.first) +
          '&last_name=' + encodeURIComponent(n.last) +
          '&email=' + encodeURIComponent(email) +
          '&phone=' + encodeURIComponent(wa);
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.title = 'Calendario para agendar la evaluación';
        iframe.setAttribute('scrolling', 'no');
        iframe.id = 'lt-ghl-calendar';
        iframe.setAttribute('style', 'width:100%;min-height:680px;border:none;overflow:hidden');
        $('#eval-calendar-frame').appendChild(iframe);
        if (!document.getElementById('ghl-embed-js')) {
          var s = document.createElement('script');
          s.id = 'ghl-embed-js';
          s.src = 'https://link.msgsndr.com/js/form_embed.js';
          s.async = true;
          document.body.appendChild(s);
        }
        cal.hidden = false;
        fallback.hidden = true;
      } else {
        cal.hidden = true;
        fallback.hidden = false;
      }
    }

    update();
  })();
})();
