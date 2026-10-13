# AI Pod 综合门户 1.3.0 验证记录

日期：2026-10-13（Asia/Shanghai）。包标识：xyz.mxue.ai.pod.aipod-quick-use。

## 设计

依据用户指定的 anthropics/frontend-design skill。色彩：雾蓝 #edf3f6、纸白 #ffffff、深海蓝 #15394c、正文蓝 #183244、连接青 #096c83、状态绿 #13725e。正文采用本机 Noto Sans CJK SC / 思源黑体回退，代码保留等宽字体，不加载在线字体。布局左对齐：导航 → 页面任务 → 连接路径 → 就绪状态 → 地址和下一步。通过统一状态带与列表减少重复容器；重点表达设备、模型和应用之间的连接关系。

## 规范

目标 lzcos 1.6.2（用户确认），CLI 实测 2.0.9。在线获取官方 Gitee raw 的 package、manifest、build、deploy-params、lpk-format、store-submission 六篇原文；实际来源和 SHA-256 见 specs/lzc-spec-20261013-221615-if3u5opc/calibration.json。

差异：本地技能旧示例使用 project build，当前 CLI 命令已改为 project release；使用当前 CLI。官方 manifest 文档允许 locales.usage，已补充中英文使用须知。静态容器无需 net.internet；浏览器直连 API，不申请容器网络权限。最低系统版本设为本次验证目标 1.6.2。

## 验证

- CLI manifest lint 无警告；JS 语法检查、git diff --check 通过。
- 浏览器检查 7 个页面、4 种异常场景、390/768/1024 像素布局。
- 模型搜索、详情、流式完成/停止/切页终止、curl 引号与换行、设置非法地址、移动端焦点、深色主题通过；无浏览器脚本错误。
- 真机：NVIDIA Jetson AGX Orin，管理界面显示 61 GB；Thor 离线，未验证 Thor。
- 微服部署从 1.2.0 升级到 1.3.0，容器健康、Status_Running。
- 已登录 Chrome 中经平台使用须知进入应用，无额外应用账号登录；首页确认默认算力舱在线，Ollama 0.34.0，27 个模型。
- 实际浏览器调用 qwen3:0.6b，流式回复“连接成功。”，done 正常，8 tokens；原生 HTTP 流式调用也成功。
- 设置只保存到当前浏览器 localStorage；本次没有修改实例模式或数据路径。

## 未验证项

没有执行全新卸载重装；尚未实测多算力舱自定义地址、离线 Thor、所有目录内第三方应用及全部兼容 API 协议。浏览器基础请求、模型读取及原生聊天已实测。

## 截图

screenshots/live-overview.png 和 live-verify.png 来自实际部署；其余截图带演示数据，用于响应式和页面视觉验收。

## 发布包

产物：aipod-quick-use-1.3.0.lpk。SHA-256：`4a7fb03b3e161771f1712c5f3e65e191a8be78e320f600ddb8cb1027e3c71ce9`。和最终部署包的 SHA-256 一致。

商店资料：开发者中心应用 ID 6807，中文和英语名称/简介/功能介绍/更新日志；每种语言各有两张 1920×1080 桌面截图和三张 390×844 手机截图，均来自真实部署。

## 商店提交结果

2026-10-13 22:31（Asia/Shanghai）通过开发者中心提交成功。审核单号 **20475**，版本 **1.3.0**，审核类型“更新应用信息及版本”，状态 **等待审核**。

审核记录：https://developer.lazycat.cloud/manage/#/apps/6807/reviews 。正式上架需平台审核通过；本次未声明审核已通过。提交凭证：screenshots/store-submitted.jpg。
