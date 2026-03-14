import React, { useEffect, useRef } from 'react';

export default function LogPanel({ logs, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const levelColors = {
    info: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warn: '#f59e0b',
  };

  return (
    <div className="log-container">
      <div className="log-header">
        <h3>ログ</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>クリア</button>
      </div>
      <div className="log-entries">
        {logs.length === 0 ? (
          <div className="log-empty">ログなし</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="log-entry" style={{ borderLeftColor: levelColors[log.level] || '#6b7280' }}>
              <span className="log-time">
                {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
              </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
