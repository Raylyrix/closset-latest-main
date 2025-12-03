/**
 * Project Manager Component
 * UI for saving, loading, and managing projects
 */

import React, { useState, useEffect } from 'react';
import { projectFileManager } from '../core/persistence/ProjectFileManager';
import { getAutoSaveManager, initAutoSaveManager } from '../core/persistence/AutoSaveManager';
import { RecoveryPoint } from '../core/persistence/AutoSaveManager';

interface ProjectManagerProps {
  onClose?: () => void;
}

export function ProjectManager({ onClose }: ProjectManagerProps) {
  const [tab, setTab] = useState<'save' | 'load' | 'recovery' | 'settings'>('save');
  const [projectName, setProjectName] = useState('My Design');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<any>(null);
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percentage: 0 });
  // 🚀 NEW: Format selection
  const [useDetailedFormat, setUseDetailedFormat] = useState(true); // Default to comprehensive

  // Initialize auto-save on mount
  useEffect(() => {
    const autoSave = initAutoSaveManager(projectFileManager);
    autoSave.start();

    // Check for crash recovery
    autoSave.checkForCrashRecovery().then(recoveryPoint => {
      if (recoveryPoint) {
        setMessage({
          type: 'error',
          text: `Detected unsaved changes from ${new Date(recoveryPoint.timestamp).toLocaleString()}. Go to Recovery tab to restore.`
        });
      }
    });

    return () => {
      autoSave.markCleanExit();
    };
  }, []);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      try {
        const autoSave = getAutoSaveManager();
        setAutoSaveStatus(autoSave.getStatus());
        setRecoveryPoints(autoSave.getRecoveryPoints());
        setStorageUsage(autoSave.getStorageUsage());
      } catch (error) {
        // Auto-save not initialized yet
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveProject = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Create/update project metadata
      if (!projectFileManager.getCurrentProject()) {
        projectFileManager.createProject(projectName);
      }

      // Save to file with chosen format
      await projectFileManager.saveProjectToFile(undefined, {
        compress: true,
        includeHistory: false,
        detailed: useDetailedFormat,  // 🚀 NEW: Use comprehensive format if selected
      });

      const formatType = useDetailedFormat ? 'comprehensive (all details)' : 'basic';
      setMessage({ type: 'success', text: `Project saved successfully in ${formatType} format!` });
    } catch (error) {
      console.error('Save failed:', error);
      setMessage({ type: 'error', text: `Save failed: ${error}` });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadProject = async (file: File) => {
    setLoading(true);
    setMessage(null);

    try {
      const project = await projectFileManager.loadProjectFromFile(file);
      setProjectName(project.name);
      setMessage({ type: 'success', text: `Project "${project.name}" loaded successfully!` });
    } catch (error) {
      console.error('Load failed:', error);
      setMessage({ type: 'error', text: `Load failed: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (recoveryId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const autoSave = getAutoSaveManager();
      const success = await autoSave.recoverFromPoint(recoveryId);
      
      if (success) {
        setMessage({ type: 'success', text: 'Project recovered successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Recovery failed' });
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      setMessage({ type: 'error', text: `Recovery failed: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'png' | 'jpg') => {
    setSaving(true);
    setMessage(null);

    try {
      const blob = await projectFileManager.exportProject(format);
      setMessage({ type: 'success', text: `Exported as ${format.toUpperCase()}` });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: `Export failed: ${error}` });
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#1e1e1e',
      color: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      width: '600px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 10000,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Project Manager</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #333' }}>
        {(['save', 'load', 'recovery', 'settings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? '#007acc' : 'transparent',
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#28a745' : '#dc3545',
        }}>
          {message.text}
        </div>
      )}

      {/* Auto-save status */}
      {autoSaveStatus && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: '#2d2d2d',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Auto-save: {autoSaveStatus.running ? '🟢 Active' : '🔴 Inactive'}</span>
            <span>Last save: {formatTime(autoSaveStatus.lastSaveTime)}</span>
          </div>
          {autoSaveStatus.hasUnsavedChanges && (
            <div style={{ marginTop: '5px', color: '#ffa500' }}>⚠️ Unsaved changes</div>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div style={{ marginTop: '20px' }}>
        {tab === 'save' && (
          <div>
            <h3>Save Project</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Project Name:</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #555',
                  backgroundColor: '#2d2d2d',
                  color: '#fff',
                }}
              />
            </div>

            {/* 🚀 NEW: Format Selection */}
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#2d2d2d',
              borderRadius: '4px',
              border: useDetailedFormat ? '2px solid #28a745' : '2px solid #555',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useDetailedFormat}
                  onChange={(e) => setUseDetailedFormat(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', color: useDetailedFormat ? '#28a745' : '#fff' }}>
                    🎯 Comprehensive Format (Recommended)
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                    {useDetailedFormat 
                      ? '✅ Saves EVERY detail: coordinates (UV/Pixel/3D), brush pressure, color in 4 formats, all transforms, effects, masks - NOTHING is lost!'
                      : 'ℹ️ Basic format - Less detailed, faster, smaller files'
                    }
                  </div>
                </div>
              </label>
            </div>

            <button
              onClick={handleSaveProject}
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                marginBottom: '10px',
              }}
            >
              {saving ? 'Saving...' : '💾 Save Project (.closset)'}
            </button>

            <h4 style={{ marginTop: '20px' }}>Export As:</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleExport('png')}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                🖼️ PNG
              </button>
              <button
                onClick={() => handleExport('jpg')}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                📷 JPG
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                📄 JSON
              </button>
            </div>

            {projectFileManager.getCurrentProject() && (
              <div style={{
                marginTop: '20px',
                padding: '10px',
                backgroundColor: '#2d2d2d',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <h4 style={{ marginTop: 0 }}>Current Project:</h4>
                <div>Name: {projectFileManager.getCurrentProject()?.name}</div>
                <div>Layers: {projectFileManager.getStatistics().layers}</div>
                <div>Assets: {projectFileManager.getStatistics().assets.totalAssets}</div>
                <div>Size: {formatBytes(projectFileManager.getStatistics().assets.totalSize)}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'load' && (
          <div>
            <h3>Load Project</h3>
            
            <div
              style={{
                border: '2px dashed #555',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
              <div>Click to select a .closset file</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                or drag and drop here
              </div>
            </div>

            <input
              id="file-input"
              type="file"
              accept=".closset,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLoadProject(file);
              }}
            />

            {loading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div>Loading project...</div>
              </div>
            )}
          </div>
        )}

        {tab === 'recovery' && (
          <div>
            <h3>Recovery Points</h3>
            
            {recoveryPoints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                No recovery points available
              </div>
            ) : (
              <div>
                {recoveryPoints.map((point) => (
                  <div
                    key={point.id}
                    style={{
                      padding: '15px',
                      marginBottom: '10px',
                      backgroundColor: '#2d2d2d',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{point.projectName}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {new Date(point.timestamp).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {point.layerCount} layers • {formatBytes(point.size)}
                        {point.isAutoSave && ' • Auto-saved'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRecovery(point.id)}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007acc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Restore
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    if (confirm('Clear all recovery points?')) {
                      getAutoSaveManager().clearAllRecoveryPoints();
                      setRecoveryPoints([]);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginTop: '10px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div>
            <h3>Settings</h3>
            
            {autoSaveStatus && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={autoSaveStatus.config.enabled}
                      onChange={(e) => {
                        const autoSave = getAutoSaveManager();
                        autoSave.updateConfig({ enabled: e.target.checked });
                        if (e.target.checked) {
                          autoSave.start();
                        } else {
                          autoSave.stop();
                        }
                      }}
                    />
                    Enable Auto-save
                  </label>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Auto-save Interval (seconds):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={autoSaveStatus.config.interval / 1000}
                    onChange={(e) => {
                      const autoSave = getAutoSaveManager();
                      autoSave.updateConfig({ interval: parseInt(e.target.value) * 1000 });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #555',
                      backgroundColor: '#2d2d2d',
                      color: '#fff',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Max Recovery Points:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={autoSaveStatus.config.maxBackups}
                    onChange={(e) => {
                      const autoSave = getAutoSaveManager();
                      autoSave.updateConfig({ maxBackups: parseInt(e.target.value) });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #555',
                      backgroundColor: '#2d2d2d',
                      color: '#fff',
                    }}
                  />
                </div>

                <div style={{
                  padding: '15px',
                  backgroundColor: '#2d2d2d',
                  borderRadius: '4px',
                  marginTop: '20px',
                }}>
                  <h4 style={{ marginTop: 0 }}>Storage Usage</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{
                      height: '20px',
                      backgroundColor: '#555',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(storageUsage.percentage, 100)}%`,
                        backgroundColor: storageUsage.percentage > 80 ? '#dc3545' : '#28a745',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.total)} 
                    ({storageUsage.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

