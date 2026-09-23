/* rules.js — перечень листьев с фильтром по классу и поиском. */
(function () {
  "use strict";
  DrevoHelpers.ready(function () {
    var rules = window.RULES || [];
    var grid = document.querySelector("[data-rules-grid]");
    if (!grid) return;
    var filter = {};
    var q = new URLSearchParams(location.search).get("grade");
    if (q) filter.grade = parseInt(q, 10) || null;

    var chips = document.querySelector("[data-chips]");
    if (chips) {
      [0, 1, 2, 3].forEach(function (g) {
        var b = document.createElement("button");
        b.className = "chip" + (filter.grade === g || (!g && !filter.grade) ? " on" : "");
        b.textContent = g ? g + " класс" : "Все";
        b.addEventListener("click", function () {
          filter.grade = g || null;
          paint();
          chips.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
        });
        chips.appendChild(b);
      });
    }

    var search = document.querySelector("[data-search]");
    if (search) {
      search.addEventListener("input", function () {
        filter.text = search.value.trim().toLowerCase();
        paint();
      });
    }

    function norm(s) { return s.toLowerCase(); }

    function paint() {
      var list = rules.filter(function (r) {
        if (filter.grade && r.grade !== filter.grade) return false;
        if (filter.text) {
          var hay = norm(r.title + " " + r.human + " " + r.textbook);
          return hay.indexOf(filter.text) !== -1;
        }
        return true;
      });
      grid.innerHTML = "";
      if (!list.length) {
        grid.innerHTML = '<div class="empty"><p>По такому запросу ничего нет — попробуй короче.</p></div>';
        return;
      }
      list.forEach(function (r) {
        var card = document.createElement("a");
        card.className = "rule-card" + (Progress.isLearned(r.id) ? " learned" : "");
        card.href = "rule.html?id=" + r.id;
        card.innerHTML =
          '<span class="badge g' + r.grade + '">' + r.grade + " класс</span>" +
          '<h3>' + r.title + "</h3>" +
          "<p>" + r.human + "</p>" +
          '<span class="card-foot">Открыть <i data-ic="chevR"></i></span>';
        grid.appendChild(card);
      });
      ICON.scan(grid);
    }

    paint();
  });
})();