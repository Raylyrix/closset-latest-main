import { TextElement } from '../core/AdvancedLayerSystemV2';

export interface AccessibilitySettings {
  enableKeyboardNavigation: boolean;
  enableScreenReader: boolean;
  announceChanges: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusOutline: boolean;
  keyboardShortcuts: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
}

export interface FocusableElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'button' | 'input';
  element: TextElement | any;
  tabIndex: number;
  position: { x: number; y: number };
  bounds: { width: number; height: number };
}

/**
 * AccessibilityManager - Handles accessibility features for the text tool
 */
export class AccessibilityManager {
  private static settings: AccessibilitySettings = {
    enableKeyboardNavigation: true,
    enableScreenReader: true,
    announceChanges: true,
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
    focusOutline: true,
    keyboardShortcuts: true
  };

  private static focusableElements: Map<string, FocusableElement> = new Map();
  private static currentFocusIndex: number = -1;
  private static focusedElementId: string | null = null;
  private static keyboardShortcuts: Map<string, KeyboardShortcut> = new Map();

  /**
   * Initialize accessibility features
   */
  static initialize(): void {
    this.setupKeyboardShortcuts();
    this.setupScreenReaderSupport();
    this.setupHighContrastMode();
    this.setupReducedMotion();
    this.setupFocusManagement();
    
    console.log('♿ Accessibility Manager initialized');
  }

  /**
   * Setup keyboard shortcuts for text tool
   */
  private static setupKeyboardShortcuts(): void {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'Tab',
        action: 'focus-next',
        description: 'Move focus to next text element'
      },
      {
        key: 'Tab',
        shiftKey: true,
        action: 'focus-previous',
        description: 'Move focus to previous text element'
      },
      {
        key: 'Enter',
        action: 'edit-text',
        description: 'Edit focused text element'
      },
      {
        key: 'Escape',
        action: 'cancel-edit',
        description: 'Cancel text editing'
      },
      {
        key: 'Delete',
        action: 'delete-text',
        description: 'Delete focused text element'
      },
      {
        key: 'ArrowUp',
        action: 'move-up',
        description: 'Move text element up'
      },
      {
        key: 'ArrowDown',
        action: 'move-down',
        description: 'Move text element down'
      },
      {
        key: 'ArrowLeft',
        action: 'move-left',
        description: 'Move text element left'
      },
      {
        key: 'ArrowRight',
        action: 'move-right',
        description: 'Move text element right'
      },
      {
        key: 'c',
        ctrlKey: true,
        action: 'copy-text',
        description: 'Copy text element'
      },
      {
        key: 'v',
        ctrlKey: true,
        action: 'paste-text',
        description: 'Paste text element'
      },
      {
        key: 'z',
        ctrlKey: true,
        action: 'undo',
        description: 'Undo last action'
      },
      {
        key: 'y',
        ctrlKey: true,
        action: 'redo',
        description: 'Redo last action'
      },
      {
        key: 'a',
        ctrlKey: true,
        action: 'select-all',
        description: 'Select all text elements'
      }
    ];

    shortcuts.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.keyboardShortcuts.set(key, shortcut);
    });

    // Add global keyboard event listener
    document.addEventListener('keydown', this.handleKeyboardEvent.bind(this));
  }

  /**
   * Setup screen reader support
   */
  private static setupScreenReaderSupport(): void {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'accessibility-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);

    // Create screen reader only text element
    const srOnly = document.createElement('div');
    srOnly.id = 'screen-reader-only';
    srOnly.style.position = 'absolute';
    srOnly.style.left = '-10000px';
    srOnly.style.width = '1px';
    srOnly.style.height = '1px';
    srOnly.style.overflow = 'hidden';
    srOnly.setAttribute('aria-hidden', 'true');
    document.body.appendChild(srOnly);
  }

  /**
   * Setup high contrast mode
   */
  private static setupHighContrastMode(): void {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    this.settings.highContrast = mediaQuery.matches;
    
    mediaQuery.addEventListener('change', (e) => {
      this.settings.highContrast = e.matches;
      this.applyHighContrastStyles();
    });

    this.applyHighContrastStyles();
  }

  /**
   * Setup reduced motion preferences
   */
  private static setupReducedMotion(): void {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.settings.reducedMotion = mediaQuery.matches;
    
    mediaQuery.addEventListener('change', (e) => {
      this.settings.reducedMotion = e.matches;
      this.applyReducedMotionStyles();
    });

    this.applyReducedMotionStyles();
  }

  /**
   * Setup focus management
   */
  private static setupFocusManagement(): void {
    // Track focus changes
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      if (target && target.id) {
        this.focusedElementId = target.id;
        // Find the corresponding focusable element
        const focusableElement = this.focusableElements.get(target.id);
        if (focusableElement) {
          this.announceFocusChange(focusableElement);
        }
      }
    });

    document.addEventListener('focusout', (e) => {
      this.focusedElementId = null;
    });
  }

  /**
   * Handle keyboard events
   */
  private static handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.settings.keyboardShortcuts) return;

    const key = this.getShortcutKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      action: '',
      description: ''
    });

    const shortcut = this.keyboardShortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      this.executeShortcut(shortcut);
    }
  }

  /**
   * Execute keyboard shortcut
   */
  private static executeShortcut(shortcut: KeyboardShortcut): void {
    switch (shortcut.action) {
      case 'focus-next':
        this.focusNextElement();
        break;
      case 'focus-previous':
        this.focusPreviousElement();
        break;
      case 'edit-text':
        this.editFocusedText();
        break;
      case 'cancel-edit':
        this.cancelTextEdit();
        break;
      case 'delete-text':
        this.deleteFocusedText();
        break;
      case 'move-up':
        this.moveTextElement('up');
        break;
      case 'move-down':
        this.moveTextElement('down');
        break;
      case 'move-left':
        this.moveTextElement('left');
        break;
      case 'move-right':
        this.moveTextElement('right');
        break;
      case 'copy-text':
        this.copyFocusedText();
        break;
      case 'paste-text':
        this.pasteText();
        break;
      case 'undo':
        this.undoAction();
        break;
      case 'redo':
        this.redoAction();
        break;
      case 'select-all':
        this.selectAllTextElements();
        break;
    }

    this.announceAction(shortcut.description);
  }

  /**
   * Register a focusable text element
   */
  static registerTextElement(textElement: TextElement): void {
    const focusableElement: FocusableElement = {
      id: textElement.id,
      type: 'text',
      element: textElement,
      tabIndex: textElement.tabIndex || 0,
      position: { x: textElement.x, y: textElement.y },
      bounds: {
        width: textElement.fontSize * textElement.text.length * 0.6,
        height: textElement.fontSize * 1.2
      }
    };

    this.focusableElements.set(textElement.id, focusableElement);
    
    if (this.settings.announceChanges) {
      this.announceToScreenReader(`Text element "${textElement.text}" added`);
    }
  }

  /**
   * Unregister a text element
   */
  static unregisterTextElement(textId: string): void {
    const element = this.focusableElements.get(textId);
    if (element) {
      this.focusableElements.delete(textId);
      
      if (this.settings.announceChanges) {
        this.announceToScreenReader(`Text element "${element.element.text}" removed`);
      }
    }
  }

  /**
   * Focus next element
   */
  private static focusNextElement(): void {
    const elements = Array.from(this.focusableElements.values())
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    if (elements.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex + 1) % elements.length;
    const element = elements[this.currentFocusIndex];
    
    this.focusedElementId = element.id;
    this.announceFocusChange(element);
  }

  /**
   * Focus previous element
   */
  private static focusPreviousElement(): void {
    const elements = Array.from(this.focusableElements.values())
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    if (elements.length === 0) return;

    this.currentFocusIndex = this.currentFocusIndex <= 0 
      ? elements.length - 1 
      : this.currentFocusIndex - 1;
    
    const element = elements[this.currentFocusIndex];
    this.focusedElementId = element.id;
    this.announceFocusChange(element);
  }

  /**
   * Edit focused text
   */
  private static editFocusedText(): void {
    if (!this.focusedElementId) return;

    const element = this.focusableElements.get(this.focusedElementId);
    if (element && element.type === 'text') {
      // Trigger text editing mode
      window.dispatchEvent(new CustomEvent('editTextElement', {
        detail: { textId: this.focusedElementId }
      }));
      
      this.announceToScreenReader(`Editing text: "${element.element.text}"`);
    }
  }

  /**
   * Cancel text editing
   */
  private static cancelTextEdit(): void {
    window.dispatchEvent(new CustomEvent('cancelTextEdit'));
    this.announceToScreenReader('Text editing cancelled');
  }

  /**
   * Delete focused text
   */
  private static deleteFocusedText(): void {
    if (!this.focusedElementId) return;

    const element = this.focusableElements.get(this.focusedElementId);
    if (element && element.type === 'text') {
      window.dispatchEvent(new CustomEvent('deleteTextElement', {
        detail: { textId: this.focusedElementId }
      }));
      
      this.announceToScreenReader(`Text "${element.element.text}" deleted`);
    }
  }

  /**
   * Move text element
   */
  private static moveTextElement(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.focusedElementId) return;

    const moveDistance = 10; // pixels
    let deltaX = 0;
    let deltaY = 0;

    switch (direction) {
      case 'up':
        deltaY = -moveDistance;
        break;
      case 'down':
        deltaY = moveDistance;
        break;
      case 'left':
        deltaX = -moveDistance;
        break;
      case 'right':
        deltaX = moveDistance;
        break;
    }

    window.dispatchEvent(new CustomEvent('moveTextElement', {
      detail: { 
        textId: this.focusedElementId, 
        deltaX, 
        deltaY 
      }
    }));

    this.announceToScreenReader(`Text moved ${direction}`);
  }

  /**
   * Copy focused text
   */
  private static copyFocusedText(): void {
    if (!this.focusedElementId) return;

    const element = this.focusableElements.get(this.focusedElementId);
    if (element && element.type === 'text') {
      navigator.clipboard.writeText(element.element.text);
      this.announceToScreenReader(`Text "${element.element.text}" copied to clipboard`);
    }
  }

  /**
   * Paste text
   */
  private static pasteText(): void {
    navigator.clipboard.readText().then(text => {
      if (text) {
        window.dispatchEvent(new CustomEvent('pasteTextElement', {
          detail: { text }
        }));
        this.announceToScreenReader(`Text "${text}" pasted`);
      }
    }).catch(() => {
      this.announceToScreenReader('Failed to paste text');
    });
  }

  /**
   * Undo action
   */
  private static undoAction(): void {
    window.dispatchEvent(new CustomEvent('undoAction'));
    this.announceToScreenReader('Action undone');
  }

  /**
   * Redo action
   */
  private static redoAction(): void {
    window.dispatchEvent(new CustomEvent('redoAction'));
    this.announceToScreenReader('Action redone');
  }

  /**
   * Select all text elements
   */
  private static selectAllTextElements(): void {
    window.dispatchEvent(new CustomEvent('selectAllTextElements'));
    this.announceToScreenReader('All text elements selected');
  }

  /**
   * Announce focus change
   */
  private static announceFocusChange(element: FocusableElement): void {
    if (!this.settings.enableScreenReader) return;

    const announcement = element.type === 'text' 
      ? `Focused on text: "${element.element.text}"`
      : `Focused on ${element.type} element`;
    
    this.announceToScreenReader(announcement);
  }

  /**
   * Announce action
   */
  private static announceAction(description: string): void {
    if (!this.settings.enableScreenReader) return;
    this.announceToScreenReader(description);
  }

  /**
   * Announce to screen reader
   */
  private static announceToScreenReader(message: string): void {
    if (!this.settings.announceChanges) return;

    const liveRegion = document.getElementById('accessibility-live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Apply high contrast styles
   */
  private static applyHighContrastStyles(): void {
    const styleId = 'accessibility-high-contrast';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (this.settings.highContrast) {
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      
      style.textContent = `
        .text-element {
          border: 2px solid #FFFFFF !important;
          background-color: #000000 !important;
          color: #FFFFFF !important;
        }
        .text-element:focus {
          border: 3px solid #FFFF00 !important;
          outline: 2px solid #FFFF00 !important;
        }
        .text-settings-panel {
          background-color: #000000 !important;
          color: #FFFFFF !important;
          border: 2px solid #FFFFFF !important;
        }
      `;
    } else if (style) {
      style.remove();
    }
  }

  /**
   * Apply reduced motion styles
   */
  private static applyReducedMotionStyles(): void {
    const styleId = 'accessibility-reduced-motion';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (this.settings.reducedMotion) {
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      
      style.textContent = `
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .text-element {
          transition: none !important;
        }
      `;
    } else if (style) {
      style.remove();
    }
  }

  /**
   * Get shortcut key string
   */
  private static getShortcutKey(shortcut: Partial<KeyboardShortcut>): string {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.metaKey) parts.push('meta');
    parts.push(shortcut.key?.toLowerCase() || '');
    
    return parts.join('+');
  }

  /**
   * Update accessibility settings
   */
  static updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    if (newSettings.highContrast !== undefined) {
      this.applyHighContrastStyles();
    }
    
    if (newSettings.reducedMotion !== undefined) {
      this.applyReducedMotionStyles();
    }
    
    console.log('♿ Accessibility settings updated:', this.settings);
  }

  /**
   * Get current accessibility settings
   */
  static getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Get focused element ID
   */
  static getFocusedElementId(): string | null {
    return this.focusedElementId;
  }

  /**
   * Get all focusable elements
   */
  static getFocusableElements(): FocusableElement[] {
    return Array.from(this.focusableElements.values());
  }

  /**
   * Generate accessibility report
   */
  static generateAccessibilityReport(): {
    totalElements: number;
    focusableElements: number;
    elementsWithLabels: number;
    elementsWithRoles: number;
    keyboardShortcuts: number;
    settings: AccessibilitySettings;
  } {
    const elements = Array.from(this.focusableElements.values());
    const textElements = elements.filter(e => e.type === 'text');
    
    return {
      totalElements: elements.length,
      focusableElements: elements.filter(e => e.tabIndex >= 0).length,
      elementsWithLabels: textElements.filter(e => e.element.ariaLabel).length,
      elementsWithRoles: textElements.filter(e => e.element.role).length,
      keyboardShortcuts: this.keyboardShortcuts.size,
      settings: this.settings
    };
  }
}