import React, { useState, useEffect } from 'react';

const api = window.electronAPI;

export default function SettingsPanel({ onBack }) {
  const [settings, setSettings] = useState({ hasOpenAIKey: false, hasYouTubeCredentials: false });
  const [openaiKey, setOpenaiKey] = useState('');
  const [ytClientId, setYtClientId] = useState('');
  const [ytClientSecret, setYtClientSecret] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const result = await api.settings.get();
    if (result.success) setSettings(result.data);
  }

  async function handleSave() {
    const updates = {};
    if (openaiKey) updates.openaiApiKey = openaiKey;
    if (ytClientId) updates.youtubeClientId = ytClientId;
    if (ytClientSecret) updates.youtubeClientSecret = ytClientSecret;

    await api.settings.update(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    await loadSettings();
  }

  async function validateKey() {
    const result = await api.settings.validateApiKey();
    if (result.success && result.data.valid) {
      alert('APIキーは有効です');
    } else {
      alert('APIキーが無効です。確認してください。');
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>設定</h2>
        <button className="btn btn-ghost" onClick={onBack}>← 戻る</button>
      </div>

      <div className="section">
        <h3>OpenAI API</h3>
        <p className="setting-status">
          ステータス: {settings.hasOpenAIKey ? '✅ 設定済み' : '❌ 未設定'}
        </p>
        <div className="form-group">
          <label>APIキー（.envでの設定を推奨）</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
          />
          <p className="form-help">
            セキュリティ上、.env ファイルでの設定を推奨します。
            ここで入力した値は現在のセッションのみ有効です。
          </p>
        </div>
        {settings.hasOpenAIKey && (
          <button className="btn btn-outline btn-sm" onClick={validateKey}>
            キーを検証
          </button>
        )}
      </div>

      <div className="section">
        <h3>YouTube Data API</h3>
        <p className="setting-status">
          ステータス: {settings.hasYouTubeCredentials ? '✅ 設定済み' : '❌ 未設定'}
        </p>
        <div className="form-group">
          <label>Client ID</label>
          <input
            type="password"
            value={ytClientId}
            onChange={(e) => setYtClientId(e.target.value)}
            placeholder="xxxx.apps.googleusercontent.com"
          />
        </div>
        <div className="form-group">
          <label>Client Secret</label>
          <input
            type="password"
            value={ytClientSecret}
            onChange={(e) => setYtClientSecret(e.target.value)}
            placeholder="GOCSPX-..."
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          保存
        </button>
        {saved && <span className="save-indicator">保存しました</span>}
      </div>
    </div>
  );
}
