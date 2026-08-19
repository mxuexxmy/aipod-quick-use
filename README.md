# 算力舱快捷使用（AI Pod Quick Use）

懒猫微服应用：算力舱的快捷使用助手。纯前端静态应用（零构建、无后端），打开即知道自己算力舱的 API 地址、已安装模型、服务是否可用，并附带完整的 AI 使用文档。

## 功能

- **总览**：探测算力舱 Ollama 在线状态（版本 / 延迟），一键复制 OpenAI 兼容与原生 API 地址
- **模型列表**：实时读取已安装模型（名称 / 参数规模 / 量化 / 大小），可跳转验证
- **API 验证**：连通性测试 + 流式对话测试（耗时 / tokens / 吞吐统计），自动生成等效 curl 命令
- **使用文档**：快速开始、API 指南、客户端配置（ChatBox / Cherry Studio / 沉浸式翻译 / Cline）、常用应用、地址规则；文档中的地址自动替换为当前盒子真实域名，复制即可用
- **地址速查**：全部端点对照表、`{服务名}-ai.{盒子域名}` 规则、多算力舱 `f-{序列号}-` 前缀说明

## 技术要点

- 纯静态 SPA（原生 HTML/JS/CSS），`marked` + `highlight.js` 内嵌于 `content/assets/vendor/`，离线可用
- 浏览器直连算力舱 Ollama（`https://ollama-ai.<盒子域名>`，算力舱默认放行跨域 `Access-Control-Allow-Origin: *`，无需反代容器）；非默认服务名 / 多算力舱可在设置中切换为自定义地址直连
- 盒子域名由 `location.hostname` 推导，文档示例中的 `{{BOX}}` / `{{OPENAI_BASE}}` 占位符在渲染时替换
- 地址栏加 `?mock=1` 进入演示模式，无需算力舱即可体验全部功能

## 目录结构

```
├── package.yml          # LPK V2 元数据（package / version / locales）
├── lzc-manifest.yml     # 路由：静态托管 + 算力舱 Ollama 反代
├── lzc-build.yml        # 构建配置
├── icon.png             # 应用图标（512x512）
└── content/             # 静态资源（打包为应用内容）
    ├── index.html
    ├── assets/          # css / js / vendor / img
    └── docs/            # 5 篇使用文档（Markdown）
```

## 开发与打包

```bash
# 本地预览（演示模式）
cd content && python -m http.server 8765
# 浏览器打开 http://localhost:8765/?mock=1

# 打包 lpk
lzc-cli project build

# 部署到微服（开发态）
lzc-cli project deploy
```

修改文档内容只需编辑 `content/docs/*.md`，无需改动代码。
