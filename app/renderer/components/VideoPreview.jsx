import React from 'react';

export default function VideoPreview({ project, onRender, onBack, loading }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>動画プレビュー</h2>
        <button className="btn btn-ghost" onClick={onBack}>← 戻る</button>
      </div>

      {project.outputPath ? (
        <div className="preview-container">
          <video
            className="video-player"
            controls
            src={`file://${project.outputPath}`}
          >
            お使いのブラウザは動画タグをサポートしていません。
          </video>
          <div className="preview-info">
            <p>出力ファイル: {project.outputPath}</p>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={onRender} disabled={loading}>
              再レンダリング
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>動画がまだレンダリングされていません。</p>
          <button className="btn btn-primary btn-lg" onClick={onRender} disabled={loading}>
            {loading ? 'レンダリング中...' : '動画をレンダリング'}
          </button>
        </div>
      )}
    </div>
  );
}
