import { useState } from 'react';

const STATUS_TEXT = {
  local: 'Saved only on this device',
  connecting: 'Connecting to Dropbox…',
  synced: 'Synced with Dropbox',
  offline: 'Dropbox unreachable — showing last synced copy',
  error: 'Dropbox sync error',
};

export default function SyncPanel({ sync }) {
  const [editingKey, setEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState(sync.appKey);

  if (sync.connected) {
    return (
      <div className="sync-panel">
        <span className={`sync-status sync-status-${sync.status}`}>
          <span className="sync-dot" aria-hidden="true" />
          {STATUS_TEXT[sync.status] ?? STATUS_TEXT.local}
        </span>
        {sync.status === 'error' && sync.error && (
          <span className="sync-error">{sync.error}</span>
        )}
        <button type="button" className="sync-link-button" onClick={sync.disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  if (!sync.appKey || editingKey) {
    return (
      <div className="sync-panel sync-panel-setup">
        <p className="sync-setup-text">
          To sync with an iPhone or Mac, paste the App key from your{' '}
          <a
            href="https://www.dropbox.com/developers/apps"
            target="_blank"
            rel="noreferrer"
          >
            Dropbox App Console
          </a>
          .
        </p>
        <div className="sync-setup-row">
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Dropbox App key"
            className="sync-key-input"
            aria-label="Dropbox App key"
          />
          <button
            type="button"
            className="sync-link-button sync-link-button-primary"
            onClick={() => {
              sync.saveAppKey(keyInput.trim());
              setEditingKey(false);
            }}
            disabled={!keyInput.trim()}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sync-panel">
      <span className="sync-status sync-status-local">
        <span className="sync-dot" aria-hidden="true" />
        {STATUS_TEXT.local}
      </span>
      <button type="button" className="sync-link-button sync-link-button-primary" onClick={sync.connect}>
        Connect Dropbox
      </button>
      <button type="button" className="sync-link-button" onClick={() => setEditingKey(true)}>
        Change App key
      </button>
    </div>
  );
}
