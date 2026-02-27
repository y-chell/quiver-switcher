// ── DOM refs ──────────────────────────────────────────────
const versionBadge   = document.getElementById('versionBadge');
const sessionDot     = document.getElementById('sessionDot');
const sessionEmail   = document.getElementById('sessionEmail');
const sessionLabel   = document.getElementById('sessionLabel');
const queueFill      = document.getElementById('queueFill');
const queueCount     = document.getElementById('queueCount');
const fillingRow     = document.getElementById('fillingRow');
const fillingText    = document.getElementById('fillingText');
const switchBtn      = document.getElementById('switchBtn');
const switchStatus   = document.getElementById('switchStatus');
const historyCount   = document.getElementById('historyCount');
const historyList    = document.getElementById('historyList');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
const batchCheckBtn  = document.getElementById('batchCheckBtn');
const batchStatus    = document.getElementById('batchStatus');
const exportBtn      = document.getElementById('exportBtn');
const copyExportBtn  = document.getElementById('copyExportBtn');
const exportOutput   = document.getElementById('exportOutput');
const importEmail    = document.getElementById('importEmail');
const importInput    = document.getElementById('importInput');
const importBtn      = document.getElementById('importBtn');
const manageStatus   = document.getElementById('manageStatus');
const updateStatus   = document.getElementById('updateStatus');
const checkUpdateBtn = document.getElementById('checkUpdateBtn');
const openUpdateBtn  = document.getElementById('openUpdateBtn');

const CURRENT_VERSION = chrome.runtime.getManifest().version || '0.0.0';
const QUEUE_TARGET = 2;

// ── Tabs ──────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'history') loadHistory();
  });
});

// ── Helpers ───────────────────────────────────────────────
function send(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, resp => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      resolve(resp);
    });
  });
}

function setStatus(el, text, type = '') {
  el.textContent = text || '';
  el.className = 'status-text' + (type ? ' ' + type : '');
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function fmtDate(val) {
  if (!val) return '-';
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function fmtCredits(item) {
  const u = item?.usage;
  if (!u) return null;
  if (u.raw) return u.raw;
  if (u.used != null && u.total != null) return `${u.used}/${u.total}`;
  return null;
}

function parseSemver(s) {
  return String(s||'').replace(/^v/i,'').split('.').map(n => parseInt(n,10)||0);
}
function compareSemver(a, b) {
  const av = parseSemver(a), bv = parseSemver(b);
  for (let i=0;i<3;i++) { if (av[i]>bv[i]) return 1; if (av[i]<bv[i]) return -1; }
  return 0;
}

// ── Status tab ────────────────────────────────────────────
async function refreshState() {
  try {
    const state = await send({ type: 'GET_STATE' });
    if (!state) return;

    // Queue bar
    const q = Math.min(Number(state.queued||0), QUEUE_TARGET);
    queueFill.style.width = (q / QUEUE_TARGET * 100) + '%';
    queueCount.textContent = `${q} / ${QUEUE_TARGET}`;

    // Filling indicator
    if (state.filling) {
      fillingRow.style.display = 'flex';
      fillingText.textContent = '正在后台准备账号...';
    } else {
      fillingRow.style.display = 'none';
    }

    // Session dot
    if (state.switching) {
      sessionDot.className = 'dot busy';
      sessionEmail.textContent = state.currentEmail || '切换中...';
      sessionLabel.textContent = '切换中';
    } else if (state.lastError) {
      sessionDot.className = 'dot error';
      sessionEmail.textContent = state.currentEmail || '未知';
      sessionLabel.textContent = '有错误';
    } else {
      sessionDot.className = 'dot online';
      sessionEmail.textContent = state.currentEmail || '未登录';
      sessionLabel.textContent = '';
    }
  } catch (err) {
    sessionDot.className = 'dot error';
    sessionEmail.textContent = '连接失败';
  }
}

switchBtn.addEventListener('click', async () => {
  if (switchBtn.disabled) return;
  switchBtn.disabled = true;
  switchBtn.textContent = '切换中...';
  setStatus(switchStatus, '正在请求切换，请稍候...', '');

  try {
    const res = await send({ type: 'REQUEST_SWITCH' });
    if (!res?.ok) throw new Error(res?.error || '切换失败');
    const email = res?.session?.sessionEmail || res?.account?.email || '-';
    setStatus(switchStatus, `已切换到 ${email}`, 'ok');
    await refreshState();
  } catch (err) {
    setStatus(switchStatus, String(err?.message || err), 'err');
    await refreshState();
  } finally {
    switchBtn.disabled = false;
    switchBtn.textContent = '一键切换账号';
  }
});

// ── History tab ───────────────────────────────────────────
async function loadHistory() {
  try {
    const resp = await send({ type: 'GET_COOKIE_HISTORY' });
    renderHistory(resp?.items || []);
  } catch (err) {
    historyList.innerHTML = `<div class="empty-hint">加载失败: ${err.message}</div>`;
  }
}

function creditsClass(usage) {
  if (!usage) return '';
  const used = Number(usage.used), total = Number(usage.total);
  if (!isFinite(used) || !isFinite(total) || total === 0) return '';
  const ratio = used / total;
  if (ratio >= 1) return 'empty';
  if (ratio >= 0.75) return 'low';
  return 'full';
}

function creditsText(usage) {
  if (!usage) return '未检测';
  if (usage.raw) return usage.raw;
  if (usage.used != null && usage.total != null) return `${usage.used}/${usage.total}`;
  return '未知';
}

function renderHistory(items) {
  historyCount.textContent = `${items.length} 个账号`;
  if (!items.length) {
    historyList.innerHTML = '<div class="empty-hint">暂无账号记录</div>';
    return;
  }
  historyList.innerHTML = '';
  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'h-item';
    el.dataset.id = item.id;

    const cls = creditsClass(item.usage);
    const credits = creditsText(item.usage);
    const checkedAt = item.checkedAt ? `检测于 ${fmtDate(item.checkedAt)}` : '';

    el.innerHTML = `
      <div class="h-top">
        <span class="h-email">${item.note || item.email || '(未标记)'}</span>
        <span class="h-time">${fmtDate(item.savedAt)}</span>
      </div>
      <div class="h-top" style="justify-content:space-between">
        <span class="h-credits ${cls}" id="credits-${item.id}">积分: ${credits}</span>
        <span class="h-time">${checkedAt}</span>
      </div>
      <input class="h-note-input" placeholder="添加备注..." value="${item.note||''}" data-id="${item.id}" />
      <div class="h-actions">
        <button class="btn-sm primary apply-btn" data-id="${item.id}">切换</button>
        <button class="btn-sm check-btn" data-id="${item.id}">检测积分</button>
        <button class="btn-sm copy-btn" data-cookie='${JSON.stringify(item.cookie||{})}'>复制</button>
        <button class="btn-sm danger del-btn" data-id="${item.id}">删除</button>
      </div>
    `;

    el.querySelector('.h-note-input').addEventListener('blur', async (e) => {
      await send({ type: 'UPDATE_HISTORY_NOTE', id: e.target.dataset.id, note: e.target.value.trim() });
    });

    el.querySelector('.apply-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '切换中...'; btn.disabled = true;
      try {
        const res = await send({ type: 'APPLY_HISTORY_COOKIE', id: btn.dataset.id, reloadTabs: true });
        if (!res?.ok) throw new Error(res?.error);
        btn.textContent = '已切换';
        await refreshState();
      } catch (err) {
        btn.textContent = '失败';
      }
      setTimeout(() => { btn.textContent = '切换'; btn.disabled = false; }, 1500);
    });

    el.querySelector('.check-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const creditsEl = el.querySelector(`#credits-${item.id}`);
      btn.textContent = '检测中...'; btn.disabled = true;
      creditsEl.className = 'h-credits checking';
      creditsEl.textContent = '积分: 检测中...';
      try {
        const res = await send({ type: 'CHECK_ACCOUNT_CREDITS', id: btn.dataset.id });
        if (!res?.ok) throw new Error(res?.error);
        const cls2 = creditsClass(res.usage);
        creditsEl.className = `h-credits ${cls2}`;
        creditsEl.textContent = `积分: ${creditsText(res.usage)}`;
        btn.textContent = '已检测';
      } catch (err) {
        creditsEl.className = 'h-credits';
        creditsEl.textContent = `积分: 检测失败`;
        btn.textContent = '检测积分';
      }
      setTimeout(() => { btn.disabled = false; btn.textContent = '检测积分'; }, 1500);
    });

    el.querySelector('.copy-btn').addEventListener('click', async (e) => {
      const ok = await copyText(e.currentTarget.dataset.cookie);
      const btn = e.currentTarget;
      btn.textContent = ok ? '已复制' : '失败';
      setTimeout(() => { btn.textContent = '复制'; }, 1200);
    });

    el.querySelector('.del-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (btn.dataset.confirm === '1') {
        await send({ type: 'DELETE_HISTORY_ENTRY', id: btn.dataset.id });
        await loadHistory();
        return;
      }
      btn.dataset.confirm = '1';
      btn.textContent = '确认?';
      setTimeout(() => { btn.dataset.confirm = ''; btn.textContent = '删除'; }, 2000);
    });

    historyList.appendChild(el);
  }
}

refreshHistoryBtn.addEventListener('click', loadHistory);

batchCheckBtn.addEventListener('click', async () => {
  batchCheckBtn.disabled = true;
  batchCheckBtn.textContent = '检测中...';
  setStatus(batchStatus, '正在逐个检测，请勿关闭...', '');
  try {
    const res = await send({ type: 'BATCH_CHECK_CREDITS' });
    if (!res?.ok) throw new Error(res?.error);
    setStatus(batchStatus, `已完成，共检测 ${res.done} 个账号`, 'ok');
    renderHistory(res.items || []);
  } catch (err) {
    setStatus(batchStatus, `批量检测失败: ${err.message}`, 'err');
  } finally {
    batchCheckBtn.disabled = false;
    batchCheckBtn.textContent = '全部检测';
  }
});

// ── Manage tab ────────────────────────────────────────────
exportBtn.addEventListener('click', async () => {
  setStatus(manageStatus, '导出中...', '');
  try {
    const resp = await send({ type: 'EXPORT_CURRENT_COOKIE' });
    if (!resp?.ok) throw new Error(resp?.error || '导出失败');
    exportOutput.value = JSON.stringify(resp.item?.cookie || null, null, 2);
    setStatus(manageStatus, '导出成功', 'ok');
  } catch (err) {
    setStatus(manageStatus, String(err?.message || err), 'err');
  }
});

copyExportBtn.addEventListener('click', async () => {
  const text = exportOutput.value.trim();
  if (!text) { setStatus(manageStatus, '没有可复制的内容', 'err'); return; }
  const ok = await copyText(text);
  setStatus(manageStatus, ok ? '已复制' : '复制失败', ok ? 'ok' : 'err');
});

importBtn.addEventListener('click', async () => {
  const payload = importInput.value.trim();
  if (!payload) { setStatus(manageStatus, '请先粘贴 Cookie', 'err'); return; }
  setStatus(manageStatus, '导入中...', '');
  try {
    const resp = await send({
      type: 'IMPORT_COOKIE',
      payload,
      email: importEmail.value.trim() || null,
      reloadTabs: true,
    });
    if (!resp?.ok) throw new Error(resp?.error || '导入失败');
    importInput.value = '';
    setStatus(manageStatus, '导入成功并已应用', 'ok');
    await refreshState();
  } catch (err) {
    setStatus(manageStatus, String(err?.message || err), 'err');
  }
});

// ── Update check ──────────────────────────────────────────
checkUpdateBtn.addEventListener('click', async () => {
  updateStatus.textContent = '检查中...';
  updateStatus.className = 'update-status';
  openUpdateBtn.style.display = 'none';
  try {
    const res = await fetch(`https://raw.githubusercontent.com/lueluelue2006/quiver_mv3_switcher_extension/main/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();
    const latest = String(data?.version||'').trim();
    if (compareSemver(latest, CURRENT_VERSION) > 0) {
      updateStatus.textContent = `发现新版本 ${latest}（当前 ${CURRENT_VERSION}）`;
      updateStatus.className = 'update-status new';
      openUpdateBtn.style.display = '';
    } else {
      updateStatus.textContent = `已是最新版本 ${CURRENT_VERSION}`;
    }
  } catch (err) {
    updateStatus.textContent = `检查失败: ${err.message}`;
  }
});

openUpdateBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://github.com/lueluelue2006/quiver_mv3_switcher_extension/releases' });
});

// ── Init ──────────────────────────────────────────────────
versionBadge.textContent = `v${CURRENT_VERSION}`;
refreshState();
setInterval(refreshState, 3000);
