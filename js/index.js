/* index.js — главная: личное дерево, ветки-классы, достижения. */
(function () {
  "use strict";
  DrevoHelpers.ready(function () {
    var rules = window.RULES || [];

    var totalEl = document.querySelector("[data-total]");
    if (totalEl) DrevoHelpers.countTo(totalEl, rules.length, 900);

    var growsEl = document.querySelector(".tree-stats-num");
    var learned = Progress.learnedCount();

    if (growsEl) {
      var txt = document.querySelector("[data-total-text]");
      if (txt) txt.textContent = "из " + rules.length;
      /* Счётчик растёт от 0 до числа выученных, а не появляется готовым. */
      DrevoHelpers.countTo(growsEl, learned);
    }

    var treeRoot = document.querySelector("[data-tree]");
    if (treeRoot) {
      var tree = Progress.tree(treeRoot);
      var leaves = tree.refresh();
      if (growsEl && leaves) DrevoHelpers.countTo(growsEl, leaves);
    }

    /* Кнопка выбора класса при первом заходе */
    var gradePad = document.querySelector("[data-grade-trigger]");
    var chipWrap = document.querySelector("[data-grade-chips]");
    if (chipWrap) {
      [1, 2, 3].forEach(function (g) {
        var b = document.createElement("button");
        b.className = "chip" + (Progress.grade() === g ? " on" : "");
        b.textContent = g + " класс";
        b.addEventListener("click", function () {
          Progress.setGrade(g);
          chipWrap.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          window.dispatchEvent(new CustomEvent("drevo:grade", { detail: g }));
        });
        chipWrap.appendChild(b);
      });
    }
    if (gradePad && !Progress.grade()) {
      /* Раньше здесь был scrollIntoView — страница открывалась прокрученной
         вниз, а заголовок hero обрезался шапкой. Теперь мягко подсвечиваем
         сам блок выбора класса и никуда не уезжаем. */
      gradePad.classList.add("is-hint");
      gradePad.addEventListener("click", function () {
        gradePad.classList.remove("is-hint");
      }, { once: true });
    }

    /* Ветки-классы */
    var wrap = document.querySelector("[data-branches]");
    if (wrap) {
      [1, 2, 3].forEach(function (g) {
        var list = rules.filter(function (r) { return r.grade === g; });
        var card = document.createElement("a");
        card.className = "branch-card rv";
        card.setAttribute("href", "rules.html?grade=" + g);
        card.innerHTML =
          '<div class="branch-head"><span class="branch-name">' + g + " класс</span>" +
          '<span class="branch-num">' + Progress.learnedByGrade(g) + " / " + list.length + "</span></div>" +
          "<ul class=\"branch-list\">" +
          list.map(function (r) {
            var done = Progress.isLearned(r.id);
            return "<li class=\"" + (done ? "done" : "") + "\">" + r.title + "</li>";
          }).join("") +
          "</ul>";
        wrap.appendChild(card);
      });
    }

    /* Достижения */
    var achWrap = document.querySelector("[data-ach]");
    if (achWrap) {
      var tpl = document.querySelector("[data-ach-tpl]");
      Progress.ach().forEach(function (a) {
        if (tpl) {
          var node = tpl.content.firstElementChild.cloneNode(true);
          node.querySelector("[data-ach-t]").textContent = a.t;
          node.querySelector("[data-ach-d]").textContent = a.d;
          if (a.got) node.classList.add("got");
          achWrap.appendChild(node);
        }
      });
    }

    /* Прогресс-бар */
    var bar = document.querySelector("[data-progress-bar]");
    if (bar) {
      var pct = rules.length ? Math.round((learned / rules.length) * 100) : 0;
      bar.style.width = pct + "%";
      if (pct > 0) bar.classList.add("ready");
    }

    /* Карточки веток и достижения созданы уже после initReveal —
       просим движок подхватить их, иначе они остаются прозрачными. */
    DrevoHelpers.reveal(document);
  });
})();