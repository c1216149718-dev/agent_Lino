# Lino

Lino 是一个温和、可靠的 AI 陪伴空间。聊天是主入口，情绪信箱承担慢节奏的生活记录、情绪整理和次日回信。

## 功能

- Lino 角色使用已确认的九宫格透明素材，拥有情绪、思考、完成与页面专属动作。
- 对话支持流式 DeepSeek 回复、停止生成、重试、编辑用户消息、复制与收藏。
- 情绪信箱支持 7 种心情、4 套信纸、4 种字迹、日历印章和同日多封信。
- 信件可留在本机，也可寄给 Lino；北京时间次日 08:00 合并生成一封回信。
- 匿名 Lino ID 与一次性恢复卡用于小范围账号测试，不需要手机号或邮箱。
- 聊天、记忆、收藏、心情、信件和回信可同步到 Cloudflare D1，离线变化会在恢复网络后补传。
- Memory 支持基本记忆、收藏记忆、跳转原对话、添加与删除本地记忆。
- Actions 可以将常用行动建议带回对话继续执行。
- 手机竖屏使用独立布局：聊天优先，其他页面从左侧涂鸦抽屉打开。
- 所有内容保留浏览器离线缓存，并支持导入、导出、本机清除和云端账号删除。
- DeepSeek 不可用时自动使用本地模拟回复，保证演示和基础交互仍可用。

## 技术栈

- React + Vite
- Framer Motion
- Tailwind CSS
- Cloudflare Workers Static Assets
- Cloudflare D1 + Cron Triggers
- DeepSeek Chat Completions API

## 本地运行

安装依赖后，在两个 PowerShell 窗口分别启动 API 和前端：

```powershell
pnpm install
pnpm dev:api
```

```powershell
pnpm dev
```

前端默认地址为 `http://127.0.0.1:5175/`，API 代理使用 `http://127.0.0.1:5174/`。

## 环境变量

在项目根目录创建 `.env`，不要提交该文件：

```env
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
```

`DEEPSEEK_API_KEY` 只应出现在本地环境文件或 Cloudflare Secret 中，不能放入前端代码、Git 提交或公开配置。

## 验证

```powershell
pnpm lint
pnpm run build:cloudflare
pnpm test:e2e
```

## Cloudflare 部署

首次部署前登录 Cloudflare，创建并迁移 D1，然后将 DeepSeek 密钥保存为 Worker Secret：

```powershell
pnpm exec wrangler login
pnpm exec wrangler d1 create lino-agent-home-db
pnpm exec wrangler d1 migrations apply lino-agent-home-db --remote
pnpm exec wrangler secret put DEEPSEEK_API_KEY
pnpm run deploy:cloudflare
```

将 `wrangler.jsonc` 中的 D1 `database_id` 替换为创建结果。Worker 处理对话、账号、同步、信箱和定时回信接口；Cron 在 UTC 00:00 至 00:50 每 10 分钟运行一次，已生成的每日回信不会重复创建。部署完成后，必须通过返回的 `workers.dev` 网址匿名访问首页并实际调用接口，再视为上线成功。

## 项目结构

- `src/components/`：页面、Bento 模块与 Lino 组件。
- `src/hooks/useStoredChat.js`：对话、记忆、收藏与本地数据状态。
- `src/hooks/useMailbox.js`：心情、信件、回信与离线缓存状态。
- `src/hooks/useCloudAccount.js`：Lino ID、恢复卡和云端同步。
- `src/services/assistantService.js`：前端流式响应与本地回退。
- `migrations/`：D1 数据库结构。
- `server/index.mjs`：本地 Node API 代理。
- `server/sites-worker.mjs`：Cloudflare Worker、D1 API 与定时回信。
- `wrangler.jsonc`：Cloudflare Worker 与静态资源配置。
- `tests/`：交互、信箱、定时任务与响应式截图回归测试。
