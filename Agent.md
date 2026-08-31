# HanYu Cards Agent 协作指南

本文档供在本仓库中工作的编码 Agent 使用。目标是在不破坏离线学习、移动端体验和用户本地数据的前提下，持续完善 HanYu Cards。

## 项目定位

HanYu Cards 是面向成人 HSK 1–3 学习者的 Vue 3 应用，核心闭环是“词卡学习 → 间隔复习 → 场景任务 → 进度反馈”。应用默认无需账号、无广告、无追踪，并且在 AI 服务不可用时仍应完成主要学习流程。可选 AI 助教通过独立的 Express 服务访问模型，前端不得持有服务商密钥。

修改时优先保证以下原则：

1. 离线学习、词典、复习和进度查看不依赖后端。
2. 已有用户的 IndexedDB/localStorage 数据保持兼容。
3. 中文、拼音、英文释义和 HSK 等级必须准确且彼此一致。
4. Web、PWA 和 Capacitor 移动端共享同一套核心行为。
5. 保持默认发行版“无账号、无广告、无追踪”的产品边界。

## 当前技术栈

- Node.js `>=22.0.0`（开发和 CI 使用 22.12+），依赖管理使用 npm 和已提交的 `package-lock.json`。
- Vue 3、TypeScript 严格模式、Vite、Vue Router、Pinia。
- `localforage`/IndexedDB 保存学习进度，localStorage 保存偏好设置。
- Vitest、Vue Test Utils、happy-dom 和 fake-indexeddb 用于自动化测试。
- SCSS、Vite PWA、Capacitor 8 支持样式、离线安装及 Android/iOS 打包。
- `server/index.mjs` 使用 Express，通过 OpenAI 兼容客户端连接 Agicto，提供可选 AI 助教接口。

`package.json` 的 Node 版本是当前依据。Capacitor 8 要求 Node 22；Dockerfile 和 GitHub Actions 均以 Node 22.12 为基线，不要降级到 Node 20。

## 有效代码边界

从 `src/main.ts` 的导入链判断当前运行代码，主要目录如下：

- `src/pages/`：Study、Mistakes、Missions、Practice、Dictionary、Progress、Settings 等页面。
- `src/components/`：跨页面组件，当前包括词卡和 AI 助教。
- `src/stores/`：内容、学习进度、设置和助教状态。
- `src/types/learning.ts`：当前学习领域模型的唯一主要定义位置。
- `src/utils/learning.ts`：复习排期、搜索、语音和学习辅助逻辑。
- `src/data/hskWords.json`：2,209 条 HSK 1–3 词汇数据。
- `src/data/scenarios.ts`：六个任务型真实场景及其教学内容。
- `src/assets/app.scss` 与 `src/assets/scenarios.scss`：当前界面的全局样式。
- `src/router/index.ts`：无需登录的当前路由表。
- `server/index.mjs`：AI 助教后端；`GET /health`、`POST /api/assistant/chat` 和 `POST /api/assistant/evaluate-scenario`。
- `tests/`：当前 Vitest 单元、组件、数据和路由测试。
- `public/`、`capacitor.config.ts`、`android/`、`ios/`：PWA 与原生壳资源。
- `src/utils/native.ts` 与 `src/composables/useNativeBackButton.ts`：原生语音、分享、触觉反馈和 Android 返回键适配。
- `scripts/verify-mobile-config.mjs`：发布前只检查 `.env.mobile.local` 和签名变量是否存在，不读取后端 `.env`。

`src/modules/`、`src/services/`、`src/store/modules/` 以及 Firebase、旧 i18n/路由守卫相关插件来自重构前的 `languages-learner` 应用，且大多已被 TypeScript/ESLint 排除。除非任务明确要求迁移或清理，否则不要在这些目录中添加新功能，也不要把 Firebase 登录或旧多语言路由重新接入当前应用。

`cypress/e2e/learning.cy.ts` 是当前有效的端到端学习流程验收，桌面与移动配置分别位于 `cypress/configs/index.ts` 和 `cypress/configs/mobile.ts`。新增关键用户流程时同步扩展该用例，不要恢复旧登录页面的测试假设。

## 本地开发

首次进入仓库：

```bash
npm ci
```

仅启动前端：

```bash
npm run dev
```

同时启动前端和本地 AI API：

```bash
cp .env.example .env
npm run dev:all
```

`.env.example` 默认设置 `AI_MOCK=true`，无需密钥即可验证助教流程。只有在确实需要真实模型响应时才在本地 `.env` 中设置 `AGICTO_API_KEY` 和 `AI_MOCK=false`。`.env` 已被 Git 忽略；禁止提交 `.env`、API key、签名密码、用户消息或其他敏感数据，也绝不能把服务端密钥改成 `VITE_` 前缀。

移动端生产包从 `.env.mobile.local` 读取公开的 `VITE_ASSISTANT_API_URL`，该地址必须是已部署的 HTTPS 后端。文件中不得出现 `AGICTO_API_KEY`；没有安全公网地址时，原生 App 必须直接使用本地 AI 回退。

## 数据架构决策

当前里程碑不引入远程业务数据库：HSK 和场景内容随应用发布，学习进度保存在 IndexedDB/localforage，偏好保存在 localStorage，AI 代理保持无状态。这样可以保留无账号、低运营成本和离线可用的产品边界。

只有在明确加入账号、跨设备同步、后台内容运营、教师端、付费权限或群体分析时才增加服务端数据库。届时优先采用带鉴权 API 的 PostgreSQL 兼容方案，设计本地与云端冲突规则，并保证核心学习流程不会因网络失败而不可用。

## 实现约定

- 新界面使用 Vue SFC 和 `<script setup lang="ts">`；状态跨页面共享时放入 Pinia store，纯计算逻辑优先放入 `src/utils/`。
- 使用 `@/` 引用 `src/`、使用 `@@/` 引用仓库根目录，避免脆弱的多层相对路径。
- 遵循现有格式：TypeScript/Vue 及 `src/assets/app.scss` 使用 4 空格，其他 SCSS/JSON/YAML 使用 2 空格；单引号、无分号、多行尾逗号，并使用 `import type` 导入纯类型。
- 保持 TypeScript 严格类型。不要用 `any`、非必要的类型断言或关闭检查来绕过问题。
- 延续现有视觉语言和 CSS 类命名，复用 `.primary-action`、`.secondary-action`、`.screen` 等公共模式。界面至少适配 320 px 宽度，并保留安全区、键盘操作、可见焦点、语义标签和 `aria-*` 状态。
- 不直接编辑 `dist/`、`dist-test/`、`node_modules/` 或其他生成物。仅在任务需要更新原生壳时运行 `npx cap sync`，并检查它产生的 Android/iOS 差异。
- Android 原生基线为 JDK 21、`minSdk 24`、`compileSdk/targetSdk 36` 和 AGP 8.13；iOS 最低版本为 15.0。发布流程改变时同步更新 `docs/mobile-build.md` 与 `docs/release-checklist.md`。
- 添加或升级依赖时同时提交 `package.json` 和 `package-lock.json`，说明依赖的必要性，并优先使用现有能力。
- 保留现有第三方许可信息。新增词库、图片、字体或教学资料时，确认可用许可并更新 `THIRD_PARTY_NOTICES.md`。

## 领域与数据约束

学习数据类型以 `src/types/learning.ts` 为准。修改数据或算法时遵守以下约束：

- `HskWord.id` 和场景 `id` 是持久化及关联键，发布后不得随意改变或复用。
- 词汇必须包含有效的 HSK 1–3 等级、简体、繁体、带声调拼音、数字拼音、英文释义、词性、部首、示例和标签。批量修改 JSON 时必须检查条目数、ID 唯一性和字段完整性。
- 场景保持渐进的 HSK 难度，并包含学习目标、至少五个核心表达、至少五轮示例对话、文化说明、任务提示、目标表达和中/拼/英示范答案。
- 间隔复习规则集中在 `src/utils/learning.ts`，记录写入集中在 `src/stores/progress.ts`。不要在页面中复制排期算法。
- Today 使用“到期复习 → 活跃错题 → 高频新词”生成每天唯一且固定的队列；HSK 范围只在新一天创建队列时读取，已经创建的队列必须可刷新续学，不能因切换范围或再次渲染而更换。每日进度分子是当天队列中已首次评分的唯一词卡数，`Again` 也计入并同时进入错题本；Practice、错题重练等重复作答只增加总作答数，不增加每日进度，掌握状态另由多次复习结果决定。
- `needsMistakeReview` 是错题本当前状态；答错自动加入，错题本中 `Good`/`Easy` 才自动清除，手动移除必须显式调用 store action。
- Practice 的 `meaning`、`hanzi`、`pinyin`、`listening`、`context` 统计分别持久化；混合模式优先尚未练习或正确率较低的能力，每 10 题结束后显示轮次总结，不得静默重置为第 1 题。
- 场景的每次提交都记录尝试次数和最近成绩，并立即计入“已探索”；只有语义要求全部满足且分数不低于 70 才加入完成列表，历史最佳分及其三维评分不能被较低的新成绩覆盖。
- `hanyu-progress-v1` 和 `hanyu-settings-v1` 是已发布的存储键。若变更持久化结构，应提供向后兼容的默认值或显式迁移，并验证旧数据、空数据和损坏数据的行为。
- 日期键使用学习者设备的本地日历日期；测试中使用固定时间，避免依赖执行机器的当前时间或时区。
- 设置页备份格式由 `app: "hanyu-cards"` 和 `version: 1` 标识，只能包含学习数据与偏好；任何备份、日志或前端状态都不得包含 `.env` 或 Agicto 密钥。

## AI 助教约束

- `AGICTO_API_KEY` 只能由 `server/index.mjs` 读取，绝不能使用 `VITE_` 前缀或发送给浏览器。
- 前端只向 `VITE_ASSISTANT_API_URL` 发送必要的学习上下文；不要加入身份信息、完整本地历史或无关设备数据。
- 场景任务在线时按语义和交际目标评估，不要求逐字匹配例句；评估必须返回任务完整度、表达自然度、语言准确度和一个追问。无 key、mock、超时或上游失败时使用本地目标表达检查，并在界面上明确标注评估来源。
- 后端继续执行输入校验、请求体大小限制、来源限制和速率限制。错误响应不得泄露密钥、提示词、堆栈或供应商原始敏感信息。
- 无 key、`AI_MOCK=true`、断网、超时和上游失败时都必须保留清晰可用的本地 fallback。
- 医疗等场景只用于语言练习，不能把助教包装成专业诊断或安全建议来源。

## 测试与验收

先运行与改动直接相关的测试，再执行完整检查。常用命令：

```bash
npm run test:ci
npm run types
npm run lint
npm run stylelint
npm run build
npm run cypress:run
npm run cypress:run:mobile
npm run mobile:doctor
npm run mobile:android:debug
```

提交前的默认完整检查为：

```bash
npm run lint && npm run stylelint && npm run test:ci && npm run build
```

`npm run stylelint` 当前只覆盖独立 `.scss` 文件；若修改 Vue 文件内的 `<style>`，额外运行：

```bash
npx stylelint "src/**/*.{scss,vue}"
```

测试要求：

- 工具函数和复习算法使用 Vitest 做边界测试，包括 `again/hard/good/easy`、首次复习、到期时间和掌握状态。
- Vue 组件使用 Vue Test Utils；断言用户可见行为、事件和可访问状态，避免依赖内部实现。
- Store 测试应创建独立 Pinia，清理 localStorage，并使用 `vitest-setup.ts` 已提供的 fake-indexeddb，避免跨用例污染。
- 路由测试使用内存 history，不启动真实服务器。
- AI 相关测试不得访问真实模型或网络，应覆盖 mock/fallback、错误状态和发送上下文的最小化。
- 修改词汇或场景数据时同步增加完整性、唯一性和关键教学字段测试。
- 涉及响应式布局、PWA、语音或原生壳时，在自动化检查之外手动验证移动视口及离线行为；涉及发布时遵循 `docs/release-checklist.md`。

## 完成标准

任务完成时应满足：改动范围与请求一致，没有顺手改写无关文件；新增行为有相应测试；离线主流程和本地存储兼容性未被破坏；lint、类型检查、测试和构建均通过，或明确记录仓库已有且与本次改动无关的失败；文档、隐私说明、许可或发布步骤在行为发生变化时同步更新。
