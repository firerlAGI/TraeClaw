# Tasks
- [x] Task 1: 建立 CDP 发现与连接基础能力
  - [x] SubTask 1.1: 增加调试端口发现与页面目标筛选
  - [x] SubTask 1.2: 实现 CDP WebSocket 会话与 Runtime/Page 指令发送
  - [x] SubTask 1.3: 重写 Trae 启动脚本，等待调试端口与 target 就绪

- [x] Task 2: 实现 DOM 自动化驱动
  - [x] SubTask 2.1: 支持 composer、send button、response container 的 selector 配置
  - [x] SubTask 2.2: 实现文本输入、发送触发与响应轮询
  - [x] SubTask 2.3: 增加串行化执行，避免同窗口并发污染

- [x] Task 3: 保留并改造 HTTP 网关
  - [x] SubTask 3.1: 保留会话创建、消息发送、状态查询与流式接口
  - [x] SubTask 3.2: 将消息路由从 IPC bridge 切换为 automation driver
  - [x] SubTask 3.3: 将 `/ready` 判定切换为 CDP/selector 就绪态

- [x] Task 4: 保留安全与观测能力
  - [x] SubTask 4.1: 保留本地监听、Bearer 鉴权、来源限制与限流
  - [x] SubTask 4.2: 保留敏感信息过滤与审计日志
  - [x] SubTask 4.3: 保留链路追踪、错误统计与健康检查

- [x] Task 5: 清理旧架构并补齐文档测试
  - [x] SubTask 5.1: 删除 Hook/IPC 旧实现和注入脚本
  - [x] SubTask 5.2: 增加 discovery、driver、gateway 的自动化测试
  - [x] SubTask 5.3: 更新 README 与 spec 文档到 CDP/DOM 方案

- [x] Task 6: 增加诊断与联调工具
  - [x] SubTask 6.1: 增加页面诊断脚本，输出 target 与 selector 命中信息
  - [x] SubTask 6.2: 增加可选调试接口，返回自动化诊断数据
  - [x] SubTask 6.3: 在文档中补充 selector 排查流程

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1 and Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 2, Task 3, and Task 4
- Task 6 depends on Task 2 and Task 3
