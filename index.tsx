
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundaryWrapper extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error no capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '600px', width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ color: '#f43f5e', margin: '0 0 12px 0', fontSize: '20px', fontWeight: 'bold' }}>⚠️ Error en la aplicación</h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>Se produjo un error durante la ejecución de la interfaz:</p>
            <pre style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', color: '#fb7185', fontSize: '12px', overflowX: 'auto', border: '1px solid #1e293b' }}>
              {this.state.error?.toString() || 'Error desconocido'}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', marginTop: '20px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ErrorBoundary = ErrorBoundaryWrapper as unknown as React.FC<ErrorBoundaryProps>;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

