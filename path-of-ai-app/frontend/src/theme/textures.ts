/* Проброс сгенерированных Flux-текстур UI в CSS-переменные --tex-*.

   Растровые текстуры «хрома» (рамки, камень HUD, пергамент, сферы) подключаются
   НЕ литералом в CSS/TSX, а через резолвер манифеста — единая точка резолва,
   корректный фолбэк на градиенты из tokens.css, если арт ещё не сгенерирован,
   и совместимость с визуальным гвардом (guards.test.ts). */

import { resolveAsset } from './assets';

/** id ассета из манифеста → имя CSS-переменной (только текстуры, которые
    реально потребляет kit.css; рамки и орбы рисуются чистым CSS). */
const TEXTURE_VARS: Record<string, string> = {
  'ui-parchment': '--tex-parchment',
  'ui-stone': '--tex-stone',
  'ui-button': '--tex-button',
  'ui-map-bg': '--tex-map-bg',
  'ui-worldmap': '--tex-worldmap',
};

/** Проставляет --tex-* на :root для каждой существующей UI-текстуры. */
export function applyTextureVars(
  root: HTMLElement = document.documentElement,
  resolver: (id: string) => string | undefined = resolveAsset,
): void {
  for (const [id, cssVar] of Object.entries(TEXTURE_VARS)) {
    const url = resolver(id);
    if (url !== undefined) {
      root.style.setProperty(cssVar, `url("${url}")`);
    }
  }
}
