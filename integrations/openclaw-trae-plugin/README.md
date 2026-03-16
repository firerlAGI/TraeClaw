# OpenClaw Trae 插件

[中文](README.md) | [English](README.en.md)

这个插件让 OpenClaw 可以通过 TraeAPI 调用本地 Trae 桌面端，把 Trae 当作一个 IDE 工具使用。

目标链路：

`OpenClaw -> trae_delegate -> TraeAPI -> Trae 桌面端`

这不是模型提供方接入。OpenClaw 继续使用自己的 LLM，这个插件只负责把 IDE 工作委托给 Trae。

## 暴露的工具

插件会在 OpenClaw 中注册两个工具：

- `trae_status`
- `trae_delegate`

它们分别用于：

- 检查 TraeAPI 是否在线且 ready
- 把任务委托给 TraeAPI，再由 Trae 在桌面端执行

## 推荐接入方式

1. 先启动 TraeAPI
2. 在 OpenClaw 中从本地路径加载本插件
3. 用 `tools.alsoAllow` 放行插件工具
4. 重启 OpenClaw Gateway
5. 让 OpenClaw 调用 `trae_status` 或 `trae_delegate`

相关文档：

- [OpenClaw 用户安装指南](../../docs/install.zh-CN.md)
- [OpenClaw 集成说明](../../docs/openclaw-integration.zh-CN.md)
- [常见问题](../../docs/faq.zh-CN.md)

## 最小 OpenClaw 配置

```json
{
  "plugins": {
    "load": {
      "paths": [
        "C:\\path\\to\\TraeAPI\\integrations\\openclaw-trae-plugin"
      ]
    },
    "entries": {
      "trae-ide": {
        "enabled": true,
        "config": {
          "baseUrl": "http://127.0.0.1:8787",
          "autoStart": true,
          "quickstartCommand": "C:\\path\\to\\TraeAPI\\start-traeapi.cmd",
          "quickstartCwd": "C:\\path\\to\\TraeAPI"
        }
      }
    }
  },
  "tools": {
    "alsoAllow": ["trae-ide"]
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["trae_status", "trae_delegate"]
        }
      }
    ]
  }
}
```

也可以直接从仓库示例开始：

- [完整示例](examples/openclaw.config.example.json)
- [最小示例](examples/openclaw.minimal.config.json)

## Token 网关

如果 TraeAPI 开启了 `TRAE_GATEWAY_TOKEN`，在插件配置里加上：

```json
{
  "plugins": {
    "entries": {
      "trae-ide": {
        "config": {
          "token": "your-token"
        }
      }
    }
  }
}
```

## 关键注意点

请使用：

- `tools.alsoAllow`
- `agents.list[].tools.alsoAllow`

不要只写插件专用的 `tools.allow`。否则 OpenClaw 可能能看到插件，但 agent 实际还是调不到 `trae_delegate`。

## 快速验证

重启 OpenClaw 后：

1. 确认插件已经加载
2. 让 OpenClaw 执行：`Use trae_status exactly once and tell me whether Trae is ready.`
3. 再让 OpenClaw 执行：`Use trae_delegate exactly once and ask Trae to summarize this project.`

## 排障

OpenClaw 能看到插件，但调不到 `trae_delegate`

- 检查 `tools.alsoAllow`
- 重启 OpenClaw Gateway
- 确认 `http://127.0.0.1:8787/ready` 为 true

TraeAPI 已启动，但不 ready

- 确认 Trae 已安装并已登录
- 确认 Trae 能打开项目
- 执行 `npm run inspect:trae`

Trae 自动打开了一个独立窗口

- 这是预期行为
- 当前窗口不适合自动化时，独立窗口会更稳定
