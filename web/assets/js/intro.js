/* Intro: video → záblesk → fotka + písaný text */
(function () {
  'use strict';

  // Časy vo videu (sekundy) – namerané z jasu snímok, vrchol záblesku je 8,58 s
  var FLASH_AT = 8.45;   // spustí sa náš svetelný záblesk
  var REVEAL_AT = 8.7;   // objaví sa HUD (fotka + text)
  var STOP_AT = 9.3;     // video sa zastaví – ostane statický obraz

  var TYPE_SPEED = 38;   // ms na znak
  var ROW_PAUSE = 180;   // pauza medzi riadkami

  var root = document.getElementById('intro');
  var video = document.getElementById('introVideo');
  var continueBtn = document.getElementById('continue');
  var status = document.getElementById('status');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var flashed = false;
  var revealed = false;

  // Texty si zapamätáme a vyprázdnime – budú sa písať
  var typeEls = Array.prototype.slice.call(root.querySelectorAll('.hud .type'));
  typeEls.forEach(function (el) { el.textContent = ''; });

  function flash() {
    if (flashed) return;
    flashed = true;
    root.classList.add('is-flash');
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    flash();
    root.classList.add('is-revealed');
    setTimeout(typeAll, reduceMotion ? 0 : 700);
  }

  function stopVideo() {
    if (!video.paused) video.pause();
  }

  // Sledujeme čas videa každú snímku (timeupdate je príliš nepresný)
  function watch() {
    var t = video.currentTime;
    if (t >= FLASH_AT) flash();
    if (t >= REVEAL_AT) reveal();
    if (t >= STOP_AT) { stopVideo(); return; }
    if (!video.ended) requestAnimationFrame(watch);
  }

  function showFinal() {
    // video skryjeme – v pozadí ostane záverečná snímka (obrázok)
    stopVideo();
    root.classList.add('is-skipped');
    reveal();
  }

  // ----- Písanie textu -----

  function typeText(el, done) {
    var text = el.getAttribute('data-text') || '';
    if (reduceMotion) { el.textContent = text; done(); return; }
    var i = 0;
    el.classList.add('is-typing');
    (function next() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) {
        setTimeout(next, TYPE_SPEED + Math.random() * 30);
      } else {
        el.classList.remove('is-typing');
        done();
      }
    })();
  }

  function typeAll() {
    var rows = Array.prototype.slice.call(root.querySelectorAll('.hud .row'));
    var r = 0;
    (function nextRow() {
      if (r >= rows.length) {
        continueBtn.classList.add('is-on');
        return;
      }
      var row = rows[r++];
      row.classList.add('is-on');
      var parts = Array.prototype.slice.call(row.querySelectorAll('.type'));
      var p = 0;
      (function nextPart() {
        if (p >= parts.length) { setTimeout(nextRow, reduceMotion ? 0 : ROW_PAUSE); return; }
        typeText(parts[p++], nextPart);
      })();
    })();
  }

  // ----- Continue → HUD zmizne a začne príbeh (story.js) -----

  continueBtn.addEventListener('click', function () {
    if (root.classList.contains('is-leaving')) return;
    root.classList.add('is-leaving');
    status.textContent = '';
    status.setAttribute('data-text', 'OPENING FILE…');
    typeText(status, function () {});
    setTimeout(function () {
      root.classList.add('is-story');
      document.dispatchEvent(new CustomEvent('story:start'));
    }, reduceMotion ? 0 : 900);
  });


  // ----- Štart -----

  if (reduceMotion) {
    showFinal();
    return;
  }

  video.addEventListener('ended', reveal);
  video.addEventListener('error', showFinal, true);

  var fallbackTimer = null;

  function start() {
    if (revealed || document.hidden) return; // v karte na pozadí počkáme
    var playing = video.play();
    if (playing && typeof playing.then === 'function') {
      playing.then(function () {
        requestAnimationFrame(watch);
      }).catch(function (err) {
        // NotAllowedError = prehliadač automatické prehrávanie zakázal (napr. úsporný režim).
        // AbortError = prehrávanie prerušené (karta išla na pozadie) – skúsime znova po návrate.
        if (err && err.name === 'NotAllowedError') showFinal();
      });
    } else {
      requestAnimationFrame(watch);
    }

    // Poistka: ak sa video do 12 s ani nerozbehne (pomalé pripojenie), ukážeme rovno HUD
    if (!fallbackTimer) {
      fallbackTimer = setTimeout(function () {
        if (!revealed && !document.hidden && video.currentTime < 0.5) showFinal();
      }, 12000);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !revealed && video.paused) start();
  });

  start();
})();
