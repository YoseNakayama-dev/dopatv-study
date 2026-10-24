/* ドパガキセキュリティTV 学習ノート: カード・クイズ・復習（記録はこのブラウザの localStorage のみ） */
(function () {
  "use strict";
  var KEY = "dopa-study-v1";
  var LABELS = ["ア", "イ", "ウ", "エ"];
  var MASTER = 3; // 「覚えた」をこの回数続けたら定着

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { c: s.c || {}, q: s.q || {}, last: s.last || "" };
    } catch (e) {
      return { c: {}, q: {}, last: "" };
    }
  }
  var st = load();
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {}
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isWeak(key) {
    var lv = st.c[key];
    return lv === undefined || lv < MASTER;
  }

  /* ---------- 用語カード ---------- */
  function paintLevel(card) {
    var lv = st.c[card.dataset.key];
    var el = card.querySelector(".lv");
    var n = lv || 0;
    var dots = "";
    for (var i = 0; i < 5; i++) dots += '<i class="' + (i < n ? "on" : "") + '"></i>';
    el.innerHTML = dots;
    el.setAttribute("aria-label", lv === undefined ? "未学習" : "定着度 " + n + "/5");
    card.classList.toggle("mastered", n >= MASTER);
  }
  function bindCards(root) {
    root.querySelectorAll(".card").forEach(function (card) {
      paintLevel(card);
      var flip = card.querySelector(".flip");
      flip.addEventListener("click", function () {
        var open = flip.getAttribute("aria-expanded") === "true";
        flip.setAttribute("aria-expanded", String(!open));
        card.querySelector(".front").hidden = !open;
        card.querySelector(".back").hidden = open;
        card.classList.toggle("open", !open);
      });
      card.querySelectorAll(".grade button").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = card.dataset.key;
          st.c[k] = b.dataset.g === "1" ? Math.min((st.c[k] || 0) + 1, 5) : 0;
          save();
          paintLevel(card);
          if (flip.getAttribute("aria-expanded") === "true") flip.click();
          card.classList.add("graded");
          setTimeout(function () { card.classList.remove("graded"); }, 300);
        });
      });
    });
  }
  function bindFilter(section) {
    var group = section.querySelector(".filter");
    if (!group) return;
    group.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        group.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var weak = b.dataset.f === "weak";
        section.querySelectorAll(".card").forEach(function (c) { c.hidden = weak && !isWeak(c.dataset.key); });
      });
    });
  }

  /* ---------- クイズ ---------- */
  function answerQuiz(li, picked) {
    var ans = Number(li.dataset.answer);
    li.classList.add("answered");
    li.querySelectorAll(".choice").forEach(function (b) {
      var i = Number(b.dataset.i);
      b.disabled = true;
      b.classList.toggle("correct", i === ans);
      b.classList.toggle("picked", i === picked);
      b.classList.toggle("wrong", i === picked && i !== ans);
    });
    li.querySelectorAll(".why").forEach(function (w) { w.hidden = false; });
    var res = li.querySelector(".result");
    if (!res) {
      res = document.createElement("div");
      res.className = "result";
      li.appendChild(res);
    }
    var ok = picked === ans;
    res.innerHTML = '<span class="' + (ok ? "ok" : "ng") + '">' + (ok ? "正解" : "不正解。正解は" + LABELS[ans]) + '</span><button type="button" class="retry">解き直す</button>';
    res.querySelector(".retry").addEventListener("click", function () { resetQuiz(li); });
    st.q[li.dataset.key] = ok ? 1 : 0;
    save();
  }
  function resetQuiz(li) {
    li.classList.remove("answered");
    li.querySelectorAll(".choice").forEach(function (b) {
      b.disabled = false;
      b.classList.remove("correct", "picked", "wrong");
    });
    li.querySelectorAll(".why").forEach(function (w) { w.hidden = true; });
    var res = li.querySelector(".result");
    if (res) res.remove();
  }
  function bindQuizzes(root) {
    root.querySelectorAll(".quiz").forEach(function (li) {
      li.querySelectorAll(".choice").forEach(function (b) {
        b.addEventListener("click", function () { answerQuiz(li, Number(b.dataset.i)); });
      });
    });
  }

  /* ---------- 一覧の進み具合 ---------- */
  function paintIndex() {
    var data = window.STUDY_DATA;
    document.querySelectorAll(".ep[data-ep]").forEach(function (a) {
      var id = a.dataset.ep;
      var total = Number(a.dataset.terms);
      var m = 0;
      var qOk = 0;
      var qN = 0;
      Object.keys(st.c).forEach(function (k) { if (k.indexOf(id + ":") === 0 && st.c[k] >= MASTER) m++; });
      Object.keys(st.q).forEach(function (k) { if (k.indexOf(id + ":") === 0) { qN++; if (st.q[k]) qOk++; } });
      var el = a.querySelector(".prog");
      if (!m && !qN) { el.textContent = ""; return; }
      el.innerHTML = '<span>用語 ' + m + "/" + total + "</span><span>クイズ正解 " + qOk + "/" + qN + "</span>";
      a.classList.toggle("done", m === total && qN > 0 && qOk === qN);
    });
    return data;
  }
  function paintResume() {
    var a = document.getElementById("resume");
    var src = st.last && document.querySelector('#view-order .ep[data-ep="' + st.last + '"]');
    if (!a || !src) return;
    a.href = src.getAttribute("href");
    a.innerHTML = "<small>続きから</small>" + esc(src.querySelector(".no").textContent + " " + src.querySelector(".t").textContent);
    a.hidden = false;
  }
  function bindViews() {
    var group = document.querySelector(".bar .filter");
    var views = document.getElementById("views");
    if (!group || !views) return;
    function show(v) {
      views.classList.toggle("by-chapter", v === "chapter");
      document.getElementById("view-order").hidden = v === "chapter";
      document.getElementById("view-chapter").hidden = v !== "chapter";
      group.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.view === v)); });
    }
    group.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        show(b.dataset.view);
        try { localStorage.setItem("dopa-view", b.dataset.view); } catch (e) {}
      });
    });
    var v = "order";
    try { v = localStorage.getItem("dopa-view") === "chapter" ? "chapter" : "order"; } catch (e) {}
    show(v);
  }

  /* ---------- 折りたたみ節（考える・午後・本）をアンカーで開く ---------- */
  function openFold() {
    var el = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    var d = el && el.querySelector(":scope > details");
    if (d) { d.open = true; el.scrollIntoView(); }
  }

  /* ---------- 復習ページ ---------- */
  function cardHtml(t, ep) {
    return '<li class="card" data-key="' + esc(t.key) + '"><button type="button" class="flip" aria-expanded="false"><span class="front">' + esc(t.term) +
      '<span class="from">#' + ep.no + "</span></span><span class=\"back\" hidden><span class=\"def\">" + esc(t.definition) + "</span>" +
      (t.note ? '<span class="note">' + esc(t.note) + "</span>" : "") +
      '</span></button><div class="grade"><button type="button" class="ng" data-g="0">まだ</button><button type="button" class="ok" data-g="1">覚えた</button><span class="lv"></span></div></li>';
  }
  function quizHtml(q, ep) {
    var h = '<li class="quiz" data-key="' + esc(q.key) + '" data-answer="' + q.answerIndex + '"><p class="q"><a class="tag" href="' + esc(ep.id) + '.html">#' + ep.no + " " + esc(ep.title) + "</a>" + esc(q.question) + '</p><ol class="choices">';
    q.choices.forEach(function (c, i) {
      h += '<li><button type="button" class="choice" data-i="' + i + '"><span class="lbl">' + LABELS[i] + "</span><span>" + esc(c) + '</span></button><p class="why" hidden>' + esc(q.explanations[i]) + "</p></li>";
    });
    return h + "</ol></li>";
  }
  function renderReview(mode) {
    var data = window.STUDY_DATA || [];
    var box = document.getElementById("review");
    var html = "";
    if (mode === "cards") {
      var items = [];
      data.forEach(function (ep) { ep.terms.forEach(function (t) { if (st.c[t.key] !== undefined && st.c[t.key] < MASTER) items.push(cardHtml(t, ep)); }); });
      html = items.length
        ? '<p class="lead">まだ定着していない用語 ' + items.length + '枚。「覚えた」を' + MASTER + '回続けると、ここから外れます。</p><ul class="cards">' + items.join("") + "</ul>"
        : '<p class="empty">苦手な用語はありません。各回の用語カードで「まだ」を押した用語が、ここに集まります。<br><a href="index.html">回の一覧へ</a></p>';
    } else {
      var qs = [];
      data.forEach(function (ep) { ep.quizzes.forEach(function (q) { qs.push([q, ep]); }); });
      if (mode === "quiz") {
        qs = qs.filter(function (x) { return st.q[x[0].key] === 0; });
      } else {
        for (var i = qs.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = qs[i]; qs[i] = qs[j]; qs[j] = t; }
        qs = qs.slice(0, 10);
      }
      html = qs.length
        ? '<ol class="quizzes">' + qs.map(function (x) { return quizHtml(x[0], x[1]); }).join("") + "</ol>"
        : '<p class="empty">間違えたままの問題はありません。各回のクイズで間違えた問題が、ここに集まります。<br><a href="index.html">回の一覧へ</a></p>';
    }
    box.innerHTML = html;
    bindCards(box);
    bindQuizzes(box);
  }
  function bindReview() {
    var group = document.querySelector(".hero .filter");
    group.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        group.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        renderReview(b.dataset.mode);
      });
    });
    renderReview("cards");
  }

  /* ---------- 起動 ---------- */
  if (document.getElementById("review")) bindReview();
  var cards = document.getElementById("cards");
  if (cards) {
    bindCards(cards);
    bindFilter(cards);
  }
  var quiz = document.getElementById("quiz");
  if (quiz) bindQuizzes(quiz);
  if (document.querySelector(".ep[data-ep]")) { paintIndex(); paintResume(); bindViews(); }
  var here = location.pathname.match(/\/(ep\d+[^\/]*)\.html$/);
  if (here && cards) { st.last = here[1]; save(); }
  openFold();
  window.addEventListener("hashchange", openFold);
})();
