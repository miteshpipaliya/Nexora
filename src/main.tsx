import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installWebSocketResilience } from './shared/lib/websocketResilience';

installWebSocketResilience();

createRoot(document.getElementById('root')!).render(<App />);
