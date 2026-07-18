/* Резолвер сгенерированных артов. Манифест (assetManifest.json) заполняется
   build-time скриптом `python -m app.assets`; по умолчанию пуст → используются
   векторные плейсхолдеры из E7v. Файлы артов отдаются статикой из /assets. */

import manifest from './assetManifest.json';

const ASSETS = manifest as Record<string, string>;

export function resolveAsset(
  id: string,
  source: Record<string, string> = ASSETS,
): string | undefined {
  const relative = source[id];
  return relative === undefined ? undefined : `/assets/${relative}`;
}
