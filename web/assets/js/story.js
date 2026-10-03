/* Príbeh – kapitola 01: vzdelanie.
   Karty sa ukazujú samy jedna po druhej priamo na svojom mieste (zľava doprava)
   a ostávajú zobrazené. */
(function () {
  'use strict';

  var TYPE_SPEED = 15;      // ms na znak (rýchlejšie než intro – textu je viac)
  var ENTER = 400;          // ako dlho sa karta objavuje, kým sa začne písať text
  var HOLD = 1300;          // čas na prečítanie po dopísaní textu, kým sa objaví ďalšia karta

  var root = document.getElementById('intro');
  var story = document.getElementById('story');
  var title = story.querySelector('.chapter__title');
  var cards = Array.prototype.slice.call(story.querySelectorAll('.card'));

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 760px)');
  var started = false;

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

  var typeEls = Array.prototype.slice.call(story.querySelectorAll('.type'));
  typeEls.forEach(function (el) { ghost(el, el.getAttribute('data-text') || ''); });

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
      .then(function () { return typeAll(Array.prototype.slice.call(card.querySelectorAll('.type'))); })
      .then(function () { return wait(last ? 0 : HOLD); });
  }

  function run() {
    var chain = type(title).then(function () { return wait(700); });
    cards.forEach(function (card, i) {
      chain = chain.then(function () { return show(card, i === cards.length - 1); });
    });
  }

  document.addEventListener('story:start', function () {
    if (started) return;
    started = true;
    story.hidden = false;
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    setTimeout(run, 50);
  });
})();
