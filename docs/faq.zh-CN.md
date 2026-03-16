# 常见问题

## 这是 Trae 官方 API 吗？

不是。TraeAPI 是构建在 Trae Electron 界面之上的本地桌面桥接服务。

## 它是在本地运行还是云端运行？

本地运行。TraeAPI 启动在你的机器上，并直接连接本机的 Trae 窗口。

## 为什么需要 remote debugging port？

因为 TraeAPI 是通过 Chrome DevTools Protocol 自动化 Trae 渲染进程，并从应用窗口里读取 DOM 内容。

## 为什么 OpenClaw 能看到插件，却还是不能调用 `trae_delegate`？

OpenClaw 可能会把工具显示在 catalog 里，但如果没有加入 `tools.alsoAllow`，agent 运行时仍然会拦截这个工具。请直接以插件示例配置为准。

## 为什么 TraeAPI 会额外打开一个 Trae 窗口？

如果你当前的 Trae 窗口不适合自动化，TraeAPI 会启动一个带独立 profile 的专用窗口，保证接口更稳定。

## 为什么这个专用窗口还会让我重新登录？

登录态复制只是尽力而为。如果本地 profile 文件被锁住，或者关键数据不完整，独立窗口仍然可能要求重新登录。

## 为什么有些回复前面会带 `SOLO Coder` 之类的前缀？

因为这些前缀本来就是 Trae 界面渲染出来的内容。TraeAPI 返回的是 Trae UI 上看到的文本，不是底层隐藏响应对象。

## 为什么我要求“精确输出”，结果还是会多出一些字？

Trae 可能会给你的结果包上一层自己的助手风格或任务描述。这个项目本质上是 UI 自动化桥，不是裸模型接口。

## 为什么 `/ready` 已经是 true，但下一条任务还是不一定正常？

`/ready` 只表示网关已经连上可用的 Trae 页面，而且关键 selector 可用了；它不保证下一条自然语言任务一定语义正确。

## 不接 OpenClaw 也能直接用吗？

可以，但这已经不是主要产品路径。现在推荐的用户路径是让 OpenClaw 通过原生插件去调用 Trae。

## Trae 更新后最容易坏的是哪里？

主要风险是 selector 漂移。只要 Trae 改了 DOM 结构、输入框、发送按钮或回复容器，就可能需要重新调整 selector。

## 支持并发吗？

单个 Trae 窗口本质上还是串行执行。多个调用方可以同时接入 API，但落到同一个自动化窗口上的任务应视为顺序执行。

## 出现问题时，最快怎么排查？

建议按这个顺序检查：

1. `/health`
2. `/ready`
3. `npm run inspect:trae`
4. `.env` 里的 selector 配置
5. 内置 `/chat` 页面
