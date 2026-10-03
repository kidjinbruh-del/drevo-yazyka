/* voice.js — озвучка правил.
   1. Если для текста есть готовый аудиофайл (js/audio.js -> window.__AUDIO__) — играем файл.
   2. Иначе синтез Web Speech API (ru-RU, локальный голос ОС). Офлайн. */
var Voice = (function () {
  var supported = typeof window === "object" && "speechSynthesis" in window;
  var ruin = null;
  var queue = [];

  function audioMap() {
    return (typeof window === "object" && window.__AUDIO__) ? window.__AUDIO__ : {};
  }

  function playFile(url) {
    if (typeof Audio === "undefined" || !url) return false;
    try {
      var a = new Audio(url);
      a.play();
      return true;
    } catch (e) { return false; }
  }

  function pickVoice() {
    if (!supported || ruin) return null;
    var voices = window.speechSynthesis.getVoices();
    var russian = voices.filter(function (v) { return /ru[-_]RU/i.test(v.lang) || /^ru/i.test(v.lang); });
    var good = russian.slice().sort(function (a, b) {
      var na = /(irina|svetlana|mariya|maria|polina|olga|maya|milena|полина|мария|ирина|светлана)/i.test(a.name) ? 1 : (a.localService ? 0.5 : 0);
      var nb = /(irina|svetlana|mariya|maria|polina|olga|maya|milena|полина|мария|ирина|светлана)/i.test(b.name) ? 1 : (b.localService ? 0.5 : 0);
      return nb - na;
    });
    ruin = good[0] || russian[0] || null;
    return ruin;
  }

  if (supported) window.speechSynthesis.onvoiceschanged = pickVoice;

  function cancel() {
    if (supported) window.speechSynthesis.cancel();
    queue.length = 0;
  }

  function speakText(text) {
    if (!supported) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "ru-RU";
    u.rate = 0.95;
    u.pitch = 1.05;
    var v = pickVoice();
    if (v) u.voice = v;
    u.onend = Voice._onEnd;
    window.speechSynthesis.speak(u);
  }

  return {
    supported: supported,
    play: playFile,
    /* speak(text, opts): opts.key — слот ("g3-members_human"), opts.audio — прямой путь.
       Возвращает true, если озвучивание начато (файлом или синтезом). */
    speak: function (text, opts) {
      opts = opts || {};
      if (opts.audio && playFile(opts.audio)) return true;
      if (opts.key) {
        var url = audioMap()[opts.key];
        if (url && playFile(url)) return true;
      }
      if (!supported) return false;
      cancel();
      var chunks = String(text).split(/[\r\n;]+/).map(function (s) { return s.replace(/^[*\s]+/, "").replace(/[—,.\s]+$/, ""); }).filter(Boolean);
      if (!chunks.length) return false;
      queue = chunks;
      speakText(queue.shift());
      return true;
    },
    stop: cancel,
    list: function () {
      if (!supported) return [];
      pickVoice();
      return window.speechSynthesis.getVoices().filter(function (v) { return /ru/i.test(v.lang); });
    },
    _onEnd: function () {
      if (queue.length) speakText(queue.shift());
    }
  };
})();