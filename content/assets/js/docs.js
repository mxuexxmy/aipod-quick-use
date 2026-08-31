/* ============ 文档中心渲染 ============
 * 加载本地 Markdown，替换地址占位符，完成安全渲染、代码高亮和复制操作。
 */
"use strict";

const DocsCenter = (() => {
  const DOC_LIST = [
    { id: "01-quick-start", title: "快速开始" },
    { id: "02-api-guide", title: "API 使用指南" },
    { id: "03-clients", title: "客户端配置" },
    { id: "04-apps", title: "算力舱常用应用" },
    { id: "05-endpoints", title: "地址与多算力舱" },
    { id: "06-pod-management", title: "设备与端口转发" },
  ];

  // 将文档中的占位符替换为当前环境真实地址，实现"复制即可用"
  function replacePlaceholders(md) {
    const base = PodAPI.externalBase();
    return md
      .replace(/\{\{OLLAMA_URL\}\}/g, base)
      .replace(/\{\{OPENAI_BASE\}\}/g, base + "/v1")
      .replace(/\{\{BOX\}\}/g, PodAPI.getBoxDomain());
  }

  function renderMarkdown(md) {
    let html;
    if (window.marked) {
      marked.setOptions({ mangle: false, headerIds: false });
      html = marked.parse(md);
    } else {
      html = "<p><strong>文档渲染库加载失败</strong>，请检查 assets/vendor/marked.min.js 是否存在。</p>";
    }
    const div = document.createElement("div");
    div.className = "markdown";
    div.innerHTML = window.DOMPurify ? DOMPurify.sanitize(html) : html;
    decorate(div);
    return div;
  }

  // 代码块：包一层头部栏（语言名 + 复制按钮），并执行高亮
  function decorate(root) {
    root.querySelectorAll("pre > code").forEach((code) => {
      const pre = code.parentElement;
      const langMatch = [...code.classList.values()].find((c) => c.startsWith("language-"));
      const lang = langMatch ? langMatch.replace("language-", "") : "text";

      if (window.hljs) {
        try { hljs.highlightElement(code); } catch { /* 保持原文 */ }
      }

      const wrap = document.createElement("div");
      wrap.className = "codeblock";
      const head = document.createElement("div");
      head.className = "codeblock-head";
      head.innerHTML = '<span class="code-lang">' + lang + "</span>";
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "复制";
      btn.addEventListener("click", () => {
        AppUtil.copyText(code.textContent, btn);
      });
      head.appendChild(btn);
      pre.replaceWith(wrap);
      wrap.appendChild(head);
      wrap.appendChild(pre);
    });
  }

  async function loadDoc(id) {
    const res = await fetch("docs/" + id + ".md");
    if (!res.ok) throw new Error("文档加载失败：" + res.status);
    return await res.text();
  }

  return { DOC_LIST, replacePlaceholders, renderMarkdown, loadDoc };
})();
