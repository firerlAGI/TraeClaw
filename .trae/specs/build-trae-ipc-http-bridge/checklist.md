# Checklist

- [x] `start:trae` 使用远程调试端口启动 Trae，并等待 CDP 就绪
- [x] `start:gateway` 在安全附着模式下支持 mock automation driver
- [x] HTTP 网关保留 `/health`、`/ready`、`/v1/sessions` 与消息接口
- [x] DOM 驱动支持 selector 配置、文本输入、发送和结果轮询
- [x] 自动化请求在单窗口下串行执行
- [x] 鉴权、来源限制、限流、审计日志和链路日志仍然有效
- [x] README、spec、tasks 已同步到 CDP/DOM 新方案
- [x] 提供 `inspect:trae` 诊断脚本和可选 `/debug/automation` 调试接口
