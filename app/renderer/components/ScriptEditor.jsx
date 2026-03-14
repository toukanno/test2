import React, { useState, useEffect } from 'react';

const api = window.electronAPI;

export default function ScriptEditor({ project, onGenerate, onBack, loading }) {
  const [script, setScript] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadScript();
  }, [project.id]);

  async function loadScript() {
    const result = await api.script.get(project.id);
    if (result.success && result.data) {
      setScript(result.data);
      setEditText(JSON.stringify(result.data, null, 2));
    }
  }

  async function handleGenerate() {
    const result = await onGenerate({
      theme: project.theme,
      duration: project.duration,
      tone: project.tone,
      targetAudience: project.targetAudience,
      language: project.language,
    });
    if (result?.success) {
      setScript(result.data.script);
      setEditText(JSON.stringify(result.data.script, null, 2));
    }
  }

  async function handleSave() {
    try {
      const parsed = JSON.parse(editText);
      await api.script.update(project.id, parsed);
      setScript(parsed);
      setEditMode(false);
    } catch {
      alert('JSONの形式が正しくありません');
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>台本エディタ</h2>
        <button className="btn btn-ghost" onClick={onBack}>← 戻る</button>
      </div>

      {!script ? (
        <div className="empty-state">
          <p>台本がまだ生成されていません。</p>
          <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={loading}>
            {loading ? 'AI生成中...' : 'AIで台本を生成'}
          </button>
        </div>
      ) : editMode ? (
        <div className="editor">
          <textarea
            className="code-editor"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={30}
          />
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setEditMode(false)}>キャンセル</button>
            <button className="btn btn-primary" onClick={handleSave}>保存</button>
          </div>
        </div>
      ) : (
        <div className="script-view">
          <div className="script-header">
            <h3>{script.title}</h3>
            <div className="script-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setEditMode(true)}>
                編集
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleGenerate} disabled={loading}>
                再生成
              </button>
            </div>
          </div>

          {script.titleAlternatives?.length > 0 && (
            <div className="script-section">
              <h4>タイトル候補</h4>
              <ul>
                {script.titleAlternatives.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}

          <div className="script-section">
            <h4>概要</h4>
            <p>{script.summary}</p>
          </div>

          <div className="script-section">
            <h4>シーン一覧 ({script.scenes?.length || 0})</h4>
            {script.scenes?.map((scene, i) => (
              <div key={i} className="scene-card">
                <div className="scene-card-header">
                  <strong>Scene {scene.sceneNumber}: {scene.title}</strong>
                  <span className="scene-duration">{scene.duration}</span>
                </div>
                <p className="scene-description">{scene.description}</p>
                <div className="scene-narration">
                  <label>ナレーション:</label>
                  <p>{scene.narration}</p>
                </div>
              </div>
            ))}
          </div>

          {script.tags?.length > 0 && (
            <div className="script-section">
              <h4>タグ</h4>
              <div className="tag-list">
                {script.tags.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
