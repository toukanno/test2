import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import WorkflowPanel from './components/WorkflowPanel';
import ScriptEditor from './components/ScriptEditor';
import SceneList from './components/SceneList';
import VideoPreview from './components/VideoPreview';
import YouTubeUpload from './components/YouTubeUpload';
import LogPanel from './components/LogPanel';
import SettingsPanel from './components/SettingsPanel';

const api = window.electronAPI;

function Toast({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.level}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="toast-icon">
            {toast.level === 'success' ? '✓' : toast.level === 'error' ? '✗' : 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onCancel}>キャンセル</button>
          <button className="btn btn-primary" onClick={onConfirm} autoFocus>OK</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [view, setView] = useState('home');
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastIdRef = useRef(0);

  // Toast helpers
  const showToast = useCallback((level, message, duration = 4000) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, level, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load system info + projects on mount
  useEffect(() => {
    (async () => {
      try {
        const info = await api.system.info();
        if (info.success) setSystemInfo(info.data);
      } catch (err) {
        console.error('Failed to load system info:', err);
      }
      loadProjects();
    })();
  }, []);

  // Listen for workflow events
  useEffect(() => {
    const cleanups = [];

    cleanups.push(api.on('workflow:progress', (data) => {
      setWorkflowStatus((prev) => ({
        ...prev,
        ...data,
        steps: prev?.steps?.map((s) =>
          s.id === data.step ? { ...s, status: data.status } : s
        ) || [],
      }));
      addLog('info', `[${data.stepName}] ${data.status} - ${data.overallProgress}%`);
    }));

    cleanups.push(api.on('workflow:stepComplete', (data) => {
      setWorkflowStatus((prev) => ({
        ...prev,
        steps: prev?.steps?.map((s) =>
          s.id === data.step ? { ...s, status: 'completed' } : s
        ) || [],
        overallProgress: data.overallProgress,
      }));
      addLog('success', `✓ ${data.stepName} 完了`);
      showToast('success', `${data.stepName} 完了`);
    }));

    cleanups.push(api.on('workflow:error', (data) => {
      setWorkflowStatus((prev) => ({
        ...prev,
        status: 'failed',
        steps: prev?.steps?.map((s) =>
          s.id === data.step ? { ...s, status: 'failed', error: data.error } : s
        ) || [],
      }));
      addLog('error', `✗ ${data.stepName} 失敗: ${data.error}`);
      showToast('error', `${data.stepName} 失敗: ${data.error}`, 6000);
    }));

    cleanups.push(api.on('render:progress', (data) => {
      addLog('info', `動画レンダリング: ${data.progress}%`);
    }));

    cleanups.push(api.on('upload:progress', (data) => {
      addLog('info', `アップロード: ${data.progress}%`);
    }));

    return () => cleanups.forEach((fn) => fn && fn());
  }, []);

  const addLog = useCallback((level, message) => {
    setLogs((prev) => [...prev.slice(-199), { timestamp: new Date().toISOString(), level, message }]);
  }, []);

  async function loadProjects() {
    try {
      const result = await api.project.list();
      if (result.success) setProjects(result.data);
    } catch (err) {
      console.error('loadProjects failed:', err);
    }
  }

  async function selectProject(project) {
    try {
      const result = await api.project.get(project.id);
      if (result.success) {
        setCurrentProject(result.data);
        setView('workflow');
        const statusResult = await api.workflow.getStatus(project.id);
        if (statusResult.success) setWorkflowStatus(statusResult.data);
      }
    } catch (err) {
      showToast('error', `プロジェクト読み込み失敗: ${err.message}`);
    }
  }

  async function createProject(data) {
    setLoading(true);
    try {
      const result = await api.project.create(data);
      if (result.success) {
        setCurrentProject(result.data);
        await loadProjects();
        setView('workflow');
        showToast('success', `プロジェクト「${result.data.name}」を作成しました`);
        addLog('info', `プロジェクト「${result.data.name}」を作成しました`);
      } else {
        showToast('error', `作成失敗: ${result.error}`);
      }
    } catch (err) {
      showToast('error', `作成失敗: ${err.message}`);
    }
    setLoading(false);
  }

  function deleteProject(id) {
    const project = projects.find((p) => p.id === id);
    setConfirmDialog({
      message: `プロジェクト「${project?.name || ''}」を削除しますか？\nこの操作は取り消せません。`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const result = await api.project.delete(id);
          if (result.success) {
            if (currentProject?.id === id) {
              setCurrentProject(null);
              setView('home');
            }
            await loadProjects();
            showToast('info', 'プロジェクトを削除しました');
          }
        } catch (err) {
          showToast('error', `削除失敗: ${err.message}`);
        }
      },
    });
  }

  async function startWorkflow() {
    if (!currentProject) return;
    if (!systemInfo?.hasOpenAIKey) {
      showToast('error', 'OpenAI APIキーが設定されていません。設定画面からキーを入力してください。', 6000);
      return;
    }
    setLoading(true);
    addLog('info', 'ワークフロー開始...');
    try {
      const result = await api.workflow.start(currentProject.id);
      if (result.success) {
        showToast('info', 'ワークフローを開始しました');
        const statusResult = await api.workflow.getStatus(currentProject.id);
        if (statusResult.success) setWorkflowStatus(statusResult.data);
      } else {
        addLog('error', `ワークフロー開始失敗: ${result.error}`);
        showToast('error', result.error, 6000);
      }
    } catch (err) {
      addLog('error', `ワークフロー開始失敗: ${err.message}`);
      showToast('error', err.message, 6000);
    }
    setLoading(false);
  }

  async function generateScript(params) {
    if (!currentProject) return;
    setLoading(true);
    addLog('info', '台本を生成中...');
    try {
      const result = await api.script.generate(currentProject.id, params);
      if (result.success) {
        addLog('success', `台本生成完了: ${result.data.scenes.length}シーン`);
        showToast('success', `台本生成完了（${result.data.scenes.length}シーン）`);
        const projResult = await api.project.get(currentProject.id);
        if (projResult.success) setCurrentProject(projResult.data);
      } else {
        addLog('error', `台本生成失敗: ${result.error}`);
        showToast('error', `台本生成失敗: ${result.error}`, 6000);
      }
      setLoading(false);
      return result;
    } catch (err) {
      addLog('error', `台本生成失敗: ${err.message}`);
      showToast('error', `台本生成失敗: ${err.message}`, 6000);
      setLoading(false);
    }
  }

  async function renderVideo() {
    if (!currentProject) return;
    if (!systemInfo?.ffmpegAvailable) {
      showToast('error', 'FFmpegがインストールされていません。動画生成にはFFmpegが必要です。', 6000);
      return;
    }
    setLoading(true);
    addLog('info', '動画をレンダリング中...');
    try {
      const result = await api.video.render(currentProject.id);
      if (result.success) {
        addLog('success', '動画レンダリング完了');
        showToast('success', '動画レンダリング完了');
        const projResult = await api.project.get(currentProject.id);
        if (projResult.success) setCurrentProject(projResult.data);
      } else {
        addLog('error', `レンダリング失敗: ${result.error}`);
        showToast('error', `レンダリング失敗: ${result.error}`, 6000);
      }
    } catch (err) {
      addLog('error', `レンダリング失敗: ${err.message}`);
      showToast('error', `レンダリング失敗: ${err.message}`, 6000);
    }
    setLoading(false);
  }

  const statusColors = {
    draft: '#6b7280', processing: '#f59e0b', rendered: '#3b82f6',
    ready_for_review: '#8b5cf6', uploaded: '#10b981', failed: '#ef4444',
  };

  const statusLabels = {
    draft: '下書き', processing: '処理中', rendered: 'レンダリング済み',
    ready_for_review: '確認待ち', uploaded: 'アップロード済み', failed: 'エラー',
  };

  return (
    <div className="app-container">
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* System warnings */}
      {systemInfo && !systemInfo.ffmpegAvailable && view !== 'settings' && (
        <div className="system-warning">
          FFmpegが見つかりません — 動画生成機能が使えません。
          <button className="btn btn-ghost btn-sm" onClick={() => setView('settings')}>設定を確認</button>
        </div>
      )}

      {/* Sidebar - Project List */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">AI Video</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>
            + 新規
          </button>
        </div>
        <ProjectList
          projects={projects}
          currentId={currentProject?.id}
          onSelect={selectProject}
          onDelete={deleteProject}
          statusLabels={statusLabels}
          statusColors={statusColors}
        />
        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => setView('settings')}>
            ⚙ 設定
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {view === 'home' && (
          <div className="welcome-screen">
            <h2>AI Video Generator</h2>
            <p>テーマを入力するだけで、YouTube動画を半自動生成。</p>
            <button className="btn btn-primary btn-lg" onClick={() => setView('create')}>
              新しいプロジェクトを作成
            </button>
          </div>
        )}

        {view === 'create' && (
          <ProjectForm
            onSubmit={createProject}
            onCancel={() => setView(currentProject ? 'workflow' : 'home')}
            loading={loading}
          />
        )}

        {view === 'workflow' && currentProject && (
          <WorkflowPanel
            project={currentProject}
            workflowStatus={workflowStatus}
            onStartWorkflow={startWorkflow}
            onNavigate={setView}
            loading={loading}
            statusLabels={statusLabels}
            statusColors={statusColors}
            systemInfo={systemInfo}
          />
        )}

        {view === 'script' && currentProject && (
          <ScriptEditor
            project={currentProject}
            onGenerate={generateScript}
            onBack={() => setView('workflow')}
            loading={loading}
            showToast={showToast}
          />
        )}

        {view === 'scenes' && currentProject && (
          <SceneList
            project={currentProject}
            onBack={() => setView('workflow')}
            showToast={showToast}
          />
        )}

        {view === 'preview' && currentProject && (
          <VideoPreview
            project={currentProject}
            onRender={renderVideo}
            onBack={() => setView('workflow')}
            loading={loading}
          />
        )}

        {view === 'upload' && currentProject && (
          <YouTubeUpload
            project={currentProject}
            onBack={() => setView('workflow')}
            addLog={addLog}
            showToast={showToast}
          />
        )}

        {view === 'settings' && (
          <SettingsPanel
            onBack={() => setView(currentProject ? 'workflow' : 'home')}
            showToast={showToast}
            systemInfo={systemInfo}
            onSettingsChanged={async () => {
              const info = await api.system.info();
              if (info.success) setSystemInfo(info.data);
            }}
          />
        )}
      </main>

      {/* Right Panel - Logs */}
      <aside className="log-panel">
        <LogPanel logs={logs} onClear={() => setLogs([])} />
      </aside>
    </div>
  );
}
