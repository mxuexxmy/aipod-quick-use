/* ============ 算力舱 API 封装 ============
 * 服务连接：
 *  - default 模式：直连算力舱官方 Ollama 地址 ollama-ai.<盒子域名>（算力舱默认放行跨域）
 *  - custom 模式：直连用户填写的完整服务地址（多算力舱 / 非默认服务名）
 * mock 模式：URL 带 ?mock=1 时拦截全部请求，返回演示数据
 */
"use strict";

const PodAPI = (() => {
  const SETTINGS_KEY = "aipod.settings.v1";

  const MOCK = new URLSearchParams(location.search).has("mock");

  // ---------- 设置 ----------
  function loadSettings() {
    let s;
    try {
      s = Object.assign({ svcMode: "default", customBase: "" }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
    } catch { s = { svcMode: "default", customBase: "" }; }
    if (s.svcMode === "proxy") s.svcMode = "default"; // 兼容旧版取值
    return s;
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  function settings() { return loadSettings(); }

  // 请求基础路径（绝对地址，不带末尾斜杠）
  function reqBase() {
    return externalBase();
  }

  // 展示给用户的完整服务地址（用于生成 curl / 文档示例）
  function externalBase() {
    const s = loadSettings();
    if (s.svcMode === "custom" && s.customBase) return s.customBase.replace(/\/+$/, "");
    return "https://ollama-ai." + getBoxDomain();
  }

  // ---------- 盒子域名 ----------
  function getBoxDomain() {
    const h = location.hostname;
    const parts = h.split(".");
    if (parts.length <= 2) return h; // localhost / 内网 IP 等本地开发场景
    return parts.slice(1).join(".");
  }

  // ---------- mock 数据 ----------
  const MOCK_MODELS = {
    models: [
      { name: "qwen3:4b", modified_at: "2026-08-10T08:30:00Z", size: 2573259904, digest: "mock1",
        details: { parameter_size: "4B", quantization_level: "Q4_K_M", family: "qwen3" } },
      { name: "deepseek-r1:8b", modified_at: "2026-08-02T14:00:00Z", size: 4934825984, digest: "mock2",
        details: { parameter_size: "8.0B", quantization_level: "Q4_K_M", family: "qwen3" } },
      { name: "llama3.2:3b-instruct-q4_K_M", modified_at: "2026-07-21T02:10:00Z", size: 2019393189, digest: "mock3",
        details: { parameter_size: "3.2B", quantization_level: "Q4_K_M", family: "llama" } },
      { name: "nomic-embed-text", modified_at: "2026-06-30T09:00:00Z", size: 274302450, digest: "mock4",
        details: { parameter_size: "137M", quantization_level: "F16", family: "nomic-bert" } },
    ],
  };
  const MOCK_REPLY = [
    "你好！我是运行在算力舱上的演示模型。", "\n\n",
    "当前处于 **演示模式**（?mock=1），所有数据均为模拟数据，用于展示界面功能。", "\n\n",
    "部署到微服并连接真实算力舱后，这里会显示模型的真实流式回复，",
    "并在下方展示耗时与吞吐（tokens/s）统计。",
  ];

  function mockStream({ onDelta, onDone, signal }) {
    let i = 0, cancelled = false;
    if (signal) signal.addEventListener("abort", () => { cancelled = true; }, { once: true });
    const start = performance.now();
    (function tick() {
      if (cancelled) return;
      if (i >= MOCK_REPLY.length) {
        onDone({ eval_count: 128, total_duration: (performance.now() - start) * 1e6, eval_duration: 2.4e9, cancelled: false });
        return;
      }
      onDelta(MOCK_REPLY[i++]);
      setTimeout(tick, 90 + Math.random() * 130);
    })();
  }

  // ---------- 探测服务 ----------
  async function probe() {
    if (MOCK) {
      await sleep(400);
      return { ok: true, latencyMs: 23, version: "0.6.9（演示）", mode: "mock" };
    }
    const start = performance.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(reqBase() + "/api/version", { signal: ctrl.signal, headers: { Accept: "application/json" } });
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) return { ok: false, latencyMs, error: "HTTP " + res.status };
      const data = await res.json().catch(() => ({}));
      return { ok: true, latencyMs, version: data.version || "未知版本" };
    } catch (e) {
      return { ok: false, latencyMs: Math.round(performance.now() - start), error: friendlyError(e) };
    }
  }

  // ---------- 模型列表 ----------
  async function listModels() {
    if (MOCK) { await sleep(500); return normalizeTags(MOCK_MODELS); }
    const res = await fetch(reqBase() + "/api/tags", { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return normalizeTags(await res.json());
  }

  function normalizeTags(data) {
    return (data.models || []).map((m) => ({
      name: m.name,
      size: m.size || 0,
      modifiedAt: m.modified_at || "",
      family: m.details?.family || "",
      parameterSize: m.details?.parameter_size || guessParam(m.name),
      quantization: m.details?.quantization_level || guessQuant(m.name),
    }));
  }
  function guessParam(name) { const m = name.match(/(\d+(?:\.\d+)?[bmx])/i); return m ? m[1].toUpperCase() : ""; }
  function guessQuant(name) { const m = name.match(/(q\d[_a-z0-9]*)/i); return m ? m[1].toUpperCase() : ""; }

  // ---------- 流式对话（原生 /api/chat） ----------
  async function chatStream({ model, messages, onDelta, onDone, onError, signal }) {
    if (MOCK) return mockStream({ onDelta, onDone, signal });
    try {
      const res = await fetch(reqBase() + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
        signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error("HTTP " + res.status + (text ? "：" + truncate(text, 200) : "") + explainSuffix(text));
      }
      await readNdjson(res, (obj) => {
        if (obj.error) { onError?.(obj.error); return; }
        if (obj.message?.content) onDelta(obj.message.content);
        if (obj.done) onDone(obj);
      });
    } catch (e) {
      if (e.name === "AbortError") { onDone?.({ cancelled: true }); return; }
      onError?.(friendlyError(e));
    }
  }

  async function readNdjson(res, onLine) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        const s = line.trim();
        if (s) { try { onLine(JSON.parse(s)); } catch { /* 忽略残行 */ } }
      }
    }
    const s = buf.trim();
    if (s) { try { onLine(JSON.parse(s)); } catch { /* 忽略 */ } }
  }

  // ---------- 工具 ----------
  // 常见 Ollama 服务端错误的排查建议
  function explainSuffix(raw) {
    const s = String(raw || "");
    if (/illegal instruction/i.test(s))
      return "\n\n💡 该模型加载时崩溃（illegal instruction），通常与 Ollama 运行时版本或算力舱指令集不兼容。建议：重启算力舱的 Ollama 应用后，换其他模型测试；若反复出现，等待/更新 Ollama 应用版本。";
    if (/model .*not found|not found, try pulling/i.test(s))
      return "\n\n💡 模型不存在：请到「模型列表」核对模型名（需与列表完全一致，含冒号后的版本号）。";
    if (/out of memory|OOM|cuda|gpu/i.test(s))
      return "\n\n💡 显存不足或 GPU 异常：请关闭占用算力舱显存的其他应用，或换参数更小的模型。";
    return "";
  }

  function friendlyError(e) {
    const msg = String(e?.message || e);
    if (e?.name === "AbortError") return "请求超时";
    if (/Failed to fetch|NetworkError|load failed/i.test(msg)) {
      return "网络请求失败：服务可能未启动，或自定义地址不可达 / 未允许跨域（OLLAMA_ORIGINS）";
    }
    return truncate(msg, 300);
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n) + "…" : s; }
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function formatSize(bytes) {
    if (!bytes) return "-";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0, v = bytes;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return v.toFixed(v >= 100 || i === 0 ? 0 : 1) + " " + units[i];
  }

  return { MOCK, settings, saveSettings, reqBase, externalBase, getBoxDomain, probe, listModels, chatStream, formatSize };
})();
