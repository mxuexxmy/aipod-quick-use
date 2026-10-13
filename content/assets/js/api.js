/* ============ 算力舱 API 封装 ============
 * 服务连接：
 *  - default 模式：直连算力舱官方 Ollama 地址 ollama-ai.<盒子域名>（算力舱默认放行跨域）
 *  - custom 模式：直连用户填写的完整服务地址（多算力舱 / 非默认服务名）
 * mock 模式：URL 带 ?mock=1 时拦截全部请求，返回演示数据
 */
"use strict";

const PodAPI = (() => {
  const SETTINGS_KEY = "aipod.settings.v1";

  const QUERY = new URLSearchParams(location.search);
  const MOCK = QUERY.has("mock");
  const MOCK_SCENARIO = !QUERY.get("mock") || QUERY.get("mock") === "1" ? "ready" : QUERY.get("mock");

  // ---------- 设置 ----------
  function loadSettings() {
    let s;
    try {
      s = Object.assign({ svcMode: "default", customBase: "" }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
    } catch { s = { svcMode: "default", customBase: "" }; }
    if (!["default", "custom"].includes(s.svcMode)) s.svcMode = "default"; // 兼容旧版取值
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
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)$/i.test(h) || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return h;
    const parts = h.split(".");
    if (parts.length <= 2) return h;
    return parts.slice(1).join(".");
  }

  function aiManagerBase() { return "https://ai." + getBoxDomain(); }

  async function hasDefaultPod() {
    if (MOCK) {
      await sleep(260);
      if (MOCK_SCENARIO === "pod-none") return { state: "unavailable", status: 503 };
      if (MOCK_SCENARIO === "pod-unknown") return { state: "unknown", error: "演示：无法确认设备状态" };
      return { state: "ready", status: 200 };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(aiManagerBase() + "/backend/device/hasDefault", {
        method: "GET", credentials: "include", signal: ctrl.signal,
      });
      if (res.status === 200) return { state: "ready", status: 200 };
      if (res.status === 503) return { state: "unavailable", status: 503 };
      return { state: "unknown", status: res.status, error: "HTTP " + res.status };
    } catch (e) {
      return { state: "unknown", error: friendlyError(e) };
    } finally { clearTimeout(timer); }
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
    return new Promise((resolve) => {
      let i = 0, timer;
      const start = performance.now();
      const finish = (cancelled) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        onDone({ eval_count: cancelled ? undefined : 128, total_duration: (performance.now() - start) * 1e6, eval_duration: 2.4e9, cancelled });
        resolve();
      };
      const abort = () => finish(true);
      if (signal?.aborted) { finish(true); return; }
      signal?.addEventListener("abort", abort, { once: true });
      const tick = () => {
        if (i >= MOCK_REPLY.length) { finish(false); return; }
        onDelta(MOCK_REPLY[i++]);
        timer = setTimeout(tick, 160);
      };
      tick();
    });
  }

  async function request(path, options = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(reqBase() + path, { ...options, signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) { throw new Error(friendlyError(e)); }
    finally { clearTimeout(timer); }
  }

  // ---------- 探测服务 ----------
  async function probe() {
    if (MOCK) {
      await sleep(400);
      if (MOCK_SCENARIO === "offline") return { ok: false, latencyMs: 23, error: "演示：Ollama 服务不可达" };
      return { ok: true, latencyMs: 23, version: "0.6.9（演示）", mode: "mock" };
    }
    const start = performance.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(reqBase() + "/api/version", { signal: ctrl.signal, headers: { Accept: "application/json" } });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) return { ok: false, latencyMs, error: "HTTP " + res.status };
      const data = await res.json().catch(() => ({}));
      return { ok: true, latencyMs, version: data.version || "未知版本" };
    } catch (e) {
      return { ok: false, latencyMs: Math.round(performance.now() - start), error: friendlyError(e) };
    } finally { clearTimeout(timer); }
  }

  // ---------- 模型列表 ----------
  async function listModels() {
    if (MOCK) {
      await sleep(500);
      if (MOCK_SCENARIO === "offline") throw new Error("演示：Ollama 服务不可达");
      return MOCK_SCENARIO === "empty" ? [] : normalizeTags(MOCK_MODELS);
    }
    return normalizeTags(await request("/api/tags"));
  }

  async function listRunningModels() {
    if (MOCK) {
      await sleep(240);
      if (MOCK_SCENARIO === "empty" || MOCK_SCENARIO === "offline") return [];
      return [{ name: "qwen3:4b", size: 2573259904, expiresAt: new Date(Date.now() + 240000).toISOString(), contextLength: 8192 }];
    }
    return (await request("/api/ps")).models?.map((m) => ({
      name: m.name || m.model || "", size: m.size || m.size_vram || 0,
      expiresAt: m.expires_at || "", contextLength: m.context_length || 0,
    })) || [];
  }

  async function showModel(name) {
    if (MOCK) {
      await sleep(320);
      return { modelInfo: { "general.architecture": name.includes("nomic") ? "bert" : "qwen3", "general.parameter_count": 4000000000 }, capabilities: name.includes("nomic") ? ["embedding"] : ["completion", "tools", "thinking"], template: "" };
    }
    const data = await request("/api/show", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: name }),
    });
    return { modelInfo: data.model_info || {}, capabilities: data.capabilities || [], template: data.template || "" };
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
      let completed = false;
      await readNdjson(res, (obj) => {
        if (obj.error) throw new Error(obj.error);
        if (obj.message?.content) onDelta(obj.message.content);
        if (obj.done) { completed = true; onDone(obj); }
      });
      if (!completed) throw new Error("响应提前结束，请重新测试");
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
        if (s) onLine(JSON.parse(s));
      }
    }
    const s = buf.trim();
    if (s) onLine(JSON.parse(s));
  }

  // ---------- 工具 ----------
  // 常见 Ollama 服务端错误的排查建议
  function explainSuffix(raw) {
    const s = String(raw || "");
    if (/illegal instruction/i.test(s))
      return "\n\n建议：该模型加载时崩溃，通常与 Ollama 运行时版本或算力舱指令集不兼容。请重启 Ollama 后换其他模型测试。";
    if (/model .*not found|not found, try pulling/i.test(s))
      return "\n\n建议：请到「模型列表」核对完整模型名，包括冒号后的版本号。";
    if (/out of memory|OOM|cuda|gpu/i.test(s))
      return "\n\n建议：请关闭占用显存的其他应用，或换用参数更小的模型。";
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

  return { MOCK, MOCK_SCENARIO, settings, saveSettings, reqBase, externalBase, getBoxDomain, aiManagerBase, hasDefaultPod, probe, listModels, listRunningModels, showModel, chatStream, formatSize };
})();
