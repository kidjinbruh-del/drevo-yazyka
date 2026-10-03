/* progress.js — личное дерево ребёнка + достижения.
   Механический слой растёт в localStorage, дерево рендерится как SVG.
   Ключи:  drevo_state_v1   { grade, seen:{}, ach:{} }
           drevo_quiz_last  {grade, score} — для статистики на главной */
var Progress = (function () {
  var KEY = "drevo_state_v1";
  var SUBKEY = "drevo_sub_v1";
  var storage = null;

  try {
    storage = window.localStorage;
  } catch (e) { storage = null; }

  function load() {
    var raw = storage && storage.getItem(KEY);
    var s = { grade: 0, seen: {}, ach: {} };
    if (raw) {
      try {
        var p = JSON.parse(raw);
        if (p && typeof p === "object") {
          s.grade = p.grade || 0;
          s.seen = p.seen || {};
          s.ach = p.ach || {};
        }
      } catch (e) { /* сбросим битые данные */ }
    }
    return s;
  }
  function save(s) {
    if (!storage) return;
    try { storage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  var state = load();

  return {
    grade: function () { return state.grade; },
    setGrade: function (g) {
      if (g < 1 || g > 3) return;
      state.grade = g;
      save(state);
    },
    learned: function () {
      return (window.RULES || []).filter(function (r) { return !!state.seen[r.id]; }).map(function (r) { return r.id; });
    },
    learnedByGrade: function (g) {
      return (window.RULES || []).filter(function (r) { return r.grade === g && state.seen[r.id]; }).length;
    },
    learnedCount: function () {
      return (window.RULES || []).filter(function (r) { return state.seen[r.id]; }).length;
    },
    total: function () { return (window.RULES || []).length; },
    isLearned: function (id) { return !!state.seen[id]; },
    markLearned: function (id) {
      var r = (window.RULES || []).find(function (x) { return x.id === id; });
      if (!r || state.seen[id]) return { "new": false };
      state.seen[id] = true;
      save(state);
      setTimeout(function(){ checkAchievements(r); }, 100);
      return { "new": true, rule: r };
    },
    reset: function () {
      try { storage && storage.removeItem(KEY); } catch (e) {}
      state = load();
    },

    /* ------------------------------------------------------------------
       ЛИЧНОЕ ДЕРЕВО: SVG. Позиции листьев по ветвям-классам.
    ------------------------------------------------------------------ */
    tree: function (rootEl) {
      if (!rootEl) return;
      var rules = window.RULES || [];
/* Геометрия ветвей: одна кривая на класс, листья расставляются выборкой
         точек вдоль неё. Раньше позиции листьев были расставлены руками,
         из-за чего дерево выглядело как зелёные пятна на палке. */
      var BRANCH = {
        1: { p: [[214, 268], [176, 250], [122, 214], [74, 148]], tip: [74, 148], label: "1 класс", ax: "end" },
        2: { p: [[214, 266], [220, 216], [214, 150], [220, 88]], tip: [220, 88], label: "2 класс", ax: "middle" },
        3: { p: [[214, 268], [258, 248], [318, 208], [382, 140]], tip: [382, 140], label: "3 класс", ax: "start" }
      };

      function bez(pt, t) {
        var u = 1 - t;
        return [
          u * u * u * pt[0][0] + 3 * u * u * t * pt[1][0] + 3 * u * t * t * pt[2][0] + t * t * t * pt[3][0],
          u * u * u * pt[0][1] + 3 * u * u * t * pt[1][1] + 3 * u * t * t * pt[2][1] + t * t * t * pt[3][1]
        ];
      }
      function bezD(pt) {
        return "M" + pt[0][0] + "," + pt[0][1] +
          " C" + pt[1][0] + "," + pt[1][1] +
          " " + pt[2][0] + "," + pt[2][1] +
          " " + pt[3][0] + "," + pt[3][1];
      }
      function angleAt(pt, t) {
        var a = bez(pt, Math.max(0, t - 0.02));
        var b = bez(pt, Math.min(1, t + 0.02));
        return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      }

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 440 400");
      svg.setAttribute("class", "tree");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Личное дерево знаний");

      var ns = "http://www.w3.org/2000/svg";
      function add(name, attr) {
        var el = document.createElementNS(ns, name);
        for (var k in attr) el.setAttribute(k, attr[k]);
        svg.appendChild(el);
        return el;
      }
      function addTo(parent, name, attr) {
        var el = document.createElementNS(ns, name);
        for (var k in attr) el.setAttribute(k, attr[k]);
        parent.appendChild(el);
        return el;
      }

      /* --- земля и крона-подсветка --- */
      add("ellipse", { cx: 220, cy: 372, rx: 150, ry: 16, class: "tree-shadow" });
      add("path", { d: "M62,368 Q140,352 220,360 Q300,352 378,368", class: "tree-ground" });
      add("ellipse", { cx: 220, cy: 190, rx: 190, ry: 130, class: "tree-glow" });

      /* --- ствол: два контура, чтобы получить сужение --- */
      add("path", {
        d: "M214,262 C206,300 200,330 196,364 L236,364 C232,330 222,300 214,262 Z",
        class: "tree-trunk"
      });
      add("path", { d: "M214,268 C212,300 210,330 209,360", class: "tree-trunk-line" });
      add("path", { d: "M214,300 C196,314 182,330 176,364", class: "tree-root" });
      add("path", { d: "M214,306 C232,318 246,332 252,364", class: "tree-root" });

      var order = {};
      rules.forEach(function (r, idx) { order[r.id] = idx; });
      var seq = [];

      [1, 2, 3].forEach(function (g) {
        var b = BRANCH[g];
        add("path", { d: bezD(b.p), class: "tree-branch" });

        var gs = rules.filter(function (r) { return r.grade === g; });
        gs.sort(function (a, c) { return order[a.id] - order[c.id]; });
        var n = gs.length;
        gs.forEach(function (r, j) {
          // Листья расходятся от ствола к краю ветви и чередуются стороной.
          var t = n === 1 ? 0.62 : 0.34 + (j / (n - 1)) * 0.58;
          var p = bez(b.p, t);
          var rot = angleAt(b.p, t) + (j % 2 ? 34 : -34);
          seq.push({ r: r });
          var lg = add("g", {
            class: "leaf",
            "data-on": state.seen[r.id] ? "1" : "0",
            transform: "translate(" + p[0].toFixed(1) + "," + p[1].toFixed(1) + ") rotate(" + rot.toFixed(1) + ")"
          });
          addTo(lg, "path", { d: "M0,0 C7,-9 21,-9 29,0 C21,9 7,9 0,0 Z", class: "leaf-shape" });
          addTo(lg, "path", { d: "M2,0 L27,0", class: "leaf-vein" });
        });

        var lb = add("text", {
          x: b.tip[0], y: b.tip[1] - 16, "class": "tree-label", "text-anchor": b.ax
        });
        lb.textContent = b.label;
      });

      /* --- сердцевина ствола: показывает общий проход --- */
      var done = rules.filter(function (r) { return state.seen[r.id]; }).length;
      add("circle", { cx: 214, cy: 286, r: 11, class: "tree-heart" });

      rootEl.appendChild(svg);
      rootEl.appendChild(svg);
      // Состояние листа задаём атрибутом, а не классом: класс «on» в этом файле
      // наследуется от предыдущей отрисовки и красит все листья разом.
      Array.prototype.forEach.call(svg.querySelectorAll(".leaf"), function (el, i) {
        var r = seq[i] && seq[i].r;
        el.setAttribute("data-on", r && state.seen[r.id] ? "1" : "0");
      });
      return {
        refresh: function () {
          var leaves = svg.querySelectorAll(".leaf");
          var n = 0;
          seq.forEach(function (item, i) {
            var on = state.seen[item.r.id];
            leaves[i].setAttribute("data-on", on ? "1" : "0");
            if (on) n++;
          });
          return n;
        }
      };
    },

    /* ------------------------------------------------------------------
       Достижения
    ------------------------------------------------------------------ */
    toast: function (msg) {
      var old = document.querySelector(".toast");
      if (old) old.remove();
      var t = document.createElement("div");
      t.className = "toast";
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.classList.add("show"); }, 20);
      setTimeout(function () {
        t.classList.remove("show");
        setTimeout(function () { t.remove(); }, 300);
      }, 3200);
    },
    ach: function () {
      var defs = [
        { id: "first", t: "Первый листик", d: "Понял первое правило" },
        { id: "five", t: "Пятак листьев", d: "5 правил на дереве" },
        { id: "ten", t: "Десяток", d: "10 правил на дереве" },
        { id: "all", t: "Пышная крона", d: "Все правила выращены" },
        { id: "branch", t: "Целая ветка", d: "Весь класс пройден" }
      ];
      var n = Progress.learnedCount();
      var map = {};
      defs.forEach(function (d) {
        if (state.ach[d.id]) d.got = true;
        map[d.id] = d;
      });
      var grants = [];
      var t = Progress.total();
      if (n >= 1) grants.push("first");
      if (n >= 5) grants.push("five");
      if (n >= 10) grants.push("ten");
      if (n >= t) grants.push("all");
      [1, 2, 3].forEach(function (g) {
        var tot = (window.RULES || []).filter(function (r) { return r.grade === g; }).length;
        if (tot > 0 && Progress.learnedByGrade(g) >= tot) grants.push("branch");
      });
      return defs.map(function (d) { d.got = state.ach[d.id] || grants.indexOf(d.id) !== -1; return d; });
    }
  };

  function checkAchievements(rule) {
    var g = Progress.learnedCount();
    var newAch = null;
    var t = Progress.total();
    if (g === 1) newAch = "first";
    else if (g === 5) newAch = "five";
    else if (g === 10) newAch = "ten";
    else if (g === t) newAch = "all";
    if (!newAch && rule) {
      var cnt = Progress.learnedByGrade(rule.grade);
      var tot = (window.RULES || []).filter(function (r) { return r.grade === rule.grade; }).length;
      if (cnt >= tot) newAch = "branch";
    }
    if (newAch && !state.ach[newAch]) {
      state.ach[newAch] = true;
      save(state);
      var d = Progress.ach().find(function (a) { return a.id === newAch; });
      if (d) Progress.toast("Достижение: " + d.t + " — " + d.d);
    }
  }

  return Progress;
})();
window.Progress = Progress;