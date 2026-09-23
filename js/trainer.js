/* trainer.js — движок тренажёра.
   Типы вопросов (правило.quiz[]):
     choice   как кнопки-варианты; ровно один ok с объяснением why.
     tap      предложение из tokens; кликаем слова по порядку steps.
   Trainer.mount(root, quiz, { onDone }) — отрисовывает по очереди. */
var Trainer = (function () {
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function playWrong(e) {
    e.classList.add("shake");
    setTimeout(function () { e.classList.remove("shake"); }, 500);
  }

  return {
    mount: function (root, quiz, opts) {
      opts = opts || {};
      if (!root || !quiz || !quiz.length) return null;
      var quizArr = quiz.slice();
      var pos = 0;
      var score = 0;
      var nodes = {};

      function teardown() {
        root.innerHTML = "";
      }

      function render() {
        teardown();
        if (pos >= quizArr.length) {
          root.appendChild(renderDone());
          return;
        }
        var q = quizArr[pos];
        var total = quizArr.length;

        var head = el("div", "tr-head");
        var pager = el("span", "tr-pager", "Вопрос " + (pos + 1) + " из " + total);
        head.appendChild(pager);
        root.appendChild(head);

        var qt = el("p", "tr-q", q.q);
        root.appendChild(qt);

        if (q.type === "choice") {
          renderChoice(q, total);
        } else {
          renderTap(q, total);
        }
      }

      function reveal(shown, correctEl, clicked, why) {
        var box = el("div", "tr-reveal");
        box.appendChild(el("p", "tr-why", why || ""));
        var nextBtn = el("button", "btn btn-ok", "Дальше");
        nextBtn.addEventListener("click", function () { pos++; render(); });
        box.appendChild(nextBtn);
        shown.appendChild(box);
        if (opts.onAnswer) opts.onAnswer(correctEl && correctEl !== clicked);
      }

      function renderChoice(q) {
        var optsBox = el("div", "tr-opts");
        q.options.forEach(function (o) {
          var b = el("button", "tr-btn", o.t);
          b.addEventListener("click", function () {
            if (root.querySelector(".tr-reveal")) return;
            if (o.ok) {
              score++;
              b.classList.add("ok");
              reveal(root, b, b, o.why);
            } else {
              b.classList.add("bad");
              var good = root.querySelector(".tr-btn.ok");
              if (!good) {
                q.options.some(function (x) {
                  if (x.ok) { good = optsBox.children[x === o ? -1 : q.options.indexOf(x)]; return true; }
                  return false;
                });
                if (good) good.classList.add("ok");
              }
              reveal(root, b, good, o.why);
            }
          });
          optsBox.appendChild(b);
        });
        root.appendChild(optsBox);
      }

      function renderTap(q) {
        var stepIdx = 0;
        var strip = el("div", "tr-strip");
        var prompt = el("p", "tr-prom", "Шаг 1: " + q.steps[0].mark);
        root.appendChild(prompt);
        q.tokens.forEach(function (tok, i) {
          var s = el("span", "tr-tok", tok);
          if (tok === ",") s.setAttribute("data-punc", "1");
          s.addEventListener("click", function () {
            if (root.querySelector(".tr-done")) return;
            if (i === q.steps[stepIdx].i) {
              s.classList.add("ok");
              var why = el("div", "tr-reveal tr-inline");
              why.appendChild(el("p", "tr-why", q.steps[stepIdx].why));
              strip.appendChild(why);
              stepIdx++;
              if (stepIdx >= q.steps.length) {
                score++;
                var nb = el("button", "btn btn-ok", "Дальше");
                nb.addEventListener("click", function () { pos++; render(); });
                strip.appendChild(nb);
              } else {
                prompt.textContent = "Шаг " + (stepIdx + 1) + ": " + q.steps[stepIdx].mark;
              }
            } else {
              playWrong(s);
            }
          });
          strip.appendChild(s);
        });
        root.appendChild(strip);
        var hint = el("p", "tr-hint", "Подсказка: задай вопрос из правила и нажми на подходящее слово.");
        root.appendChild(hint);
      }

      function renderDone() {
        var box = el("div", "tr-result");
        var pct = quizArr.length ? Math.round((score / quizArr.length) * 100) : 0;
        var title = pct === 100 ? "Отлично, всё верно!" : pct >= 66 ? "Молодец, почти всё!" : pct >= 33 ? "Хорошо, попробуем ещё раз?" : "Начнём ещё раз — получится!";
        box.appendChild(el("p", "tr-result-title", title));
        box.appendChild(el("p", "tr-result-num", "Верно: " + score + " из " + quizArr.length));
        if (opts.onDone) opts.onDone(score, quizArr.length);
        return box;
      }

      render();
      return { reset: function () { pos = 0; score = 0; render(); } };
    }
  };
})();