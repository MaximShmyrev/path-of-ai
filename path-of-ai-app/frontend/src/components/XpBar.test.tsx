import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { XpBar } from './XpBar';

describe('XpBar', () => {
  it('показывает прогресс опыта через progressbar', () => {
    render(<XpBar current={50} max={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('заполнение пропорционально опыту', () => {
    const { container } = render(<XpBar current={25} max={100} />);
    const fill = container.querySelector('.xp-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });

  it('цвета берутся из токенов (var(--...)), без хардкода hex', () => {
    const { container } = render(<XpBar current={50} max={100} />);
    expect(container.innerHTML).toContain('var(--');
  });

  it('переполнение и нулевой максимум не ломают бар', () => {
    const { container } = render(<XpBar current={150} max={0} />);
    const fill = container.querySelector('.xp-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });
});
