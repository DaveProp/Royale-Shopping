(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* En-tête qui s'assombrit au défilement */
  var header = $('header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 30); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menu téléphone */
  var burger = $('#burger');
  var nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Ouvrir le menu');
    }
  });

  /* Étincelles dorées */
  var sparks = $('#sparks');
  if (sparks && !reduce) {
    for (var i = 0; i < 16; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      s.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      s.style.setProperty('--s', (3 + Math.random() * 6).toFixed(1) + 'px');
      s.style.setProperty('--d', (9 + Math.random() * 9).toFixed(1) + 's');
      s.style.setProperty('--w', '-' + (Math.random() * 14).toFixed(1) + 's');
      s.style.setProperty('--dx', (Math.random() * 80 - 40).toFixed(0) + 'px');
      sparks.appendChild(s);
    }
  }

  /* Apparition au défilement */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* Vitrine des t-shirts */
  var slides = $$('.slide');
  var swatches = $$('.sw');
  var label = $('#showLabel');
  var stage = $('#stage');
  var heroBtn = $('#heroOrder');
  var current = 0;
  var timer = null;

  function show(n) {
    current = (n + slides.length) % slides.length;
    slides.forEach(function (im, k) { im.classList.toggle('on', k === current); });
    swatches.forEach(function (b, k) { b.setAttribute('aria-pressed', k === current ? 'true' : 'false'); });
    var active = slides[current];
    var name = active.getAttribute('data-name');
    label.textContent = 'T-shirt ACENA 2026 · ' + name;
    stage.style.setProperty('--glow', active.getAttribute('data-glow'));
    if (heroBtn) heroBtn.setAttribute('data-order', name);
    if (!active.complete) { active.loading = 'eager'; }
  }
  function start() {
    if (reduce) return;
    stop();
    timer = setInterval(function () { show(current + 1); }, 3800);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  swatches.forEach(function (b) {
    b.addEventListener('click', function () {
      show(Number(b.getAttribute('data-i')));
      start();
    });
  });
  stage.addEventListener('pointerenter', stop);
  stage.addEventListener('pointerleave', start);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  show(0);
  start();

  /* Inclinaison des cartes (souris uniquement) */
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg) translateY(-6px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* Compteurs */
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  var counters = $$('[data-count]');
  function run(el) {
    var target = Number(el.getAttribute('data-count'));
    if (reduce) { el.textContent = fmt(target); return; }
    var t0 = null;
    var dur = 1600;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* Retrait de l'écran d'ouverture */
  window.addEventListener('load', function () {
    setTimeout(function () {
      var sp = $('#splash');
      if (sp && sp.parentNode) sp.parentNode.removeChild(sp);
    }, 2400);
  });
})();
