# TraeAPI

[English](README.md) | [简体中文](README.zh-CN.md)

TraeAPI 是一个面向 Trae 桌面端的本地 HTTP 桥接服务。

它通过 Chrome DevTools Protocol 附着到 Trae 的 Electron 渲染进程，使用 DOM selector 驱动界面，并对外暴露一套稳定的本地接口，供其他工具调用。

这个项目的定位是本地接口服务，不是 Trae 官方提供的 API。

## 你能得到什么

- 本地 HTTP API，支持会话、消息发送和流式回复
- 内置浏览器聊天页 `/chat`
- 健康检查和就绪检查
- 可选的 token 鉴权和来源限制
- 用于应对 Trae UI 变更的 selector 诊断能力

## 运行要求

- Node.js `>= 22`
- 一个支持 `--remote-debugging-port=<port>` 的 Trae 版本
- 一个已经打开项目的 Trae 窗口
- 与当前 Trae UI 匹配的 DOM selector

## 快速开始

1. 安装依赖：

```bash
npm install
```

2. 以 [.env.example](.env.example) 为参考，在你的 shell 中设置环境变量：

```bash
set TRAE_BIN=C:\Path\To\Trae.exe
set TRAE_COMPOSER_SELECTORS=textarea,[contenteditable='true']
set TRAE_SEND_BUTTON_SELECTORS=button[data-testid='send'],button[type='submit']
set TRAE_RESPONSE_SELECTORS=[data-message-author-role='assistant'],.assistant
```

至少需要设置：

- `TRAE_BIN`
- `TRAE_COMPOSER_SELECTORS`
- `TRAE_SEND_BUTTON_SELECTORS`
- `TRAE_RESPONSE_SELECTORS`

当前脚本不会自动加载 `.env` 文件。
如果你习惯用 `.env`，请在启动命令前通过 shell、进程管理器或包装脚本先加载它。

3. 启动带远程调试端口的 Trae：

```bash
npm run start:trae
```

4. 启动本地网关：

```bash
npm run start:gateway
```

5. 检查是否就绪：

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
```

6. 直接调用 API，或者打开内置本地页面：

```bash
start http://127.0.0.1:8787/chat
```

## 对外公开的 API

当前稳定提供的本地接口：

- `GET /health`
- `GET /ready`
- `POST /v1/sessions`
- `GET /v1/sessions/{sessionId}`
- `POST /v1/sessions/{sessionId}/messages`
- `POST /v1/sessions/{sessionId}/messages/stream`

完整请求和响应格式见 [docs/api.md](docs/api.md)。

## 最小调用示例

创建会话：

```bash
curl -X POST http://127.0.0.1:8787/v1/sessions ^
  -H "content-type: application/json" ^
  -d "{\"metadata\":{\"client\":\"demo\"}}"
```

发送普通消息：

```bash
curl -X POST http://127.0.0.1:8787/v1/sessions/<sessionId>/messages ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"Summarize this project in one paragraph.\"}"
```

发送流式消息：

```bash
curl -N -X POST http://127.0.0.1:8787/v1/sessions/<sessionId>/messages/stream ^
  -H "accept: text/event-stream" ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"Explain what you are doing step by step.\"}"
```

## 示例客户端

- Python: [examples/python/client.py](examples/python/client.py)
- Node.js: [examples/node/client.mjs](examples/node/client.mjs)

两个示例都支持：

- `TRAE_API_BASE_URL`
- `TRAE_API_TOKEN`
- `TRAE_API_PROMPT`
- `TRAE_API_STREAM`

## 配置项

完整配置见 [.env.example](.env.example)。

最重要的几项：

- `TRAE_BIN`: Trae 可执行文件路径
- `TRAE_REMOTE_DEBUGGING_PORT`: 远程调试端口，默认 `9222`
- `TRAE_COMPOSER_SELECTORS`: 输入框 selector
- `TRAE_SEND_BUTTON_SELECTORS`: 发送按钮 selector
- `TRAE_RESPONSE_SELECTORS`: assistant 输出区域 selector
- `TRAE_ACTIVITY_SELECTORS`: 用于抓取任务过程文本的 selector
- `TRAE_NEW_CHAT_SELECTORS`: 为新 HTTP 会话打开新 Trae 会话时使用的 selector
- `TRAE_GATEWAY_TOKEN`: 开启 API Bearer 鉴权
- `TRAE_ALLOWED_ORIGINS`: 浏览器来源白名单
- `TRAE_ENABLE_DEBUG_ENDPOINTS`: 开启 `/debug/automation`

## Selector 诊断

如果你还不知道当前 Trae 页面应该用哪些 selector，可以先跑：

```bash
npm run inspect:trae
```

它会输出：

- 当前匹配到的 target 信息
- 每组 selector 的命中数量
- 可见的通用输入框和按钮候选
- 回复区域和活动区域的诊断信息

## Safe Attach 模式

如果 Trae 已经在运行，不想让脚本重复拉起它：

```bash
set TRAE_SAFE_ATTACH_ONLY=1
npm run start:gateway
```

如果你希望 Trae 不在线时本地 API 也能先启动：

```bash
set TRAE_SAFE_ATTACH_ONLY=1
set TRAE_ENABLE_MOCK_BRIDGE=1
npm run start:gateway
```

## 运行说明

- 网关只监听本机 loopback 地址
- 消息抓取是基于 DOM 的，不是 OCR，也不是 Trae 私有 API
- 过程文本和最终回复都来自页面上已经渲染出来的 UI 容器
- HTTP session 是网关层的逻辑会话，不是 Trae 内部持久会话 ID
- 自动化驱动内部会串行处理请求，避免多个调用方同时对同一个 Trae 窗口执行点击和输入

## 调试

基础检查：

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ready
npm run inspect:trae
```

详细诊断：

```bash
set TRAE_ENABLE_DEBUG_ENDPOINTS=1
curl http://127.0.0.1:8787/debug/automation
```

## 当前限制

- Trae UI 更新后 selector 可能失效
- 某些任务场景下，Trae 暴露出的过程文本会比最终 assistant 文本更完整，因此两者都会从 DOM 流中采集
- 会话状态只保存在内存中
- 这是一个本地桌面自动化桥，因此依赖本地 Trae 窗口持续可用且结构稳定

## 验证

```bash
npm test
npm run lint
npm run typecheck
```
