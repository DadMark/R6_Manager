import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RunProvider } from './state/RunContext';
import './ui/styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <RunProvider>
      <App />
    </RunProvider>
  </StrictMode>,
);
