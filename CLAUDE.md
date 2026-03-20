# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered desktop app that automates video creation and YouTube publishing. Enter a topic and the pipeline runs: AI script generation (GPT-4o) -> scene planning -> image generation (DALL-E 3) -> voice synthesis (TTS) -> subtitle generation -> FFmpeg video rendering -> YouTube upload.

**Tech stack:** Electron 33 (main process) + React 18 (renderer, bundled by Webpack 5). SQLite via better-sqlite3 for persistence. OpenAI SDK for AI features. fluent-ffmpeg for video rendering. googleapis for YouTube Data API.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev mode: webpack-dev-server on :3000 + Electron (hot reload)
npm run dev:renderer     # Renderer only (webpack-dev-server)
npm run build:renderer   # Production build of renderer to build/
npm run build            # Full build: renderer + electron-builder package
npm run pack             # Package to directory (no installer)
npm start                # Run production Electron (loads build/index.html)
```

There are no tests in this project.

## Dependency Direction

```
renderer (React) --IPC via preload.js--> electron/main.js --> ipc-handlers.js --> modules/*
```

- Renderer calls `window.electronAPI.*` (exposed by `preload.js` via contextBridge)
- `ipc-handlers.js` is the single hub that wires all IPC channels to backend modules
- Backend modules are independent of each other; only `workflow-engine` orchestrates them
- `data-layer/` (database, storage, logger) is a shared dependency for all modules

## Architecture

| Directory | Role |
|---|---|
| `app/electron/` | Electron main process: window creation (`main.js`), IPC bridge (`preload.js`), handler registration (`ipc-handlers.js`) |
| `app/modules/` | Backend modules, each with `index.js` entry. Self-contained per domain |
| `app/modules/workflow-engine/` | Pipeline orchestrator. Runs 7 steps sequentially, emits progress events |
| `app/modules/data-layer/` | SQLite database, file storage, logger, SimpleStore (JSON persistence) |
| `app/modules/ai-provider/` | OpenAI abstraction layer with base provider pattern |
| `app/renderer/` | React 18 SPA. `App.jsx` is root, manages all views via `view` state |
| `app/renderer/components/` | UI components: ProjectForm, WorkflowPanel, ScriptEditor, SceneList, VideoPreview, YouTubeUpload, SettingsPanel, LogPanel |
| `app/config/` | `default.js` — AI model settings, video encoding defaults, YouTube defaults |
| `app/storage/` | Runtime data directory (gitignored). DB, images, audio, outputs stored here |
| `build/` | Webpack output for renderer |

## Entry Points

- **Main process:** `app/electron/main.js` (package.json `"main"`)
- **Renderer entry:** `app/renderer/index.jsx` (webpack entry)
- **Renderer HTML:** `app/renderer/index.html` (HtmlWebpackPlugin template)
- **IPC contract:** `app/electron/preload.js` defines the full `window.electronAPI` surface
- **IPC implementation:** `app/electron/ipc-handlers.js` registers all `ipcMain.handle` calls

## Workflow Pipeline Steps (in order)

1. `script_generation` — AI script from theme/params
2. `scene_planning` — Split script into scenes
3. `image_generation` — DALL-E image per scene (falls back to placeholder on failure)
4. `voice_generation` — TTS audio per scene
5. `subtitle_generation` — SRT file from scenes
6. `video_rendering` — FFmpeg compositing (requires FFmpeg on PATH)
7. `metadata_generation` — YouTube title/description/tags via AI

## Change Rules

### Do Not Modify (without full understanding of downstream impact)

- `app/electron/preload.js` — Security boundary. Defines the only API surface between main and renderer. Changes here require updating both renderer calls and ipc-handlers.
- `app/electron/main.js` — App lifecycle, DB/storage initialization order matters.
- `app/modules/data-layer/database.js` — Schema changes affect all repositories.
- `webpack.renderer.config.js` — Build configuration for the entire frontend.

### Before Any Change

- Adding a new IPC channel requires changes in three files: `preload.js` (expose API), `ipc-handlers.js` (register handler), and the calling renderer component.
- Adding a new workflow step requires updating `WORKFLOW_STEPS` array and `_executeStep` switch in `app/modules/workflow-engine/index.js`.
- New backend modules should follow the existing pattern: single `index.js` exporting a class, instantiated in `ipc-handlers.js`.
- Environment variables go in `.env` (copied from `.env.example`). Secrets must never be committed.
- The renderer accesses Node/Electron APIs only through `window.electronAPI` — never import Node modules directly in renderer code.
- Verify `npm run build:renderer` succeeds before submitting changes.
