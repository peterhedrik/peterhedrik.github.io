/* Príbeh – kapitola 01: vzdelanie.
   Karty sa ukazujú samy jedna po druhej: nová karta sa zväčšená objaví v strede,
   po prečítaní odcestuje na svoje miesto v rade a stmavne. Na konci sú všetky tri vedľa seba. */
(function () {
  'use strict';

  var TYPE_SPEED = 24;      // ms na znak (rýchlejšie než intro – textu je viac)
  var ENTER = 650;          // ako dlho sa karta objavuje, kým sa začne písať text
  var HOLD = [2600, 3400, 3400]; // čas na prečítanie po dopísaní textu (pre každú kartu)
  var MOVE = 1100;          // presun karty na jej miesto v rade (musí sedieť s CSS)
  var GAP = 250;            // pauza, kým sa po presune objaví ďalšia karta
  var MAX_SCALE = 1.7;      // najväčšie zväčšenie karty v strede

  var root = document.getElementById('intro');
  var story = document.getElementById('story');
  var header = story.querySelector('.chapter');
  var timeline = document.getElementById('timeline');
  var cards = Array.prototype.slice.call(story.querySelectorAll('.card'));
  var statusEl = document.getElementById('storyStatus');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 760px)');
  var focused = null;
  var started = false;

  // Nenapísaná časť textu ostáva v stránke neviditeľná („ghost“) – karty tak počas písania
  // nemenia veľkosť a zväčšená karta neposkakuje.
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

  // Posun + zväčšenie, ktoré dostane kartu z jej miesta v rade do stredu voľnej plochy
  function focusTransform(card) {
    if (narrow.matches || reduceMotion) return '';
    var prev = card.style.transform;
    card.style.transform = 'none';
    var r = card.getBoundingClientRect();
    card.style.transform = prev;

    var top = header.getBoundingClientRect().bottom + 16;
    var bottom = window.innerHeight - 24;
    var scale = Math.min(MAX_SCALE, (window.innerWidth * 0.62) / r.width, (bottom - top) / r.height);
    scale = Math.max(1, scale);
    var dx = window.innerWidth / 2 - (r.left + r.width / 2);
    var dy = (top + bottom) / 2 - (r.top + r.height / 2);
    return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';
  }

  function show(card, i) {
    focused = card;
    card.style.transform = focusTransform(card);
    card.classList.add('is-on', 'is-focus');
    if (narrow.matches) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

    return wait(ENTER)
      .then(function () { return typeAll(Array.prototype.slice.call(card.querySelectorAll('.type'))); })
      .then(function () { return wait(HOLD[i] || HOLD[HOLD.length - 1]); });
  }

  // karta odcestuje na svoje miesto v rade a ustúpi do pozadia
  function park(card, last) {
    focused = null;
    card.classList.add('is-moving');
    card.classList.remove('is-focus');
    card.style.transform = '';
    if (!last) card.classList.add('is-past');
    return wait(MOVE).then(function () { card.classList.remove('is-moving'); });
  }

  function run() {
    var chain = typeAll([header.querySelector('.chapter__kicker'), header.querySelector('.chapter__title')])
      .then(function () { return wait(700); });

    cards.forEach(function (card, i) {
      var last = i === cards.length - 1;
      chain = chain
        .then(function () { return show(card, i); })
        .then(function () { return park(card, last); })
        .then(function () { return wait(last ? 0 : GAP); });
    });

    chain.then(function () {
      // na záver sa všetky karty rozsvietia
      cards.forEach(function (c) { c.classList.remove('is-past'); });
      timeline.classList.add('is-done');
      return wait(900);
    }).then(function () { return type(statusEl); });
  }

  // pri zmene veľkosti okna prepočítame polohu práve zväčšenej karty
  window.addEventListener('resize', function () {
    if (focused) focused.style.transform = focusTransform(focused);
  });

  document.addEventListener('story:start', function () {
    if (started) return;
    started = true;
    story.hidden = false;
    root.scrollTop = 0;
    window.scrollTo(0, 0);
    setTimeout(run, 50); // nech sa sekcia najprv vykreslí, potom merajme polohy kariet
  });
})();
