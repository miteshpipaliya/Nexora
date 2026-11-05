import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent spurious Vite HMR WebSocket connection closed rejections in embedded iframe/proxy environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (msg.includes('WebSocket closed without opened') || msg.includes('failed to connect to websocket')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

