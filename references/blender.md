# Blender：可选的离线三维镜头

仅在分镜确定需要复杂实体、剖切、装配、机械运动或材质照明时阅读和启用。普通图表、简单空间示意及音乐响应粒子沿用 Canvas2D/WebGL。未安装 Blender 不影响基础工程。

## 选择与职责

逐镜记录表达收益 benefit、渲染成本 cost、所用 engine、模型和素材来源、交付格式。Blender 创建该镜头；Remotion 保留全片时间轴、字幕、公式、来源和总音轨。不能因为启用了 Blender 就删改已确认剧情或未经说明替换效果。

## 配置

镜头 kind 为 blender，提供 object/action/before/after/understanding/science、start/end/eventIds 和 blender:{benefit,cost,engine}。

无声视频 media：type=video，file 为 public 相对路径，fps 与本片一致，frames 为真实源帧数，sourceStartFrame 从 0 起。

透明序列 media：type=sequence，pattern 如 blender/part-{frame}.png，padding=6，fps/frames 为真实规格，sourceStartFrame 为首个文件号。示例生成器使用 1 起始；所有画面 RGBA PNG。

`npm run blender:render -- --episode E1 --scene scene-id` 运行原创的壳体打开测试镜头。它验证接口，不能声称自动创建正确科学装置。实际题材应重写 blender/build_scene.py 中的几何与动作。命令保存 .blend、job 和 manifest，默认使用 Cycles CPU；用户可选择已验证引擎。

Blender 第 1 帧 = 镜头局部第 0 帧 = Remotion 的场景起始帧。事件局部 Blender 帧 = round((事件秒数−场景开始秒数)×fps)+1。输出视频从本地 0 帧读取；序列按实际首文件号读取。事件必须属于该镜头且帧对齐，不能把动作错到片段开始。

## 音乐驱动与重建

需要音乐驱动 Blender 时，由 public/generated 的预计算音乐特征在 frame_change 或烘焙关键帧中按上述帧映射读取，不能实时播放累计。当前测试镜头只演示共享事件开合，不自动实现所有音乐响应；每个新增响应需在镜头脚本实现并验证。同一事件控制后期强调和音效。

## 缺失与验证

通过 BLENDER_EXECUTABLE 或 PATH 指定 Blender；不自动下载安装。缺少可执行文件时指出具体受影响镜头，提出保留 WebGL 或简化结构的候选，用户锁定的镜头不得静默降级。

检查版本、实际渲染引擎、素材路径、源视频 fps/帧数、透明通道、事件前后帧及接缝。保存渲染参数和来源。只做过 Python 语法检查、没有运行 Blender 时，报告必须注明该分支未渲染验证。未来支持的 Blender 版本需要实际运行后登记，不能仅凭脚本存在声称兼容所有版本。
