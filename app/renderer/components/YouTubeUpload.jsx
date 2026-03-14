import React, { useState, useEffect } from 'react';

const api = window.electronAPI;

export default function YouTubeUpload({ project, onBack, addLog }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [channelInfo, setChannelInfo] = useState(null);
  const [meta, setMeta] = useState({
    title: '',
    description: '',
    tags: [],
    privacyStatus: 'private',
    publishAt: '',
    thumbnailPath: '',
  });
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const result = await api.youtube.checkAuth();
    if (result.success) setAuthenticated(result.data.authenticated);
  }

  async function handleAuth() {
    setLoading(true);
    const result = await api.youtube.auth();
    if (result.success) {
      setAuthenticated(true);
      setChannelInfo(result.data);
      addLog('success', `YouTube認証成功: ${result.data.channelName}`);
    } else {
      addLog('error', `YouTube認証失敗: ${result.error}`);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await api.youtube.logout();
    setAuthenticated(false);
    setChannelInfo(null);
  }

  async function generateMeta() {
    setLoading(true);
    const result = await api.youtube.generateMeta(project.id);
    if (result.success) {
      setMeta({
        ...meta,
        title: result.data.title || '',
        description: result.data.description || '',
        tags: result.data.tags || [],
        categoryId: result.data.category || '22',
      });
      setTagsInput((result.data.tags || []).join(', '));
      addLog('success', 'メタデータ生成完了');
    } else {
      addLog('error', `メタデータ生成失敗: ${result.error}`);
    }
    setLoading(false);
  }

  async function handleUpload() {
    if (!authenticated) {
      addLog('error', 'YouTubeにログインしてください');
      return;
    }
    if (!project.outputPath) {
      addLog('error', '動画ファイルがありません。先にレンダリングしてください');
      return;
    }

    const confirmed = confirm(
      `以下の内容でYouTubeにアップロードします。よろしいですか？\n\n` +
      `タイトル: ${meta.title}\n` +
      `公開設定: ${meta.privacyStatus}\n` +
      `${meta.publishAt ? `公開予約: ${meta.publishAt}` : ''}`
    );
    if (!confirmed) return;

    setUploading(true);
    addLog('info', 'アップロード開始...');

    const uploadMeta = {
      ...meta,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };

    const result = await api.youtube.upload(project.id, uploadMeta);
    if (result.success) {
      setUploadResult(result.data);
      addLog('success', `アップロード完了: ${result.data.videoUrl}`);
    } else {
      addLog('error', `アップロード失敗: ${result.error}`);
    }
    setUploading(false);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>YouTube投稿</h2>
        <button className="btn btn-ghost" onClick={onBack}>← 戻る</button>
      </div>

      {/* Auth Section */}
      <div className="section">
        <h3>YouTube認証</h3>
        {authenticated ? (
          <div className="auth-status auth-connected">
            <span>接続済み {channelInfo ? `(${channelInfo.channelName})` : ''}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>ログアウト</button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleAuth} disabled={loading}>
            {loading ? '認証中...' : 'Googleアカウントでログイン'}
          </button>
        )}
      </div>

      {/* Metadata Section */}
      <div className="section">
        <div className="section-header">
          <h3>投稿情報</h3>
          <button className="btn btn-outline btn-sm" onClick={generateMeta} disabled={loading}>
            AIで自動生成
          </button>
        </div>

        <div className="form">
          <div className="form-group">
            <label>タイトル</label>
            <input
              type="text"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder="動画タイトル"
              maxLength={100}
            />
            <span className="char-count">{meta.title.length}/100</span>
          </div>

          <div className="form-group">
            <label>説明文</label>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              placeholder="動画の説明"
              rows={8}
            />
          </div>

          <div className="form-group">
            <label>タグ（カンマ区切り）</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="AI, テクノロジー, 解説"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>公開設定</label>
              <select
                value={meta.privacyStatus}
                onChange={(e) => setMeta({ ...meta, privacyStatus: e.target.value })}
              >
                <option value="private">非公開</option>
                <option value="unlisted">限定公開</option>
                <option value="public">公開</option>
              </select>
            </div>

            <div className="form-group">
              <label>公開予約（オプション）</label>
              <input
                type="datetime-local"
                value={meta.publishAt}
                onChange={(e) => setMeta({ ...meta, publishAt: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="section">
        <h3>アップロード</h3>
        {uploadResult ? (
          <div className="upload-result">
            <p>アップロード完了！</p>
            <p>Video ID: {uploadResult.videoId}</p>
            <p>URL: {uploadResult.videoUrl}</p>
          </div>
        ) : (
          <div className="upload-actions">
            {!project.outputPath && (
              <p className="warning">動画ファイルがありません。先にレンダリングしてください。</p>
            )}
            <button
              className="btn btn-success btn-lg"
              onClick={handleUpload}
              disabled={uploading || !authenticated || !project.outputPath || !meta.title}
            >
              {uploading ? 'アップロード中...' : '確認してアップロード'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
