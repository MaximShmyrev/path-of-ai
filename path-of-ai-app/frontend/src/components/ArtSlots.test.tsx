import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeroPortrait, LocationArt } from './ArtSlots';

describe('HeroPortrait', () => {
  it('показывает плейсхолдер без src (арт подключается в E9)', () => {
    render(<HeroPortrait classId="model-mage" />);
    const art = screen.getByRole('img', { name: /маг моделей|портрет/i });
    expect(art.tagName.toLowerCase()).toBe('svg');
  });

  it('показывает изображение, когда src задан', () => {
    render(<HeroPortrait classId="model-mage" src="/classes/mm.png" />);
    const img = screen.getByRole('img');
    expect(img.tagName.toLowerCase()).toBe('img');
    expect(img).toHaveAttribute('src', '/classes/mm.png');
  });
});

describe('LocationArt', () => {
  it('показывает плейсхолдер без src', () => {
    render(<LocationArt title="Трансформеры" />);
    const art = screen.getByRole('img', { name: /трансформеры|локация/i });
    expect(art.tagName.toLowerCase()).toBe('svg');
  });
});
