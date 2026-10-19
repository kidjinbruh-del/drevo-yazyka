/* main.js — общий слой: иконки, навигация, reveal, счётчики, выбор класса. */
(function () {
  "use strict";

  /* Ставим сразу, а не после DOMContentLoaded: иначе reveal-элементы
     успевают мелькнуть видимыми и только потом прячутся. */
  document.documentElement.classList.add("js");

  function ready(fn) {
    if (document.readyState === "interactive" || document.readyState === "complete") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function gradeLabel(g) {
    return { 1: "1 класс", 2: "2 класс", 3: "3 класс" }[g] || "";
  }

  function initNav() {
    var here = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-link").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === here) a.className += " active";
    });
  }

  function initGradePad() {
    var sel = document.querySelector("[data-grade-select]");
    if (sel) {
      var g = Progress.grade();
      var options = [0, 1, 2, 3].map(function (x) {
        return '<option value="' + x + '">' + (x ? gradeLabel(x) : "Не выбран") + "</option>";
      }).join("");
      sel.innerHTML = options;
      sel.value = String(g || 0);
      sel.addEventListener("change", function () {
        var v = parseInt(sel.value, 10) || 0;
        if (v) { Progress.setGrade(v); window.dispatchEvent(new CustomEvent("drevo:grade", { detail: v })); }
      });
    }
  }

  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var revealScan = null;

  /* Reveal-движок.
     Раньше он собирал .rv один раз на DOMContentLoaded, а ветки-классы
     создаёт index.js уже после этого — карточки получали .rv и навсегда
     оставались с opacity:0 (секция «Ветки» была пустой). Теперь: один
     IntersectionObserver + MutationObserver, который догоняет всё, что
     добавили позже (ветки, достижения, результаты квиза). */
  function initReveal() {
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;

    function show(el) {
      el.classList.add("in");
      if (seen) seen.delete(el);
    }

    if (!("IntersectionObserver" in window) || reduced) {
      var flat = document.querySelectorAll(".rv");
      for (var k = 0; k < flat.length; k++) show(flat[k]);
      return function () {
        var later = document.querySelectorAll(".rv:not(.in)");
        for (var j = 0; j < later.length; j++) show(later[j]);
      };
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        show(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    function scan(root) {
      var scope = root && root.querySelectorAll ? root : document;
      var els = scope.querySelectorAll(".rv:not(.in)");
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (seen && seen.has(el)) continue;
        if (seen) seen.add(el);
        el.style.setProperty("--rv-i", String(i % 6));
        io.observe(el);
      }
    }

    scan(document);

    if ("MutationObserver" in window && document.body) {
      var queued = false;
      var mo = new MutationObserver(function (muts) {
        var added = false;
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes && muts[i].addedNodes.length) { added = true; break; }
        }
        if (!added || queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(function () {
          queued = false;
          scan(document);
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return scan;
  }

  /* Числа в интерфейсе должны «дорастать», а не появляться скачком.
     Уважает prefers-reduced-motion. */
  function countTo(el, value, dur) {
    if (!el) return;
    var to = parseInt(value, 10);
    if (isNaN(to)) return;
    var from = parseInt(String(el.textContent).replace(/\D/g, ""), 10) || 0;
    if (reduced || !window.requestAnimationFrame || from === to) {
      el.textContent = String(to);
      return;
    }
    var span = dur || 640;
    var t0 = 0;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / span);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  ready(function () {
    ICON.scan();
    initNav();
    initGradePad();
    revealScan = initReveal();
  });

  window.DrevoHelpers = {
    ready: ready,
    gradeLabel: gradeLabel,
    reveal: function (root) { if (revealScan) revealScan(root); },
    countTo: countTo,
    speak: function (text, opts) {
      if (Voice.speak(text, opts)) return;
      Progress.toast("Озвучка недоступна в этом браузере");
    },
    bindSpeak: function (root) {
      var btns = (root || document).querySelectorAll("[data-voice]");
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          var t = b.getAttribute("data-voice");
          var k = b.getAttribute("data-voice-key");
          if (t) DrevoHelpers.speak(t, k ? { key: k } : null);
        });
      });
    }
  };
})();