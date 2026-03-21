# Video Auto Editor

> AI-powered video creation & publishing automation / AI動画自動生成＆投稿ツール

[![CI](https://github.com/toukanno/video-auto-editor-2/actions/workflows/ci.yml/badge.svg)](https://github.com/toukanno/video-auto-editor-2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://www.electronjs.org/)

テーマを入力するだけで、**AI台本生成 → 画像生成 → 音声合成 → 動画レンダリング → YouTube投稿** までを自動化するデスクトップアプリです。

Enter a topic and automatically generate a full video — from AI script writing to YouTube upload.

## Features / 機能

| Feature | Description |
|---|---|
| 🤖 AI Script | OpenAI GPT-4o で台本を自動生成 |
| 🎬 Scene Planning | シーン構成を自動設計 |
| 🖼️ Image Generation | DALL-E 3 で各シーンの画像を生成 |
| 🔊 Voice Synthesis | OpenAI TTS でナレーション音声を生成 |
| 📝 Subtitles | 字幕ファイルを自動生成 |
| 🎥 Video Rendering | FFmpeg で動画を合成 |
| 📤 YouTube Upload | YouTube Data API で自動投稿 |
| 🔄 Workflow Engine | 全工程をパイプラインで一括実行 |

## Quick Start

```bash
git clone https://github.com/toukanno/video-auto-editor-2.git
cd video-auto-editor-2
npm install
npm start
```

## Architecture / アーキテクチャ

```
app/
├── electron/              # Main process (Electron)
│   ├── main.js            #   Window creation, lifecycle
│   ├── preload.js         #   Context bridge (secure IPC)
│   └── ipc-handlers.js    #   IPC handler registration
├── modules/               # Backend modules
│   ├── ai-provider/       #   OpenAI API abstraction
│   ├── script-generator/  #   AI script generation
│   ├── scene-planner/     #   Scene decomposition
│   ├── image-generator/   #   DALL-E image generation
│   ├── voice-generator/   #   TTS voice synthesis
│   ├── subtitle-generator/#   Subtitle file creation
│   ├── video-generator/   #   FFmpeg video rendering
│   ├── youtube-publisher/ #   YouTube Data API upload
│   ├── workflow-engine/   #   Pipeline orchestration
│   └── data-layer/        #   SQLite DB, storage, logging
├── renderer/              # Frontend (React 18)
│   ├── App.jsx
│   └── components/
│       ├── ProjectForm.jsx
│       ├── ProjectList.jsx
│       ├── ScriptEditor.jsx
│       ├── SceneList.jsx
│       ├── VideoPreview.jsx
│       ├── YouTubeUpload.jsx
│       ├── WorkflowPanel.jsx
│       ├── SettingsPanel.jsx
│       └── LogPanel.jsx
├── config/                # App configuration
└── storage/               # Local data (gitignored)
```

## Installation / インストール

### 必要なもの

- **Node.js** 22+
- **FFmpeg** (動画レンダリングに必要)
- **OpenAI API Key**

### セットアップ

```bash
git clone https://github.com/toukanno/video-auto-editor-2.git
cd video-auto-editor-2
npm install
cp .env.example .env
```

`.env` を編集:

```
OPENAI_API_KEY=sk-your-key-here
YOUTUBE_CLIENT_ID=your-google-client-id
YOUTUBE_CLIENT_SECRET=your-google-client-secret
```

### 起動

```bash
# 開発モード（Hot reload）
npm run dev

# プロダクション
npm start
```

## Build / ビルド

```bash
# Renderer のみビルド
npm run build:renderer

# Electron アプリとしてパッケージング
npm run build

# ディレクトリ出力（テスト用）
npm run pack
```

出力先: `dist/`

## Tech Stack / 技術スタック

| Layer | Technology |
|---|---|
| Framework | Electron 33 |
| Frontend | React 18 + Webpack 5 |
| AI | OpenAI API (GPT-4o, DALL-E 3, TTS) |
| Video | FFmpeg (fluent-ffmpeg) |
| Database | SQLite (better-sqlite3) |
| Upload | YouTube Data API (googleapis) |

## Roadmap

- [x] v0.1 — MVP: Script → Image → Voice → Video pipeline
- [ ] v0.2 — Video editing engine improvements (transitions, effects)
- [ ] v0.3 — Multi-language support, batch processing
- [ ] v0.4 — TikTok / Instagram Reels auto-upload
- [ ] v1.0 — Stable release with installer

## Related / 関連リポジトリ

| Repository | Role |
|---|---|
| **video-auto-editor-2** (this) | Electron desktop app — GUI workflow |
| [video-auto-editor-1](https://github.com/toukanno/video-auto-editor-1) | Laravel backend — job processing reference |

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## License

[MIT](LICENSE)

## Development Rules

- [AGENTS.md](./AGENTS.md) — Sub-agent configuration for Claude Code / Codex
- Commits must pass CI before merging to main
- Use feature branches + pull requests for all changes
