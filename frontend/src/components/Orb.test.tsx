import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Orb } from './Orb';

describe('Orb', () => {
  it('экспонирует значения через role=meter', () => {
    render(<Orb kind="health" current={30} max={120} label="Опыт" />);
    const meter = screen.getByRole('meter', { name: 'Опыт' });
    expect(meter).toHaveAttribute('aria-valuenow', '30');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '120');
    expect(meter).toHaveAttribute('data-kind', 'health');
  });

  it('высота налива пропорциональна значению', () => {
    const { container } = render(
      <Orb kind="mana" current={30} max={120} label="Мана" />,
    );
    const fill = container.querySelector('.orb__fill') as HTMLElement;
    expect(fill.style.height).toBe('25%');
  });

  it('нулевой максимум и переполнение не ломают орб', () => {
    const { container } = render(
      <Orb kind="health" current={50} max={0} label="Опыт" />,
    );
    const fill = container.querySelector('.orb__fill') as HTMLElement;
    expect(fill.style.height).toBe('0%');
  });

  it('показывает подпись', () => {
    render(
      <Orb kind="mana" current={2} max={5} label="Познание" caption="2/5" />,
    );
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });
});
