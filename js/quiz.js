/* quiz.js — тренировка: случайные вопросы из правил выбранного класса. */
(function () {
  "use strict";
  DrevoHelpers.ready(function () {
    var root = document.querySelector("[data-quiz]");
    if (!root) return;
    var rules = window.RULES || [];
    var q = new URLSearchParams(location.search).get("grade");
    var grade = q ? parseInt(q, 10) : Progress.grade();

    var head = document.querySelector("[data-quiz-grade]");
    var sel = document.querySelector("[data-quiz-select]");
    if (sel) {
      [0,1,2,3].forEach(function (g) {
        var o = document.createElement("option");
        o.value = String(g);
        o.textContent = g ? g + " класс" : "Любой класс";
        sel.appendChild(o);
      });
      sel.value = String(grade || 0);
      sel.addEventListener("change", function () {
        grade = parseInt(sel.value, 10) || 0;
        start();
      });
    }
    if (head) head.textContent = grade ? grade + " класс" : "Все классы";

    var meta = root.querySelector("[data-quiz-meta]");
    var trainerRoot = root.querySelector("[data-quiz-trainer]");
    var resultBox = root.querySelector("[data-quiz-result]");

    function toQuestions(g) {
      var arr = [];
      rules.forEach(function (r) {
        if (g && r.grade !== g) return;
        (r.quiz || []).forEach(function (qq) {
          arr.push({ q: qq, rule: r });
        });
      });
      return arr;
    }

    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function start() {
      if (head) head.textContent = grade ? grade + " класс" : "Все классы";
      var all = toQuestions(grade);
      var picked = shuffle(all).slice(0, 8).map(function (x) { return x.q; });
      if (!picked.length) {
        trainerRoot.innerHTML = '<div class="empty"><p>Здесь пока нет вопросов. Оставь отзыв или выбери класс постарше.</p></div>';
        return;
      }
      if (meta) meta.textContent = "Выбрано " + picked.length + " вопросов из " + rules.length + " правил";
      Trainer.mount(trainerRoot, picked, {
        onDone: function (score, total) {
          var pct = Math.round((score / total) * 100);
          resultBox.classList.add("show");
          resultBox.querySelector("[data-qr-title]").textContent =
            pct === 100 ? "Отлично, всё верно!" : pct >= 66 ? "Молодец!" : pct >= 33 ? "Неплохо — давай ещё раз!" : "Не сдавайся!";
          resultBox.querySelector("[data-qr-score]").textContent = score + " из " + total;
          var btn = resultBox.querySelector(".btn");
          btn.addEventListener("click", function () { resultBox.classList.remove("show"); start(); });
        }
      });
    }

    start();
  });
})();