import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CompetencyRadar } from './CompetencyRadar';

describe('CompetencyRadar', () => {
  it('рендерит оси-подписи и фигуру значений', () => {
    const { container } = render(
      <CompetencyRadar
        axes={[
          { label: 'ML', value: 1 },
          { label: 'LLM', value: 0.5 },
          { label: 'RAG', value: 0 },
          { label: 'Агенты', value: 0.25 },
        ]}
      />,
    );
    expect(
      screen.getByRole('img', { name: 'Радар компетенций' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ML')).toBeInTheDocument();
    expect(screen.getByText('Агенты')).toBeInTheDocument();
    expect(container.querySelector('.radar__value')).not.toBeNull();
  });
});
