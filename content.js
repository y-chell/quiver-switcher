(() => {
  const STATE_POLL_MS = 4000;
  const DRAG_THRESHOLD_PX = 4;
  const POSITION_STORAGE_KEY = '__qsw_floating_pos_v1';

  const STYLE = `
    .qsw-wrap {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      user-select: none;
      touch-action: none;
    }
    .qsw-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px;
      background: rgba(15, 23, 42, 0.92);
      color: #f8fafc;
      border: 1px solid rgba(148, 163, 184, 0.32);
      border-radius: 999px;
      box-shadow: 0 10px 24px rgba(0,0,0,.30);
      cursor: default;
    }
    .qsw-wrap[data-open="1"] .qsw-bar {
      border-radius: 12px 12px 0 0;
      border-bottom-color: rgba(148,163,184,.12);
    }
    .qsw-btn {
      border: none;
      background: linear-gradient(90deg, #2563eb, #0ea5e9);
      color: #fff;
      font-size: 11px;
      padding: 7px 10px;
      border-radius: 999px;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
    }
    .qsw-btn:disabled { opacity: .6; cursor: not-allowed; }
    .qsw-wrap[data-dragging="1"] .qsw-bar { cursor: grabbing; }
    .qsw-toggle {
      border: 1px solid rgba(148,163,184,.28);
      background: rgba(30,41,59,.8);
      color: #94a3b8;
      font-size: 10px;
      padding: 5px 8px;
      border-radius: 999px;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      transition: color .12s, background .12s;
    }
    .qsw-toggle:hover { color: #e2e8f0; background: rgba(51,65,85,.9); }
    .qsw-panel {
      display: none;
      flex-direction: column;
      background: rgba(10,15,30,.96);
      border: 1px solid rgba(148,163,184,.32);
      border-top: none;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 12px 28px rgba(0,0,0,.35);
      width: 100%;
      min-width: 260px;
      max-height: 320px;
      overflow: hidden;
    }
    .qsw-wrap[data-open="1"] .qsw-panel { display: flex; }
    .qsw-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px 5px;
      border-bottom: 1px solid rgba(148,163,184,.12);
    }
    .qsw-panel-title { font-size: 10px; color: #64748b; }
    .qsw-batch-btn {
      font-size: 10px;
      padding: 3px 8px;
      border: 1px solid rgba(148,163,184,.25);
      border-radius: 999px;
      background: rgba(30,41,59,.8);
      color: #94a3b8;
      cursor: pointer;
      font-family: inherit;
    }
    .qsw-batch-btn:disabled { opacity: .5; cursor: not-allowed; }
    .qsw-batch-btn:hover:not(:disabled) { color: #e2e8f0; }
    .qsw-list {
      overflow-y: auto;
      flex: 1;
      padding: 4px 0;
    }
    .qsw-list::-webkit-scrollbar { width: 3px; }
    .qsw-list::-webkit-scrollbar-thumb { background: rgba(148,163,184,.2); border-radius: 2px; }
    .qsw-account {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      transition: background .1s;
    }
    .qsw-account:hover { background: rgba(30,41,59,.6); }
    .qsw-acc-info { flex: 1; min-width: 0; }
    .qsw-acc-email {
      font-size: 11px;
      color: #cbd5e1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qsw-acc-credits { font-size: 10px; color: #64748b; margin-top: 1px; }
    .qsw-acc-credits.full  { color: #22c55e; }
    .qsw-acc-credits.low   { color: #f59e0b; }
    .qsw-acc-credits.empty { color: #f87171; }
    .qsw-acc-switch {
      font-size: 10px;
      padding: 3px 8px;
      border: 1px solid rgba(148,163,184,.25);
      border-radius: 999px;
      background: rgba(30,41,59,.8);
      color: #94a3b8;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      flex-shrink: 0;
    }
    .qsw-acc-switch:hover { background: rgba(37,99,235,.5); color: #fff; border-color: transparent; }
    .qsw-acc-switch:disabled { opacity: .5; cursor: not-allowed; }
    .qsw-empty { font-size: 11px; color: #475569; text-align: center; padding: 16px 0; }
  `;

  const wrap = document.createElement('div');
  wrap.className = 'qsw-wrap';
  wrap.innerHTML = `
    <div class="qsw-bar">
      <button id="qsw-switch" class="qsw-btn">注册新账号</button>
      <button id="qsw-toggle" class="qsw-toggle">账号 ▾</button>
    </div>
    <div class="qsw-panel">
      <div class="qsw-panel-head">
        <span class="qsw-panel-title" id="qsw-acc-count">账号列表</span>
        <button class="qsw-batch-btn" id="qsw-batch">全部检测积分</button>
      </div>
      <div class="qsw-list" id="qsw-acc-list">
        <div class="qsw-empty">暂无账号记录</div>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.documentElement.appendChild(style);
  document.body.appendChild(wrap);

  const switchBtn = wrap.querySelector('#qsw-switch');
  const toggleBtn = wrap.querySelector('#qsw-toggle');
  const accList   = wrap.querySelector('#qsw-acc-list');
  const accCount  = wrap.querySelector('#qsw-acc-count');
  const batchBtn  = wrap.querySelector('#qsw-batch');

  let isBusy = false;
  let suppressClickUntil = 0;

  // ── Drag (on queued pill) ───────────────────────────────
  const ds = { active: false, moved: false, pointerId: null, startX: 0, startY: 0, originLeft: 0, originTop: 0, width: 0, height: 0 };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function applyPos(left, top) {
    wrap.style.left = `${left}px`;
    wrap.style.top  = `${top}px`;
    wrap.style.right = 'auto';
    wrap.style.bottom = 'auto';
  }

  function loadPos() {
    try {
      const raw = localStorage.getItem(POSITION_STORAGE_KEY);
      if (!raw) return;
      const { left, top } = JSON.parse(raw);
      if (!isFinite(left) || !isFinite(top)) return;
      const r = wrap.getBoundingClientRect();
      applyPos(clamp(left, 0, Math.max(0, window.innerWidth - r.width)), clamp(top, 0, Math.max(0, window.innerHeight - r.height)));
    } catch (_) {}
  }

  function savePos(left, top) {
    try { localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ left, top })); } catch (_) {}
  }

  wrap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // 点在按钮上不触发拖拽
    if (e.target.closest('button')) return;
    const r = wrap.getBoundingClientRect();
    Object.assign(ds, { active: true, moved: false, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, originLeft: r.left, originTop: r.top, width: r.width, height: r.height });
    wrap.dataset.dragging = '1';
    wrap.setPointerCapture(e.pointerId);
  });

  wrap.addEventListener('pointermove', (e) => {
    if (!ds.active || ds.pointerId !== e.pointerId) return;
    const dx = e.clientX - ds.startX, dy = e.clientY - ds.startY;
    if (!ds.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    ds.moved = true;
    e.preventDefault();
    applyPos(clamp(ds.originLeft + dx, 0, Math.max(0, window.innerWidth - ds.width)), clamp(ds.originTop + dy, 0, Math.max(0, window.innerHeight - ds.height)));
  });

  wrap.addEventListener('pointerup', (e) => {
    if (!ds.active || ds.pointerId !== e.pointerId) return;
    if (wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
    if (ds.moved) { const r = wrap.getBoundingClientRect(); savePos(r.left, r.top); suppressClickUntil = Date.now() + 250; }
    Object.assign(ds, { active: false, moved: false, pointerId: null });
    wrap.dataset.dragging = '0';
  });

  wrap.addEventListener('pointercancel', (e) => {
    if (ds.pointerId === e.pointerId) { Object.assign(ds, { active: false, moved: false, pointerId: null }); wrap.dataset.dragging = '0'; }
  });

  // ── Message helper ──────────────────────────────────────
  function sendMsg(msg, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const t = setTimeout(() => { done = true; reject(new Error('timeout')); }, timeoutMs);
      chrome.runtime.sendMessage(msg, (resp) => {
        if (done) return;
        done = true; clearTimeout(t);
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (resp === undefined) { reject(new Error('empty response')); return; }
        resolve(resp);
      });
    });
  }

  function isInvalidated(err) { return /Extension context invalidated/i.test(String(err?.message || err || '')); }

  function scheduleRefresh(reason) {
    setStatus(reason || '扩展已更新，刷新中...');
    switchBtn.disabled = true; switchBtn.textContent = '刷新中...';
    setTimeout(() => window.location.reload(), 250);
  }

  function setStatus(msg) { switchBtn.title = String(msg || ''); }

  // ── Credits helpers ─────────────────────────────────────
  function creditsClass(usage) {
    if (!usage) return '';
    const used = Number(usage.used), total = Number(usage.total);
    if (!isFinite(used) || !isFinite(total) || total === 0) return '';
    const r = used / total;
    return r >= 1 ? 'empty' : r >= 0.75 ? 'low' : 'full';
  }

  function creditsText(usage) {
    if (!usage) return '未检测';
    return usage.raw || (usage.used != null && usage.total != null ? `${usage.used}/${usage.total}` : '未知');
  }

  // ── Account list ────────────────────────────────────────
  function renderAccounts(items) {
    accCount.textContent = `共 ${items.length} 个账号`;
    if (!items.length) { accList.innerHTML = '<div class="qsw-empty">暂无账号记录</div>'; return; }
    accList.innerHTML = '';
    for (const item of items) {
      const el = document.createElement('div');
      el.className = 'qsw-account';
      el.innerHTML = `
        <div class="qsw-acc-info">
          <div class="qsw-acc-email">${item.note || item.email || '(未标记)'}</div>
          <div class="qsw-acc-credits ${creditsClass(item.usage)}">${creditsText(item.usage)}</div>
        </div>
        <button class="qsw-acc-switch" data-id="${item.id}">切换</button>
      `;
      el.querySelector('.qsw-acc-switch').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true; btn.textContent = '...';
        try {
          const res = await sendMsg({ type: 'APPLY_HISTORY_COOKIE', id: btn.dataset.id, reloadTabs: true });
          if (!res?.ok) throw new Error(res?.error);
          btn.textContent = '已切换';
        } catch (err) {
          btn.textContent = '失败';
          if (isInvalidated(err)) { scheduleRefresh(); return; }
        }
        setTimeout(() => { btn.disabled = false; btn.textContent = '切换'; }, 1500);
      });
      accList.appendChild(el);
    }
  }

  async function loadAccounts() {
    try {
      const resp = await sendMsg({ type: 'GET_COOKIE_HISTORY' });
      renderAccounts(resp?.items || []);
    } catch (err) {
      if (isInvalidated(err)) { scheduleRefresh(); return; }
      accList.innerHTML = '<div class="qsw-empty">加载失败</div>';
    }
  }

  // ── Toggle panel ────────────────────────────────────────
  toggleBtn.addEventListener('click', () => {
    if (Date.now() < suppressClickUntil) return;
    const open = wrap.dataset.open === '1';
    wrap.dataset.open = open ? '0' : '1';
    toggleBtn.textContent = open ? '账号 ▾' : '账号 ▴';
    if (!open) loadAccounts();
  });

  // ── Batch check ─────────────────────────────────────────
  batchBtn.addEventListener('click', async () => {
    batchBtn.disabled = true; batchBtn.textContent = '检测中...';
    try {
      const res = await sendMsg({ type: 'BATCH_CHECK_CREDITS' }, 300000);
      if (!res?.ok) throw new Error(res?.error);
      renderAccounts(res.items || []);
    } catch (err) {
      if (isInvalidated(err)) { scheduleRefresh(); return; }
    } finally {
      batchBtn.disabled = false; batchBtn.textContent = '全部检测积分';
    }
  });

  // ── State polling ───────────────────────────────────────
  async function refreshState() {
    try {
      const state = await sendMsg({ type: 'GET_STATE' }, 10000);
      if (!state) return;
      if (!isBusy) {
        if (state.switching) {
          switchBtn.textContent = '注册中...'; switchBtn.disabled = true;
        } else if (state.filling && state.queued === 0) {
          switchBtn.textContent = '准备中...'; switchBtn.disabled = true;
        } else {
          switchBtn.textContent = '注册新账号'; switchBtn.disabled = false;
        }
        setStatus(state.lastError ? `上次失败: ${state.lastError}` : '就绪');
      }
    } catch (err) {
      if (isInvalidated(err)) { scheduleRefresh(); return; }
    }
  }

  // ── Quiver session helpers ──────────────────────────────
  function fetchWithTimeout(resource, options = {}, ms = 6000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(resource, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(t));
  }

  async function applyByMagic(account) {
    const resp = await fetchWithTimeout('/api/auth/magic/verify', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email, code: account.magicCode }),
    });
    if (!resp.ok) throw new Error(`verify failed ${resp.status}`);
    const s = await fetchWithTimeout('/api/_auth/session', { credentials: 'include' });
    if (!s.ok) throw new Error(`session check failed ${s.status}`);
    const session = await s.json();
    return { ok: true, email: session?.user?.email || account.email };
  }

  async function checkSession() {
    const r = await fetchWithTimeout('/api/_auth/session', { credentials: 'include' });
    if (!r.ok) return { ok: false };
    const session = await r.json();
    return { ok: true, email: session?.user?.email || null };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'APPLY_ACCOUNT') {
      applyByMagic(message.account).then(sendResponse).catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
      return true;
    }
    if (message.type === 'CHECK_SESSION') {
      checkSession().then(sendResponse).catch(() => sendResponse({ ok: false }));
      return true;
    }
  });

  // ── Switch button ───────────────────────────────────────
  switchBtn.addEventListener('click', async () => {
    if (Date.now() < suppressClickUntil || switchBtn.disabled || isBusy) return;
    isBusy = true; switchBtn.disabled = true; switchBtn.textContent = '注册中...';
    try {
      const res = await sendMsg({ type: 'REQUEST_SWITCH' }, 130000);
      if (!res?.ok) throw new Error(res?.error || 'switch failed');
      setStatus(`已切到: ${res?.session?.sessionEmail || res?.account?.email || '-'}`);
      if (wrap.dataset.open === '1') loadAccounts();
    } catch (err) {
      if (isInvalidated(err)) { scheduleRefresh(); return; }
      setStatus(`失败: ${String(err.message || err)}`);
    } finally {
      isBusy = false; switchBtn.disabled = false; switchBtn.textContent = '注册新账号';
      refreshState().catch(() => {});
    }
  });

  // ── Init ────────────────────────────────────────────────
  loadPos();
  refreshState();
  setInterval(() => { if (!isBusy) refreshState().catch(() => {}); }, STATE_POLL_MS);
})();
