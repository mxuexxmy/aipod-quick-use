# 算力舱常用应用

应用商店的“AI 算力舱”分类持续更新。门户只提供场景导航，不复制下载量或版本号，以免显示过期信息。

## 模型运行与聊天

### Ollama

Ollama 是门户默认使用的模型运行时，提供原生 API、OpenAI 兼容 API 和 Anthropic Messages 兼容 API。

### Open WebUI

适合希望直接聊天、切换模型或通过网页安装和删除 Ollama 模型的用户。

### webollama

轻量的 Ollama 网页管理工具，可查看模型并发起文本生成。部分版本下载模型时不会显示完整进度。

## 知识与检索

“知识库”应用适合文档问答、语义检索和 RAG。通常需要：

- 一个对话模型。
- 一个嵌入模型，例如 `qwen3-embedding`。
- 需要排序优化时，再配置重排模型。

## 图像与视频

- 文生图：适合直接通过提示词生成图片。
- ComfyUI：适合需要节点工作流和精细控制的用户，占用显存通常更高。
- 文生视频：使用独立视频模型生成内容，运行前应预留足够显存和磁盘空间。
- Stable Diffusion WebUI：传统 Stable Diffusion 网页工作台。

## 语音、OCR 与翻译

- IndexTTS、Kokoro、Qwen3TTS：文本转语音和声音克隆。
- FunASR、Whisper ASR：把音频转换为文字。
- DeepSeek OCR、PaddleOCR VL：识别图片和文档内容。
- 懒猫翻译、AI 翻译、PDF 翻译：调用本地模型完成翻译。

## 安装前检查

1. 在门户总览确认默认算力舱和 Ollama 状态。
2. 阅读商店详情中的机型、固件和模型要求。
3. 在 AI Pod 管理页查看可用显存和硬盘。
4. 避免同时启动多个高显存应用。

打开 [AI 算力舱应用商店](https://appstore.lazycat.cloud/#/shop/category/27) 查看最新应用。
