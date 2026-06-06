import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LocationMarker } from './LocationMarker';

describe('LocationMarker', () => {
  it('доступная локация', () => {
    render(<LocationMarker status="available" />);
    expect(screen.getByRole('img', { name: /доступно/i })).toBeInTheDocument();
  });

  it('заблокированная локация', () => {
    render(<LocationMarker status="locked" />);
    expect(
      screen.getByRole('img', { name: /заблокировано/i }),
    ).toBeInTheDocument();
  });

  it('пройденная локация', () => {
    render(<LocationMarker status="completed" />);
    expect(screen.getByRole('img', { name: /пройдено/i })).toBeInTheDocument();
  });
});
