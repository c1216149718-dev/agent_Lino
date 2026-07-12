# Lino 对话空间

Lino 是一个温和、可靠、本地优先的 AI 对话智能体网站 MVP。当前版本使用 React + Vite + Tailwind CSS + Framer Motion 构建，不接真实模型、不登录、不上传数据，回复由本地模拟服务生成并保存到 `localStorage`。

## 已实现

- 极简黑白灰 UI，保留浅云层背景和中性描边。
- 入口态：Lino 停靠在 compact 输入框上方，引导用户开始对话。
- 过渡态：输入框展开为主界面，Lino 飞向发送按钮。
- 主界面：聊天区域 + Bento Grid 模块。
- Lino 角色：状态、三视图、六种表情、额头响应符号。
- 本地会话：消息、状态和记忆片段保存到 `localStorage`。
- 服务层预留：`src/services/assistantService.js` 可替换为真实 AI API。
- Playwright e2e 覆盖入口、对话、状态、角色模块和移动端溢出。

## 本地运行

```bash
pnpm install
pnpm dev --host 127.0.0.1 --port 5174
```

## 验证

```bash
pnpm lint
pnpm build
pnpm test:e2e
```

## 关键文件

- `src/App.jsx`：入口、过渡、聊天主状态机。
- `src/components/LinoMascot.jsx`：Lino SVG/CSS 角色组件。
- `src/components/ChatStage.jsx`：主对话界面和 Bento 模块。
- `src/hooks/useStoredChat.js`：本地消息、状态和记忆管理。
- `src/services/assistantService.js`：模拟回复服务，后续真实模型接入点。
- `src/utils/replies.js`：本地模拟回复文案。
- `public/favicon.svg`：Lino 网站图标。
- `public/site.webmanifest`：PWA/安装元信息。

## 后续接真实模型

后续接入真实 AI 时，优先替换 `requestAssistantReply` 的实现，保持 UI 状态结构不变：

```js
export async function requestAssistantReply({ content, agentState }) {
  // call real model API here
  return { content: '...', source: 'api' }
}
```
