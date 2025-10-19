import React, { useState, useEffect } from 'react';
import { useAdvancedLayerStoreV2 } from '../core/AdvancedLayerSystemV2';

interface AccessibilitySettingsPanelProps {
  onClose?: () => void;
}

export function AccessibilitySettingsPanel({ onClose }: AccessibilitySettingsPanelProps) {
  const { updateAccessibilitySettings, getAccessibilityReport } = useAdvancedLayerStoreV2();
  const [settings, setSettings] = useState({
    enableKeyboardNavigation: true,
    enableScreenReader: true,
    announceChanges: true,
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium' as 'small' | 'medium' | 'large' | 'extra-large',
    focusOutline: true,
    keyboardShortcuts: true
  });

  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    loadAccessibilityReport();
  }, []);

  const loadAccessibilityReport = async () => {
    try {
      const accessibilityReport = await getAccessibilityReport();
      setReport(accessibilityReport);
    } catch (error) {
      console.error('Failed to load accessibility report:', error);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateAccessibilitySettings(newSettings);
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '500px',
    maxHeight: '80vh',
    background: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '8px',
    padding: '20px',
    zIndex: 1000,
    overflowY: 'auto',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid #333'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#FFF',
    margin: 0
  };

  const closeButtonStyle: React.CSSProperties = {
    background: '#dc3545',
    color: '#FFF',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
    padding: '15px',
    background: '#2a2a2a',
    borderRadius: '6px',
    border: '1px solid #444'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFF',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const settingRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    padding: '8px',
    background: '#333',
    borderRadius: '4px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#CCC',
    flex: 1
  };

  const toggleStyle: React.CSSProperties = {
    width: '40px',
    height: '20px',
    background: settings.enableKeyboardNavigation ? '#007bff' : '#666',
    borderRadius: '10px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.3s'
  };

  const toggleThumbStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    background: '#FFF',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: settings.enableKeyboardNavigation ? '22px' : '2px',
    transition: 'left 0.3s'
  };

  const selectStyle: React.CSSProperties = {
    padding: '4px 8px',
    background: '#000',
    color: '#FFF',
    border: '1px solid #555',
    borderRadius: '3px',
    fontSize: '11px'
  };

  const reportStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#999',
    lineHeight: '1.4'
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>♿ Accessibility Settings</h2>
        {onClose && (
          <button onClick={onClose} style={closeButtonStyle}>
            Close
          </button>
        )}
      </div>

      {/* Keyboard Navigation */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          ⌨️ Keyboard Navigation
        </div>
        
        <div style={settingRowStyle}>
          <span style={labelStyle}>Enable Keyboard Navigation</span>
          <div 
            style={toggleStyle}
            onClick={() => handleSettingChange('enableKeyboardNavigation', !settings.enableKeyboardNavigation)}
          >
            <div style={toggleThumbStyle}></div>
          </div>
        </div>

        <div style={settingRowStyle}>
          <span style={labelStyle}>Keyboard Shortcuts</span>
          <div 
            style={toggleStyle}
            onClick={() => handleSettingChange('keyboardShortcuts', !settings.keyboardShortcuts)}
          >
            <div style={{...toggleThumbStyle, left: settings.keyboardShortcuts ? '22px' : '2px'}}></div>
          </div>
        </div>

        <div style={settingRowStyle}>
          <span style={labelStyle}>Focus Outline</span>
          <div 
            style={toggleStyle}
            onClick={() => handleSettingChange('focusOutline', !settings.focusOutline)}
          >
            <div style={{...toggleThumbStyle, left: settings.focusOutline ? '22px' : '2px'}}></div>
          </div>
        </div>
      </div>

      {/* Screen Reader Support */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          🔊 Screen Reader Support
        </div>
        
        <div style={settingRowStyle}>
          <span style={labelStyle}>Enable Screen Reader</span>
          <div 
            style={toggleStyle}
            onClick={() => handleSettingChange('enableScreenReader', !settings.enableScreenReader)}
          >
            <div style={{...toggleThumbStyle, left: settings.enableScreenReader ? '22px' : '2px'}}></div>
          </div>
        </div>

        <div style={settingRowStyle}>
          <span style={labelStyle}>Announce Changes</span>
          <div 
            style={toggleStyle}
            onClick={() => handleSettingChange('announceChanges', !settings.announceChanges)}
          >
            <div style={{...toggleThumbStyle, left: settings.announceChanges ? '22px' : '2px'}}></div>
          </div>
        </div>
      </div>

      {/* Visual Accessibility */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          👁️ Visual Accessibility
        </div>
        
        <div style={settingRowStyle}>
          <span style={labelStyle}>High Contrast Mode</span>
          <div 
            style={toggleStyle}
            onClick={() => handleSettingChange('highContrast', !settings.highContrast)}
          >
            <div style={{...toggleThumbStyle, left: settings.highContrast ? '22px' : '2px'}}></div>
          </div>
        </div>

        <div style={settingRowStyle}>
          <span style={labelStyle}>Reduced Motion</span>
          <div 
            style={toggleStyle}
            onClick={() => handleSettingChange('reducedMotion', !settings.reducedMotion)}
          >
            <div style={{...toggleThumbStyle, left: settings.reducedMotion ? '22px' : '2px'}}></div>
          </div>
        </div>

        <div style={settingRowStyle}>
          <span style={labelStyle}>Font Size</span>
          <select
            value={settings.fontSize}
            onChange={(e) => handleSettingChange('fontSize', e.target.value)}
            style={selectStyle}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra Large</option>
          </select>
        </div>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          ⌨️ Keyboard Shortcuts
        </div>
        <div style={reportStyle}>
          <div><strong>Tab</strong> - Move focus to next text element</div>
          <div><strong>Shift+Tab</strong> - Move focus to previous text element</div>
          <div><strong>Enter</strong> - Edit focused text element</div>
          <div><strong>Escape</strong> - Cancel text editing</div>
          <div><strong>Delete</strong> - Delete focused text element</div>
          <div><strong>Arrow Keys</strong> - Move text element</div>
          <div><strong>Ctrl+C</strong> - Copy text element</div>
          <div><strong>Ctrl+V</strong> - Paste text element</div>
          <div><strong>Ctrl+Z</strong> - Undo last action</div>
          <div><strong>Ctrl+Y</strong> - Redo last action</div>
          <div><strong>Ctrl+A</strong> - Select all text elements</div>
        </div>
      </div>

      {/* Accessibility Report */}
      {report && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            📊 Accessibility Report
          </div>
          <div style={reportStyle}>
            <div>Total Elements: {report.totalElements}</div>
            <div>Focusable Elements: {report.focusableElements}</div>
            <div>Elements with Labels: {report.elementsWithLabels}</div>
            <div>Elements with Roles: {report.elementsWithRoles}</div>
            <div>Keyboard Shortcuts: {report.keyboardShortcuts}</div>
          </div>
        </div>
      )}
    </div>
  );
}
