import React, { useState } from 'react';

export default function ProjectForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    theme: '',
    duration: '5分',
    tone: 'informative',
    targetAudience: '一般',
    language: 'ja',
    platform: 'youtube',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.theme.trim()) return;
    onSubmit({ ...form, name: form.theme });
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="panel">
      <h2>新しいプロジェクト</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>動画テーマ *</label>
          <textarea
            value={form.theme}
            onChange={(e) => update('theme', e.target.value)}
            placeholder="例: 2024年に注目すべきAI技術トップ5"
            rows={3}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>動画時間</label>
            <select value={form.duration} onChange={(e) => update('duration', e.target.value)}>
              <option value="1分">1分（ショート）</option>
              <option value="3分">3分</option>
              <option value="5分">5分</option>
              <option value="10分">10分</option>
              <option value="15分">15分</option>
            </select>
          </div>

          <div className="form-group">
            <label>トーン</label>
            <select value={form.tone} onChange={(e) => update('tone', e.target.value)}>
              <option value="informative">情報提供</option>
              <option value="entertaining">エンタメ</option>
              <option value="educational">教育的</option>
              <option value="professional">プロフェッショナル</option>
              <option value="casual">カジュアル</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>対象視聴者</label>
            <input
              type="text"
              value={form.targetAudience}
              onChange={(e) => update('targetAudience', e.target.value)}
              placeholder="例: 20-30代のビジネスパーソン"
            />
          </div>

          <div className="form-group">
            <label>言語</label>
            <select value={form.language} onChange={(e) => update('language', e.target.value)}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>対象媒体</label>
          <select value={form.platform} onChange={(e) => update('platform', e.target.value)}>
            <option value="youtube">YouTube</option>
            <option value="tiktok" disabled>TikTok（今後対応）</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !form.theme.trim()}>
            {loading ? '作成中...' : 'プロジェクト作成'}
          </button>
        </div>
      </form>
    </div>
  );
}
