/* voice.js — озвучка правил и примеров через Web Speech API.
   Работает офлайн: голос берётся из операционной системы. */
var Voice = (function () {
  var supported = typeof window === "object" && "speechSynthesis" in window;
  var ruin = null;
  var queue = [];

  function pickVoice() {
    if (!supported || ruin) return null;
    var voices = window.speechSynthesis.getVoices();
    ruin =
      voices.find(function (v) { return /ru[-_]RU/i.test(v.lang); }) ||
      voices.find(function (v) { return /^ru/i.test(v.lang); }) ||
      null;
    return ruin;
  }

  if (supported) {
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

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
    speak: function (text) {
      if (!supported) return;
      cancel();
      var chunks = String(text).split(/[\r\n;]+/).map(function (s) { return s.replace(/^[*\s]+/, "").replace(/[—,.\s]+$/, ""); }).filter(Boolean);
      queue = chunks;
      speakText(queue.shift());
    },
    stop: cancel,
    _onEnd: function () {
      if (queue.length) speakText(queue.shift());
    }
  };
})();