import React from 'react';

export default function ProjectList({ projects, currentId, onSelect, onDelete, statusLabels, statusColors }) {
  if (projects.length === 0) {
    return <div className="project-list-empty">プロジェクトなし</div>;
  }

  return (
    <div className="project-list">
      {projects.map((project) => (
        <div
          key={project.id}
          className={`project-item ${project.id === currentId ? 'active' : ''}`}
          onClick={() => onSelect(project)}
        >
          <div className="project-item-name">{project.name}</div>
          <div className="project-item-meta">
            <span
              className="status-badge"
              style={{ backgroundColor: statusColors[project.status] || '#6b7280' }}
            >
              {statusLabels[project.status] || project.status}
            </span>
            <button
              className="btn-icon btn-danger-icon"
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              title="削除"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
