import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { HttpApiClient } from './api/http';
import { GameProvider } from './game/store';
import './theme/tokens.css';
import './theme/kit.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Корневой элемент #root не найден');
}

createRoot(rootElement).render(
  <StrictMode>
    <GameProvider api={new HttpApiClient()}>
      <App />
    </GameProvider>
  </StrictMode>,
);
