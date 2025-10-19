/**
 * 🛡️ App with Error Boundary - Production-Ready App Wrapper
 * 
 * Wraps the main App component with comprehensive error handling:
 * - Error boundaries for React errors
 * - Performance monitoring
 * - Accessibility features
 * - Loading states
 * - Error reporting
 */

import React, { Suspense, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingOverlay } from './components/LoadingStates';
import { performanceMonitor } from './utils/PerformanceMonitor';
import { AccessibilityManager } from './utils/AccessibilityManager';
import { validationSystem } from './utils/ValidationSystem';
import { VectorMemoryManager } from './vector/VectorMemoryManager';

// Lazy load the main App component for better performance
const App = React.lazy(() => import('./App'));

export const AppWithErrorBoundary: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing application...');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize performance monitoring
        setLoadingMessage('Setting up performance monitoring...');
        setLoadingProgress(20);
        performanceMonitor.configure({
          enableMonitoring: true,
          maxMetrics: 1000
        });

        // Initialize accessibility features
        setLoadingMessage('Configuring accessibility features...');
        setLoadingProgress(40);
        AccessibilityManager.updateSettings({
          enableKeyboardNavigation: true,
          enableScreenReader: true,
          announceChanges: true,
          highContrast: false,
          reducedMotion: false,
          fontSize: 'medium',
          focusOutline: true,
          keyboardShortcuts: true
        });

        // Initialize validation system
        setLoadingMessage('Setting up validation system...');
        setLoadingProgress(60);
        validationSystem.configure({
          stopOnFirstError: false,
          includeWarnings: true,
          realTimeValidation: true,
          debounceMs: 300,
          customMessages: {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            minLength: 'Must be at least {minLength} characters',
            maxLength: 'Must be no more than {maxLength} characters'
          }
        });

        // Initialize memory management
        setLoadingMessage('Initializing memory management...');
        setLoadingProgress(80);
        const memoryManager = VectorMemoryManager.getInstance();
        memoryManager.createCanvasPool('main', 10);
        memoryManager.createImageDataPool('main', 20);
        memoryManager.createEventListenerPool('main', 50);

        // Track app initialization
        performanceMonitor.trackCustomEvent('app_initialization', {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        });

        setLoadingMessage('Application ready!');
        setLoadingProgress(100);

        // Small delay to show completion
        setTimeout(() => {
          setIsLoading(false);
        }, 500);

      } catch (error) {
        console.error('Failed to initialize application:', error);
        performanceMonitor.trackError(error as Error, 'AppWithErrorBoundary', 'critical', {
          phase: 'initialization',
          timestamp: Date.now()
        });
        
        // Still show the app, but with error state
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle unhandled errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      performanceMonitor.trackError(
        new Error(event.message), 
        'AppWithErrorBoundary', 
        'high',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: Date.now()
        }
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      performanceMonitor.trackError(
        new Error(event.reason), 
        'AppWithErrorBoundary', 
        'high',
        {
          type: 'unhandled_promise_rejection',
          reason: event.reason,
          timestamp: Date.now()
        }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Handle visibility change for performance optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        performanceMonitor.trackCustomEvent('app_hidden', {
          timestamp: Date.now()
        });
      } else {
        performanceMonitor.trackCustomEvent('app_visible', {
          timestamp: Date.now()
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (isLoading) {
    return (
      <LoadingOverlay
        isVisible={true}
        message={loadingMessage}
        progress={loadingProgress}
        showProgress={true}
        type="loading"
      />
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚨</div>
          <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>
            Application Error
          </h1>
          <p style={{ color: '#6c757d', textAlign: 'center', maxWidth: '500px' }}>
            We're sorry, but something went wrong with the application. 
            Please try refreshing the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              marginTop: '1rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      }
      onError={(error, errorInfo) => {
        performanceMonitor.trackError(error, 'AppWithErrorBoundary', 'critical', {
          componentStack: errorInfo.componentStack,
          timestamp: Date.now()
        });
      }}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <Suspense
        fallback={
          <LoadingOverlay
            isVisible={true}
            message="Loading application..."
            type="loading"
          />
        }
      >
        <App />
      </Suspense>
    </ErrorBoundary>
  );
};

export default AppWithErrorBoundary;

