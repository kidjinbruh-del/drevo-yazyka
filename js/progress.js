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
      var traces = {
        1: [ {x:170,y:226},{x:150,y:208},{x:130,y:190},{x:110,y:172},{x:92,y:156},{x:74,y:143} ],
        2: [ {x:196,y:214},{x:214,y:186},{x:196,y:158},{x:214,y:130},{x:198,y:102} ],
        3: [ {x:248,y:228},{x:268,y:208},{x:288,y:190},{x:308,y:172},{x:328,y:156},{x:348,y:142},{x:368,y:130} ]
      };
      var bis = {
        1: 'M210,260 Q165,238 82,150',
        2: 'M210,258 Q214,184 210,106',
        3: 'M210,260 Q255,238 372,138'
      };
      var labels = { 1: { x: 62, y: 118, t: "1 класс" }, 2: { x: 210, y: 86, t: "2 класс" }, 3: { x: 362, y: 102, t: "3 класс" } };

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 440 372");
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

      add("path", { d: "M60,352 Q210,356 380,350", stroke: "#9ccc65", "stroke-width": 6, fill: "none", "stroke-linecap": "round" });
      add("path", { d: "M210,352 Q214,300 210,258", stroke: "#6d4c41", "stroke-width": 16, fill: "none", "stroke-linecap": "round" });
      add("path", { d: "M210,310 Q214,286 210,268", stroke: "#8d6e63", "stroke-width": 4, fill: "none" });

      var order = {};
      rules.forEach(function (r, idx) { order[r.id] = idx; });
      var seq = [];

      [1, 2, 3].forEach(function (g) {
        add("path", { d: bis[g], stroke: "#8d6e63", "stroke-width": 7, fill: "none", "stroke-linecap": "round" });
        var gs = rules.filter(function (r) { return r.grade === g; });
        gs.sort(function (a, b) { return order[a.id] - order[b.id]; });
        gs.forEach(function (r, j) {
          seq.push({ r: r, pos: traces[g][j] });
          var lg = add("g", { class: "leaf " + (state.seen[r.id] ? "on" : ""), transform: "translate(" + traces[g][j].x + "," + traces[g][j].y + ")" });
          addTo(lg, "ellipse", { rx: "17", ry: "11", class: "leaf-shape" });
        });
        var lb = labels[g];
        add("text", { x: lb.x, y: lb.y, "class": "tree-label", "text-anchor": lb.x < 150 ? "end" : (lb.x > 300 ? "start" : "middle") }).textContent = lb.t;
      });

      add("circle", { cx: 205, cy: 268, r: 9, fill: "#5d4037" });
      add("circle", { cx: 217, cy: 276, r: 6, fill: "#5d4037" });
      add("circle", { cx: 199, cy: 284, r: 4, fill: "#5d4037" });

      rootEl.appendChild(svg);
      return {
        refresh: function () {
          var leaves = svg.querySelectorAll(".leaf");
          var n = 0;
          seq.forEach(function (item, i) {
            var on = state.seen[item.r.id];
            leaves[i].classList.toggle("on", on);
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