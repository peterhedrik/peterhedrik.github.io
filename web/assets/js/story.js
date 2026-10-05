/* Príbeh – kapitoly po intre (01 vzdelanie, 02 pracovné skúsenosti, 03 GIS, 04 projekty ABB, 05 Inovate, 06 projekty GE, 07 aktuálny projekt, 08 zručnosti, 09 jazyky, 10 záverečná otázka).
   Každá kapitola je <section data-chapter>. Karty sa ukazujú samy jedna po druhej priamo
   na svojom mieste (zľava doprava) a ostávajú zobrazené. Po poslednej karte sa objaví
   Continue, ktoré kapitolu zavrie a otvorí ďalšiu – alebo, ak má kapitola data-auto-next,
   sa ďalšia otvorí sama po danom čase. */
(function () {
  'use strict';

  var TYPE_SPEED = 15;      // ms na znak (rýchlejšie než intro – textu je viac)
  var ENTER = 400;          // ako dlho sa karta objavuje, kým sa začne písať text
  var HOLD = 1300;          // čas na prečítanie po dopísaní textu, kým sa objaví ďalšia karta
  var LEAVE = 850;          // ako dlho trvá odchod kapitoly (po Continue alebo data-auto-next)
  // Zručnosti – časovanie obrázkov:
  var SITE_FIRST = 3800;    // obrázky „kde a ako“ (Hitachi/GE … bez žeriavu): prvý svieti 3,8 s,
  var SLOWDOWN = 0.932;     //   každý ďalší o ~7 % kratšie (posledný z nich ~2,5 s)
  var SITE_EXTRA = 1000;    //   – z toho 1 s navyše oproti pôvodnému tempu (Peter: každý o 1 s kratšie)
  var TOOLS_STEADY = 4;     // náradie: prvé 4 ešte pokojne (od 1,4 s po ~1,1 s)…
  var TOOLS_FIRST = 1400;
  var FLICKER_FROM = 750;   // …potom prudko zrýchľuje až do preblikávania
  var FLICKER_TO = 110;
  var SLIDE_TYPE = 1000;    // obrázky kratšie než toto už popis nepíšu, ukážu ho naraz
  var SLIDE_FLASH = 300;    // kratšie obrázky sa menia bez záblesku (aby to neblikalo príliš ostro)

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

  // posunie stránku k prvku, ak nie je celý na obrazovke (mobil, dlhšie kapitoly)
  function reveal(el) {
    var r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: narrow.matches ? 'center' : 'nearest' });
  }

  function show(card, hold) {
    card.classList.add('is-on');
    reveal(card);

    return wait(ENTER)
      .then(function () { return typeAll(all(card, '.type')); })
      .then(function () { return wait(hold); });
  }

  // obrázky s data-src sa začnú sťahovať až keď treba (o kapitolu skôr, aby boli pripravené)
  function preload(ch) {
    if (!ch) return;
    all(ch, 'img[data-src]').forEach(function (img) {
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    });
  }

  // Zručnosti: obrázky sa striedajú na jednom mieste a každý svieti o niečo kratšie než
  // predchádzajúci (geometricky od SLIDE_FIRST po SLIDE_LAST).
  function slideshow(ch) {
    var box = ch.querySelector('.slides');
    var imgs = all(ch, '.slides__img');
    var text = ch.querySelector('.slides__text');
    var tools = imgs.filter(function (img) { return img.hasAttribute('data-tool'); });
    var site = imgs.length - tools.length;
    var flicker = tools.length - TOOLS_STEADY;
    var ratio = Math.pow(FLICKER_TO / FLICKER_FROM, 1 / Math.max(flicker - 1, 1));

    function duration(i) {
      if (i < site) return (SITE_FIRST - SITE_EXTRA) * Math.pow(SLOWDOWN, i) + SITE_EXTRA;
      var j = i - site;
      if (j < TOOLS_STEADY) return TOOLS_FIRST * Math.pow(SLOWDOWN, j);
      return FLICKER_FROM * Math.pow(ratio, j - TOOLS_STEADY);
    }

    box.classList.add('is-on');
    var chain = wait(600);
    imgs.forEach(function (img, i) {
      var ms = Math.round(duration(i));
      chain = chain.then(function () {
        box.classList.toggle('is-fast', ms < SLIDE_FLASH);
        if (imgs[i - 1]) imgs[i - 1].classList.remove('is-on');
        img.classList.add('is-on');
        text.setAttribute('data-text', img.getAttribute('data-caption'));
        if (ms >= SLIDE_TYPE) return Promise.all([type(text), wait(ms)]);
        text.textContent = img.getAttribute('data-caption');
        return wait(ms);
      });
    });
    // na záver obrázok zmizne a v prázdnom rámiku sa napíše „…AND MUCH MORE“
    var end = ch.querySelector('.slides__end');
    if (!end) return chain;
    return chain.then(function () {
      box.classList.add('is-end');
      return wait(500);
    }).then(function () { return type(end); });
  }

  function open(index) {
    var ch = chapters[index];
    ch.hidden = false;
    preload(ch);
    preload(chapters[index + 1]);
    root.scrollTop = 0;
    window.scrollTo(0, 0);

    var cards = all(ch, '.card');
    var hold = parseInt(ch.getAttribute('data-hold'), 10);   // data-hold – kratšia pauza pri veľa kartách
    if (isNaN(hold)) hold = HOLD;
    var chain = wait(50)
      .then(function () { return typeAll(all(ch, '.chapter .type')); })
      .then(function () { return wait(700); });
    cards.forEach(function (card, i) {
      chain = chain.then(function () { return show(card, i === cards.length - 1 ? 0 : hold); });
    });
    if (ch.querySelector('.slides')) chain = chain.then(function () { return slideshow(ch); });

    // data-delay="ms" – text, ktorý sa napíše až chvíľu po dobehnutí kapitoly (TO BE CONTINUED…)
    all(ch, '.type[data-delay]').forEach(function (el) {
      chain.then(function () { return wait(parseInt(el.getAttribute('data-delay'), 10)); })
        .then(function () { el.classList.add('is-on'); return type(el); });
    });

    if (!chapters[index + 1]) return;

    function leave() {
      if (ch.classList.contains('is-leaving')) return;
      ch.classList.add('is-leaving');
      wait(LEAVE).then(function () {
        all(ch, '.video__frame').forEach(function (f) { f.remove(); });   // zastaví prehrávané video
        ch.hidden = true;
        open(index + 1);
      });
    }

    // data-auto-next="ms" – ďalšia kapitola sa otvorí sama, bez Continue
    var auto = parseInt(ch.getAttribute('data-auto-next'), 10);
    if (auto) {
      chain.then(function () { return wait(auto); }).then(leave);
      return;
    }

    var btn = ch.querySelector('.story__next .continue');
    if (!btn) return;

    chain.then(function () { return wait(500); }).then(function () {
      btn.classList.add('is-on');
      reveal(btn);
    });
    btn.addEventListener('click', leave);
  }

  // Videá z YouTube: kým sa neklikne, je tam len náhľad (žiadne cookies ani prehrávač).
  // Po kliknutí sa náhľad nahradí prehrávačom youtube-nocookie.com.
  all(document, '.video[data-youtube]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = 'https://www.youtube-nocookie.com/embed/' + btn.getAttribute('data-youtube') +
        '?autoplay=1&rel=0&playsinline=1' + (btn.getAttribute('data-start') ? '&start=' + btn.getAttribute('data-start') : '');
      var frame = document.createElement('iframe');
      frame.className = 'video__frame';
      frame.src = src;
      frame.title = btn.getAttribute('aria-label');
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      btn.replaceWith(frame);
    });
  });

  document.addEventListener('story:start', function () {
    if (started || !chapters.length) return;
    started = true;
    open(0);
  });
})();
