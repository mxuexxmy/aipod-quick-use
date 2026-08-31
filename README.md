# AI Pod 综合门户

懒猫微服中的稳定只读 AI Pod 门户。项目保持纯前端静态架构（零构建、无后端），用于检查设备与 Ollama 就绪状态、查看本地模型和运行状态、发现算力舱应用、验证 API，并提供可直接复制的接入文档。

## 功能

- **总览**：并行检查默认算力舱、Ollama 和本地模型，一键复制 OpenAI、Anthropic 与原生 API 地址
- **算力舱**：使用官方公开接口预检设备，并提供设备资源、端口转发和升级管理入口
- **应用中心**：按聊天、知识、图像、视频、语音、OCR、翻译和开发场景查找 AI Pod 应用
- **模型列表**：搜索和筛选已安装模型，查看运行状态并按需读取模型能力
- **API 验证**：连通性测试 + 流式对话测试（耗时 / tokens / 吞吐统计），自动生成等效 curl 命令
- **使用文档**：快速开始、API 指南、客户端配置（ChatBox / Cherry Studio / 沉浸式翻译 / Cline）、常用应用、地址规则；文档中的地址自动替换为当前盒子真实域名，复制即可用
- **地址速查**：OpenAI、Anthropic 与 Ollama 原生端点，以及多算力舱地址规则

## 技术要点

- 纯静态 SPA（原生 HTML/JS/CSS），`marked` + `highlight.js` 内嵌于 `content/assets/vendor/`，离线可用
- 浏览器直连算力舱 Ollama（`https://ollama-ai.<盒子域名>`，算力舱默认放行跨域 `Access-Control-Allow-Origin: *`，无需反代容器）；非默认服务名 / 多算力舱可在设置中切换为自定义地址直连
- 盒子域名由 `location.hostname` 推导，文档示例中的 `{{BOX}}` / `{{OPENAI_BASE}}` 占位符在渲染时替换
- 地址栏加 `?mock=1` 进入演示模式；还支持 `mock=empty`、`mock=offline`、`mock=pod-none` 和 `mock=pod-unknown` 验证异常状态

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
