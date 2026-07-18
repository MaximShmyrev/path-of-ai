import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from './Icon';

describe('Icon', () => {
  it('декоративная иконка скрыта от скринридера', () => {
    const { container } = render(<Icon name="nav-character" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
  });

  it('с title доступна как img', () => {
    render(<Icon name="mastery" title="Трофей" />);
    expect(screen.getByRole('img', { name: 'Трофей' })).toBeInTheDocument();
  });

  it('неизвестное имя не падает (фолбэк)', () => {
    const { container } = render(<Icon name="does-not-exist" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
