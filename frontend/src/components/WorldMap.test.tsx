import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WorldMap, type RegionView } from './WorldMap';

const REGIONS: RegionView[] = [
  {
    id: 'ml',
    title: 'Долина основ ML',
    status: 'open',
    topics: [
      { id: 't1', title: 'Базис', status: 'available' },
      { id: 't2', title: 'Оценка', status: 'locked' },
    ],
  },
  {
    id: 'llm',
    title: 'Цитадель LLM',
    status: 'locked',
    topics: [{ id: 't3', title: 'Трансформеры', status: 'locked' }],
  },
];

describe('WorldMap', () => {
  it('рисует регионы по данным', () => {
    render(<WorldMap regions={REGIONS} />);
    expect(screen.getByText('Долина основ ML')).toBeInTheDocument();
    expect(screen.getByText('Цитадель LLM')).toBeInTheDocument();
  });

  it('рисует маркер для каждой локации', () => {
    render(<WorldMap regions={REGIONS} />);
    // 3 локации → 3 маркера (role img)
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByText('Трансформеры')).toBeInTheDocument();
  });

  it('вызывает onEnterTopic для доступной локации', async () => {
    const calls: string[] = [];
    render(
      <WorldMap regions={REGIONS} onEnterTopic={(id) => calls.push(id)} />,
    );
    screen.getByRole('button', { name: /Базис/ }).click();
    expect(calls).toEqual(['t1']);
  });
});
