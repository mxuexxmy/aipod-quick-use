/* ============ AI Pod 综合门户 - 主应用 ============ */
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

const APP_CATALOG = [
  { id: "openwebui", name: "Open WebUI", category: "聊天", summary: "面向本地模型的完整聊天与模型管理界面。", requirements: "需要 Ollama", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.openwebui", docsUrl: "#/docs?id=04-apps" },
  { id: "knowledge", name: "知识库", category: "知识", summary: "使用算力舱完成文档检索、问答与 RAG。", requirements: "需要 Ollama 与嵌入模型", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.knowledge", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/knowledge/mcp.html" },
  { id: "imagen", name: "文生图", category: "图像", summary: "在算力舱本地生成图片。", requirements: "需要独立图像服务", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.imagen", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/imagen/api.html" },
  { id: "comfyui", name: "ComfyUI", category: "图像", summary: "模块化视觉生成工作流和模型管理工具。", requirements: "需要较多显存", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.comfyui", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/comfyui/" },
  { id: "videogen", name: "文生视频", category: "视频", summary: "使用算力舱生成视频内容。", requirements: "需要独立视频模型", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.videogen", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/" },
  { id: "indextts", name: "IndexTTS", category: "语音", summary: "多语言文本转语音与声音克隆。", requirements: "需要语音模型", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.indextts", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/tts/tts_api.html" },
  { id: "funasr", name: "FunASR", category: "语音", summary: "面向中文场景的快速语音识别服务。", requirements: "需要 ASR 模型", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.funasr", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/asr/" },
  { id: "ocr", name: "DeepSeek OCR 2", category: "OCR", summary: "本地文档与图片文字识别。", requirements: "需要视觉模型", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.deepseek-ocr-2", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/ocr/" },
  { id: "translator", name: "懒猫翻译", category: "翻译", summary: "使用本地模型完成多语言翻译。", requirements: "建议安装轻量语言模型", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.translator", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/trans/trans.html" },
  { id: "webollama", name: "webollama", category: "开发", summary: "通过网页管理 Ollama 模型和文本生成。", requirements: "需要 Ollama", storeUrl: "https://appstore.lazycat.cloud/#/shop/detail/cloud.lazycat.aipod.webollama", docsUrl: "https://docs-ai.mxuexxmy.heiyu.space/aipod/ollama/download-model.html" },
];

function externalLink(url, label, cls = "btn") {
  return `<a class="${cls}" href="${AppUtil.esc(url)}" target="_blank" rel="noopener noreferrer">${AppUtil.esc(label)} ${AppUtil.iconSvg("external")}</a>`;
}

function statePanel(id, icon, title, description) {
  return `<div class="readiness-item is-loading" id="${id}"><span class="readiness-icon">${AppUtil.iconSvg(icon)}</span><div><strong>${title}</strong><p>${description}</p></div><span class="state-label">检查中</span></div>`;
}

function setReadiness(root, id, state, title, description) {
  const node = root.querySelector("#" + id);
  if (!node) return;
  const names = { ready: "可用", unavailable: "需处理", unknown: "无法确认", error: "异常", loading: "检查中" };
  node.className = "readiness-item is-" + state;
  node.querySelector("strong").textContent = title;
  node.querySelector("p").textContent = description;
  node.querySelector(".state-label").textContent = names[state] || state;
}

/* ---------- 不可达引导 ---------- */
function offlineGuide(extraHtml = "") {
  return `<div class="guide warn" style="margin-top:14px">
    <span class="guide-icon">${AppUtil.iconSvg("alert")}</span>
    <div class="guide-body">
      <p><strong>连不上算力舱的 Ollama，可以依次检查：</strong></p>
      <p>1. 微服是否已安装算力舱 AI 应用 <a href="#/docs?id=01-quick-start">Ollama</a>（应用商店中的算力舱分类）</p>
      <p>2. 算力舱设备是否开机并联网</p>
      <p>3. 若服务名不是默认的 <code>ollama-ai</code> 或有多个算力舱，请在右上角「设置」中填写完整服务地址</p>
      ${extraHtml}
    </div>
  </div>`;
}

/* ============ 页面：总览 ============ */
function renderOverview(el) {
  el.innerHTML = `
    <div class="page-head page-head-action">
      <div><h1 class="page-title">总览</h1><p class="page-desc">确认设备、服务和模型已准备好，再开始调用</p></div>
      <button class="btn" id="overviewRefresh">${AppUtil.iconSvg("refresh")}重新检查</button>
    </div>
    <section class="readiness" aria-label="AI Pod 就绪状态" aria-live="polite">
      ${statePanel("podCheck", "cpu", "默认算力舱", "正在确认设备连接状态")}
      ${statePanel("ollamaCheck", "zap", "Ollama 服务", "正在检测 API 连通性")}
      ${statePanel("modelCheck", "box", "已安装模型", "正在读取本地模型")}
    </section>
    <div class="overview-split">
      <section class="card address-card">
        <h2 class="card-title">常用连接地址</h2>
        ${AppUtil.copyRow("OpenAI", SvcInfo.openaiBase())}
        ${AppUtil.copyRow("Anthropic", PodAPI.externalBase())}
        ${AppUtil.copyRow("原生 API", SvcInfo.nativeBase())}
        <p class="hint">API Key 需要填写但不会被 Ollama 校验。详细配置见 <a href="#/docs?id=03-clients">客户端配置</a>。</p>
      </section>
      <section class="next-actions">
        <a href="#/models"><span>${AppUtil.iconSvg("box")}</span><div><strong>选择模型</strong><p>查看本地模型、运行状态与能力</p></div></a>
        <a href="#/apps"><span>${AppUtil.iconSvg("apps")}</span><div><strong>发现应用</strong><p>按场景找到适合的算力舱应用</p></div></a>
        <a href="#/verify"><span>${AppUtil.iconSvg("zap")}</span><div><strong>验证 API</strong><p>发送一条流式消息确认调用链路</p></div></a>
      </section>
    </div>
    ${PodAPI.MOCK ? `<p class="mock-notice">当前为演示模式：${AppUtil.esc(PodAPI.MOCK_SCENARIO)}</p>` : ""}`;

  const refresh = async () => {
    const btn = el.querySelector("#overviewRefresh");
    btn.disabled = true;
    ["podCheck", "ollamaCheck", "modelCheck"].forEach((id) => setReadiness(el, id, "loading", el.querySelector("#" + id + " strong").textContent, "正在检查"));
    const [pod, ollama, models] = await Promise.allSettled([PodAPI.hasDefaultPod(), PodAPI.probe(), PodAPI.listModels()]);
    if (pod.status === "fulfilled") {
      const p = pod.value;
      setReadiness(el, "podCheck", p.state, p.state === "ready" ? "默认算力舱已连接" : p.state === "unavailable" ? "尚无可用算力舱" : "无法确认算力舱", p.state === "ready" ? "设备在最近一分钟内保持活跃" : p.state === "unavailable" ? "请前往管理页绑定或唤醒设备" : "可能是登录状态、跨域限制或网络问题");
    } else setReadiness(el, "podCheck", "unknown", "无法确认算力舱", "请前往官方管理页查看设备状态");
    if (ollama.status === "fulfilled" && ollama.value.ok) setReadiness(el, "ollamaCheck", "ready", "Ollama 服务运行中", `版本 ${ollama.value.version}，响应 ${ollama.value.latencyMs} ms`);
    else setReadiness(el, "ollamaCheck", "unavailable", "Ollama 服务不可达", ollama.value?.error || "请检查服务和连接地址");
    if (models.status === "fulfilled") setReadiness(el, "modelCheck", models.value.length ? "ready" : "unavailable", models.value.length ? `已安装 ${models.value.length} 个模型` : "还没有安装模型", models.value.length ? "可以开始验证 API" : "前往应用中心安装或管理模型");
    else setReadiness(el, "modelCheck", "error", "模型列表读取失败", models.reason?.message || "请稍后重试");
    btn.disabled = false;
  };
  el.querySelector("#overviewRefresh").addEventListener("click", refresh);
  refresh();
}

function renderPod(el) {
  const manager = PodAPI.aiManagerBase();
  el.innerHTML = `<div class="page-head"><h1 class="page-title">算力舱</h1><p class="page-desc">可靠信息在这里检查，设备管理操作由官方页面完成</p></div>
    <div class="card pod-status" id="podStatus">${statePanel("podPageCheck", "cpu", "正在确认默认算力舱", "公开接口只返回可用状态，不读取设备隐私信息")}</div>
    <section class="action-grid">
      <article><span>${AppUtil.iconSvg("cpu")}</span><h2>设备与资源</h2><p>查看型号、在线状态、显存、硬盘和风扇模式。</p>${externalLink(manager + "/setting/micro-service", "打开设备管理")}</article>
      <article><span>${AppUtil.iconSvg("link")}</span><h2>端口转发</h2><p>将算力舱服务安全暴露到微服局域网。</p>${externalLink(manager + "/setting/micro-service", "管理端口转发")}</article>
      <article><span>${AppUtil.iconSvg("refresh")}</span><h2>升级更新</h2><p>查看固件和已安装 AI 应用的版本。</p>${externalLink(manager + "/setting/micro-service", "检查升级")}</article>
      <article><span>${AppUtil.iconSvg("book")}</span><h2>官方手册</h2><p>了解绑定、局域网访问、服务地址和故障排查。</p>${externalLink("https://docs-ai.mxuexxmy.heiyu.space/aipod/", "阅读算力舱手册")}</article>
    </section>
    <div class="guide info"><span class="guide-icon">${AppUtil.iconSvg("info")}</span><div class="guide-body"><p><strong>为什么不直接显示显存和硬盘？</strong></p><p>这些数据来自未公开的管理接口。门户保持只读和版本稳定，因此只提供官方入口，不保存设备信息。</p></div></div>`;
  PodAPI.hasDefaultPod().then((p) => setReadiness(el, "podPageCheck", p.state, p.state === "ready" ? "默认算力舱可用" : p.state === "unavailable" ? "尚无可用算力舱" : "无法确认设备状态", p.state === "ready" ? "设备最近一分钟内保持活跃" : p.state === "unavailable" ? "打开设备管理页添加或唤醒设备" : "请在官方管理页确认登录和设备状态"));
}

function renderApps(el, query) {
  const active = query.get("category") || "全部";
  const categories = ["全部", ...new Set(APP_CATALOG.map((a) => a.category))];
  const apps = active === "全部" ? APP_CATALOG : APP_CATALOG.filter((a) => a.category === active);
  el.innerHTML = `<div class="page-head page-head-action"><div><h1 class="page-title">应用中心</h1><p class="page-desc">按使用场景查找 AI Pod 应用，不复制易过期的下载量</p></div>${externalLink("https://appstore.lazycat.cloud/#/shop/category/27", "打开完整商店")}</div>
    <nav class="filter-tabs" aria-label="应用分类">${categories.map((c) => `<a class="${c === active ? "active" : ""}" href="#/apps?category=${encodeURIComponent(c)}">${AppUtil.esc(c)}</a>`).join("")}</nav>
    <section class="app-grid">${apps.map((app) => `<article class="app-card"><div class="app-card-top"><span>${AppUtil.iconSvg("apps")}</span><span class="badge neutral">${AppUtil.esc(app.category)}</span></div><h2>${AppUtil.esc(app.name)}</h2><p>${AppUtil.esc(app.summary)}</p><small>${AppUtil.esc(app.requirements)}</small><div class="app-actions">${externalLink(app.storeUrl, "商店详情", "btn btn-primary")}<a class="btn" href="${AppUtil.esc(app.docsUrl)}" ${/^https?:/.test(app.docsUrl) ? 'target="_blank" rel="noopener noreferrer"' : ""}>使用说明</a></div></article>`).join("")}</section>`;
}

/* ============ 页面：模型列表 ============ */
function renderModels(el) {
  el.innerHTML = `
    <div class="page-head page-head-action"><div><h1 class="page-title">模型列表</h1><p class="page-desc">搜索本地模型，查看运行状态并按需读取能力</p></div><div class="head-actions">${externalLink("https://ollama.com/search", "查找模型")}<button class="btn" id="modelsRefresh">${AppUtil.iconSvg("refresh")}刷新</button></div></div>
    <div class="model-toolbar">
      <label class="search-field">${AppUtil.iconSvg("search")}<span class="sr-only">搜索模型</span><input id="modelSearch" type="search" placeholder="搜索模型名称"></label>
      <label><span class="sr-only">模型家族</span><select id="familyFilter"><option value="">全部家族</option></select></label>
      <label><span class="sr-only">运行状态</span><select id="runningFilter"><option value="">全部状态</option><option value="running">正在运行</option><option value="idle">未运行</option></select></label>
    </div>
    <div id="modelsBody" aria-live="polite"><div class="model-skeleton">${[1,2,3].map(() => '<div class="skeleton-card"><div class="skeleton"></div><div class="skeleton"></div></div>').join("")}</div></div>`;

  let allModels = [];

  const paintModels = () => {
    const q = el.querySelector("#modelSearch").value.trim().toLowerCase();
    const family = el.querySelector("#familyFilter").value;
    const running = el.querySelector("#runningFilter").value;
    const rows = allModels.filter((m) => (!q || m.name.toLowerCase().includes(q)) && (!family || m.family === family) && (!running || (running === "running") === m.running));
    const body = el.querySelector("#modelsBody");
    if (!rows.length) {
      body.innerHTML = `<div class="empty">${AppUtil.iconSvg("box")}<strong>${allModels.length ? "没有匹配的模型" : "还没有安装模型"}</strong><p>${allModels.length ? "尝试清除搜索或筛选条件" : "可通过 Open WebUI、webollama 或 Ollama 命令行安装模型"}</p>${externalLink("https://ollama.com/search", "浏览 Ollama 模型库")}</div>`;
      return;
    }
    body.innerHTML = `<section class="model-list">${rows.map((m) => `<article class="model-row" data-model="${AppUtil.esc(m.name)}"><div class="model-main"><div class="model-title"><strong>${AppUtil.esc(m.name)}</strong>${m.running ? '<span class="badge ok">运行中</span>' : '<span class="badge neutral">已安装</span>'}</div><p>${[m.family, m.parameterSize, m.quantization, PodAPI.formatSize(m.size)].filter(Boolean).join(" / ")}</p>${m.running && m.contextLength ? `<small>上下文 ${Number(m.contextLength).toLocaleString("zh-CN")}，保留至 ${AppUtil.fmtDate(m.expiresAt)}</small>` : ""}</div><div class="model-actions"><button class="copy-btn" data-copy="${AppUtil.esc(m.name)}">复制名称</button><a class="copy-btn" href="#/verify?model=${encodeURIComponent(m.name)}">验证</a><button class="copy-btn" data-model-detail="${AppUtil.esc(m.name)}">详情</button></div><div class="model-detail" hidden></div></article>`).join("")}</section><p class="hint">显示 ${rows.length} 个，共 ${allModels.length} 个模型${PodAPI.MOCK ? "（演示数据）" : ""}</p>`;
    body.querySelectorAll("[data-model-detail]").forEach((btn) => btn.addEventListener("click", async () => {
      const box = btn.closest(".model-row").querySelector(".model-detail");
      if (!box.hidden) { box.hidden = true; btn.textContent = "详情"; return; }
      box.hidden = false; btn.disabled = true; btn.textContent = "读取中";
      try {
        const detail = await PodAPI.showModel(btn.dataset.modelDetail);
        const caps = detail.capabilities.length ? detail.capabilities : ["未声明能力"];
        box.innerHTML = `<div><strong>模型能力</strong><div class="capability-list">${caps.map((c) => `<span class="badge neutral">${AppUtil.esc(c)}</span>`).join("")}</div></div><div><strong>架构</strong><p>${AppUtil.esc(detail.modelInfo["general.architecture"] || "未提供")}</p></div>`;
        btn.textContent = "收起";
      } catch (e) { box.innerHTML = `<p class="error-text">详情读取失败：${AppUtil.esc(e.message)}</p>`; btn.textContent = "重试"; }
      finally { btn.disabled = false; }
    }));
  };

  const load = async () => {
    const body = el.querySelector("#modelsBody");
    body.innerHTML = `<div class="model-skeleton">${[1,2,3].map(() => '<div class="skeleton-card"><div class="skeleton"></div><div class="skeleton"></div></div>').join("")}</div>`;
    try {
      const [models, running] = await Promise.all([PodAPI.listModels(), PodAPI.listRunningModels().catch(() => [])]);
      const runningMap = new Map(running.map((m) => [m.name, m]));
      allModels = models.map((m) => Object.assign(m, { running: runningMap.has(m.name), expiresAt: runningMap.get(m.name)?.expiresAt || "", contextLength: runningMap.get(m.name)?.contextLength || 0, capabilities: [] }));
      const families = [...new Set(allModels.map((m) => m.family).filter(Boolean))].sort();
      el.querySelector("#familyFilter").innerHTML = '<option value="">全部家族</option>' + families.map((f) => `<option value="${AppUtil.esc(f)}">${AppUtil.esc(f)}</option>`).join("");
      paintModels();
    } catch (e) { body.innerHTML = `<div class="guide err"><span class="guide-icon">${AppUtil.iconSvg("alert")}</span><div class="guide-body"><p><strong>模型列表加载失败：</strong>${AppUtil.esc(e.message)}</p></div></div>` + offlineGuide(); }
  };

  el.querySelector("#modelsRefresh").addEventListener("click", load);
  el.querySelector("#modelSearch").addEventListener("input", paintModels);
  el.querySelector("#familyFilter").addEventListener("change", paintModels);
  el.querySelector("#runningFilter").addEventListener("change", paintModels);
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
      <h3 class="card-title">检查连通性</h3>
      <div class="verify-form-row">
        <div class="field"><label class="field-label">目标服务</label>
          <input type="text" value="${AppUtil.esc(PodAPI.externalBase())}" readonly style="opacity:.75">
        </div>
        <button class="btn btn-primary" id="probeBtn">开始检测</button>
      </div>
      <div class="verify-result" id="probeResult"></div>
    </div>
    <div class="card">
      <h3 class="card-title">发送流式对话</h3>
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

    try {
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
        onError: (err) => { out.textContent += `\n\n[错误] ${err}`; },
      });
    } catch (e) { out.textContent += `\n\n[错误] ${e.message || e}`; }
    finally {
      out.classList.remove("cursor-blink");
      sendBtn.disabled = false; stopBtn.disabled = true; aborter = null;
    }
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
    box.innerHTML = `<div class="guide err"><span class="guide-icon">${AppUtil.iconSvg("alert")}</span><div class="guide-body"><p>${AppUtil.esc(e.message)}</p></div></div>`;
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
    ["Responses（OpenAI 兼容）", "POST", base + "/v1/responses"],
    ["对话（Anthropic 兼容）", "POST", base + "/v1/messages"],
    ["对话（原生，支持流式）", "POST", base + "/api/chat"],
    ["文本补全", "POST", base + "/api/generate"],
    ["文本向量（Embedding）", "POST", base + "/api/embed"],
    ["文本向量（OpenAI 风格）", "POST", base + "/v1/embeddings"],
    ["模型详情", "POST", base + "/api/show"],
    ["运行中的模型", "GET", base + "/api/ps"],
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
    pod: { title: "算力舱", render: renderPod },
    apps: { title: "应用中心", render: renderApps },
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
    document.querySelectorAll("[data-page]").forEach((a) => {
      const active = a.dataset.page === name;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const el = document.getElementById("page");
    pages[name].render(el, query);
    el.scrollTop = 0; // 内容区独立滚动，切页回到顶部
    document.title = pages[name].title + " | AI Pod 综合门户";
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
    dialog.querySelector("button, input, select, textarea, a[href]")?.focus();
  };
  const close = () => {
    modal.hidden = true;
    if (lastFocus?.focus) lastFocus.focus();
  };
  const focusables = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')].filter((x) => !x.closest("[hidden]"));

  document.getElementById("settingsBtn").addEventListener("click", open);
  modal.querySelectorAll("[data-close-modal]").forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") {
      const list = focusables(); if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  modal.querySelectorAll('input[name="svcMode"]').forEach((r) =>
    r.addEventListener("change", () => { modal.querySelector("#customBaseField").hidden = r.value !== "custom" || !r.checked; }));

  document.getElementById("settingsSave").addEventListener("click", () => {
    const mode = modal.querySelector('input[name="svcMode"]:checked').value;
    const custom = modal.querySelector("#customBaseInput").value.trim();
    if (mode === "custom") {
      try {
        const url = new URL(custom);
        if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error();
      } catch { AppUtil.toast("请填写不含账号密码的 HTTP 或 HTTPS 完整地址"); return; }
    }
    PodAPI.saveSettings({ svcMode: mode, customBase: custom.replace(/\/+$/, "") });
    close();
    AppUtil.toast("设置已保存");
    location.reload(); // 简单可靠：重新按新设置渲染
  });
}

function initMobileSheet() {
  const mask = document.getElementById("moreSheet");
  const btn = document.getElementById("moreBtn");
  const sheet = mask.querySelector(".bottom-sheet");
  let lastFocus = null;
  const open = () => { lastFocus = document.activeElement; mask.hidden = false; btn.setAttribute("aria-expanded", "true"); sheet.querySelector("a,button")?.focus(); };
  const close = () => { mask.hidden = true; btn.setAttribute("aria-expanded", "false"); lastFocus?.focus(); };
  btn.addEventListener("click", open);
  mask.addEventListener("click", (e) => { if (e.target === mask || e.target.closest("[data-close-sheet]") || e.target.closest("a")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !mask.hidden) close(); });
}

/* ============ 启动 ============ */
(function boot() {
  Theme.init();
  initSettingsModal();
  initMobileSheet();

  document.querySelector(".topbar-brand").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.go("overview"); } });

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
