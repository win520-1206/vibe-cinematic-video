# 独立工程脚手架

## 创建与运行

在用户作品目录之外保留 Skill。用 Node 调用 `scripts/create-project.mjs <新目录>`；它只接受不存在或空的目标，复制自包含模板及音频辅助脚本，不自动安装依赖。

- 默认生成待填写的 schemaVersion 2 约定；集数、画幅、帧率、片长仍需本次问答。
- `--contract <配置文件>` 创建已填写项目；结构先校验再复制。
- `--music <素材>` 把指定曲目复制到项目 public，优先于默认音乐。
- 无指定曲目时，私人安装版若有已登记音轨则复制到工程；公开版缺少音轨时提示用户提供，不能下载替代歌曲。
- `--demo` 是独立验证例子，显式采用其示例参数和本地合成音轨，不代表新项目默认值。

创建后进入工程：`npm ci`；`python -m pip install -r requirements.txt`。先确认脚本清单，再 `npm run analyze:music`、`npm run doctor`、`npm run dev`、`npm run stills`、`npm run render`、`npm run check`、`npm run package`。具体命令参数在生成工程 README 中。依赖锁来自实测兼容的一组版本，不代表最新版建议。

## 数据和接口

沿用 v2 project/video/audio/style/keyEvents/output/workflow 字段，新增 episodes。每集包含 id、durationSeconds、scenes、events 和可选 audio 覆盖；顶层 video.durationSeconds 可以作为所有分集共同片长。各集最终音频配置为顶层与分集覆盖的合并。

scenes 用绝对分集秒数 start/end 覆盖全片半开区间，字幕也是绝对秒数。事件使用 id/atSeconds；字幕及场景引用 eventId/eventIds。现有 top-level keyEvents 保留作为制作约定，若要驱动动画必须显式列入本集 events，不能猜测它属于哪集。

统一 `atFrame` 上下文包含 frame/fps/width/height/time/localTime/scene/episode/seed/style/signal/event。模型单独输出；渲染无上一帧依赖。新增题材在共享校验和 Film 中注册自己的 scene kind；模板 walk/distribution 是示范，不是对所有主题的限制。

音频特征用完整分集时间；图表和过程可用镜头局部时间；片段渲染的 --from/--to 是绝对分集帧号且两端包含。Blender 接口见 [blender.md](blender.md)。

## 验收和证据

`script-manifest.json` 是确认稿快照。创建时从初始输入建立；用户确认后独立维护，检查时禁止从实际场景反向生成，避免漏句后自检仍通过。

静态检查：必填值、帧对齐、场景连续、字幕完整、字幕重叠、阅读密度提示、事件引用、音效越界/并发、资产存在、音频缓存有效性。

动态检查：按场景/字幕中点及事件前后帧渲染，采集真实文字盒和画面，检查文字越界与互相重叠。WebGL 输出模型状态只作辅助证据；它不代表图形已被正确绘出。

成片检查：合同与视频哈希、完整帧解码、规格、音轨时长、PCM 峰值/RMS、关键边界像素证据。黑场和静止帧是复核线索，不武断判为错误。报告保留科学、连续观看和审听状态；技术通过不自动更新这些状态。

检查思路参考 [LuZhong-Li 的验收工具](https://github.com/LuZhong-Li/vibe-knowledge-video-skill/blob/main/templates/tools/README.md)。本实现为 Remotion/React/WebGL 重新编写，不依赖其 HTML 钩子，不复制案例文案、常量或阈值。

## 交付边界

项目 package 包含作品媒体及源码，适合交给本次用户。公开 Skill 包仅包含模板、规范、工具及文本例子，不包含私人音轨或原成片。打包不会推送 GitHub。
