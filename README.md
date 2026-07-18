# Lino

Lino 是一个温和、可靠、本地优先的 AI 对话空间。它以可交互的 Lino 角色为核心，提供对话、情绪、记忆、行动和本地数据管理五个界面。

## 功能

- Lino 角色使用已确认的九宫格透明素材，拥有情绪、思考、完成与页面专属动作。
- 对话支持流式 DeepSeek 回复、停止生成、重试、编辑用户消息、复制与收藏。
- Memory 支持基本记忆、收藏记忆、跳转原对话、添加与删除本地记忆。
- Actions 可以将常用行动建议带回对话继续执行。
- 所有会话和偏好默认保存在浏览器 `localStorage`，支持本地导入、导出和清除。
- DeepSeek 不可用时自动使用本地模拟回复，保证演示和基础交互仍可用。

## 技术栈

- React + Vite
- Framer Motion
- Tailwind CSS
- Cloudflare Workers Static Assets
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

首次部署前登录 Cloudflare，并将 DeepSeek 密钥保存为 Worker Secret：

```powershell
pnpm exec wrangler login
pnpm exec wrangler secret put DEEPSEEK_API_KEY
pnpm run deploy:cloudflare
```

部署命令会把 Vite 产物作为 Cloudflare Static Assets 发布，并由 `server/sites-worker.mjs` 处理 `/api/chat` 请求。部署完成后，必须通过返回的 `workers.dev` 网址实际访问首页和发送一条对话，再视为上线成功。

## 项目结构

- `src/components/`：页面、Bento 模块与 Lino 组件。
- `src/hooks/useStoredChat.js`：对话、记忆、收藏与本地数据状态。
- `src/services/assistantService.js`：前端流式响应与本地回退。
- `server/index.mjs`：本地 Node API 代理。
- `server/sites-worker.mjs`：Cloudflare Worker API 代理。
- `wrangler.jsonc`：Cloudflare Worker 与静态资源配置。
- `tests/lino.spec.js`：端到端交互与响应式回归测试。
