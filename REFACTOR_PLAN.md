# 二次元宝可梦对战项目重构计划书

## 1. 项目概述

本项目是对现有“二次元宝可梦对战”React 应用的全面重构。目标是采用最新的技术栈和最佳实践，构建一个高性能、高可维护性、高开发体验的现代化 Web 应用。

核心特色是深度集成了 Google Gemini AI，通过 AI 驱动动态生成游戏剧情、NPC 互动、甚至战斗场景，为玩家提供独一无二的、非线性的游戏体验。

## 2. 现有项目分析

我们对现有项目进行了四个维度的深入分析：

### 2.1. 初步分析

- **核心框架**: React 19 + Vite + TypeScript
- **样式方案**: Tailwind CSS
- **代码规范**: ESLint + Prettier
- **关键依赖**: `@google/genai`，证实了项目对 Google Gemini AI 的深度依赖。

### 2.2. 核心逻辑与业务流

项目采用模块化的自定义 Hooks (`useCharacterManager`, `useStoryEngine`, `useBattleManager`, `useSaveManager`) 来组织业务逻辑，由一个中心化的 `useGameLogic` Hook 进行协调。故事引擎巧妙地结合了静态剧情和 AI 动态生成内容，通过事件驱动模型 (`AIEventTrigger`) 来更新游戏状态，架构清晰，扩展性强。

### 2.3. UI 组件结构

UI 分为顶层视图、模态框、面板和原子组件。当前主要问题是存在明显的 Props 钻取（Prop Drilling），导致组件耦合度高。

### 2.4. 数据状态管理

整个应用的状态存储在一个单一的、巨大的 `gameState` 对象中，通过 `useState` 管理。这在应用复杂化后会引发性能问题和维护困难。数据持久化采用了 `localStorage`，方案简单有效。

## 3. 重构目标

1.  **提升性能**: 优化渲染逻辑，减少不必要的组件重渲染。
2.  **改善可维护性**: 降低组件和模块间的耦合度，使代码更易于理解和修改。
3.  **优化开发体验**: 引入现代化工具，简化数据请求、表单处理等常见任务。
4.  **增强扩展性**: 构建一个稳固的架构，便于未来添加新功能。

## 4. 建议技术选型

| 类别 | 现有技术 | 建议重构技术 | 理由 |
| :--- | :--- | :--- | :--- |
| **核心框架** | React 19, Vite, TypeScript | **保持不变** | 非常现代和高效的基础技术栈，完全符合重构目标。 |
| **状态管理** | `useState` + Props Drilling | **Zustand** | 轻量、简单，完美解决 Props 钻取问题，提供细粒度的性能优化。 |
| **UI 组件库** | 自定义组件 | **Shadcn/ui** | 设计精美、可访问性高，提供完全的控制权和自定义能力。 |
| **数据请求** | `fetch` | **TanStack Query** | 强大的缓存、重试、后台同步机制，极大简化数据请求逻辑。 |
| **路由** | 基于状态的 `switch` | **React Router** | 声明式的、功能完备的路由解决方案，利于URL与UI同步。 |
| **表单处理** | 手动处理 | **React Hook Form** | 简化表单状态管理和校验，提升性能，与UI库无缝集成。 |

## 5. UI/UX 设计与交互逻辑

### 5.1. 设计原则

- **沉浸式体验**: UI 设计应服务于故事，减少不必要的干扰，让玩家专注于剧情和决策。
- **信息清晰**: 玩家状态、宝可梦信息、战斗数据等应清晰易读。
- **响应式设计**: 确保在不同尺寸的设备上都有一致且优秀的体验。
- **动效反馈**: 为用户的操作提供即时、流畅的动画反馈，增强交互感。

### 5.2. 核心交互流程

1.  **游戏启动**:
    -   **路由**: `/`
    -   **逻辑**: 检查是否存在本地存档。
        -   **有存档**: 显示主菜单 (`<MainMenu />`)，提供“继续游戏”、“新游戏”、“删除存档”选项。
        -   **无存档**: 直接跳转到角色创建界面 (`/customize`)。

2.  **角色创建**:
    -   **路由**: `/customize`
    -   **组件**: `<CustomizeRandomStartScreen />`
    -   **交互**:
        -   AI 自动生成初始角色、宝可梦、目标等。
        -   玩家可以手动修改各项信息，或请求 AI 重新生成特定部分（如“换一只宝可梦”、“换个目标”）。
        -   所有与 AI 的交互都通过一个聊天窗口进行，由 TanStack Query 管理请求状态。
        -   表单部分由 React Hook Form 管理，提供即时校验。
        -   点击“开始冒险”后，保存初始状态，跳转到冒险界面 (`/adventure`)。

3.  **冒险界面**:
    -   **路由**: `/adventure`
    -   **组件**: `<AdventureView />`
    -   **布局**:
        -   **主内容区**: 显示故事叙述、AI 生成的场景图片、玩家选项。
        -   **侧边栏/底部栏**: 玩家状态面板、队伍概览、背包入口、地图、历史记录等功能按钮。
    -   **交互**:
        -   玩家点击选项，触发 `storySlice` 中的 action，调用 AI 服务获取下一段剧情。
        -   AI 返回的数据流式显示在主内容区，增强动态感。
        -   功能按钮（如背包、地图）以模态框（Modal）形式打开，由 Shadcn/ui 的 `Dialog` 组件实现。

4.  **战斗界面**:
    -   **路由**: `/battle`
    -   **组件**: `<BattleView />`
    -   **交互**:
        -   回合制战斗。玩家通过点击“攻击”、“背包”、“宝可梦”、“逃跑”按钮进行操作。
        -   招式选择后，播放简洁的动画效果和战斗日志。
        -   战斗状态（如HP变化、状态异常）实时更新，由 `battleSlice` 管理。
        -   战斗结束后，根据结果（胜利/失败/捕捉）显示结算画面，并自动跳转回冒险界面 (`/adventure`)。

## 6. 组件化开发策略

我们将遵循**原子设计（Atomic Design）**的原则来组织组件。

-   **Atoms (原子)**: 最基础的 UI 元素，不可再分。
    -   `Button` (Shadcn)
    -   `Input` (Shadcn)
    -   `Badge` (Shadcn)
    -   `Avatar` (Shadcn)
    -   `Typography` (自定义，用于统一文本样式)
-   **Molecules (分子)**: 由原子组成的简单 UI 结构。
    -   `PokemonCard`: 由 `Avatar`, `Typography`, `Badge` 组成。
    -   `StatBar`: 显示 HP、Stamina 等状态条。
    -   `SearchInput`: 由 `Input` 和 `Button` 组成。
-   **Organisms (生物)**: 由分子和/或原子组成的复杂 UI 模块。
    -   `PlayerStatusPanel`: 显示玩家所有状态信息。
    -   `TeamList`: 展示所有宝可梦卡片 (`PokemonCard`)。
    -   `ChatBox`: 冒险和战斗中的对话/日志显示区域。
-   **Templates (模板)**: 定义页面的布局框架。
    -   `AdventureLayout`: 定义冒险界面的整体布局（主内容区+侧边栏）。
    -   `BattleLayout`: 定义战斗界面的布局。
-   **Pages (页面)**: 模板的具体实例，连接了业务逻辑和状态。
    -   `MainMenuPage`
    -   `CustomizePage`
    -   `AdventurePage`
    -   `BattlePage`

## 7. 实施计划与当前进度

### 阶段一：项目初始化与环境配置 (进行中)

- [x] **1. 初始化项目**: 使用 Vite 在 `refactored-client` 目录下创建了一个新的 React + TypeScript 项目。
- [x] **2. 安装核心依赖**: 成功安装了 `zustand`, `react-router-dom`, `@tanstack/react-query`, `react-hook-form`。
- [x] **3. 配置 Shadcn/ui**:
    - [x] 安装了 `tailwindcss` 和 `@tailwindcss/vite`。
    - [x] 配置了 `vite.config.ts` 和 `tsconfig.json` 以支持 Tailwind CSS 和路径别名。
    - [x] 成功运行 `npx shadcn@latest init` 完成了 Shadcn/ui 的初始化。
- [-] **4. 搭建状态管理 (Zustand)**:
    - [ ] 创建 `store` 目录。 (已完成)
    - [ ] 将原 `GameState` 拆分为 `playerSlice`, `storySlice`, `battleSlice` 等模块。 (正在进行 `playerSlice`)
    - [ ] 实现每个 slice 的 state 和 actions。

### 阶段二：核心功能重构 (待开始)

- [ ] **5. 设置路由 (React Router)**:
    - [ ] 在 `App.tsx` 中配置路由，替代原有的 `switch` 逻辑。
    - [ ] 创建 `/`, `/customize`, `/adventure`, `/battle` 等路由。
- [ ] **6. 迁移核心逻辑**:
    - [ ] 将原 `use...Manager` 中的逻辑迁移到 Zustand store 的 actions 中。
    - [ ] 使用 TanStack Query 封装 `geminiService.ts` 中的所有 API 请求。

### 阶段三：UI 重构与开发 (待开始)

- [ ] **7. 逐个重构 UI 组件 (遵循原子设计)**:
    - [ ] **Atoms & Molecules**: 从最底层的原子和分子组件开始，使用 Shadcn/ui 重建。
    - [ ] **Organisms**: 组合原子和分子，构建更复杂的模块。
    - [ ] **Templates & Pages**: 搭建页面布局，并连接 Zustand store 获取数据和调用 actions。
    - [ ] 使用 React Hook Form 重构所有表单。

### 阶段四：完善与测试 (待开始)

- [ ] **8. 完善与测试**:
    - [ ] 编写单元测试 (Vitest) 和组件测试 (React Testing Library)。
    - [ ] 进行全面的功能回归测试。

## 8. 总结

本次重构将使项目在架构、性能和可维护性上达到一个新的高度。这份详尽的设计文档将指导我们高效、高质量地完成开发工作，为未来的功能迭代打下坚实的基础。