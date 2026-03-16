# Trae CDP DOM HTTP Bridge Spec

## Why
Trae 的内部 IPC 结构不稳定，继续走注入和接管内部通道会让维护成本持续上升。Electron 渲染进程天然支持 Chrome DevTools Protocol，因此更现实的方案是直接连远程调试端口，用 JS 驱动 DOM，保留对外的本地 HTTP 契约。

## What Changes
- 移除 Hook 注入与内部 IPC 路由方案
- 增加 CDP 目标发现、WebSocket 会话与 Runtime/Page 控制层
- 增加 DOM 自动化驱动，通过 selector 完成输入、发送与结果提取
- 增加诊断能力，用于输出目标页面信息、selector 命中情况与候选元素摘要
- 保留本地 HTTP API，包括会话创建、消息发送、流式输出、健康检查与就绪探针
- 保留本地绑定、鉴权、来源限制、限流、审计日志与链路指标
- 增加串行化执行策略，避免同一 Trae 窗口上的 UI 操作互相污染

## Impact
- Affected specs: Trae 接入方式、会话执行模型、流式传输、运行保护、可观测性
- Affected code: 启动脚本、目标发现、CDP 客户端、DOM 驱动、HTTP 网关、文档与测试

## ADDED Requirements
### Requirement: 远程调试接入
系统 SHALL 通过 Trae 的远程调试端口发现可操作的页面目标，而不是注入运行时 Hook。

#### Scenario: 调试端口与页面目标就绪
- **WHEN** 用户以 `--remote-debugging-port` 启动 Trae
- **THEN** 服务可以发现 Trae 页面 target 并建立 CDP 会话

#### Scenario: 页面目标不可达
- **WHEN** 调试端口未开启或没有匹配页面
- **THEN** `/ready` 返回未就绪并给出诊断信息

### Requirement: DOM 自动化驱动
系统 SHALL 通过 selector 驱动 Trae 页面完成文本输入、触发发送与提取响应内容。

#### Scenario: 标准消息调用成功
- **WHEN** 外部客户端调用发送消息接口
- **THEN** 服务向 Trae 页面写入内容、触发发送，并返回结构化响应

#### Scenario: 增量输出透传
- **WHEN** 外部客户端调用流式接口
- **THEN** 服务轮询 DOM 变化并持续返回增量事件直到输出稳定

### Requirement: 诊断与联调支持
系统 SHALL 提供本地诊断能力，帮助识别目标页面和可用 selector。

#### Scenario: selector 尚未确定
- **WHEN** 用户运行诊断脚本或调试接口
- **THEN** 系统返回页面标题、URL、selector 命中统计与可见候选元素摘要

### Requirement: 单窗口执行保护
系统 SHALL 对同一 Trae 窗口上的自动化操作串行化执行，避免并发 UI 污染。

#### Scenario: 多请求同时进入
- **WHEN** 多个 HTTP 请求几乎同时触发 Trae 操作
- **THEN** 驱动按顺序执行每个操作并保证响应不串线

### Requirement: 安全与可观测性
系统 SHALL 继续提供本地接口保护与链路观测能力。

#### Scenario: 未授权请求被拒绝
- **WHEN** 客户端缺失或携带错误令牌
- **THEN** 服务拒绝请求且不驱动 Trae 窗口

#### Scenario: 关键请求可追踪
- **WHEN** 任意请求完成或失败
- **THEN** 系统记录请求日志、耗时、错误码与审计字段

## REMOVED Requirements
### Requirement: 启动注入与 IPC 接管
**Reason**: 方案切换为 CDP + DOM 自动化后，不再依赖注入和内部通道映射。

### Requirement: Hook 状态文件校验
**Reason**: 就绪判定改为调试端口、页面目标与 selector 可用性检查。
