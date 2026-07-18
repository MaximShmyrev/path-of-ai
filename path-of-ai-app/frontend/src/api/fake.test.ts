import { describe, expect, it } from 'vitest';

import { FakeApiClient } from './fake';

describe('FakeApiClient', () => {
  it('создаёт героя 1 уровня и возвращает его', async () => {
    const api = new FakeApiClient();
    expect(await api.getHero()).toBeNull();
    const hero = await api.createHero({ name: 'Артур', classId: 'model-mage' });
    expect(hero.level).toBe(1);
    expect(hero.total_xp).toBe(0);
    expect((await api.getHero())?.name).toBe('Артур');
  });

  it('возвращает карту с регионами', async () => {
    const api = new FakeApiClient();
    const map = await api.getMap();
    expect(map.regions.length).toBeGreaterThan(0);
    expect(map.regions[0]?.topics.length ?? 0).toBeGreaterThan(0);
  });
});
