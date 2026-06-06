import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('показывает название игры «Путь ИИ»', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /Путь ИИ/ }),
    ).toBeInTheDocument();
  });
});
