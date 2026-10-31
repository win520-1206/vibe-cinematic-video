# Cinematic science project

Generated from vibe-cinematic-video. This project is independent of the Skill and earlier productions.

1. `npm ci` and `python -m pip install -r requirements.txt`.
2. Complete `project-contract.json`; no missing project values are inferred. The `--demo` option creates an explicitly configured random-walk demonstration, not defaults for new films.
3. Confirm the script and maintain `script-manifest.json` independently. Do not regenerate it from the film during checks.
4. `npm run analyze:music`, then `npm run doctor`, then `npm run dev`.
5. `npm run stills`, `npm run render`, `npm run check`, then `npm run package`.

`npm run render -- --episode E1 --from 24 --to 71` renders inclusive, absolute episode frames. The music remains at the same episode position. Partial outputs cannot substitute for a final full render.

`npm run check -- --static` checks configuration/assets without rendering. Full check measures actual React text boxes, decodes video/audio and captures event boundaries. It is not scientific, perceptual readability or listening approval. Inspect `qa/report.json` and the real video. Reading-rate limits are review hints, not comprehension guarantees.

## Configuration

Each episode supplies scenes covering `[0,durationSeconds)` without gaps. Times are absolute episode seconds and must align to frames. Captions have unique IDs, text and start/end. Events have unique IDs and atSeconds; scenes/captions reference event IDs. A procedural sound uses durationSeconds, gainDb and optional frequency; an external sound adds a public-relative file.

`audio.file` is relative to `public/`; cropStartSeconds selects the first source sample. The crop must cover the episode. No silent looping/time-stretching. Generated features use the music-only bus, while mix.wav includes event sounds. A missing or stale cache fails. `audio.required:false` explicitly selects silence.

Supported starter scenes are `walk`, `distribution`, `blender`. Register new subject-specific scenes in the shared validation and Film renderer. The random walk is a teaching example, not a generic physical model.

`style.tokens` overrides background/warm/cool/text/fontFamily. Optional `fontFile` is public-relative and is loaded before capture. With no font file the starter deliberately uses the system sans-serif; supply a redistributable font for consistent cross-machine typography.

## Environment

Optional environment variables: BROWSER_EXECUTABLE, PYTHON, FFMPEG, FFPROBE, BLENDER_EXECUTABLE, RENDER_CONCURRENCY. FFmpeg/ffprobe first use explicit paths/PATH, then the project's own Remotion compositor package. Browser detection covers common installed Chrome/Edge paths; no automatic download. Blender is optional.

## Optional Blender

Plan a scene of kind blender with `blender:{benefit,cost,engine}` and an existing event ID. Media is `{type:'video',file:'blender/scene.mp4',fps,frames,sourceStartFrame:0}` or `{type:'sequence',pattern:'blender/scene-{frame}.png',padding:6,fps,frames,sourceStartFrame:1}`.

Run `npm run blender:render -- --episode E1 --scene scene-id`. The supplied builder is an original shell-opening interface test, not an automatic scientific modeler. Replace geometry for the real subject. It writes a .blend source, a job/manifest and renders frames; video output is muted. Blender frame 1 corresponds to scene local frame 0. React overlays captions and sources. Preserve exact fps/frame count; transparent sequences use RGBA PNG. Missing Blender fails explicitly without replacing the scene. The basic demo never needs Blender.

## Delivery

Package copies project sources and the current media into a timestamped deliveries directory and exports SRT. It intentionally contains this project's media; this is distinct from the public Skill ZIP, which excludes private media. No server, node_modules, credentials or rendering caches are packaged. Commit source provenance and manual review findings in docs.
