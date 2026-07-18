import { describe, expect, it } from 'vitest';

import { resolveAsset } from './assets';

describe('resolveAsset', () => {
  it('возвращает undefined, если арта нет в манифесте', () => {
    expect(resolveAsset('model-mage', {})).toBeUndefined();
  });

  it('строит путь /assets/... по записи манифеста', () => {
    expect(
      resolveAsset('model-mage', { 'model-mage': 'classes/model-mage.png' }),
    ).toBe('/assets/classes/model-mage.png');
  });

  it('штатный манифест: сгенерированный арт резолвится в /assets/...', () => {
    // После генерации (E9) арты подключены; для отсутствующего id — undefined.
    expect(resolveAsset('model-mage')).toBe('/assets/classes/model-mage.webp');
    expect(resolveAsset('нет-такого')).toBeUndefined();
  });
});
