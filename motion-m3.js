/* =====================================================================
   Planning La Bocca — animations de sortie façon Material 3 (v1)
   À charger à la fin de index.html, après le grand <script> :
     <script src="motion-m3.js"></script>
   Le CSS (ameliorations-ui.css) gère les entrées ; ce fichier fait
   jouer les sorties avant de cacher les éléments, sans toucher à la logique.
   ===================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Joue la classe .is-leaving puis appelle `done` (une seule fois, même sans animationend)
  function leave(el, ms, done) {
    if (!el || el.hidden || reduce.matches) { done(); return; }
    if (el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    var finished = false;
    var finish = function () {
      if (finished) return; finished = true;
      el.classList.remove('is-leaving');
      done();
    };
    el.addEventListener('animationend', function h(e) {
      if (e.target === el || el.contains(e.target)) { el.removeEventListener('animationend', h); finish(); }
    });
    setTimeout(finish, ms + 60); // filet de sécurité
  }

  // 1. Popovers et menus (closePop)
  if (typeof window.closePop === 'function') {
    var _closePop = window.closePop;
    window.closePop = function () {
      var el = document.getElementById('pop');
      leave(el, 150, function () { _closePop(); });
    };
  }

  // 2. Origine du déploiement : vers le bas si le menu est sous le bouton, vers le haut sinon
  if (typeof window.placePop === 'function') {
    var _placePop = window.placePop;
    window.placePop = function () {
      _placePop.apply(this, arguments);
      var el = document.getElementById('pop');
      var anchor = (typeof popAnchor !== 'undefined') ? popAnchor : null; // variable globale « let » de la page
      if (!el || !anchor) return;
      var a = anchor.getBoundingClientRect();
      var top = parseFloat(el.style.top) || 0;
      var below = top >= a.top;
      var left = (parseFloat(el.style.left) || 0) <= a.left + 4;
      el.style.setProperty('--pop-origin', (below ? 'top ' : 'bottom ') + (left ? 'left' : 'right'));
    };
  }

  // 3. Tiroir (closeDrawer) : la feuille repart vers la droite (vers le bas sur téléphone)
  if (typeof window.closeDrawer === 'function') {
    var _closeDrawer = window.closeDrawer;
    window.closeDrawer = function () {
      var el = document.getElementById('drawer');
      leave(el, 250, function () { _closeDrawer(); });
    };
  }

  // 4. Fenêtre de chat (créée à la première ouverture) : rejoue une sortie quand elle passe à hidden
  function watchChat(chat) {
    var guard = false;
    new MutationObserver(function () {
      if (guard || !chat.hidden || reduce.matches) return;
      guard = true;
      chat.hidden = false;               // on le garde visible le temps de la sortie
      leave(chat, 200, function () { chat.hidden = true; setTimeout(function () { guard = false; }, 0); });
    }).observe(chat, { attributes: true, attributeFilter: ['hidden'] });
  }
  if ('MutationObserver' in window) {
    var found = document.querySelector('.chatwin');
    if (found) watchChat(found);
    else new MutationObserver(function (list, obs) {
      var c = document.querySelector('.chatwin');
      if (c) { obs.disconnect(); watchChat(c); }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // 5. Toasts : sortie en fondu avant suppression
  if (typeof window.toast === 'function') {
    window.toast = function (msg) {
      var t = document.createElement('div');
      t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () {
        if (reduce.matches) { t.remove(); return; }
        t.animate([{ opacity: 1, transform: 'translate(-50%,0)' }, { opacity: 0, transform: 'translate(-50%,8px)' }],
          { duration: 150, easing: 'cubic-bezier(.3,0,.8,.15)', fill: 'forwards' }).onfinish = function () { t.remove(); };
      }, 2600);
    };
  }
})();
