import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, HttpApiClient } from './http';

type Body = Record<string, unknown>;

function stubFetch(status: number, body: Body, jsonThrows = false) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'STATUS',
    json: async () => {
      if (jsonThrows) throw new Error('bad json');
      return body;
    },
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpApiClient', () => {
  it('createHero отправляет POST с маппингом полей', async () => {
    const fetchMock = stubFetch(201, { name: 'Артур', level: 1 });
    const client = new HttpApiClient();
    const hero = await client.createHero({ name: 'Артур', classId: 'mm' });
    expect(hero.name).toBe('Артур');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/api/hero');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toMatchObject({
      name: 'Артур',
      class_id: 'mm',
    });
  });

  it('getHero возвращает null при 404', async () => {
    stubFetch(404, { detail: 'нет' });
    expect(await new HttpApiClient().getHero()).toBeNull();
  });

  it('getHero возвращает героя при 200', async () => {
    stubFetch(200, { name: 'Мерлин' });
    expect((await new HttpApiClient().getHero())?.name).toBe('Мерлин');
  });

  it('ошибочный статус → ApiError', async () => {
    stubFetch(500, { detail: 'сбой' });
    await expect(new HttpApiClient().getMap()).rejects.toBeInstanceOf(ApiError);
  });

  it('ApiError использует statusText, если тело не JSON', async () => {
    stubFetch(500, {}, true);
    await expect(new HttpApiClient().getMap()).rejects.toThrow('STATUS');
  });

  it('getMap/getTopic/completeQuest/generateEvent ходят по своим путям', async () => {
    const fetchMock = stubFetch(200, { ok: true });
    const client = new HttpApiClient();
    await client.getMap();
    await client.getTopic('t1');
    await client.completeQuest('q1', [0]);
    await client.generateEvent('loc1');
    const paths = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(paths.some((p) => p.endsWith('/api/map'))).toBe(true);
    expect(paths.some((p) => p.endsWith('/api/topics/t1'))).toBe(true);
    expect(paths.some((p) => p.endsWith('/api/quests/q1/complete'))).toBe(true);
    expect(paths.some((p) => p.endsWith('/api/locations/loc1/event'))).toBe(
      true,
    );
  });
});
