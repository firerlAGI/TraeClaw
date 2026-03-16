# 安装指南

## 推荐方式

对大多数 Windows 用户，推荐这样安装：

1. 安装 Node.js 20 或更高版本。
2. 克隆或下载本仓库。
3. 执行 `npm install`。
4. 双击 [start-traeapi.cmd](../start-traeapi.cmd)。

首次启动时，TraeAPI 会尽量自动完成这些事情：

- 根据 [`.env.example`](../.env.example) 创建 `.env`
- 自动识别 `Trae.exe`
- 如果还没配置工作目录，就创建一个本地项目目录
- 优先附着到你当前已经打开的 Trae 窗口
- 如果当前窗口不适合自动化，就切到独立的 Trae 窗口
- 启动本地 HTTP 网关
- 自动打开内置聊天页

## 开始前请确认

请确认：

- 本机已经安装 Trae。
- Trae 支持 `--remote-debugging-port=<port>`。
- 你至少完成过一次 Trae 登录。
- 本机可以打开本地浏览器页面。

## 验证安装是否成功

启动成功后，打开：

- 聊天页面：`http://127.0.0.1:8787/chat`
- 健康检查：`http://127.0.0.1:8787/health`
- 就绪检查：`http://127.0.0.1:8787/ready`

最小 API 验证：

```bash
curl -X POST http://127.0.0.1:8787/v1/chat ^
  -H "content-type: application/json" ^
  -d "{\"content\":\"Reply with exactly: OK\"}"
```

如果网关已就绪，你会收到包含 Trae 回复内容的 JSON。

## 手动配置

如果一键启动还不够：

1. 把 [`.env.example`](../.env.example) 复制为 `.env`。
2. 设置 `TRAE_BIN` 为本机的 `Trae.exe` 路径。
3. 需要的话再设置固定的 `TRAE_PROJECT_DIR`。
4. 运行：

```bash
npm run quickstart
```

## OpenClaw 用户

如果你希望让 OpenClaw 把 Trae 当作 IDE 工具来调用，请看原生插件集成说明：

- [OpenClaw 集成](openclaw-integration.zh-CN.md)

## 相关文档

- [API 参考](api.md)
- [常见问题](faq.zh-CN.md)
- [OpenAPI JSON](openapi.json)
- [OpenAPI YAML](openapi.yaml)
