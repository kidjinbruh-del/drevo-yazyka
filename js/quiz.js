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
    /* Раньше панель искали внутри [data-quiz], а в разметке она стояла
       сестринской веткой — resultBox был null, onDone падал на
       classList.add, и итог не показывался никогда. Ищем по документу
       и страхуемся от null. */
    var resultBox = root.querySelector("[data-quiz-result]") || document.querySelector("[data-quiz-result]");
    var resultTitle = resultBox ? resultBox.querySelector("[data-qr-title]") : null;
    var resultScore = resultBox ? resultBox.querySelector("[data-qr-score]") : null;
    var againBtn = resultBox ? resultBox.querySelector(".btn") : null;

    if (againBtn) {
      /* Обработчик вешается один раз: раньше addEventListener вызывался
         на каждом круге и кнопка накапливала дубли. */
      againBtn.addEventListener("click", function () {
        if (resultBox) resultBox.classList.remove("show");
        start();
      });
    }

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
          if (!total) return;
          var pct = Math.round((score / total) * 100);
          if (resultBox) {
            if (resultTitle) {
              resultTitle.textContent =
                pct === 100 ? "Отлично, всё верно!" : pct >= 66 ? "Молодец!" : pct >= 33 ? "Неплохо — давай ещё раз!" : "Не сдавайся!";
            }
            if (resultScore) resultScore.textContent = score + " из " + total;
            resultBox.classList.add("show");

            /* Итог должен быть и видимым, и озвученным: aria-live уже в
               разметке, фокус переводим только если не просили меньше движения. */
            var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
            try {
              if (!calm) resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
              resultBox.focus({ preventScroll: true });
            } catch (e) {}
          }
        }
      });
    }

    start();
  });
})();