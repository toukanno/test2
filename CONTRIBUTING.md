# Contributing / コントリビューション

## 開発環境

```bash
git clone https://github.com/toukanno/video-auto-editor-2.git
cd video-auto-editor-2
npm install
cp .env.example .env
# .env に OPENAI_API_KEY を設定
npm run dev
```

## ブランチ戦略

- `main` — 安定版
- `feature/*` — 新機能
- `fix/*` — バグ修正

## コミットメッセージ

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント変更
chore: ビルド・設定変更
refactor: リファクタリング
test: テスト追加
```

## Pull Request

1. `main` から `feature/*` ブランチを作成
2. 変更を実装
3. `npm run build:renderer` でビルド確認
4. PR を作成

## Issue

バグ報告・機能要望は Issue で受け付けています。
