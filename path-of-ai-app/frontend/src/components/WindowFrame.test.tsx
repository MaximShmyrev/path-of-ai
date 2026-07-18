import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WindowFrame } from './WindowFrame';

describe('WindowFrame', () => {
  it('показывает заголовок и содержимое', () => {
    render(
      <WindowFrame title="Свиток героя">
        <p>Содержимое</p>
      </WindowFrame>,
    );
    expect(
      screen.getByRole('heading', { name: 'Свиток героя' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Содержимое')).toBeInTheDocument();
  });
});
