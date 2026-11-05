// Interview Lab — 의존성 없는 해시 라우터 SPA. 기록은 localStorage('il.v1')에만 저장.
(() => {
'use strict';
const Q = window.QUESTIONS || [];
const BY_ID = Object.fromEntries(Q.map(q => [q.id, q]));
const TOPICS = ['Java', 'Spring', 'JPA', 'SQL', 'CS', '인성'];
const LEVELS = ['하', '중', '상'];
const RATE = { no: '모름', mid: '애매', yes: '알고 있음' };
const KEY = 'il.v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD(로컬)

// ---------- 저장소 ----------
let S;
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { S = {}; }
  S.rec ||= {};        // id -> {r:'no|mid|yes', note, t}
  S.daily ||= {};      // 날짜 -> {id:1} (그날 평가한 문항)
  S.hist ||= [];       // 모의면접 결과 [{t, n, score, by}]
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('저장 공간이 부족하거나 막혀 있어요. 기록이 유지되지 않을 수 있습니다.'); }
}
function rate(id, r) {
  const rec = S.rec[id] ||= {};
  (S.daily[today()] ||= {})[id] = 1;
  rec.r = r; rec.t = Date.now(); save();
}
const score = r => r === 'yes' ? 1 : r === 'mid' ? .5 : 0;
function mastery(list) {
  if (!list.length) return 0;
  return Math.round(list.reduce((a, q) => a + score(S.rec[q.id]?.r), 0) / list.length * 100);
}
const weak = () => Q.filter(q => ['no', 'mid'].includes(S.rec[q.id]?.r));
function streak() {
  let n = 0; const d = new Date();
  if (!S.daily[today()]) d.setDate(d.getDate() - 1); // 오늘 아직 안 했어도 어제까지 이어졌으면 유지
  for (;; d.setDate(d.getDate() - 1)) { if (S.daily[d.toLocaleDateString('sv')]) n++; else break; }
  return n;
}

// ---------- 공통 UI ----------
let toastT;
function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
}
const bar = (v, cls = '', label = '') => `<div class="bar ${cls}" style="--v:${v}" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label)}"><i></i></div>`;
const badges = q => `<span class="badge badge-topic">${esc(q.topic)}</span><span class="badge badge-lv-${q.level}">${q.level}</span>`;
const rateBadge = id => { const r = S.rec[id]?.r; return r ? `<span class="rate-badge ${r}">${RATE[r]}</span>` : ''; };
const link = u => /^https?:\/\//.test(u || '') ? `<p class="source">출처: <a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\//, '').slice(0, 70))}</a></p>` : '';
const answerHtml = q => `<div class="qcard-a" id="ans">
  <p class="eyebrow">모범 답안 (30~60초 분량)</p><p style="margin-top:var(--sp-2)">${esc(q.answer)}</p>
  <p class="eyebrow" style="margin-top:var(--sp-4)">핵심 키워드</p><ul class="kw">${q.keywords.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
  <p class="eyebrow">꼬리질문 — 이어서 이렇게 물을 수 있어요</p><ul class="followups">${q.followups.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
  ${link(q.source)}</div>`;
const ratingHtml = id => `<fieldset class="fs-fieldset"><legend>이 문항, 얼마나 설명할 수 있나요?</legend>
  <div class="rating">${['no', 'mid', 'yes'].map(r => `<label><input class="r-${r}" type="radio" name="rate" value="${r}" ${S.rec[id]?.r === r ? 'checked' : ''}><span>${RATE[r]}</span></label>`).join('')}</div></fieldset>`;
const empty = (icon, title, text, btn, href) => `<section class="card empty"><div class="empty-art" aria-hidden="true">${icon}</div><h2 class="card-title">${title}</h2><p class="muted">${text}</p><a class="btn btn-primary" href="${href}">${btn}</a></section>`;
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- 라우팅 ----------
let cleanup = null;
const routes = { '': home, study, mock, session, result };
function route() {
  cleanup?.(); cleanup = null;
  const [path, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const p = new URLSearchParams(qs);
  const name = path.split('/')[0];
  const fn = routes[name] || home;
  const nav = [['', '홈'], ['study', '학습'], ['mock', '모의면접']];
  $('#nav').innerHTML = nav.map(([h, t]) => `<a href="#/${h}" ${(name === h || (name === 'session' || name === 'result') && h === 'mock') ? 'aria-current="page"' : ''}>${t}</a>`).join('');
  $('#app').innerHTML = '';
  cleanup = fn(p) || null;
  document.title = 'Interview Lab — 주니어 백엔드 면접 대비';
  window.scrollTo(0, 0);
}

// ---------- 홈 ----------
function home() {
  const done = Object.keys(S.daily[today()] || {}).length, goal = 10, wk = weak().length;
  const rated = Object.keys(S.rec).filter(id => S.rec[id].r && BY_ID[id]).length;
  const tiles = TOPICS.map(t => {
    const list = Q.filter(q => q.topic === t), m = mastery(list), n = list.filter(q => S.rec[q.id]?.r).length;
    return `<a class="field-tile" href="#/study?topic=${encodeURIComponent(t)}"><span class="ico" aria-hidden="true">${esc(t.slice(0, 2))}</span><b>${t}</b><small>${list.length}문항 · ${n ? `숙련 ${m}%` : '시작 전'}</small>${bar(m, '', `${t} 숙련도 ${m}%`)}</a>`;
  }).join('');
  $('#app').innerHTML = `
  <section class="hero"><p class="eyebrow">JUNIOR BACKEND INTERVIEW</p>
    <h1>면접장에서 <em>말이 나오게,</em><br>한 문항씩 소리 내어 연습해요</h1>
    <p>Java·Spring·JPA·SQL·CS·인성 ${Q.length}문항. 답을 떠올리고, 공개하고, 스스로 평가하면 약한 문항이 자동으로 모입니다.</p></section>
  <div class="stats" aria-label="내 기록">
    <div class="stat"><b>${done}<span class="muted" style="font-size:var(--fs-md);font-weight:400"> / ${goal}</span></b><small>오늘 푼 문항</small></div>
    <div class="stat"><b>${streak()}일</b><small>연속 학습</small></div>
    <div class="stat"><b>${rated}<span class="muted" style="font-size:var(--fs-md);font-weight:400"> / ${Q.length}</span></b><small>평가한 문항</small></div>
    <div class="stat"><b>${mastery(Q)}%</b><small>전체 숙련도</small></div>
  </div>
  <div class="grid-2">
    <div class="stack">
      <section class="card" aria-labelledby="h-today"><h2 class="card-title" id="h-today">오늘의 진행도</h2>
        <div class="score">${done}<span class="muted" style="font-size:var(--fs-lg);font-weight:var(--fw-regular)"> / ${goal} 문항</span></div>
        <div style="margin-top:var(--sp-3)">${bar(Math.min(100, done / goal * 100), '', `오늘 ${goal}문항 중 ${done}문항`)}</div>
        <p class="muted" style="margin-top:var(--sp-3)">${wk ? `복습할 문항 <b style="color:var(--text)">${wk}개</b>가 기다리고 있어요.` : '아직 복습할 문항이 없어요. 학습 카드에서 자기평가를 남기면 여기에 모입니다.'}</p></section>
      <div class="actions"><a class="btn btn-primary" href="#/mock">모의면접 시작</a><a class="btn" href="#/study?status=weak">약점 복습 (${wk})</a></div>
    </div>
    <section aria-labelledby="h-fields"><h2 class="card-title" id="h-fields">분야 선택</h2><div class="tiles">${tiles}</div></section>
  </div>
  <section class="card"><h2 class="card-title">최근 모의면접</h2>${S.hist.length ? S.hist.slice(-3).reverse().map(h => `<div class="review-item" style="cursor:default"><span class="badge badge-topic">${new Date(h.t).toLocaleDateString('ko')}</span><span>${h.n}문항 · 평균 ${h.score}점</span></div>`).join('') : '<p class="muted">아직 기록이 없어요. 5문항짜리 짧은 모의면접부터 시작해 보세요.</p>'}</section>`;
}

// ---------- 학습 카드 ----------
function study(p) {
  const f = { topic: p.get('topic') || 'all', status: p.get('status') || 'all', levels: p.get('lv') ? p.get('lv').split(',') : [...LEVELS], i: +p.get('i') || 0, q: p.get('q') || '' };
  const url = () => `#/study?${new URLSearchParams({ topic: f.topic, status: f.status, lv: f.levels.join(','), i: f.i, ...(f.q ? { q: f.q } : {}) })}`;
  let list = [], open = false;
  const pick = () => {
    const kw = f.q.trim().toLowerCase();
    list = Q.filter(q => (f.topic === 'all' || q.topic === f.topic) && f.levels.includes(q.level)
      && (f.status === 'all' || (f.status === 'weak' ? ['no', 'mid'].includes(S.rec[q.id]?.r) : f.status === 'new' ? !S.rec[q.id]?.r : S.rec[q.id]?.r === f.status))
      && (!kw || (q.question + q.keywords.join(' ')).toLowerCase().includes(kw)));
    f.i = Math.max(0, Math.min(f.i, list.length - 1));
  };
  const render = () => {
    pick();
    const chip = (v, t, cur, k) => `<button class="chip" type="button" data-${k}="${esc(v)}" aria-pressed="${cur}">${t}</button>`;
    const filters = `<div class="stack"><div class="chips" role="group" aria-label="분야 필터">${chip('all', '전체', f.topic === 'all', 'topic')}${TOPICS.map(t => chip(t, t, f.topic === t, 'topic')).join('')}</div>
      <div class="chips" role="group" aria-label="난이도·상태 필터">${LEVELS.map(l => chip(l, `난이도 ${l}`, f.levels.includes(l), 'lv')).join('')}
      ${[['all', '모든 상태'], ['new', '미평가'], ['weak', '복습 필요'], ['yes', '알고 있음']].map(([v, t]) => chip(v, t, f.status === v, 'status')).join('')}</div>
      <input class="note" style="min-height:var(--tap);height:var(--tap);resize:none" type="search" id="kw" placeholder="질문·키워드 검색" aria-label="검색" value="${esc(f.q)}"></div>`;
    if (!list.length) { $('#app').innerHTML = `<h1 class="page-title">학습 카드</h1>${filters}${empty('∅', '조건에 맞는 문항이 없어요', '필터를 바꾸거나 모두 해제해 보세요.', '필터 초기화', '#/study')}`; bind(); return; }
    const q = list[f.i], rec = S.rec[q.id] || {};
    $('#app').innerHTML = `<h1 class="page-title">학습 카드</h1>${filters}
    <article class="qcard" aria-label="질문 카드"><div class="actions" style="gap:var(--sp-2)">${badges(q)}${rateBadge(q.id)}<span class="muted" style="margin-left:auto;font-size:var(--fs-sm)">${f.i + 1} / ${list.length}</span></div>
      <h2 class="qcard-q">${esc(q.question)}</h2>
      <label class="eyebrow" for="my">내 답변 메모 (선택, 자동 저장)</label>
      <textarea id="my" placeholder="먼저 소리 내어 말하고, 떠오른 핵심을 적어 보세요.">${esc(rec.note || '')}</textarea>
      <button class="btn btn-block" id="tog" type="button" aria-expanded="${open}" aria-controls="ans" style="margin-top:var(--sp-3)">${open ? '답안 숨기기' : '답안 보기'} <span class="kbd">Space</span></button>
      ${open ? answerHtml(q) + ratingHtml(q.id) : ''}</article>
    <div class="actions"><button class="btn" id="prev" type="button" ${f.i === 0 ? 'disabled' : ''}>← 이전</button><button class="btn" id="rand" type="button">무작위</button><button class="btn btn-primary" id="next" type="button" ${f.i >= list.length - 1 ? 'disabled' : ''}>다음 →</button></div>
    <p class="hint">단축키: <span class="kbd">←</span> <span class="kbd">→</span> 이동, <span class="kbd">Space</span> 답안 토글 (입력창 밖에서)</p>`;
    bind();
  };
  const go = i => { f.i = i; open = false; render(); history.replaceState(null, '', url()); };
  function bind() {
    const app = $('#app');
    app.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => { f.topic = b.dataset.topic; f.i = 0; open = false; render(); history.replaceState(null, '', url()); });
    app.querySelectorAll('[data-status]').forEach(b => b.onclick = () => { f.status = b.dataset.status; f.i = 0; open = false; render(); history.replaceState(null, '', url()); });
    app.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
      const l = b.dataset.lv, on = f.levels.includes(l);
      if (on && f.levels.length === 1) return toast('난이도는 하나 이상 선택해야 해요.');
      f.levels = on ? f.levels.filter(x => x !== l) : [...f.levels, l]; f.i = 0; render();
    });
    $('#kw')?.addEventListener('input', e => { f.q = e.target.value; f.i = 0; const pos = e.target.selectionStart; render(); const k = $('#kw'); k.focus(); k.setSelectionRange(pos, pos); });
    $('#prev')?.addEventListener('click', () => go(f.i - 1));
    $('#next')?.addEventListener('click', () => go(f.i + 1));
    $('#rand')?.addEventListener('click', () => go(Math.floor(Math.random() * list.length)));
    $('#tog')?.addEventListener('click', () => { open = !open; render(); $('#tog').focus(); });
    $('#my')?.addEventListener('input', e => { const id = list[f.i].id; (S.rec[id] ||= {}).note = e.target.value; save(); });
    app.querySelectorAll('input[name=rate]').forEach(i => i.onchange = () => { rate(list[f.i].id, i.value); toast(`"${RATE[i.value]}"로 기록했어요`); const y = scrollY; render(); scrollTo(0, y); });
  }
  const key = e => {
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || !list.length) return;
    if (e.key === 'ArrowRight' && f.i < list.length - 1) go(f.i + 1);
    else if (e.key === 'ArrowLeft' && f.i > 0) go(f.i - 1);
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') { e.preventDefault(); open = !open; render(); }
  };
  document.addEventListener('keydown', key);
  render();
  return () => document.removeEventListener('keydown', key);
}

// ---------- 모의면접 설정 ----------
const cfgDefault = { n: 10, t: 120, topics: ['Java', 'Spring', 'SQL'], weakFirst: true };
function mock() {
  const c = { ...cfgDefault, ...(S.cfg || {}) };
  const resume = S.session && S.session.idx < S.session.ids.length;
  const draw = () => {
    const seg = (name, vals, unit) => `<div class="seg">${vals.map(v => `<label><input type="radio" name="${name}" value="${v}" ${c[name] === v ? 'checked' : ''}><span>${v}${unit}</span></label>`).join('')}</div>`;
    const pool = Q.filter(q => c.topics.includes(q.topic)).length, n = Math.min(c.n, pool);
    $('#app').innerHTML = `<h1 class="page-title">모의면접 설정</h1>
    ${resume ? `<section class="card stack"><h2 class="card-title" style="margin:0">진행 중인 면접이 있어요</h2><p class="muted">${S.session.idx + 1}번째 문항(총 ${S.session.ids.length}문항)부터 이어서 할 수 있어요.</p><div class="actions"><a class="btn btn-primary" href="#/session">이어서 하기</a><button class="btn" id="drop" type="button">버리고 새로 설정</button></div></section>` : ''}
    <div class="grid-2"><form class="card stack" id="f" onsubmit="return false">
      <fieldset style="border:0;padding:0;margin:0"><legend class="card-title">문항 수</legend>${seg('n', [5, 10, 20], '')}</fieldset>
      <fieldset style="border:0;padding:0;margin:0"><legend class="card-title">질문당 시간</legend>${seg('t', [60, 120, 180], '초')}</fieldset>
      <fieldset style="border:0;padding:0;margin:0"><legend class="card-title">분야</legend><div class="chips">${TOPICS.map(t => `<label class="chip"><input type="checkbox" name="topic" value="${t}" ${c.topics.includes(t) ? 'checked' : ''}>${t}</label>`).join('')}</div></fieldset>
      <label class="check"><input type="checkbox" name="weakFirst" ${c.weakFirst ? 'checked' : ''}><span>약점(모름·애매) 문항을 먼저 내 주세요</span></label></form>
    <aside class="card stack" aria-label="요약"><h2 class="card-title" style="margin:0">오늘의 세션</h2>
      <p>${c.topics.length ? `${esc(c.topics.join(' · '))}에서 <b>${n}문항</b>, 문항당 <b>${c.t}초</b>` : '분야를 하나 이상 선택해 주세요.'}</p>
      <p class="muted">예상 소요 시간 약 ${Math.ceil(n * (c.t + 30) / 60)}분. 나가도 이어서 할 수 있어요.</p>
      <button class="btn btn-primary btn-block" id="start" type="button" ${c.topics.length ? '' : 'disabled'}>면접 시작</button></aside></div>`;
    $('#f').onchange = e => {
      const f = new FormData($('#f'));
      c.n = +f.get('n'); c.t = +f.get('t'); c.topics = f.getAll('topic'); c.weakFirst = f.has('weakFirst');
      S.cfg = c; save(); draw();
    };
    $('#drop')?.addEventListener('click', () => { S.session = null; save(); location.reload(); });
    $('#start').onclick = () => {
      let pool = shuffle(Q.filter(q => c.topics.includes(q.topic)));
      if (c.weakFirst) { const w = pool.filter(q => ['no', 'mid'].includes(S.rec[q.id]?.r)); pool = [...w, ...pool.filter(q => !w.includes(q))]; }
      S.session = { ids: pool.slice(0, n).map(q => q.id), t: c.t, idx: 0, rated: {}, phase: 'ask' };
      save(); location.hash = '#/session';
    };
    if (document.activeElement === document.body) {} // 포커스는 그대로 둔다
  };
  draw();
}

// ---------- 세션 ----------
function session() {
  const s = S.session;
  if (!s || s.idx >= s.ids.length) { location.hash = s ? '#/result' : '#/mock'; return; }
  let left = s.t, tm = null, revealed = s.phase === 'check';
  let q = BY_ID[s.ids[s.idx]];
  const fmt = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  const stop = () => { clearInterval(tm); tm = null; };
  const head = `<div class="session-head"><button class="btn btn-ghost" id="exit" type="button">← 나가기</button><span class="muted" aria-label="진행">${s.idx + 1} / ${s.ids.length}</span></div>${bar(s.idx / s.ids.length * 100, '', '세션 진행')}`;
  const render = () => {
    const p = left / s.t * 100;
    $('#app').className = 'wrap page session';
    $('#app').innerHTML = head + (revealed ? '' : `
      <div class="ring ${p <= 20 ? 'low' : ''}" id="ring" style="--p:${p}" role="timer" aria-label="남은 시간"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="45" pathLength="100"/><circle class="ring-bar" cx="50" cy="50" r="45" pathLength="100"/></svg>
      <div class="ring-label"><b id="clock">${fmt(left)}</b><small>남은 시간</small></div></div><p class="sr-only" aria-live="polite" id="live"></p>`) + `
    <article class="qcard"><div class="actions" style="gap:var(--sp-2)">${badges(q)}</div><h2 class="qcard-q">${esc(q.question)}</h2>
      ${revealed ? `<div class="qcard-a" style="margin-top:0;border:0;padding:0">${answerHtml(q).replace('class="qcard-a" id="ans"', 'id="ans"')}</div><fieldset class="fs-fieldset"><legend>내 답변에 들어 있던 키워드 (체크)</legend>${q.keywords.map((k, i) => `<label class="check"><input type="checkbox" name="kw" value="${i}" ${s.kw?.includes(i) ? 'checked' : ''}><span>${esc(k)}</span></label>`).join('')}</fieldset>${ratingHtml(q.id).replace(/ checked/g, '')}`
      : `<p class="muted">소리 내어 30~60초 동안 말해 보세요. 메모는 평가 때 참고용으로만 쓰이고 저장되지 않아요.</p><textarea id="draft" placeholder="생각을 정리하는 메모(선택)"></textarea>`}</article>
    <div class="actions">${revealed ? `<button class="btn btn-primary" id="nextq" type="button" disabled>${s.idx + 1 === s.ids.length ? '결과 보기' : '다음 문항'}</button>` : `<button class="btn" id="skip" type="button">건너뛰기</button><button class="btn btn-primary" id="reveal" type="button">답 공개하고 체크하기</button>`}</div>`;
    bind();
  };
  const tick = () => {
    left--; const ring = $('#ring');
    if (!ring) return stop();
    const p = Math.max(0, left / s.t * 100);
    ring.style.setProperty('--p', p); ring.classList.toggle('low', p <= 20);
    $('#clock').textContent = fmt(Math.max(0, left));
    if (left > 0 && left % 10 === 0) $('#live').textContent = `남은 시간 ${Math.floor(left / 60)}분 ${left % 60}초`;
    if (left <= 0) { stop(); toast('시간이 끝났어요. 답을 공개합니다.'); reveal(); }
  };
  const reveal = () => { stop(); revealed = true; s.phase = 'check'; save(); render(); $('#app').querySelector('.qcard').scrollIntoView({ block: 'start' }); };
  const advance = skipped => {
    stop();
    if (skipped) { s.rated[q.id] = 'no'; rate(q.id, 'no'); }
    s.idx++; s.phase = 'ask'; s.kw = []; save();
    if (s.idx >= s.ids.length) finish(); else { q = BY_ID[s.ids[s.idx]]; left = s.t; revealed = false; render(); tm = setInterval(tick, 1000); }
  };
  function finish() {
    const by = {}; let sum = 0;
    s.ids.forEach(id => { const r = s.rated[id] || 'no'; sum += score(r); const t = BY_ID[id].topic; (by[t] ||= []).push(score(r)); });
    S.hist.push({ t: Date.now(), n: s.ids.length, score: Math.round(sum / s.ids.length * 100), by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100)])), ids: s.ids, rated: s.rated });
    S.session = null; save(); location.hash = '#/result';
  }
  function bind() {
    $('#exit').onclick = () => { if (confirm('나가도 진행 상황은 저장돼요. 모의면접 화면으로 돌아갈까요?')) { stop(); s.phase = revealed ? 'check' : 'ask'; save(); location.hash = '#/mock'; } };
    $('#skip')?.addEventListener('click', () => advance(true));
    $('#reveal')?.addEventListener('click', reveal);
    $('#nextq')?.addEventListener('click', () => advance(false));
    document.querySelectorAll('input[name=kw]').forEach(i => i.onchange = () => { s.kw = [...document.querySelectorAll('input[name=kw]:checked')].map(x => +x.value); save(); });
    document.querySelectorAll('input[name=rate]').forEach(i => i.onchange = () => { s.rated[q.id] = i.value; rate(q.id, i.value); save(); $('#nextq').disabled = false; });
    if (revealed && s.rated[q.id]) { const r = document.querySelector(`input[name=rate][value=${s.rated[q.id]}]`); if (r) r.checked = true; $('#nextq').disabled = false; }
  }
  render();
  if (!revealed) tm = setInterval(tick, 1000);
  return () => { stop(); $('#app').className = 'wrap page'; };
}

// ---------- 결과 ----------
function result() {
  const h = S.hist[S.hist.length - 1];
  if (!h) { $('#app').innerHTML = `<h1 class="page-title">결과</h1>${empty('▦', '아직 결과가 없어요', '모의면접을 한 번 끝내면 분야별 점수와 복습 목록이 여기에 나타나요.', '모의면접 시작', '#/mock')}`; return; }
  const rows = Object.entries(h.by).map(([t, v]) => `<div class="stat-row"><span>${esc(t)}</span>${bar(v, v >= 70 ? 'ok' : v >= 40 ? 'warn' : 'danger', `${t} ${v}%`)}<b>${v}%</b></div>`).join('');
  const revs = h.ids.filter(id => h.rated[id] !== 'yes');
  $('#app').innerHTML = `<h1 class="page-title">모의면접 결과</h1>
  <div class="grid-2"><section class="card"><p class="eyebrow">종합 점수</p><div class="score" style="margin:var(--sp-2) 0">${h.score}<span class="muted" style="font-size:var(--fs-lg);font-weight:400"> / 100</span></div>
    <p class="muted">알고 있음 100 · 애매 50 · 모름 0점 기준 평균 (${h.n}문항, 자기평가)</p>${rows}</section>
  <section class="card"><h2 class="card-title">복습할 문항 (${revs.length})</h2>${revs.length ? revs.map(id => `<a class="review-item" href="#/study?topic=${encodeURIComponent(BY_ID[id].topic)}&i=${Q.filter(q => q.topic === BY_ID[id].topic).indexOf(BY_ID[id])}" style="text-decoration:none"><span class="badge badge-topic">${esc(BY_ID[id].topic)}</span><span>${esc(BY_ID[id].question)}</span><span class="rate-badge ${h.rated[id] || 'no'}">${RATE[h.rated[id] || 'no']}</span></a>`).join('') : empty('✓', '모두 알고 있어요', '복습할 문항이 없어요. 다른 분야에도 도전해 보세요.', '다시 도전', '#/mock')}</section></div>
  <div class="actions"><a class="btn btn-primary" href="#/mock">한 번 더</a><a class="btn" href="#/study?status=weak">약점 복습</a><a class="btn" href="#/">홈으로</a></div>`;
}

// ---------- 테마·초기화·시작 ----------
function theme(t) {
  if (t) { document.documentElement.dataset.theme = t; localStorage.setItem('il.theme', t); }
}
const sys = matchMedia('(prefers-color-scheme: dark)');
theme(localStorage.getItem('il.theme') || (sys.matches ? 'dark' : 'light'));
$('#theme').onclick = () => theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
$('#reset').onclick = () => { if (confirm('학습 기록과 모의면접 기록을 모두 지울까요? 되돌릴 수 없어요.')) { localStorage.removeItem(KEY); load(); toast('기록을 지웠어요'); route(); } };
load();
addEventListener('hashchange', route);
route();
})();
