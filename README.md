# 二次元宝可梦对战（Anime-Pok-mon）

## 项目简介与定位

本项目为面向初学者和开发者的“二次元宝可梦对战”模拟平台，旨在通过工程化实践、AI 剧情与宝可梦对战机制，帮助用户学习现代前端开发、React 组件化、TypeScript 编程及项目工程管理。**本项目仅供学习与教学交流使用，不得用于商业或侵权用途。**

## 主要特性

- **AI 剧情引擎**：集成 AI 驱动的剧情推进与 NPC 互动，体验丰富的冒险故事。
- **宝可梦对战系统**：支持回合制宝可梦对战、技能释放、属性克制等核心玩法。
- **工程化实践**：采用 TypeScript + React + Vite，模块化开发，便于理解和扩展。
- **存档与进度管理**：支持本地存档、读取与多角色切换。
- **代码规范与自动化**：集成 ESLint、Prettier、CI/CD 流程，提升代码质量。

## 安装与运行说明

### 环境要求

- Node.js 版本 ≥ 18
- 推荐使用 npm 8 及以上

### 安装步骤

```bash
# 进入 server 目录
cd server

# 安装依赖
npm install
```

### 运行开发环境

```bash
npm run dev
```

### 构建生产环境

```bash
npm run build
```

### 主要环境变量

如需自定义端口等参数，可在 `server/.env` 文件中配置，常见变量如下：

```
VITE_PORT=5173
VITE_API_BASE=
```

## 学习建议

- **适合人群**：对前端开发、React、TypeScript、工程化实践、AI 游戏机制感兴趣的初学者与进阶开发者。
- **推荐参考模块**：
  - [`server/components/`](server/components/)：核心 UI 组件与交互逻辑
  - [`server/hooks/`](server/hooks/)：自定义 Hook 与游戏状态管理
  - [`server/services/`](server/services/)：AI、对战等业务逻辑
  - [`server/utils/`](server/utils/)：工具函数与数据处理
  - [`server/LINT_AND_FORMAT.md`](server/LINT_AND_FORMAT.md:1)：代码规范与格式化说明

建议结合实际代码多调试、多尝试，理解组件拆分、状态管理与工程化流程。

## 免责声明

本项目仅供学习、教学与技术交流使用。禁止用于任何商业用途或侵犯他人知识产权的行为。项目中涉及的宝可梦及相关元素版权归原权利方所有，开发者不承担由用户违规使用带来的任何法律责任。

## 附录：代码质量与 CI/CD

本项目包含自动化代码质量检查，所有 Pull Request 会自动运行：

- **ESLint**：TypeScript/React 代码规范检查
- **Prettier**：代码格式化校验
- **Build Validation**：确保代码可成功编译

### 本地开发建议

在 `server/` 目录下建议执行：

```bash
# 自动修复 lint 问题
npm run lint:fix

# 格式化代码
npm run format

# 检查编译
npm run build
```

所有提交需通过上述检查后方可合并。

---
