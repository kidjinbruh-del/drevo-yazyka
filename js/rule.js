/* rule.js — паспорт правила: человечески → примеры → учебник → тренажёр. */
(function () {
  "use strict";
  DrevoHelpers.ready(function () {
    var id = new URLSearchParams(location.search).get("id");
    var rules = window.RULES || [];
    var rule = rules.find(function (r) { return r.id === id; });
    var root = document.querySelector("[data-rule]");
    if (!root || !rule) {
      if (root) {
        root.innerHTML = '<div class="empty"><p>Правило не найдено.</p><a class="btn" href="rules.html">К списку правил</a></div>';
      }
      return;
    }

    document.title = rule.title + " — Древо языка";

    var badge = root.querySelector("[data-rule-badge]");
    if (badge) {
      badge.textContent = rule.grade + " класс · " + rule.branch;
      badge.className = "badge g" + rule.grade;
    }

    var title = root.querySelector("[data-rule-title]");
    if (title) title.textContent = rule.title;

    var human = root.querySelector("[data-rule-human]");
    if (human) {
      human.textContent = rule.human;
      human.setAttribute("tabindex", "0");
    }

    var speaker = root.querySelector("[data-rule-speak]");
    if (speaker) {
      speaker.setAttribute("data-voice", rule.human);
      speaker.addEventListener("click", function () {
        if (Voice.supported) Voice.speak(rule.human);
        else Progress.toast("Озвучка недоступна");
      });
    }

    var textbook = root.querySelector("[data-rule-textbook]");
    if (textbook) {
      textbook.textContent = rule.textbook;
    }
    var tbSpeaker = root.querySelector("[data-tb-speak]");
    if (tbSpeaker) tbSpeaker.setAttribute("data-voice", rule.textbook);

    var exWrap = root.querySelector("[data-rule-examples]");
    if (exWrap) {
      rule.examples.forEach(function (ex) {
        var li = document.createElement("li");
        li.className = "ex";
        var btn = document.createElement("button");
        btn.className = "listen-btn";
        btn.type = "button";
        btn.setAttribute("aria-label", "Послушать пример");
        btn.setAttribute("data-voice", ex);
        li.appendChild(btn);
        li.appendChild(document.createTextNode(ex));
        exWrap.appendChild(li);
      });
    }

    var wrong = root.querySelector("[data-rule-wrong]");
    if (wrong) wrong.textContent = rule.wrong.text + " " + rule.wrong.why;

    var errWrap = root.querySelector("[data-rule-errors]");
    if (errWrap) {
      rule.errors.forEach(function (e) {
        var li = document.createElement("li");
        li.textContent = e;
        errWrap.appendChild(li);
      });
    }

    var baseURL = "rule.html?id=";

    var linksWrap = root.querySelector("[data-rule-links]");
    if (linksWrap) {
      if (rule.links && rule.links.length) {
        rule.links.forEach(function (linkId) {
          var lr = rules.find(function (r) { return r.id === linkId; });
          if (!lr) return;
          var a = document.createElement("a");
          a.className = "sibling-chip";
          a.href = baseURL + lr.id;
          a.textContent = "Выросло из: " + lr.title;
          linksWrap.appendChild(a);
        });
      }
    }

    var nextWrap = root.querySelector("[data-rule-next]");
    if (nextWrap) {
      var branchOrder = rules.filter(function (r) { return r.grade === rule.grade; });
      var idx = branchOrder.findIndex(function (r) { return r.id === rule.id; });
      var next = branchOrder[idx + 1];
      if (next) {
        var a = document.createElement("a");
        a.className = "sibling-chip next";
        a.href = baseURL + next.id;
        a.textContent = "Дальше: " + next.title;
        nextWrap.appendChild(a);
      }
    }

    var trainerRoot = root.querySelector("[data-trainer]");
    var doneNote = root.querySelector("[data-learned-note]");

    if (trainerRoot) {
      var t = Trainer.mount(trainerRoot, rule.quiz, {
        onDone: function (score, total) {
          var res = Progress.markLearned(rule.id);
          if (res && res["new"] && doneNote) {
            doneNote.classList.add("show");
            var g = Progress.learnedCount();
            Progress.toast("Листик вырос! На дереве уже " + g + (g % 10 === 1 && g % 100 !== 11 ? " листик" : " листиков"));
          }
        }
      });
    }

    DrevoHelpers.bindSpeak(root);
  });
})();