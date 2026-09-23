/* main.js — общий слой: иконки, навигация, reveal, счётчики, выбор класса. */
(function () {
  "use strict";

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

  function initReveal() {
    var els = document.querySelectorAll(".rv");
    if (!els.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(function (x) { io.observe(x); });
  }

  ready(function () {
    ICON.scan();
    initNav();
    initGradePad();
    initReveal();
  });

  window.DrevoHelpers = {
    ready: ready,
    gradeLabel: gradeLabel,
    speak: function (text) {
      if (Voice.supported) Voice.speak(text);
      else Progress.toast("Озвучка недоступна в этом браузере");
    },
    bindSpeak: function (root) {
      var btns = (root || document).querySelectorAll("[data-voice]");
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          var t = b.getAttribute("data-voice");
          if (t) DrevoHelpers.speak(t);
        });
      });
    }
  };
})();