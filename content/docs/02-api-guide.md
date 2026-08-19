# API 使用指南

算力舱上的 Ollama 同时提供**原生 API**、**OpenAI 兼容 API** 和 **Anthropic 兼容 API** 三套接口。

> 本文所有地址均已替换为你当前微服的真实地址，可直接复制运行。

## 基础地址

| 接口风格 | 基础地址 | 说明 |
| ---- | ---- | ---- |
| OpenAI 兼容 | `{{OPENAI_BASE}}` | 可直接配合 OpenAI SDK / 各类客户端 |
| Anthropic 兼容 | `{{OLLAMA_URL}}` | 配合 Claude Code、Anthropic SDK（`/v1/messages`） |
| Ollama 原生 | `{{OLLAMA_URL}}/api` | 功能最全（拉模型、显存管理等） |

**鉴权**：通过微服网关访问时跟随你的微服登录态；API Key 任意填写即可（如 `sk-ollama`）。

## OpenAI 兼容接口

### Python（openai SDK）

```python
from openai import OpenAI

client = OpenAI(base_url="{{OPENAI_BASE}}", api_key="sk-ollama")

resp = client.chat.completions.create(
    model="qwen3:4b",
    messages=[{"role": "user", "content": "用一句话介绍懒猫微服"}],
)
print(resp.choices[0].message.content)
```

### Python · 流式输出

```python
stream = client.chat.completions.create(
    model="qwen3:4b",
    messages=[{"role": "user", "content": "写一首短诗"}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
```

### curl

```bash
curl {{OPENAI_BASE}}/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3:4b",
    "messages": [{ "role": "user", "content": "你好" }]
  }'
```

### JavaScript / Node.js

```javascript
const resp = await fetch("{{OPENAI_BASE}}/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "qwen3:4b",
    messages: [{ role: "user", content: "你好" }],
  }),
});
const data = await resp.json();
console.log(data.choices[0].message.content);
```

## Anthropic 兼容接口（`/v1/messages`）

与 Anthropic Messages API 格式一致，Claude Code、Anthropic SDK 可以直接对接。

### curl

```bash
curl {{OLLAMA_URL}}/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: sk-ollama" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "qwen3:4b",
    "max_tokens": 512,
    "messages": [{ "role": "user", "content": "你好" }]
  }'
```

### Python（anthropic SDK）

```python
from anthropic import Anthropic

client = Anthropic(base_url="{{OLLAMA_URL}}", api_key="sk-ollama")

msg = client.messages.create(
    model="qwen3:4b",
    max_tokens=512,
    messages=[{"role": "user", "content": "用一句话介绍算力舱"}],
)
print(msg.content[0].text)
```

> 思考型模型（deepseek-r1、qwen3 等）可能返回 `thinking` 内容块，遍历 `msg.content` 时注意区分类型。

## 原生 API（Ollama）

### 对话 · `/api/chat`

支持流式（NDJSON），消息体格式与 OpenAI 类似：

```bash
curl {{OLLAMA_URL}}/api/chat -d '{
  "model": "qwen3:4b",
  "messages": [{ "role": "user", "content": "你好" }],
  "stream": false
}'
```

`"stream": true` 时，每行返回一个 JSON 片段，`done: true` 的最后一帧携带耗时与 token 统计：

```json
{"message":{"role":"assistant","content":"你"},"done":false}
{"message":{"role":"assistant","content":"好"},"done":false}
{"done":true,"eval_count":42,"eval_duration":1200000000}
```

吞吐速率 = `eval_count / (eval_duration / 1e9)` tokens/s。

### 单轮生成 · `/api/generate`

```bash
curl {{OLLAMA_URL}}/api/generate -d '{
  "model": "qwen3:4b",
  "prompt": "用一句话介绍算力舱",
  "stream": false
}'
```

### 模型管理

```bash
# 查看已安装的模型
curl {{OLLAMA_URL}}/api/tags

# 下载模型（耗时较长，建议放开头再执行）
curl {{OLLAMA_URL}}/api/pull -d '{ "name": "qwen3:4b" }'

# 删除模型，释放磁盘
curl {{OLLAMA_URL}}/api/delete -X DELETE -d '{ "name": "qwen3:4b" }'
```

### 文本向量 · `/api/embed`

供知识库（RAG）、语义搜索类应用使用：

```bash
curl {{OLLAMA_URL}}/api/embed -d '{
  "model": "nomic-embed-text",
  "input": "懒猫微服算力舱"
}'
```

## 常用参数

| 参数 | 位置 | 作用 |
| ---- | ---- | ---- |
| `temperature` | 请求体 | 0～1，越低越稳定，越高越发散 |
| `stream` | 请求体 | 是否流式返回 |
| `options.num_ctx` | 请求体 | 上下文窗口大小，处理长文时按需调大（更吃显存） |
| `options.num_predict` | 请求体 | 最多生成的 token 数 |

```bash
curl {{OLLAMA_URL}}/api/chat -d '{
  "model": "qwen3:4b",
  "messages": [{ "role": "user", "content": "长文总结……" }],
  "stream": false,
  "options": { "temperature": 0.3, "num_ctx": 8192 }
}'
```

## 提示

- 文中 `qwen3:4b` 请替换为你在[模型列表](#/models)中实际安装的模型名
- 算力舱 Ollama 默认放行跨域，浏览器页面也可以直接请求这些地址；本应用的[验证页](#/verify)正是这样工作的
