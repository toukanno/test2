import React, { useState, useEffect, useCallback } from 'react';
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

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [view, setView] = useState('home'); // home, create, workflow, script, scenes, preview, upload, settings
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Listen for workflow events
  useEffect(() => {
    const cleanups = [];

    cleanups.push(api.on('workflow:progress', (data) => {
      setWorkflowStatus((prev) => ({ ...prev, ...data }));
      addLog('info', `[${data.stepName}] ${data.status} - ${data.overallProgress}%`);
    }));

    cleanups.push(api.on('workflow:stepComplete', (data) => {
      addLog('success', `✓ ${data.stepName} 完了`);
    }));

    cleanups.push(api.on('workflow:error', (data) => {
      addLog('error', `✗ ${data.stepName} 失敗: ${data.error}`);
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
    const result = await api.project.list();
    if (result.success) setProjects(result.data);
  }

  async function selectProject(project) {
    const result = await api.project.get(project.id);
    if (result.success) {
      setCurrentProject(result.data);
      setView('workflow');
      // Load workflow status
      const statusResult = await api.workflow.getStatus(project.id);
      if (statusResult.success) setWorkflowStatus(statusResult.data);
    }
  }

  async function createProject(data) {
    setLoading(true);
    const result = await api.project.create(data);
    if (result.success) {
      setCurrentProject(result.data);
      await loadProjects();
      setView('workflow');
      addLog('info', `プロジェクト「${result.data.name}」を作成しました`);
    }
    setLoading(false);
  }

  async function deleteProject(id) {
    const result = await api.project.delete(id);
    if (result.success) {
      if (currentProject?.id === id) {
        setCurrentProject(null);
        setView('home');
      }
      await loadProjects();
    }
  }

  async function startWorkflow() {
    if (!currentProject) return;
    setLoading(true);
    addLog('info', 'ワークフロー開始...');
    const result = await api.workflow.start(currentProject.id);
    if (!result.success) {
      addLog('error', `ワークフロー開始失敗: ${result.error}`);
    }
    setLoading(false);
  }

  async function generateScript(params) {
    if (!currentProject) return;
    setLoading(true);
    addLog('info', '台本を生成中...');
    const result = await api.script.generate(currentProject.id, params);
    if (result.success) {
      addLog('success', `台本生成完了: ${result.data.scenes.length}シーン`);
      // Refresh project
      const projResult = await api.project.get(currentProject.id);
      if (projResult.success) setCurrentProject(projResult.data);
    } else {
      addLog('error', `台本生成失敗: ${result.error}`);
    }
    setLoading(false);
    return result;
  }

  async function renderVideo() {
    if (!currentProject) return;
    setLoading(true);
    addLog('info', '動画をレンダリング中...');
    const result = await api.video.render(currentProject.id);
    if (result.success) {
      addLog('success', '動画レンダリング完了');
      const projResult = await api.project.get(currentProject.id);
      if (projResult.success) setCurrentProject(projResult.data);
    } else {
      addLog('error', `レンダリング失敗: ${result.error}`);
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
          />
        )}

        {view === 'script' && currentProject && (
          <ScriptEditor
            project={currentProject}
            onGenerate={generateScript}
            onBack={() => setView('workflow')}
            loading={loading}
          />
        )}

        {view === 'scenes' && currentProject && (
          <SceneList
            project={currentProject}
            onBack={() => setView('workflow')}
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
          />
        )}

        {view === 'settings' && (
          <SettingsPanel onBack={() => setView(currentProject ? 'workflow' : 'home')} />
        )}
      </main>

      {/* Right Panel - Logs */}
      <aside className="log-panel">
        <LogPanel logs={logs} onClear={() => setLogs([])} />
      </aside>
    </div>
  );
}
