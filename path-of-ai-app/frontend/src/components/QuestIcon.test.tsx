import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QuestIcon } from './QuestIcon';

describe('QuestIcon', () => {
  it('помечает теоретический квест', () => {
    render(<QuestIcon kind="theory" />);
    expect(screen.getByRole('img', { name: /свиток/i })).toBeInTheDocument();
  });

  it('помечает практический квест', () => {
    render(<QuestIcon kind="practice" />);
    expect(screen.getByRole('img', { name: /испытание/i })).toBeInTheDocument();
  });

  it('помечает босса', () => {
    render(<QuestIcon kind="boss" />);
    expect(screen.getByRole('img', { name: /босс/i })).toBeInTheDocument();
  });

  it('цвета из токенов', () => {
    const { container } = render(<QuestIcon kind="boss" />);
    expect(container.innerHTML).toContain('var(--');
  });
});
