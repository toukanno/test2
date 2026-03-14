import React from 'react';

const STEPS = [
  { id: 'script_generation', name: '台本生成', icon: '📝', view: 'script' },
  { id: 'scene_planning', name: 'シーン分割', icon: '🎬', view: 'scenes' },
  { id: 'image_generation', name: '画像生成', icon: '🖼', view: 'scenes' },
  { id: 'voice_generation', name: '音声生成', icon: '🎙', view: 'scenes' },
  { id: 'subtitle_generation', name: '字幕生成', icon: '💬', view: null },
  { id: 'video_rendering', name: '動画結合', icon: '🎥', view: 'preview' },
  { id: 'metadata_generation', name: 'メタデータ', icon: '📋', view: null },
];

export default function WorkflowPanel({ project, workflowStatus, onStartWorkflow, onNavigate, loading, statusLabels, statusColors }) {
  const getStepStatus = (stepId) => {
    if (!workflowStatus?.steps) return 'pending';
    const step = workflowStatus.steps.find((s) => s.id === stepId);
    return step?.status || 'pending';
  };

  const stepStatusIcons = {
    pending: '○',
    running: '◉',
    completed: '●',
    failed: '✗',
  };

  const stepStatusColors = {
    pending: '#6b7280',
    running: '#f59e0b',
    completed: '#10b981',
    failed: '#ef4444',
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>{project.name}</h2>
          <span
            className="status-badge"
            style={{ backgroundColor: statusColors[project.status] || '#6b7280' }}
          >
            {statusLabels[project.status] || project.status}
          </span>
        </div>
        <div className="panel-actions">
          <button
            className="btn btn-primary"
            onClick={onStartWorkflow}
            disabled={loading || project.status === 'processing'}
          >
            {project.status === 'processing' ? '処理中...' : '自動生成開始'}
          </button>
        </div>
      </div>

      <div className="workflow-steps">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} className={`workflow-step workflow-step-${status}`}>
              <div className="workflow-step-indicator">
                <span style={{ color: stepStatusColors[status] }}>
                  {stepStatusIcons[status]}
                </span>
                {index < STEPS.length - 1 && <div className="workflow-step-line" />}
              </div>
              <div className="workflow-step-content">
                <div className="workflow-step-header">
                  <span className="workflow-step-icon">{step.icon}</span>
                  <span className="workflow-step-name">{step.name}</span>
                  {status === 'failed' && (
                    <span className="workflow-step-error">エラー</span>
                  )}
                </div>
                {step.view && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onNavigate(step.view)}
                  >
                    編集・確認 →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {workflowStatus && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${workflowStatus.overallProgress || 0}%` }}
            />
          </div>
          <span className="progress-text">{workflowStatus.overallProgress || 0}%</span>
        </div>
      )}

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="btn btn-outline" onClick={() => onNavigate('script')}>
          台本を編集
        </button>
        <button className="btn btn-outline" onClick={() => onNavigate('scenes')}>
          シーン管理
        </button>
        <button className="btn btn-outline" onClick={() => onNavigate('preview')}>
          プレビュー
        </button>
        <button
          className="btn btn-success"
          onClick={() => onNavigate('upload')}
          disabled={project.status !== 'rendered' && project.status !== 'ready_for_review'}
        >
          YouTubeへ投稿
        </button>
      </div>
    </div>
  );
}
