import React, { useState, useEffect } from 'react';

const api = window.electronAPI;

export default function SettingsPanel({ onBack, showToast, systemInfo, onSettingsChanged }) {
  const [settings, setSettings] = useState({ hasOpenAIKey: false, hasYouTubeCredentials: false });
  const [openaiKey, setOpenaiKey] = useState('');
  const [ytClientId, setYtClientId] = useState('');
  const [ytClientSecret, setYtClientSecret] = useState('');

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

    if (Object.keys(updates).length === 0) {
      showToast?.('info', '変更はありません');
      return;
    }

    await api.settings.update(updates);
    showToast?.('success', '設定を保存しました（アプリ再起動後も有効です）');
    setOpenaiKey('');
    setYtClientId('');
    setYtClientSecret('');
    await loadSettings();
    onSettingsChanged?.();
  }

  async function validateKey() {
    const result = await api.settings.validateApiKey();
    if (result.success && result.data.valid) {
      showToast?.('success', 'APIキーは有効です');
    } else {
      showToast?.('error', 'APIキーが無効です。確認してください。');
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>設定</h2>
        <button className="btn btn-ghost" onClick={onBack}>← 戻る</button>
      </div>

      {/* FFmpeg Status */}
      <div className="section">
        <h3>システム</h3>
        <p className="setting-status">
          FFmpeg: {systemInfo?.ffmpegAvailable
            ? `✅ インストール済み (${systemInfo.ffmpegVersion})`
            : '❌ 未インストール — 動画生成に必要です'}
        </p>
        {!systemInfo?.ffmpegAvailable && (
          <p className="form-help">
            FFmpegをインストールしてPATHに追加するか、.envファイルで FFMPEG_PATH を指定してください。
          </p>
        )}
      </div>

      <div className="section">
        <h3>OpenAI API</h3>
        <p className="setting-status">
          ステータス: {settings.hasOpenAIKey ? '✅ 設定済み' : '❌ 未設定'}
        </p>
        <div className="form-group">
          <label>APIキー</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder={settings.hasOpenAIKey ? '（変更する場合のみ入力）' : 'sk-...'}
          />
          <p className="form-help">
            保存した設定はアプリ再起動後も有効です。.env ファイルでの設定も可能です。
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
            placeholder={settings.hasYouTubeCredentials ? '（変更する場合のみ入力）' : 'xxxx.apps.googleusercontent.com'}
          />
        </div>
        <div className="form-group">
          <label>Client Secret</label>
          <input
            type="password"
            value={ytClientSecret}
            onChange={(e) => setYtClientSecret(e.target.value)}
            placeholder={settings.hasYouTubeCredentials ? '（変更する場合のみ入力）' : 'GOCSPX-...'}
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  );
}
