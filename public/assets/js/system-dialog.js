/* ==========================================================================
   Diálogos do sistema (substitutos dos alerts/confirms nativos).
   Aviso centralizado no mesmo padrão estético do site: card dark #23222B,
   texto branco em negrito, acento laranja #FFAA44 e botões rounded-pill
   (primário sólido #9C5B1C, perigo #FF4068 outline, cancelar outline).
   Uso:
     await systemAlert('Salvo com sucesso!', 'success');
     if (await systemConfirm('Tem certeza que deseja excluir "X"?',
           { title: 'Excluir', confirmText: 'Excluir', danger: true })) { ... }
   ========================================================================== */
(function () {
  'use strict';

  var TYPES = {
    success: { icon: 'fa-solid fa-circle-check', color: '#2E9E63', title: 'Sucesso' },
    error:   { icon: 'fa-solid fa-circle-xmark', color: '#FF4068', title: 'Atenção' },
    warning: { icon: 'fa-solid fa-triangle-exclamation', color: '#FFAA44', title: 'Atenção' },
    info:    { icon: 'fa-solid fa-circle-info', color: '#539bf5', title: 'Aviso' },
    question:{ icon: 'fa-solid fa-circle-question', color: '#FFAA44', title: 'Confirmar' },
    danger:  { icon: 'fa-solid fa-trash', color: '#FF4068', title: 'Excluir' }
  };

  // Fila simples: um diálogo por vez (evita sobreposição em fluxos duplos).
  var queue = Promise.resolve();

  function ensureModal() {
    var el = document.getElementById('system-dialog-modal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'system-dialog-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.setAttribute('aria-hidden', 'true');
    el.style.zIndex = '5000';
    el.innerHTML =
      '<div class="modal-dialog modal-dialog-centered" style="max-width: 440px;">' +
        '<div class="modal-content border-0 shadow-lg" style="background-color: #23222B; color: #E8E8EC; border-radius: 20px; overflow: hidden;">' +
          '<div class="modal-body p-4 text-center">' +
            '<div id="system-dialog-icon" class="mb-3" style="font-size: 44px; line-height: 1;"></div>' +
            '<h5 id="system-dialog-title" class="fw-bold mb-2" style="color: #FFFFFF;"></h5>' +
            '<p id="system-dialog-message" class="mb-0" style="color: #D1D1D8; font-size: 0.95rem; white-space: pre-line; word-break: break-word;"></p>' +
          '</div>' +
          '<div id="system-dialog-footer" class="d-flex justify-content-center gap-2 px-4 pb-4"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function primaryBtn(label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn fw-bold rounded-pill px-4 py-2';
    b.style.cssText = 'background-color: #9C5B1C; border: none; color: #FFF;';
    b.textContent = label;
    return b;
  }

  function outlineBtn(label, color) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn rounded-pill px-4 py-2 fw-bold';
    b.style.cssText = 'background: transparent; border: 2px solid ' + color + '; color: ' + color + ';';
    b.textContent = label;
    return b;
  }

  function openDialog(opts) {
    return new Promise(function (resolve) {
      // Sem Bootstrap (CDN fora)? Cai para o nativo sem quebrar o fluxo.
      if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
        if (opts.mode === 'confirm') { try { resolve(window.confirm(opts.message)); } catch (e) { resolve(false); } }
        else { try { window.alert(opts.message); } catch (e) {} resolve(true); }
        return;
      }
      var el = ensureModal();
      var cfg = TYPES[opts.type] || TYPES.info;
      var iconEl = el.querySelector('#system-dialog-icon');
      var titleEl = el.querySelector('#system-dialog-title');
      var msgEl = el.querySelector('#system-dialog-message');
      var footer = el.querySelector('#system-dialog-footer');

      iconEl.innerHTML = '<i class="' + cfg.icon + '"></i>';
      iconEl.style.color = cfg.color;
      titleEl.textContent = opts.title || cfg.title;
      titleEl.style.color = opts.type === 'success' ? cfg.color : '#FFFFFF';
      msgEl.textContent = opts.message || '';

      footer.innerHTML = '';
      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        try {
          var inst = bootstrap.Modal.getInstance(el);
          if (inst) inst.hide();
        } catch (e) {}
        // Resolve após a transição p/ não emendar dois diálogos.
        setTimeout(function () { resolve(value); }, 120);
      }

      var modal = bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false });
      if (opts.mode === 'confirm') {
        var cancelB = outlineBtn(opts.cancelText || 'Cancelar', '#A09FA9');
        var okB = opts.danger === false
          ? primaryBtn(opts.confirmText || 'Confirmar')
          : outlineBtn(opts.confirmText || 'Excluir', '#FF4068');
        cancelB.addEventListener('click', function () { finish(false); });
        okB.addEventListener('click', function () { finish(true); });
        footer.appendChild(cancelB);
        footer.appendChild(okB);
        // Enter confirma, Esc cancela.
        el.onkeydown = function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
          else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
        };
      } else {
        var okSingle = primaryBtn(opts.okText || 'Entendi');
        okSingle.addEventListener('click', function () { finish(true); });
        footer.appendChild(okSingle);
        el.onkeydown = function (ev) {
          if (ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); finish(true); }
        };
      }
      modal.show();
      // Foco no botão primário (acessibilidade).
      setTimeout(function () {
        try {
          var btns = footer.querySelectorAll('button');
          (btns[btns.length - 1] || footer).focus();
        } catch (e) {}
      }, 250);
    });
  }

  function enqueue(fn) {
    var result = queue.then(fn, fn);
    // A fila nunca pode travar por rejeição.
    queue = result.then(function () {}, function () {});
    return result;
  }

  // Aviso simples (substitui alert). Resolve quando o usuário fecha.
  window.systemAlert = function (message, type) {
    return enqueue(function () {
      return openDialog({ mode: 'alert', message: String(message == null ? '' : message), type: type || 'info' });
    });
  };

  // Confirmação (substitui confirm). Resolve true/false.
  // opts: { title, confirmText, cancelText, danger }
  window.systemConfirm = function (message, opts) {
    opts = opts || {};
    return enqueue(function () {
      return openDialog({
        mode: 'confirm',
        message: String(message == null ? '' : message),
        type: opts.danger === false ? 'question' : 'danger',
        title: opts.title,
        confirmText: opts.confirmText,
        cancelText: opts.cancelText,
        danger: opts.danger
      });
    });
  };
})();
