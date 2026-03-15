# video-auto-editor-2（AI Video Generator）

動画編集自動化ツールの試作2です。Electron + React製のデスクトップアプリとして、AI台本生成から動画合成・YouTube投稿までをGUIで操作できます。

## 概要

テーマを入力するだけで以下を自動処理:

1. AI台本生成（OpenAI）
2. シーン構成の自動設計
3. 画像生成（各シーン用）
4. AI音声生成（ナレーション）
5. 字幕生成
6. 動画合成（FFmpeg）
7. YouTube自動投稿

## 技術スタック

- **Framework**: Electron 33 + React 18
- **ビルド**: Webpack + Babel
- **AI**: OpenAI API（台本・画像・音声）
- **動画処理**: fluent-ffmpeg
- **データ**: better-sqlite3
- **投稿連携**: YouTube Data API（googleapis）

## ディレクトリ

```
app/
├── config/            # アプリ設定
├── electron/          # Electronメインプロセス
├── modules/
│   ├── ai-provider/       # OpenAI API連携
│   ├── script-generator/  # AI台本生成
│   ├── scene-planner/     # シーン構成
│   ├── image-generator/   # 画像生成
│   ├── voice-generator/   # AI音声生成
│   ├── subtitle-generator/# 字幕生成
│   ├── video-generator/   # 動画合成
│   ├── youtube-publisher/ # YouTube投稿
│   ├── workflow-engine/   # ワークフロー制御
│   └── data-layer/        # DB・ストレージ
├── renderer/          # React UI
│   └── components/
└── storage/           # ローカルデータ
```

## セットアップ

```bash
npm install
cp .env.example .env
# .env に OPENAI_API_KEY を設定
npm start
```

## 使い分け

| リポジトリ | 役割 |
|---|---|
| video-auto-editor-1 | Laravel製バックエンド。ジョブ処理・API連携の検証 |
| **video-auto-editor-2**（このリポ） | Electron製デスクトップアプリ。GUI操作でのワークフロー実行 |
