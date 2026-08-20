/* ============ 算力舱快捷使用 - 主应用 ============ */
"use strict";

/* ---------- 通用工具 ---------- */
const AppUtil = (() => {
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
  }

  async function copyText(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch { ok = false; }
    }
    if (ok) {
      toast("已复制到剪贴板");
      if (btn) {
        const t = btn.textContent;
        btn.textContent = "已复制";
        btn.classList.add("copied");
        clearTimeout(btn._copyTimer);
        btn._copyTimer = setTimeout(() => { btn.textContent = t; btn.classList.remove("copied"); }, 1200);
      }
    } else toast("复制失败，请手动选择复制");
  }

  // 引用 index.html 内联雪碧图中的图标
  function iconSvg(name) {
    return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("zh-CN") + " " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } catch { return "-"; }
  }

  function copyRow(label, value, extraCls = "") {
    return `<div class="copy-row ${extraCls}">
      <span class="label">${esc(label)}</span>
      <code title="${esc(value)}">${esc(value)}</code>
      <button class="copy-btn" data-copy="${esc(value)}">复制</button>
    </div>`;
  }

  return { toast, copyText, esc, fmtDate, copyRow, iconSvg };
})();

/* ---------- 主题 ---------- */
const Theme = (() => {
  const KEY = "aipod.theme";
  const ORDER = ["auto", "light", "dark"];
  const ICONS = { auto: "monitor", light: "sun", dark: "moon" };
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  function current() { return localStorage.getItem(KEY) || "auto"; }
  function effective() { return current() === "auto" ? (mq.matches ? "dark" : "light") : current(); }

  function apply() {
    const eff = effective();
    const html = document.documentElement;
    if (current() === "auto") html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", eff);
    // highlight.js 主题切换
    const light = document.getElementById("hlThemeLight");
    const dark = document.getElementById("hlThemeDark");
    if (light) light.media = eff === "light" ? "all" : "not all";
    if (dark) dark.media = eff === "dark" ? "all" : "not all";
    const btn = document.getElementById("themeBtn");
    if (btn) btn.innerHTML = AppUtil.iconSvg(ICONS[current()]);
  }

  function cycle() {
    const next = ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length];
    localStorage.setItem(KEY, next);
    apply();
    AppUtil.toast(next === "auto" ? "主题：跟随系统" : next === "light" ? "主题：浅色" : "主题：深色");
  }

  function init() {
    mq.addEventListener("change", apply);
    document.getElementById("themeBtn").addEventListener("click", cycle);
    apply();
  }
  return { init };
})();

/* ---------- 服务地址信息 ---------- */
const SvcInfo = (() => {
  function isLocal() { return /localhost|127\.0\.0\.1|^\d+\.\d+\.\d+\.\d+$/.test(location.hostname); }
  function modeLabel() {
    const s = PodAPI.settings();
    if (PodAPI.MOCK) return "演示模式";
    if (s.svcMode === "custom") return "自定义地址";
    return "默认服务直连";
  }
  function openaiBase() { return PodAPI.externalBase() + "/v1"; }
  function nativeBase() { return PodAPI.externalBase() + "/api"; }
  return { isLocal, modeLabel, openaiBase, nativeBase };
})();

/* ---------- 不可达引导 ---------- */
function offlineGuide(extraHtml = "") {
  return `<div class="guide warn" style="margin-top:14px">
    <span class="guide-icon">${AppUtil.iconSvg("alert")}</span>
    <div class="guide-body">
      <p><strong>连不上算力舱的 Ollama，可以依次检查：</strong></p>
      <p>1. 微服是否已安装算力舱 AI 应用 <a href="#/docs/01-quick-start">Ollama</a>（应用商店 → 算力舱分类）</p>
      <p>2. 算力舱设备是否开机并联网</p>
      <p>3. 若服务名不是默认的 <code>ollama-ai</code> 或有多个算力舱，请在右上角「设置」中填写完整服务地址</p>
      ${extraHtml}
    </div>
  </div>`;
}

/* ============ 页面：总览 ============ */
function renderOverview(el) {
  el.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">总览</h1>
      <p class="page-desc">算力舱与 Ollama 服务的运行状态、API 地址一目了然</p>
    </div>
    <div class="card" id="ovStatusCard">
      <div class="status-hero"><div class="status-dot">${AppUtil.iconSvg("clock")}</div>
        <div class="status-info"><div class="status-line">正在探测算力舱服务…</div>
        <div class="status-meta">连接方式：${SvcInfo.modeLabel()}</div></div></div>
    </div>
    <div class="card">
      <h3 class="card-title">API 地址（点击复制即可使用）</h3>
      ${AppUtil.copyRow("OpenAI 兼容", SvcInfo.openaiBase())}
      ${AppUtil.copyRow("Anthropic 兼容", PodAPI.externalBase())}
      ${AppUtil.copyRow("原生 API", SvcInfo.nativeBase())}
      ${AppUtil.copyRow("盒子域名", PodAPI.getBoxDomain())}
      <p class="hint" style="margin-top:10px">OpenAI 兼容地址可直接填入 ChatBox、Cherry Studio、沉浸式翻译等客户端；Anthropic 兼容地址供 Claude Code、Anthropic SDK 使用（API Key 均随意填写）。详见 <a href="#/docs/03-clients" style="color:var(--primary)">客户端配置文档</a>。</p>
    </div>
    <div class="quick-grid">
      <a class="quick-item" href="#/models"><span class="quick-ic">${AppUtil.iconSvg("box")}</span><div><div class="quick-name">查看模型</div><div class="quick-sub">算力舱上已安装的模型</div></div></a>
      <a class="quick-item" href="#/verify"><span class="quick-ic">${AppUtil.iconSvg("zap")}</span><div><div class="quick-name">验证 API</div><div class="quick-sub">发一条测试消息确认可用</div></div></a>
      <a class="quick-item" href="#/docs/01-quick-start"><span class="quick-ic">${AppUtil.iconSvg("book")}</span><div><div class="quick-name">快速开始</div><div class="quick-sub">从安装到调用的完整路径</div></div></a>
      <a class="quick-item" href="#/endpoints"><span class="quick-ic">${AppUtil.iconSvg("link")}</span><div><div class="quick-name">地址速查</div><div class="quick-sub">全部端点与多算力舱格式</div></div></a>
    </div>`;

  PodAPI.probe().then((r) => {
    const hero = el.querySelector(".status-hero");
    if (r.ok) {
      hero.className = "status-hero ok";
      hero.querySelector(".status-dot").innerHTML = AppUtil.iconSvg("check");
      hero.querySelector(".status-line").innerHTML = 'Ollama 服务运行中 <span class="badge ok">在线</span>';
      hero.querySelector(".status-meta").textContent =
        `版本 ${r.version} · 响应 ${r.latencyMs} ms · ${SvcInfo.modeLabel()}${PodAPI.MOCK ? "（数据为演示数据）" : ""}`;
    } else {
      hero.className = "status-hero err";
      hero.querySelector(".status-dot").innerHTML = AppUtil.iconSvg("x");
      hero.querySelector(".status-line").innerHTML = '无法连接 Ollama <span class="badge err">离线</span>';
      hero.querySelector(".status-meta").textContent = r.error || "";
      document.getElementById("ovStatusCard").insertAdjacentHTML("beforeend", offlineGuide());
    }
  });
}

/* ============ 页面：模型列表 ============ */
function renderModels(el) {
  el.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">模型列表</h1>
      <p class="page-desc">实时读取算力舱 Ollama 中已安装的模型</p>
    </div>
    <div class="card">
      <h3 class="card-title">已安装模型
        <span class="spacer"></span>
        <button class="btn" id="modelsRefresh">刷新</button>
      </h3>
      <div id="modelsBody">
        <div class="skeleton" style="width:60%"></div><div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </div>`;

  const load = () => {
    const body = el.querySelector("#modelsBody");
    body.innerHTML = '<div class="skeleton" style="width:60%"></div><div class="skeleton"></div><div class="skeleton"></div>';
    PodAPI.listModels().then((models) => {
      if (!models.length) {
        body.innerHTML = `<div class="empty">${AppUtil.iconSvg("box")}
          还没有安装任何模型<br>
          在算力舱的 Ollama 应用中执行 <code style="background:var(--code-bg);padding:2px 8px;border-radius:6px">ollama pull qwen3:4b</code> 即可安装
          &nbsp;·&nbsp; <a href="#/docs/01-quick-start" style="color:var(--primary)">查看入门文档</a></div>`;
        return;
      }
      const rows = models.map((m) => `
        <tr>
          <td class="model-name-cell">${AppUtil.esc(m.name)}</td>
          <td>${AppUtil.esc(m.parameterSize) || "-"}</td>
          <td>${AppUtil.esc(m.quantization) || "-"}</td>
          <td>${PodAPI.formatSize(m.size)}</td>
          <td>${AppUtil.fmtDate(m.modifiedAt)}</td>
          <td>
            <button class="copy-btn" data-copy="${AppUtil.esc(m.name)}">复制名称</button>
            <a class="copy-btn" style="text-decoration:none;display:inline-block" href="#/verify?model=${encodeURIComponent(m.name)}">验证</a>
          </td>
        </tr>`).join("");
      body.innerHTML = `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>模型名称</th><th>参数规模</th><th>量化</th><th>大小</th><th>安装时间</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <p class="hint" style="margin-top:10px">共 ${models.length} 个模型${PodAPI.MOCK ? "（演示数据）" : ""}。参数规模与量化信息来自 Ollama，未提供时从名称推断。</p>`;
    }).catch((e) => {
      body.innerHTML = `<div class="guide err"><span class="guide-icon">${AppUtil.iconSvg("alert")}</span>
        <div class="guide-body"><p><strong>模型列表加载失败：</strong>${AppUtil.esc(e.message)}</p></div></div>` + offlineGuide();
    });
  };

  el.querySelector("#modelsRefresh").addEventListener("click", load);
  load();
}

/* ============ 页面：API 验证 ============ */
function renderVerify(el, query) {
  const presetModel = query.get("model") || "";
  el.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">API 验证</h1>
      <p class="page-desc">两步确认算力舱可用：先测连通性，再发一条真实对话</p>
    </div>
    <div class="card">
      <h3 class="card-title">第一步 · 连通性测试</h3>
      <div class="verify-form-row">
        <div class="field"><label class="field-label">目标服务</label>
          <input type="text" value="${AppUtil.esc(PodAPI.externalBase())}" readonly style="opacity:.75">
        </div>
        <button class="btn btn-primary" id="probeBtn">开始检测</button>
      </div>
      <div class="verify-result" id="probeResult"></div>
    </div>
    <div class="card">
      <h3 class="card-title">第二步 · 对话测试（流式）</h3>
      <div class="field">
        <label class="field-label" for="verifyModel">模型</label>
        <input type="text" id="verifyModel" list="modelOptions" value="${AppUtil.esc(presetModel)}" placeholder="点击下拉选择，或手动输入模型名">
        <datalist id="modelOptions"></datalist>
        <p class="hint" id="modelLoadHint" style="margin:6px 0 0">正在加载模型列表…</p>
      </div>
      <div class="field">
        <label class="field-label" for="verifyMsg">测试消息</label>
        <textarea id="verifyMsg" placeholder="例如：用一句话介绍你自己（Ctrl+Enter 发送）">你好，请用一句话介绍你自己</textarea>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" id="chatSend">发送</button>
        <button class="btn btn-danger-ghost" id="chatStop" disabled>停止</button>
      </div>
      <div class="chat-output" id="chatOutput" style="margin-top:14px"><span class="placeholder">回复将显示在这里…</span></div>
      <div class="chat-stats" id="chatStats"></div>
      <div id="curlBox" style="margin-top:14px"></div>
    </div>`;

  /* 连通性测试 */
  el.querySelector("#probeBtn").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    const out = el.querySelector("#probeResult");
    btn.disabled = true; btn.textContent = "检测中…";
    const r = await PodAPI.probe();
    btn.disabled = false; btn.textContent = "重新检测";
    out.innerHTML = r.ok
      ? `<span class="badge ok">✓ 可达</span><span class="badge neutral">延迟 ${r.latencyMs} ms</span><span class="badge neutral">版本 ${AppUtil.esc(r.version)}</span>`
      : `<span class="badge err">✗ 不可达</span><span class="badge neutral">${AppUtil.esc(r.error || "")}</span>`;
    if (!r.ok) out.insertAdjacentHTML("beforeend", offlineGuide('<p style="margin-top:8px">检测失败时对话测试通常也无法进行，请先解决连通问题。</p>'));
  });

  /* 填充模型下拉（失败时显式提示，可手动输入模型名） */
  const modelHint = el.querySelector("#modelLoadHint");
  PodAPI.listModels().then((models) => {
    el.querySelector("#modelOptions").innerHTML = models.map((m) => `<option value="${AppUtil.esc(m.name)}">`).join("");
    const input = el.querySelector("#verifyModel");
    if (!input.value && models.length) input.value = models[0].name;
    modelHint.textContent = `已加载 ${models.length} 个模型，也可手动输入`;
  }).catch((e) => {
    modelHint.style.color = "var(--warn)";
    modelHint.textContent = `模型列表加载失败（${e.message}）。可直接手动输入模型名，或稍后刷新页面重试`;
  });

  /* 对话测试 */
  let aborter = null;
  const out = el.querySelector("#chatOutput");
  const stats = el.querySelector("#chatStats");
  const sendBtn = el.querySelector("#chatSend");
  const stopBtn = el.querySelector("#chatStop");
  const msgBox = el.querySelector("#verifyMsg");

  async function send() {
    const model = el.querySelector("#verifyModel").value.trim();
    const content = msgBox.value.trim();
    if (!model) { AppUtil.toast("请填写模型名称"); return; }
    if (!content) { AppUtil.toast("请输入测试消息"); return; }

    sendBtn.disabled = true; stopBtn.disabled = false;
    aborter = new AbortController();
    out.innerHTML = ""; out.classList.add("cursor-blink");
    stats.innerHTML = "";
    const t0 = performance.now();
    let acc = "";

    el.querySelector("#curlBox").innerHTML = `
      <h3 class="card-title" style="font-size:13.5px;margin-top:6px">等效 curl 命令</h3>
      <div class="codeblock"><div class="codeblock-head"><span>bash</span>
        <button class="copy-btn" id="curlCopy">复制</button></div>
        <pre><code class="language-bash">${AppUtil.esc(
          `curl ${PodAPI.externalBase()}/api/chat -d '{\n  "model": "${model}",\n  "messages": [{"role": "user", "content": "${content.replace(/'/g, "'\\''")}"}],\n  "stream": false\n}'`
        )}</code></pre></div>`;
    el.querySelector("#curlCopy").addEventListener("click", (ev) => {
      AppUtil.copyText(ev.currentTarget.closest(".codeblock").querySelector("code").textContent, ev.currentTarget);
    });

    await PodAPI.chatStream({
      model, messages: [{ role: "user", content }], signal: aborter.signal,
      onDelta: (d) => { acc += d; out.textContent = acc; out.scrollTop = out.scrollHeight; },
      onDone: (final) => {
        const secs = ((performance.now() - t0) / 1000).toFixed(1);
        const tps = final?.eval_count && final?.eval_duration ? (final.eval_count / (final.eval_duration / 1e9)).toFixed(1) : "";
        stats.innerHTML = `<span>耗时 ${secs}s</span>` +
          (final?.eval_count ? `<span>输出 ${final.eval_count} tokens</span>` : "") +
          (tps ? `<span>${tps} tokens/s</span>` : "") +
          (final?.cancelled ? `<span>已手动停止</span>` : "");
      },
      onError: (err) => {
        out.insertAdjacentHTML("beforeend", `\n\n[错误] ${AppUtil.esc(err)}`);
      },
    });
    out.classList.remove("cursor-blink");
    sendBtn.disabled = false; stopBtn.disabled = true;
  }

  sendBtn.addEventListener("click", send);
  stopBtn.addEventListener("click", () => aborter?.abort());
  msgBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
  });
}

/* ============ 页面：使用文档 ============ */
async function renderDocs(el, query) {
  const list = DocsCenter.DOC_LIST;
  const activeId = query.get("id") && list.some((d) => d.id === query.get("id")) ? query.get("id") : list[0].id;

  el.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">使用文档</h1>
      <p class="page-desc">示例中的地址已自动替换为你的真实算力舱地址，复制即可用</p>
    </div>
    <div class="docs-layout">
      <nav class="docs-nav">
        ${list.map((d) => `<a class="doc-link ${d.id === activeId ? "active" : ""}" href="#/docs?id=${d.id}">${d.title}</a>`).join("")}
      </nav>
      <div class="docs-content card" id="docContent" style="padding:26px 30px">
        <div class="skeleton" style="width:50%"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton" style="width:80%"></div>
      </div>
    </div>`;

  const box = el.querySelector("#docContent");
  try {
    const md = await DocsCenter.loadDoc(activeId);
    box.innerHTML = "";
    box.appendChild(DocsCenter.renderMarkdown(DocsCenter.replacePlaceholders(md)));
  } catch (e) {
    box.innerHTML = `<div class="guide err"><span class="guide-icon">⚠️</span><div class="guide-body"><p>${AppUtil.esc(e.message)}</p></div></div>`;
  }
}

/* ============ 页面：地址速查 ============ */
function renderEndpoints(el) {
  const base = PodAPI.externalBase();
  const box = PodAPI.getBoxDomain();
  const rows = [
    ["模型列表（原生）", "GET", base + "/api/tags"],
    ["模型列表（OpenAI 风格）", "GET", base + "/v1/models"],
    ["对话补全（OpenAI 兼容）", "POST", base + "/v1/chat/completions"],
    ["对话（Anthropic 兼容）", "POST", base + "/v1/messages"],
    ["对话（原生，支持流式）", "POST", base + "/api/chat"],
    ["文本补全", "POST", base + "/api/generate"],
    ["文本向量（Embedding）", "POST", base + "/api/embed"],
    ["服务版本", "GET", base + "/api/version"],
  ];
  el.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">地址速查</h1>
      <p class="page-desc">常用端点一览，地址已自动填入你的盒子域名</p>
    </div>
    <div class="card">
      <h3 class="card-title">API 端点</h3>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>用途</th><th>方法</th><th>地址</th><th></th></tr></thead>
        <tbody>${rows.map(([name, method, url]) => `
          <tr><td>${name}</td><td><span class="badge ${method.toLowerCase()}">${method}</span></td>
          <td class="model-name-cell wrap-cell">${AppUtil.esc(url)}</td>
          <td><button class="copy-btn" data-copy="${AppUtil.esc(url)}">复制</button></td></tr>`).join("")}
        </tbody></table></div>
      <p class="hint" style="margin-top:10px">OpenAI 兼容端点（<code>/v1</code>）请求时 API Key 任意填写即可，例如 <code>sk-ollama</code>。</p>
    </div>
    <div class="card">
      <h3 class="card-title">域名格式规则</h3>
      ${AppUtil.copyRow("单算力舱服务", "https://{服务名}-ai." + box)}
      ${AppUtil.copyRow("多算力舱服务", "https://f-{算力舱序列号}-{服务名}-ai." + box)}
      <p class="hint" style="margin-top:10px">
        算力舱服务的域名固定以 <code>-ai</code> 结尾；<code>{服务名}</code> 即应用在算力舱上的服务标识（如 <code>ollama</code>、<code>open-webui</code>）。<br>
        接了多个算力舱时，域名前需加 <code>f-{算力舱序列号}-</code> 前缀，序列号可在微服的算力舱管理页面查看。</p>
    </div>
    <div class="card">
      <h3 class="card-title">客户端速填对照</h3>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>客户端</th><th>填写位置</th><th>填入内容</th></tr></thead>
        <tbody>
          <tr><td>ChatBox / Cherry Studio</td><td>API 地址（OpenAI 兼容）</td><td class="model-name-cell">${AppUtil.esc(base + "/v1")}</td></tr>
          <tr><td>Claude Code</td><td>ANTHROPIC_BASE_URL</td><td class="model-name-cell">${AppUtil.esc(base)}</td></tr>
          <tr><td>沉浸式翻译</td><td>OpenAI 接口地址</td><td class="model-name-cell">${AppUtil.esc(base + "/v1/chat/completions")}</td></tr>
          <tr><td>Cline / Continue 等</td><td>Base URL（OpenAI 兼容）</td><td class="model-name-cell">${AppUtil.esc(base + "/v1")}</td></tr>
          <tr><td>任意 OpenAI SDK</td><td>base_url</td><td class="model-name-cell">${AppUtil.esc(base + "/v1")}</td></tr>
          <tr><td>Anthropic SDK</td><td>base_url</td><td class="model-name-cell">${AppUtil.esc(base)}</td></tr>
        </tbody></table></div>
      <p class="hint" style="margin-top:10px">各客户端详细图文说明见 <a href="#/docs?id=03-clients" style="color:var(--primary)">客户端配置文档</a>。</p>
    </div>`;
}

/* ============ 路由 ============ */
const router = (() => {
  const pages = {
    overview: { title: "总览", render: renderOverview },
    models: { title: "模型列表", render: renderModels },
    verify: { title: "API 验证", render: renderVerify },
    docs: { title: "使用文档", render: renderDocs },
    endpoints: { title: "地址速查", render: renderEndpoints },
  };

  function parse() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const name = pages[path] ? path : "overview";
    return { name, query: new URLSearchParams(qs || "") };
  }

  function paint() {
    const { name, query } = parse();
    document.querySelectorAll(".nav-item").forEach((a) => {
      const active = a.dataset.page === name;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const el = document.getElementById("page");
    pages[name].render(el, query);
    document.title = pages[name].title + " · 算力舱快捷使用";
  }

  function go(page) { location.hash = "#/" + page; }

  function init() {
    window.addEventListener("hashchange", paint);
    if (!location.hash) location.hash = "#/overview";
    paint();
  }
  return { init, go };
})();

/* ============ 设置弹窗 ============ */
function initSettingsModal() {
  const modal = document.getElementById("settingsModal");
  const dialog = modal.querySelector(".modal");
  let lastFocus = null;
  const open = () => {
    const s = PodAPI.settings();
    modal.querySelector(`input[name="svcMode"][value="${s.svcMode}"]`).checked = true;
    modal.querySelector("#customBaseInput").value = s.customBase || "";
    modal.querySelector("#customBaseField").hidden = s.svcMode !== "custom";
    lastFocus = document.activeElement;
    modal.hidden = false;
    dialog.focus();
  };
  const close = () => {
    modal.hidden = true;
    if (lastFocus?.focus) lastFocus.focus();
  };

  document.getElementById("settingsBtn").addEventListener("click", open);
  modal.querySelectorAll("[data-close-modal]").forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
  modal.querySelectorAll('input[name="svcMode"]').forEach((r) =>
    r.addEventListener("change", () => { modal.querySelector("#customBaseField").hidden = r.value !== "custom" || !r.checked; }));

  document.getElementById("settingsSave").addEventListener("click", () => {
    const mode = modal.querySelector('input[name="svcMode"]:checked').value;
    const custom = modal.querySelector("#customBaseInput").value.trim();
    if (mode === "custom") {
      if (!/^https?:\/\/.+/.test(custom)) { AppUtil.toast("请填写以 http(s):// 开头的完整地址"); return; }
    }
    PodAPI.saveSettings({ svcMode: mode, customBase: custom.replace(/\/+$/, "") });
    close();
    AppUtil.toast("设置已保存");
    location.reload(); // 简单可靠：重新按新设置渲染
  });
}

/* ============ 启动 ============ */
(function boot() {
  Theme.init();
  initSettingsModal();

  // 顶栏盒子域名
  const chip = document.getElementById("boxDomainChip");
  chip.textContent = SvcInfo.isLocal() ? "本地预览" : PodAPI.getBoxDomain();

  // 演示模式标记
  if (PodAPI.MOCK) document.getElementById("mockBadge").hidden = false;

  // 全局复制代理：data-copy 按钮，或点击 copy-row 任意位置
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (btn) { AppUtil.copyText(btn.dataset.copy, btn); return; }
    const row = e.target.closest(".copy-row");
    if (row) {
      const code = row.querySelector("code");
      if (code) AppUtil.copyText(code.textContent, row.querySelector(".copy-btn"));
    }
  });

  router.init();
})();
