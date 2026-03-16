import React, { useState, useEffect } from 'react';

const api = window.electronAPI;

export default function SceneList({ project, onBack, showToast }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    loadScenes();
  }, [project.id]);

  async function loadScenes() {
    const result = await api.scene.list(project.id);
    if (result.success) setScenes(result.data);
  }

  async function generateImage(sceneId) {
    setLoading((prev) => ({ ...prev, [`img_${sceneId}`]: true }));
    const result = await api.scene.generateImage(sceneId);
    if (result.success) {
      await loadScenes();
      showToast?.('success', '画像を生成しました');
    } else {
      showToast?.('error', `画像生成失敗: ${result.error}`);
    }
    setLoading((prev) => ({ ...prev, [`img_${sceneId}`]: false }));
  }

  async function generateVoice(sceneId) {
    setLoading((prev) => ({ ...prev, [`voice_${sceneId}`]: true }));
    const result = await api.voice.generate(sceneId);
    if (result.success) {
      await loadScenes();
      showToast?.('success', '音声を生成しました');
    } else {
      showToast?.('error', `音声生成失敗: ${result.error}`);
    }
    setLoading((prev) => ({ ...prev, [`voice_${sceneId}`]: false }));
  }

  async function importAudio(sceneId) {
    const result = await api.voice.importFile(sceneId);
    if (result.success) {
      await loadScenes();
      showToast?.('success', '音声ファイルをインポートしました');
    }
  }

  const statusIcon = (status) => {
    switch (status) {
      case 'generated': return '✅';
      case 'imported': return '📥';
      case 'placeholder': return '⬜';
      case 'pending': return '⏳';
      default: return '○';
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>シーン管理 ({scenes.length}シーン)</h2>
        <button className="btn btn-ghost" onClick={onBack}>← 戻る</button>
      </div>

      {scenes.length === 0 ? (
        <div className="empty-state">
          <p>シーンがまだありません。まず台本を生成してください。</p>
        </div>
      ) : (
        <div className="scene-grid">
          {scenes.map((scene) => (
            <div key={scene.id} className="scene-card">
              <div className="scene-card-header">
                <strong>Scene {scene.sceneNumber}: {scene.title}</strong>
                <span className="scene-duration">{scene.duration}秒</span>
              </div>

              <p className="scene-description">{scene.description}</p>

              <div className="scene-narration">
                <label>ナレーション:</label>
                <p>{scene.narration}</p>
              </div>

              {/* Image preview */}
              {scene.imagePath && scene.imageStatus === 'generated' && (
                <div className="scene-preview">
                  <img
                    src={`file://${scene.imagePath}`}
                    alt={`Scene ${scene.sceneNumber}`}
                    className="scene-preview-img"
                  />
                </div>
              )}

              <div className="scene-assets">
                <div className="scene-asset">
                  <span>画像: {statusIcon(scene.imageStatus)} {scene.imageStatus || 'なし'}</span>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => generateImage(scene.id)}
                    disabled={loading[`img_${scene.id}`]}
                  >
                    {loading[`img_${scene.id}`] ? '生成中...' : scene.imageStatus === 'generated' ? '再生成' : '画像生成'}
                  </button>
                </div>

                <div className="scene-asset">
                  <span>音声: {statusIcon(scene.audioStatus)} {scene.audioStatus || 'なし'}</span>
                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => generateVoice(scene.id)}
                      disabled={loading[`voice_${scene.id}`]}
                    >
                      {loading[`voice_${scene.id}`] ? '生成中...' : scene.audioStatus === 'generated' ? '再生成' : '音声生成'}
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => importAudio(scene.id)}
                    >
                      インポート
                    </button>
                  </div>
                </div>
              </div>

              {scene.imagePrompt && (
                <details className="scene-details">
                  <summary>画像プロンプト</summary>
                  <p className="prompt-text">{scene.imagePrompt}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
