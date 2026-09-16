/* ==========================================================================
   Favoritos + alertas de mudança de status de conservação (por e-mail).
   - Favoritos: estrela no card; sino abre o modal de notificação a qualquer
     momento; sino preenchido = notificação ativa naquele animal.
   - Persistência: favoritos em localStorage; e-mail confirmado em cookie
     (365 dias p/ auto-preencher); "não mostrar novamente" (boas-vindas e
     modal de notificação) em cookies DE SESSÃO separados.
   - Servidor: POST/DELETE /api/v1/notificacoes/ { animal_id, email }.
   ========================================================================== */
(function () {
  'use strict';

  var FAV_KEY = 'tcc_fav_animals';
  var EMAIL_COOKIE = 'fav_notify_email';
  var HIDE_NOTIFY_COOKIE = 'hideNotifyModal';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------------- cookies ---------------- */
  window.favGetCookie = function (name) {
    try {
      var parts = document.cookie.split(';');
      for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        if (kv[0] && kv[0].trim() === name) return decodeURIComponent((kv[1] || '').trim());
      }
    } catch (e) {}
    return '';
  };

  // days=null/0 => cookie de sessão (expira ao fechar o navegador).
  window.favSetCookie = function (name, value, days) {
    try {
      var c = name + '=' + encodeURIComponent(value == null ? '' : value) + ';path=/;SameSite=Lax';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        c += ';expires=' + d.toUTCString();
      }
      document.cookie = c;
    } catch (e) {}
  };

  /* ---------------- store local ---------------- */
  function readStore() {
    try {
      var o = JSON.parse(window.localStorage.getItem(FAV_KEY) || '{}');
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function writeStore(o) {
    try { window.localStorage.setItem(FAV_KEY, JSON.stringify(o)); } catch (e) {}
  }

  window.favIsFav = function (id) {
    if (id == null) return false;
    return !!readStore()[String(id)];
  };

  window.favIsNotify = function (id) {
    if (id == null) return false;
    var e = readStore()[String(id)];
    return !!(e && e.notify);
  };

  window.favListIds = function () {
    return Object.keys(readStore());
  };

  function setFavEntry(id, entry) {
    var s = readStore();
    if (entry) s[String(id)] = entry;
    else delete s[String(id)];
    writeStore(s);
  }

  /* ---------------- servidor ---------------- */
  function serverNotify(id, email, ativo) {
    try {
      return fetch('/api/v1/notificacoes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animal_id: String(id), email: email, ativo: !!ativo })
      }).then(function (r) { return r.json(); }).catch(function (e) {
        console.error('[favoritos] falha ao sincronizar notificação:', e);
        return { success: false };
      });
    } catch (e) { return Promise.resolve({ success: false }); }
  }

  function serverUnnotify(id, email) {
    if (!email) return Promise.resolve({ success: true });
    try {
      return fetch('/api/v1/notificacoes/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animal_id: String(id), email: email })
      }).then(function (r) { return r.json(); }).catch(function (e) {
        console.error('[favoritos] falha ao desativar notificação:', e);
        return { success: false };
      });
    } catch (e) { return Promise.resolve({ success: false }); }
  }

  /* ---------------- toggle ---------------- */
  // Retorna true se ficou favoritado. Ao favoritar, abre o modal de
  // notificação (salvo "não mostrar novamente"). Ao desfavoritar,
  // interrompe o envio na hora (servidor + local).
  window.favToggle = function (id, nome) {
    id = String(id);
    if (window.favIsFav(id)) {
      var entry = readStore()[id] || {};
      var email = entry.email || window.favGetCookie(EMAIL_COOKIE);
      setFavEntry(id, null);
      serverUnnotify(id, email);
      refreshFavUI();
      return false;
    }
    setFavEntry(id, { notify: false, ts: Date.now() });
    refreshFavUI();
    if (!window.favGetCookie(HIDE_NOTIFY_COOKIE)) {
      openNotifyModal(id, nome || 'esta espécie', { auto: true });
    }
    return true;
  };

  window.favSetNotify = function (id, email) {
    id = String(id);
    email = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return Promise.resolve({ success: false });
    window.favSetCookie(EMAIL_COOKIE, email, 365);
    var s = readStore();
    s[id] = Object.assign({}, s[id], { notify: true, email: email });
    writeStore(s);
    refreshFavUI();
    return serverNotify(id, email, true);
  };

  window.favClearNotify = function (id) {
    id = String(id);
    var s = readStore();
    var email = (s[id] && s[id].email) || window.favGetCookie(EMAIL_COOKIE);
    s[id] = Object.assign({}, s[id], { notify: false });
    writeStore(s);
    refreshFavUI();
    return serverUnnotify(id, email);
  };

  /* ---------------- modal de notificação ---------------- */
  var notifyModalEl = null;
  var notifyCtx = null;

  function ensureNotifyModal() {
    if (notifyModalEl) return notifyModalEl;
    notifyModalEl = document.createElement('div');
    notifyModalEl.id = 'fav-notify-modal';
    notifyModalEl.className = 'modal fade';
    notifyModalEl.tabIndex = -1;
    notifyModalEl.setAttribute('aria-hidden', 'true');
    notifyModalEl.style.zIndex = '5000';
    notifyModalEl.innerHTML =
      '<div class="modal-dialog modal-dialog-centered" style="max-width: 440px;">' +
        '<div class="modal-content border-0 shadow-lg" style="background-color: #23222B; color: #E8E8EC; border-radius: 20px; overflow: hidden;">' +
          '<div class="modal-body p-4 text-center">' +
            '<div class="mb-3" style="font-size: 44px; line-height: 1; color: #FFAA44;"><i class="fa-solid fa-bell"></i></div>' +
            '<h5 class="fw-bold mb-2" style="color: #FFFFFF;">Notificações por e-mail</h5>' +
            '<p id="fav-notify-text" class="mb-3" style="color: #D1D1D8; font-size: 0.95rem;"></p>' +
            '<input id="fav-notify-email" type="email" class="form-control text-center" placeholder="seu@email.com" autocomplete="email" ' +
              'style="background: #191820; border: 1px solid #3B3A48; color: #FFF; border-radius: 12px; padding: 10px 14px;">' +
            '<div id="fav-notify-err" class="d-none mt-2" style="color: #FF4068; font-size: 0.85rem;">Digite um e-mail válido.</div>' +
            '<label class="d-flex align-items-center justify-content-center gap-2 mt-3" style="color: #A09FA9; font-size: 0.85rem; cursor: pointer;">' +
              '<input id="fav-notify-hide" type="checkbox" class="form-check-input" style="cursor: pointer;"> não mostrar novamente' +
            '</label>' +
          '</div>' +
          '<div class="d-flex justify-content-center gap-2 px-4 pb-4">' +
            '<button type="button" id="fav-notify-later" class="btn rounded-pill px-4 py-2 fw-bold" style="background: transparent; border: 2px solid #A09FA9; color: #A09FA9;">Agora não</button>' +
            '<button type="button" id="fav-notify-off" class="btn rounded-pill px-4 py-2 fw-bold d-none" style="background: transparent; border: 2px solid #FF4068; color: #FF4068;">Desativar</button>' +
            '<button type="button" id="fav-notify-ok" class="btn fw-bold rounded-pill px-4 py-2" style="background-color: #217757; border: none; color: #FFF;" disabled>Ativar notificações</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(notifyModalEl);

    var emailInput = notifyModalEl.querySelector('#fav-notify-email');
    var okBtn = notifyModalEl.querySelector('#fav-notify-ok');
    var errEl = notifyModalEl.querySelector('#fav-notify-err');

    function validate() {
      var ok = EMAIL_RE.test(String(emailInput.value || '').trim());
      okBtn.disabled = !ok;
      okBtn.style.opacity = ok ? '1' : '0.45';
      okBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
      if (ok) errEl.classList.add('d-none');
      return ok;
    }
    emailInput.addEventListener('input', validate);

    // A preferência "não mostrar novamente" vale em qualquer saída do
    // modal (confirmar, "agora não" ou desativar), desde que marcada.
    function persistHidePref() {
      try {
        if (notifyModalEl.querySelector('#fav-notify-hide').checked) {
          window.favSetCookie(HIDE_NOTIFY_COOKIE, '1'); // sessão, só deste modal
        }
      } catch (e) {}
    }

    notifyModalEl.querySelector('#fav-notify-later').addEventListener('click', function () {
      persistHidePref();
      hideNotifyModal();
    });
    notifyModalEl.querySelector('#fav-notify-off').addEventListener('click', function () {
      persistHidePref();
      if (notifyCtx) window.favClearNotify(notifyCtx.id);
      hideNotifyModal();
    });
    okBtn.addEventListener('click', function () {
      if (!validate()) { errEl.classList.remove('d-none'); return; }
      persistHidePref();
      if (notifyCtx) window.favSetNotify(notifyCtx.id, emailInput.value);
      hideNotifyModal();
    });
    return notifyModalEl;
  }

  function hideNotifyModal() {
    try {
      var inst = (typeof bootstrap !== 'undefined') && bootstrap.Modal.getInstance(notifyModalEl);
      if (inst) inst.hide();
    } catch (e) {}
    notifyCtx = null;
  }

  // Abre o modal p/ um animal, a qualquer momento (estrela ou sininho).
  // Fechar sem confirmar = favorita sem notificação (pode ativar depois).
  window.openNotifyModal = function (id, nome, opts) {
    id = String(id);
    notifyCtx = { id: id };
    var el = ensureNotifyModal();
    el.querySelector('#fav-notify-text').textContent =
      'Deseja ser notificado por e-mail caso o status de conservação de "' + (nome || 'esta espécie') + '" seja atualizado?';
    var saved = window.favGetCookie(EMAIL_COOKIE);
    var entry = readStore()[id] || {};
    el.querySelector('#fav-notify-email').value = entry.email || saved || '';
    el.querySelector('#fav-notify-hide').checked = false;
    el.querySelector('#fav-notify-err').classList.add('d-none');
    var active = !!entry.notify;
    el.querySelector('#fav-notify-off').classList.toggle('d-none', !active);
    var okBtn = el.querySelector('#fav-notify-ok');
    okBtn.textContent = active ? 'Manter ativado' : 'Ativar notificações';
    // Habilita conforme o e-mail (auto-preenchido pode já ser válido).
    var cur = el.querySelector('#fav-notify-email').value;
    var ok = EMAIL_RE.test(String(cur || '').trim());
    okBtn.disabled = !ok;
    okBtn.style.opacity = ok ? '1' : '0.45';
    okBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
    try {
      bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: true }).show();
      setTimeout(function () { try { el.querySelector('#fav-notify-email').focus(); } catch (e) {} }, 300);
    } catch (e) {}
  };

  /* ---------------- botões do card ---------------- */
  function favButtonsInner(id, nome) {
    var fav = window.favIsFav(id);
    var bell = window.favIsNotify(id);
    return '' +
      '<button type="button" class="species-card-favbtn" data-fav-star="' + id + '" data-nome="' + nome + '" title="' + (fav ? 'Desfavoritar' : 'Favoritar') + '">' +
        '<i class="' + (fav ? 'fa-solid' : 'fa-regular') + ' fa-star" style="color: ' + (fav ? '#FFAA44' : '#C9C9D2') + '; pointer-events: none;"></i>' +
      '</button>' +
      '<button type="button" class="species-card-favbtn" data-fav-bell="' + id + '" data-nome="' + nome + '" title="Notificações por e-mail">' +
        '<i class="' + (bell ? 'fa-solid' : 'fa-regular') + ' fa-bell" style="color: ' + (bell ? '#FFAA44' : '#C9C9D2') + '; pointer-events: none;"></i>' +
      '</button>';
  }
  // Estrela + sininho no topo do card. Sino preenchido = notificação ativa.
  window.favCardButtons = function (animal) {
    var id = String(animal.id);
    var nome = String(animal.nome_comum || '').replace(/"/g, '&quot;');
    return '<div class="species-card-favbar">' + favButtonsInner(id, nome) + '</div>';
  };

  // Mesmos botões p/ o modal de detalhes (cabeçalho, ao lado do título).
  window.favModalButtons = function (animal) {
    var id = String(animal.animal_id != null ? animal.animal_id : animal.id);
    var nome = String(animal.nome_comum || '').replace(/"/g, '&quot;');
    return '<span class="favbar-inline">' + favButtonsInner(id, nome) + '</span>';
  };

  if (typeof document !== 'undefined') {
    // Captura (antes da bolha): trata estrela/sino e impede o onclick do
    // card (que abriria o modal de detalhes junto).
    document.addEventListener('click', function (e) {
      var star = e.target && e.target.closest ? e.target.closest('[data-fav-star]') : null;
      var bell = e.target && e.target.closest ? e.target.closest('[data-fav-bell]') : null;
      if (!star && !bell) return;
      e.stopPropagation();
      e.preventDefault();
      if (star) {
        window.favToggle(star.getAttribute('data-fav-star'), star.getAttribute('data-nome'));
        return;
      }
      if (bell) {
        // Sininho acessível a qualquer momento, sem precisar (des)favoritar.
        var id = bell.getAttribute('data-fav-bell');
        if (!window.favIsFav(id)) {
          var s = readStore();
          s[id] = { notify: false, ts: Date.now() };
          writeStore(s);
        }
        window.openNotifyModal(id, bell.getAttribute('data-nome'), { auto: false });
      }
    }, true);
  }

  /* ---------------- refresh global da UI ---------------- */
  window.refreshFavUI = function () {
    try {
      var s = readStore();
      document.querySelectorAll('[data-fav-star]').forEach(function (btn) {
        var fav = !!s[String(btn.getAttribute('data-fav-star'))];
        var icon = btn.querySelector('i');
        if (icon) {
          icon.className = (fav ? 'fa-solid' : 'fa-regular') + ' fa-star';
          icon.style.color = fav ? '#FFAA44' : '#C9C9D2';
        }
        btn.title = fav ? 'Desfavoritar' : 'Favoritar';
      });
      document.querySelectorAll('[data-fav-bell]').forEach(function (btn) {
        var entry = s[String(btn.getAttribute('data-fav-bell'))] || {};
        var icon = btn.querySelector('i');
        if (icon) {
          icon.className = (entry.notify ? 'fa-solid' : 'fa-regular') + ' fa-bell';
          icon.style.color = entry.notify ? '#FFAA44' : '#C9C9D2';
        }
      });
      document.querySelectorAll('.species-card[data-fav-id]').forEach(function (card) {
        card.classList.toggle('is-fav', !!s[String(card.getAttribute('data-fav-id'))]);
      });
    } catch (e) {}
    try {
      if (typeof window.__favSectionRefresh === 'function') window.__favSectionRefresh();
      if (typeof window.__favMarkersRefresh === 'function') window.__favMarkersRefresh();
    } catch (e) {}
  };

  function refreshFavUI() { window.refreshFavUI(); }
})();
