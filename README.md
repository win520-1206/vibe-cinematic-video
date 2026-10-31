# vibe-cinematic-video

**让科学过程成为动画，让音乐参与叙事。**

面向 AI 编码助手的科学可视化视频制作 Skill，结合故事设计、科学模型、连续空间动画与声画互动，覆盖资料核验、参考拆解、分镜、工程制作、渲染与成片验收。

默认采用 Remotion、React、WebGL 和 Canvas2D；复杂三维镜头可以按需使用 Blender。适合科普短剧、概率与粒子动画、科学原理演示、科技主题系列短片，以及需要加强运镜与音画关系的作品。

[安装](#安装) · [使用](#使用) · [运行示例](#运行示例) · [工程命令](#工程命令) · [技术架构](#技术架构) · [Blender](#可选-blender-镜头) · [安装与分发答疑](#安装与分发答疑)

## 核心能力

| 能力 | 制作方式 |
| --- | --- |
| 科学叙事 | 将疑问、冲突和验证写成可见的对象变化，明确每镜要解释的关系 |
| 连续空间动画 | 通过透视、相机运动、粒子组织与解体、尺度转换和适度泛光组织画面 |
| 模型驱动图形 | 独立计算样本、概率与曲线，区分教学模拟、真实数据和艺术表达 |
| 音乐适配 | 分析频段、瞬态、节奏和段落候选，安排揭示、运动与阅读停顿 |
| 灵活项目配置 | 按本次需求确定集数、各集片长、画幅、帧率、音乐和交付目标 |
| 独立工程 | 提供项目创建器、依赖锁、预览、局部渲染、整片渲染和打包入口 |
| 技术验收 | 检查字幕、布局、时间轴、资源、缓存、实际导出帧与音轨 |

默认风格 `cinematic-spatial` 使用近黑蓝背景、暖金与冷蓝、连续空间运动和克制光效，以主体过程和完整动态文案共同推进叙事，文字按构图分时出现。配色、字体、配音与风格可以调整；集数、片长和卡点在调用时确定。

Skill 指导编码助手完成制作。具体题材的资料、科学模型、剧情和镜头仍需设计，模板提供稳定的工程基础。

## 安装

### 使用 skills CLI

安装 Node.js 后，在终端运行：

```bash
npx skills add win520-1206/vibe-cinematic-video --skill vibe-cinematic-video
```

按提示选择编码助手。默认安装到当前项目，需要跨项目使用时添加 `--global`。例如，为 Codex 安装到用户级目录：

```bash
npx skills add win520-1206/vibe-cinematic-video --skill vibe-cinematic-video --agent codex --global
```

只查看仓库中可安装的 Skill：

```bash
npx skills add win520-1206/vibe-cinematic-video --list
```

这些命令由 npm 运行 `skills` 安装工具，再从 GitHub 获取本仓库，**不需要发布同名 npm 包**。选项与版本要求以 [skills CLI 官方说明](https://github.com/vercel-labs/skills)为准；当前说明要求 Node.js 22.20 或更新版本。

安装工具支持多种 Agent；本项目的制作链路在 Windows 本地环境完成验证，其他系统和宿主需要按各自环境运行检查。

### 手动安装

```bash
git clone https://github.com/win520-1206/vibe-cinematic-video.git
```

将完整仓库目录放入编码助手配置的 Skills 目录，确保 `SKILL.md` 位于该 Skill 根目录。保留 `scripts/`、`assets/` 和 `references/`，它们是工作流的一部分。

已有同名 Skill 时，先备份本地音乐与偏好，再合并更新。安装目录与作品工程目录分开管理。

## 使用

安装后，在支持 Skill 调用的助手中提出制作需求。以 Codex 为例：

```text
使用 $vibe-cinematic-video 帮我制作科学可视化视频。
```

也可以一次提供更多信息：

```text
使用 $vibe-cinematic-video 制作关于光合作用与能量转换的科普短剧。
受众是大学生，准备发布到短视频平台。
请先与我确定集数、片长、画幅和输出规格。
使用 cinematic-spatial 风格，保留完整文案，拆成动态短语，不固定在画面下方。
我会提供音乐，请先分析节奏与高潮候选，再设计画面和声音的对应关系。
需要复杂结构或剖切镜头时可以评估 Blender。
先制作一个能够完整说明科学过程的代表性片段。
```

助手会集中询问尚未提供的主题、受众、用途、集数、时长、画幅、素材、输出目录和样片／整片选择。已明确的参数直接继承；已要求完成整片时，不强制增加样片确认。

支持单集、系列、新片和局部节奏修订。普通演示文稿、纯口播或简单剪接任务，不必套用整套制作流程。

## 环境要求

| 环境 | 用途 | 要求 |
| --- | --- | --- |
| Node.js／npm | 项目创建、依赖安装、预览和渲染 | skills CLI 当前要求 Node.js 22.20+ |
| Python／NumPy | 音乐特征、模型和媒体辅助检查 | 在作品工程安装 `requirements.txt` |
| Chrome／Edge／Chromium | 浏览器逐帧渲染 | 使用实际安装的浏览器并运行 `doctor` |
| FFmpeg／ffprobe | 媒体解码、合成和检查 | 使用显式路径、PATH 或本工程可用的 Remotion 工具 |
| Blender | 三维建模、剖切、装配和离线渲染 | 可选，仅选用相关镜头时需要 |

工程通过依赖锁安装 Remotion／React 等依赖。已验证环境包括 Windows、Node.js 22.20、Python 3.13 和 Remotion 4.0.539；依赖锁代表测试过的组合，不代表对最新版的推荐。

本机路径可通过 `BROWSER_EXECUTABLE`、`PYTHON`、`FFMPEG`、`FFPROBE`、`BLENDER_EXECUTABLE` 和 `RENDER_CONCURRENCY` 指定。创建器与环境检查不会静默下载浏览器或 Blender。

## 运行示例

以下命令从已克隆的仓库根目录执行，在相邻目录创建独立随机游走示例：

```bash
node scripts/create-project.mjs ../walk-demo --demo
cd ../walk-demo
npm ci
python -m pip install -r requirements.txt
npm run analyze:music
npm run doctor
npm run dev
```

预览后，在作品工程运行：

```bash
npm run stills
npm run render
npm run check
npm run package
```

示例展示单条随机轨迹、多个样本的终点分布、空间粒子、字幕和事件音效，使用本地合成的测试音乐，无需 Blender。示例参数仅用于演示，不会成为新项目默认值。

创建正式作品时使用：

```bash
node scripts/create-project.mjs ../my-film
```

该命令生成待填写配置。完成需求问答和分镜后，再填写 `project-contract.json` 并运行制作命令。也可以导入已完成的配置及音乐：

```bash
node scripts/create-project.mjs ../my-film --contract ./brief.json --music ./music.m4a
```

目标目录必须不存在或为空。创建器不会覆盖已有作品，也不会自动安装工程依赖。

## 工程命令

下列命令在生成的作品工程内运行：

| 命令 | 用途 |
| --- | --- |
| `npm run doctor` | 检查工具、资源和实际渲染能力 |
| `npm run dev` | 启动预览与时间轴定位 |
| `npm run analyze:music` | 准备音乐选段、特征、结构候选和事件混音 |
| `npm run stills` | 输出场景、字幕和事件边界的检查帧 |
| `npm run render` | 渲染指定分集、片段或全部分集 |
| `npm run check` | 检查配置、字幕布局、实际视频和音轨 |
| `npm run package` | 生成包含源码、媒体、SRT 和报告的交付目录 |
| `npm run blender:render` | 渲染已配置的 Blender 测试镜头 |
| `npm run typecheck` | 检查 TypeScript 类型 |
| `npm run test` | 执行工程机制与失败案例测试 |

例如，只渲染某集的一段：

```bash
npm run render -- --episode E1 --from 48 --to 95
```

帧号从零开始，使用绝对分集帧号，两端包含。片段保留对应的音乐位置。使用自己的分集 ID 与范围，局部输出不能替代完整成片验收。

## 制作流程

```mermaid
flowchart LR
    A[需求与资料] --> B[科学模型与剧情]
    B --> C[音乐分析与分镜事件]
    C --> D[代表性片段或整片制作]
    D --> E[预览与渲染]
    E --> F[实际成片验收]
    F --> G[视频与工程交付]
```

每镜明确对象、初始状态、发展、结果、观众应理解的关系和科学边界。分别设计主体运动、相机观察和文字任务，背景漂浮不代替主体动作。画面、字幕强调与音效引用同一事件表；连续运动可读取按帧音乐特征。公式与复杂说明保留稳定阅读窗口。

## 技术架构

| 层 | 职责 |
| --- | --- |
| 配置与事件表 | 统一集数、各集片长、规格、场景、字幕和关键时刻 |
| 科学模型 | 独立计算轨迹、样本、概率、曲线和计数 |
| Remotion／React | 全片编排、精确文字、字幕、来源和媒体合成 |
| WebGL | 大量粒子、透视空间、相机、连续形变和泛光 |
| Canvas2D | 科学曲线、坐标轴、波形、图例和可审查图解 |
| Python／NumPy | 音乐特征、节奏候选、音效准备及辅助检查 |
| Blender | 按需制作复杂三维镜头，输出供时间轴合成的素材 |

各图层共享帧号、全片时间、镜头时间、模型、音乐与事件状态。随机过程固定种子，同一帧可独立重建，支持跳转预览与分片渲染。

模板包含随机游走和分布示例：同一对象沿采样路径移动，再进入终点统计，样本到达与计数共用模型。新题材需要对应的模型与场景，不能只替换标题和装饰。接口见[工程脚手架](references/scaffold.md)和[架构说明](references/architecture.md)。

## 动态文案与画面组织

新建工程默认采用 `full-dynamic`：完整确认稿保留在 `captions` 与独立清单中，画面用 `textCues` 分时呈现，SRT仍导出完整内容。旧配置没有扩展字段时保留 `legacy`，既有作品不自动改写。

主要文案、对象标签和稳定公式分别设计；文字可居左、居右、居中、沿路径进入或跟随对象，底部字幕是可选布局。支持关键词强调、遮罩揭示和短语接力，字效之后保留阅读窗口。标题和科学说明不默认常驻三层叠加。具体配置见[动态文案与主体动作](references/dynamic-text-and-motion.md)。

## 音乐与素材

公开仓库不包含私人参考音轨。可以调用时提供音乐、创建工程时使用 `--music`，或在本地 `assets/defaults.json` 中登记资源。选择优先级为：本次指定曲目、选定的已登记曲目、可用的本地默认音轨。

更换曲目、截取位置、播放速度或分析帧率后，应重新分析。BPM、瞬态、段落和高潮检测均为候选，需要结合实际听取与叙事复核。参考混音保留真实来源说明，不将未分离材料称为纯音乐音轨。

片长超出音乐长度时，需要明确选择重组、循环、追加音乐或调整片长。字体、模型、图片和视频素材分别记录来源及使用范围。详见[音乐适配](references/music-adaptation.md)。

## 可选 Blender 镜头

Blender 适合复杂实体结构、剖切、装配、机械运动、材质和照明。是否使用由镜头的解释收益、视觉需要与渲染成本决定；普通曲线和粒子动画继续使用现有图形路线。

配置三维镜头后，在作品工程运行：

```bash
npm run blender:render -- --episode E1 --scene scene-id
```

Blender 输出无声视频，透明叠加使用 RGBA PNG 序列；Remotion 管理最终字幕、来源和声音。工程记录帧率、帧数、事件映射、`.blend` 源文件及渲染参数。

自带壳体开合场景用于验证接口，实际题材需单独建模。缺少 Blender 时会明确报告受影响镜头，基础示例仍可运行。详见[Blender 制作说明](references/blender.md)。

## 验证与交付

技术检查覆盖必填配置、帧对齐、场景连续性、独立确认稿、动态片段覆盖、稳定阅读时间与布局、事件引用、音效并发、资源、缓存和导出指纹。成片检查包含完整帧解码、视频规格、音轨时长及关键事件前后帧。

`qa/report.json` 分别记录技术结果与科学、连续观看、审听状态。自动检查提供可复现证据，科学解释和观看体验仍需人工判断。

当前改版通过26项测试与类型检查；实渲染覆盖横屏、竖屏和对象跟随的66个检查帧，并验证事件强调、公式字效、旧配置和实际越界检测。跨场景短技术片段用于检查完整解码与音轨位置。本轮未制作对照样片或重新交付完整影片；Blender仍未进行实机渲染验证。完整范围见[验证记录](assets/validation-report.json)。

交付可包含 MP4、SRT、可编辑工程、资料依据、资产记录和检查报告。项目交付包包含本次作品媒体；公开 Skill 分发包排除私人音乐、原成片、凭证、依赖目录和缓存。

## 风格扩展

在 `assets/styles/` 编写独立风格规范，在 `index.json` 登记唯一 ID，再由调用请求选择。风格描述配色、材质、空间、文字和运动偏好；集数、片长与音乐落点仍属于本次项目配置。

工程通过 `style.tokens` 设置运行时表现参数，完整题材场景由编码助手实现。风格文档不会自动生成所有视觉代码。

## 仓库结构

```text
vibe-cinematic-video/
├── SKILL.md                   # 编码助手的工作流入口
├── README.md                  # 项目与使用说明
├── THIRD_PARTY_NOTICES.md      # 方法来源与资源边界
├── agents/                    # 助手界面元信息
├── scripts/                   # 项目创建、音频分析与媒体辅助工具
├── references/                # 分镜、架构、音乐、Blender与验收规范
└── assets/
    ├── project-template/      # 独立Remotion工程与依赖锁
    ├── examples/              # 显式配置的原创示例
    ├── animation-core/        # 轻量动画机制示例
    ├── styles/                # 风格规范与索引
    ├── music/                 # 本地音乐配置说明
    └── validation-report.json # 验证范围与限制
```

## 安装与分发答疑

**是否需要发布到 npm？**

通过 `npx skills add owner/repo` 安装时不需要。本仓库通过 GitHub 分发，npm 提供的是 `skills` 安装工具。仓库内 `npm ci` 用于作品工程依赖安装，与发布同名 npm 包是两件事。

若以后要提供 `npx vibe-cinematic-video` 或 `npm install vibe-cinematic-video`，则需单独设计 npm 包入口、版本和文件范围，并使用 npm 账号发布。当前入口使用上文的 `npx skills add`。

**能在 Skill 目录网站找到吗？**

本仓库根目录包含标准 `SKILL.md` 及名称、描述，可被支持此格式的安装工具识别。[skills.sh 官方 FAQ](https://skills.sh/docs/faq)说明，用户通过 CLI 安装产生的匿名安装统计用于目录展示与排名；[SkillsMP](https://skillsmp.com/)则聚合公开 GitHub Skill 来源。

公开可安装不代表已经被所有网站收录。展示时间、检索结果和收录规则由各站点决定；本项目不将未确认的目录页标为已上线，也不将目录展示视为官方认证。

## 来源与许可

科学镜头设计参考了 HeyChengC 的概念可视化方法，验收机制参考了 LuZhong-Li 的事件同源与检查思路，并针对本项目架构重新实现。来源及未包含的参考素材见[方法来源说明](THIRD_PARTY_NOTICES.md)。

仓库目前尚未声明统一的代码与文档许可证。Remotion、React、Blender 等依赖遵循各自许可证；用户提供的音乐、字体、模型与影像分别管理，公开仓库不授予这些第三方媒体的再分发权限。
