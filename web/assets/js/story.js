/* Príbeh – kapitoly po intre (01 vzdelanie, 02 pracovné skúsenosti…).
   Každá kapitola je <section data-chapter>. Karty sa ukazujú samy jedna po druhej priamo
   na svojom mieste (zľava doprava) a ostávajú zobrazené. Po poslednej karte sa objaví
   Continue, ktoré kapitolu zavrie a otvorí ďalšiu. */
(function () {
  'use strict';

  var TYPE_SPEED = 15;      // ms na znak (rýchlejšie než intro – textu je viac)
  var ENTER = 400;          // ako dlho sa karta objavuje, kým sa začne písať text
  var HOLD = 1300;          // čas na prečítanie po dopísaní textu, kým sa objaví ďalšia karta
  var LEAVE = 850;          // ako dlho trvá odchod kapitoly po Continue

  var root = document.getElementById('intro');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 760px)');
  var started = false;

  function all(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }

  // Nenapísaná časť textu ostáva v stránke neviditeľná („ghost“) – karty tak počas písania
  // nemenia veľkosť.
  function ghost(el, text) {
    var span = document.createElement('span');
    span.className = 'ghost';
    span.textContent = text;
    el.textContent = '';
    el.appendChild(span);
    return span;
  }

  chapters.forEach(function (ch) {
    all(ch, '.type').forEach(function (el) { ghost(el, el.getAttribute('data-text') || ''); });
  });

  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduceMotion ? 0 : ms); }); }

  function type(el) {
    var text = el.getAttribute('data-text') || '';
    return new Promise(function (resolve) {
      if (reduceMotion) { el.textContent = text; resolve(); return; }
      var rest = ghost(el, text);
      var done = document.createTextNode('');
      var caret = document.createElement('span');
      caret.className = 'caret';
      el.insertBefore(caret, rest);
      el.insertBefore(done, caret);
      var i = 0;
      (function next() {
        i++;
        done.data = text.slice(0, i);
        rest.textContent = text.slice(i);
        if (i < text.length) {
          setTimeout(next, TYPE_SPEED + Math.random() * TYPE_SPEED * 0.8);
        } else {
          el.textContent = text;
          resolve();
        }
      })();
    });
  }

  function typeAll(els) {
    return els.reduce(function (p, el) { return p.then(function () { return type(el); }); }, Promise.resolve());
  }

  function show(card, last) {
    card.classList.add('is-on');
    if (narrow.matches) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

    return wait(ENTER)
      .then(function () { return typeAll(all(card, '.type')); })
      .then(function () { return wait(last ? 0 : HOLD); });
  }

  function open(index) {
    var ch = chapters[index];
    ch.hidden = false;
    root.scrollTop = 0;
    window.scrollTo(0, 0);

    var cards = all(ch, '.card');
    var chain = wait(50)
      .then(function () { return typeAll(all(ch, '.chapter .type')); })
      .then(function () { return wait(700); });
    cards.forEach(function (card, i) {
      chain = chain.then(function () { return show(card, i === cards.length - 1); });
    });

    var btn = ch.querySelector('.story__next .continue');
    if (!btn || !chapters[index + 1]) return;

    chain.then(function () { return wait(500); }).then(function () {
      btn.classList.add('is-on');
      if (narrow.matches) btn.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });

    btn.addEventListener('click', function () {
      if (ch.classList.contains('is-leaving')) return;
      ch.classList.add('is-leaving');
      wait(LEAVE).then(function () {
        ch.hidden = true;
        open(index + 1);
      });
    });
  }

  document.addEventListener('story:start', function () {
    if (started || !chapters.length) return;
    started = true;
    open(0);
  });
})();
