# 客户端配置

把算力舱接入你常用的 AI 客户端。绝大多数客户端走 OpenAI 兼容接口，核心就三样东西：

| 要填什么 | 填什么值 |
| ---- | ---- |
| API 类型 | **OpenAI 兼容**（或自定义 OpenAI） |
| API 地址（Base URL） | `{{OPENAI_BASE}}` |
| API Key | 随意填，如 `sk-ollama` |

Claude Code 和 Anthropic SDK 则走 Anthropic 兼容接口（基础地址 `{{OLLAMA_URL}}`），见下文专属章节。

模型名填你在[模型列表](#/models)里看到的名称（如 `qwen3:4b`）。

> 以下地址均已自动替换为你的真实域名，直接复制即可。

## ChatBox（全平台聊天客户端）

1. 依次进入“设置”“模型”“添加自定义提供方”
2. API 域名填：`{{OPENAI_BASE}}`
3. API Key 填：`sk-ollama`（任意）
4. 模型：手动添加 `qwen3:4b`（填你已安装的模型名）

## Cherry Studio（桌面多模型客户端）

1. 依次进入“设置”“模型服务”“添加”，或选择 OpenAI 兼容提供商
2. API 地址：`{{OPENAI_BASE}}`
3. API Key：`sk-ollama`
4. 在模型管理中添加模型 `qwen3:4b`，即可开始对话

## 沉浸式翻译（浏览器翻译插件）

适合用小模型（如 `qwen3:4b`），翻译速度体验最好。

1. 依次进入“设置”“翻译服务”，添加 **OpenAI** 自定义服务
2. 接口地址：`{{OPENAI_BASE}}/chat/completions`
3. API Key：`sk-ollama`
4. 模型：`qwen3:4b`

## Cline / Roo Code（VS Code AI 编程）

1. 设置面板选择 API Provider 为 **OpenAI Compatible**
2. Base URL：`{{OPENAI_BASE}}`
3. API Key：`sk-ollama`
4. Model ID：`deepseek-r1:8b`（编程建议 7B 以上模型）

> 编程类任务建议先用 [API 验证](#/verify)页确认模型回复质量，小模型生成长代码可能不稳定。

## Claude Code（Anthropic 官方 CLI）

Ollama 提供 Anthropic 兼容的 `/v1/messages` 接口，Claude Code 可以直接把算力舱当作后端，无需任何中转。

**方式 A：环境变量（临时）**

```bash
export ANTHROPIC_BASE_URL={{OLLAMA_URL}}
export ANTHROPIC_API_KEY=sk-ollama
export ANTHROPIC_MODEL=qwen3:30b-a3b
claude
```

**方式 B：写入配置文件（长期）**

编辑 `~/.claude/settings.json`：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "{{OLLAMA_URL}}",
    "ANTHROPIC_API_KEY": "sk-ollama",
    "ANTHROPIC_MODEL": "qwen3:30b-a3b"
  }
}
```

**要点**：

- 模型名填算力舱上**实际安装**的 Ollama 模型名（在[模型列表](#/models)中查看，如 `qwen3:30b-a3b`、`deepseek-r1:32b`），Claude Code 会原样传给 Ollama
- 编程任务建议选 14B 以上或 MoE 架构的模型（如 `qwen3:30b-a3b`，速度快质量高）
- 会话中可用 `/model qwen3:32b` 随时切换模型
- Windows PowerShell 用 `$env:ANTHROPIC_BASE_URL="..."` 设置环境变量

## Continue（VS Code / JetBrains）

编辑 `~/.continue/config.yaml`：

```yaml
models:
  - name: 算力舱
    provider: openai
    model: qwen3:4b
    apiBase: {{OPENAI_BASE}}
    apiKey: sk-ollama
    roles:
      - chat
      - edit
```

## LobeChat / NextChat 等网页客户端

若你把这类客户端也部署在微服上，在它们的模型设置中：

- 接口地址 / 代理地址：`{{OPENAI_BASE}}`
- API Key：`sk-ollama`
- 模型：手动填入 `qwen3:4b`

## 常见问题

**手机在外网（4G/5G）能用吗？**

`heiyu.space` 域名支持外网访问，但需要微服开启远程访问。若只在家庭内网使用，手机需连接家庭 Wi-Fi。

**提示 401 / 需要鉴权？**

浏览器类客户端（网页版）直连算力舱 API 时会受微服登录态影响，建议优先在客户端内配置、由客户端发起请求；或使用同一浏览器先登录微服。

**响应很慢？**

- 首次提问需要加载模型到显存，等待十几秒属正常现象
- 换更小的参数模型（1.7B / 4B）可显著提速
- 检查是否有其他应用正占用算力舱显存

**模型列表里没有我装的模型？**

部分客户端不会自动拉取模型列表，手动输入模型名即可（必须与[模型列表](#/models)中的名称完全一致，含冒号后的版本号）。
