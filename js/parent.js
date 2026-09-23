/* parent.js — «переводчик с учебникового» + шпаргалка родителю. */
(function () {
  "use strict";
  DrevoHelpers.ready(function () {
    /* ---------- Переводчик ---------- */
    var input = document.querySelector("[data-tr-input]");
    var out = document.querySelector("[data-tr-out]");
    var form = document.querySelector("[data-tr-form]");

    function norm(s) {
      return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
    }

    function translate(query) {
      var nq = norm(query);
      if (!nq) return null;
      var items = window.TRANSLATIONS || [];
      var scored = items.map(function (it) {
        var nf = norm(it.from);
        var nto = norm(it.to);
        var s = 0;
        if (nf.indexOf(nq) !== -1 || nto.indexOf(nq) !== -1) s += 3; // наш запрос внутри пары
        if (nq.indexOf(nf) !== -1) s += 5; // пара целиком внутри запроса
        var qwords = nq.split(" ").filter(function (w) { return w.length > 4; });
        qwords.forEach(function (w) {
          if (nf.indexOf(w) !== -1 || nto.indexOf(w) !== -1) s += 1;
        });
        return { it: it, s: s };
      }).filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; });
      return scored.length ? scored.slice(0, 3) : null;
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var res = translate(input.value);
        if (!res) {
          out.innerHTML = '<div class="tr-note">Пока не нашли такое. Введи короче — например, «часть речи» или «ударение». Или просто открой <a href="rules.html">список правил</a>.</div>';
          return;
        }
        out.innerHTML = "";
        res.forEach(function (hit) {
          var card = document.createElement("div");
          card.className = "tr-hit";
          card.innerHTML =
            '<p class="tr-from">„' + hit.it.from + '“</p>' +
            '<p class="tr-to">' + hit.it.to + "</p>";
          if (hit.it.ruleId) {
            var a = document.createElement("a");
            a.className = "sibling-chip";
            a.href = "rule.html?id=" + hit.it.ruleId;
            a.textContent = "Открыть правило";
            card.appendChild(a);
          }
          out.appendChild(card);
        });
      });
    }

    /* ---------- Шпаргалка: вся база «учебник → человеческий» ---------- */
    var sheetWrap = document.querySelector("[data-cheatsheet]");
    if (sheetWrap) {
      var rows = (window.RULES || []).slice().sort(function (a, b) { return a.grade - b.grade; });
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td><span class=\"badge g" + r.grade + "\">" + r.grade + "</span>" + r.title + "</td>" +
          "<td>" + r.textbook + "</td>" +
          "<td>" + r.human + "<a class=\"mini-link\" href=\"rule.html?id=" + r.id + "\">Подробнее</a></td>";
        sheetWrap.appendChild(tr);
      });
      var btn = document.querySelector("[data-print]");
      if (btn) btn.addEventListener("click", function () { window.print(); });
    }
  });
})();