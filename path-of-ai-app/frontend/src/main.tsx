import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { HttpApiClient } from './api/http';
import { GameProvider } from './game/store';
// Дьябло-шрифты с поддержкой кириллицы (self-hosted через @fontsource, без CDN):
// Forum — заголовки (римские капители в духе Trajan/Exocet), EB Garamond — текст.
import '@fontsource/forum/400.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/eb-garamond/400-italic.css';
import './theme/tokens.css';
import './theme/layout.css';
import './theme/kit.css';
import { applyTextureVars } from './theme/textures';

// Подключаем сгенерированные Flux-текстуры UI в CSS-переменные (если есть).
applyTextureVars();

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
