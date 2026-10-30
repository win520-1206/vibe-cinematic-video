# vibe-cinematic-video

让科学过程成为动画，让音乐参与叙事。

一个面向本地编码助手的 **Skill**：将科学主题转化为具有剧情、连续空间运动和声画互动的视频制作流程，覆盖需求问答、资料核验、参考拆解、模型设计、分镜、程序动画、音乐适配、渲染与实际成片验收。

> 本仓库提供 Skill 指令、制作参考、分析脚本和通用动画机制示例。它不是独立的视频剪辑软件，也不是安装后运行一条命令就能自动生成任意成片的应用。

## 特点

- **调用时收集参数**：询问主题、受众、用途、集数、时长、画幅与输出规格，不固定某个集数、片长或转场时刻。
- **连续空间叙事**：通过粒子、透视、对象重组、尺度变化与相机运动呈现过程，而非只给静态页面加入进出场动画。
- **音乐适配**：从所选音乐中分析瞬态、节奏周期、段落变化和高潮候选，再安排揭示、转场、运动与阅读停留。
- **模型驱动图形**：科学模型与视觉表现分开，保留公式、单位、模拟边界和资料依据。
- **可扩展风格**：默认 `cinematic-spatial`，支持增加风格配置和项目级覆盖。
- **可检查交付**：关注实际导出的视频、音轨、字幕和关键帧，不把源码通过或预览成功当作成片验收。

## 适用内容

科普短剧、科学原理演示、粒子与概率动画、模型驱动的知识短片、科技主题系列视频，以及需要加强空间运动和声画互动的既有作品。

默认视觉为近黑蓝背景、暖金与冷蓝层次、连续空间运动和克制泛光；默认以字幕推进叙事、无机械对白。主题、风格、配音方案与交付形式均可调整。

## 快速使用

将本仓库安装到本地 Skills 目录后，在支持该 Skill 的会话中输入：

```text
使用 $vibe-cinematic-video 帮我制作视频。
```

Skill 会先收集本次尚未明确的参数。你也可以一次提供：

```text
使用 $vibe-cinematic-video 制作一组关于光合作用的科学可视化短剧。
受众是大学生，发布到短视频平台。集数、时长和画幅请先与我讨论。
默认使用 cinematic-spatial 风格，以字幕推进叙事，不配机械人声。
我会提供音乐文件，请先分析节奏、鼓点和高潮候选，再设计画面卡点。
先制作包含完整科学过程的代表性样片，再根据我的反馈完成全片。
```

已明确给出的参数不会重复询问。若已要求直接完成全片，流程也不强制增加一次样片确认。

## 本地安装

以 Windows 本地 Codex 环境为例，将仓库目录放到：

```text
%USERPROFILE%\.codex\skills\vibe-cinematic-video\
```

其中 `SKILL.md` 应直接位于上述文件夹内。若环境配置了其他 Skills 根目录，使用实际目录。

下载或克隆后，在仓库根目录的 PowerShell 中执行以下命令；目标目录已存在时先自行备份或合并：

```powershell
$sourcePath = (Get-Location).Path
$skillsRoot = Join-Path $env:USERPROFILE '.codex\skills'
$targetPath = Join-Path $skillsRoot 'vibe-cinematic-video'
if (Test-Path -LiteralPath $targetPath) {
    throw '目标 Skill 已存在，请先备份或合并，避免覆盖本地设置。'
}
New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null
Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Recurse
```

安装位置与源目录应不同。此操作复制 Skill，不会安装 Node、Python、浏览器或渲染工具；使用时仍需检查实际环境。

## 音乐配置

**公开发布版默认不包含音乐文件。** `assets/defaults.json` 保留可选本地音乐路径，缺失时由 Skill 询问素材位置或替代曲目，不会自动下载其他歌曲。

可以选择：

1. 调用时提供自己的音乐路径，优先级最高。
2. 将你有权使用的参考音轨放到 `assets/music/default-reference.m4a`。
3. 在 `assets/defaults.json` 中登记另一个本地音乐资源。

音乐优先级为：**本次指定音乐 → 本次选定的已登记音乐 → 可选本地默认音乐**。

更换曲目、选段、播放速度或分析帧率后，需要重新分析。音量最大不一定是高潮，瞬态也不一定是鼓点；脚本输出用于候选定位，需要结合实际听取和叙事复核。无法听取时应明确标注，不声称已经完成审听。

片长超过曲长时，应讨论循环、重组、追加音乐或调整片长，不静默无限循环或变速。

## 制作流程

```mermaid
flowchart LR
    A[需求与参数问答] --> B[资料核验与参考拆解]
    B --> C[科学模型与剧情]
    C --> D[音乐分析与事件表]
    D --> E[代表性样片或整片制作]
    E --> F[编排与渲染]
    F --> G[实际成片验收]
    G --> H[视频与工程交付]
```

每个段落描述对象的初始状态、动作和结果。音乐与科学过程共同决定镜头时刻，字幕和公式保留阅读窗口。模拟数据、模型预测与真实测量分别标注。

## 实现架构

|层|推荐职责|
|---|---|
|Remotion / React|时间编排、Composition、精确文字、字幕与来源提示|
|WebGL|大量粒子、透视空间、对象重组、表面与后处理|
|Canvas2D|科学曲线、坐标轴、波形、图例与示意图|
|Python / NumPy|音频特征、节奏候选分析、模型与辅助验收|
|FFmpeg / ffprobe|媒体解码、音视频编码与元数据检查|

这些是制作方法，仓库不捆绑完整渲染运行时。`assets/animation-core/` 是通用机制示例，不是完整视频模板。特定题材需要重新设计科学模型与场景。

生产动画按帧号和项目 fps 计算时间，固定随机种子，允许任意帧独立重建。不要依赖浏览器实时计时或并发 worker 的执行顺序。

## 辅助脚本

Python 脚本需要 NumPy：

```shell
python -m pip install -r requirements.txt
```

FFmpeg 和 ffprobe 单独安装或使用已有环境中的版本。先将音频转为整数 PCM WAV，例如：

```shell
ffmpeg -i music.mp3 -vn -ac 1 -ar 48000 -c:a pcm_s16le analysis.wav
```

### 1. 按帧音频特征

```shell
python scripts/audio_features.py --input analysis.wav --fps 30 --output audio-features.json
```

提取低／中／高频能量、RMS 和候选瞬态。示例 `30` 应替换为本次项目 fps；不做语音识别或音源分离。

### 2. 音乐结构候选

```shell
python scripts/music_structure.py --features audio-features.json --output music-analysis.json
```

输出 BPM 候选、估计节拍网格、瞬态、段落变化和高潮候选。存在半速／倍速歧义、变速与非鼓瞬态误判的可能；`listeningStatus` 默认是 `not_reviewed`。

### 3. 导出媒体规格

复制 `assets/project-contract.example.json` 为本次 `project-contract.json`，先完成问答并填写实际输出参数，再检查：

```shell
python scripts/inspect_media.py --ffprobe /path/to/ffprobe --input episode.mp4 --contract project-contract.json --output metadata-check.json
```

该脚本检查元数据与参数约定，并计算关键时刻前后帧号。它不代替完整解码、画面审查、科学核验或实际听取。

## 仓库结构

```text
vibe-cinematic-video/
├── README.md
├── SKILL.md
├── requirements.txt
├── .gitignore
├── agents/
│   └── openai.yaml
├── references/
│   ├── workflow.md
│   ├── architecture.md
│   ├── motion-and-audio.md
│   ├── music-adaptation.md
│   ├── engineering.md
│   ├── scientific-integrity.md
│   ├── verification.md
│   ├── production-lessons.md
│   └── project-contract.md
├── scripts/
│   ├── audio_features.py
│   ├── music_structure.py
│   └── inspect_media.py
└── assets/
    ├── defaults.json
    ├── project-contract.example.json
    ├── RESOURCE_MANIFEST.json
    ├── validation-report.json
    ├── animation-core/
    ├── styles/
    └── music/
        └── README.md
```

## 增加风格

1. 在 `assets/styles/` 新建风格文档，描述配色、空间、材质、文字、运动与声音关系。
2. 在 `assets/styles/index.json` 增加唯一 ID 和文档路径。
3. 调用时指定该 ID，或仅在当前项目中设置临时覆盖。

保留已有风格档案。风格可以提供偏好，不应写死集数、片长、标题长度或音乐高潮时刻。

## 边界与交付

- 科学准确性需要资料与模型核验；光效不能替代解释，也不能颠倒物理因果。
- 脚本分析不等于完成听觉审美判断，元数据通过不等于完整成片通过。
- 生成媒体、实拍或其他3D工具可以按题材加入，不强制全片只用一种技术。
- 推荐交付 MP4、字幕、可编辑工程、资料依据、资源记录与实际验收结果；具体以任务约定为准。

## 素材与授权

仓库代码和制作文档与用户自行加入的音乐、视频、字体、图片分别管理。本发布版不包含原参考音轨或完整成片，也不提供这些第三方资源的再分发授权。

当前未设置仓库代码与文档的 `LICENSE`；维护者可在发布时选择并添加合适的许可证。选择代码许可证时，也应单独说明媒体资源的适用范围。
