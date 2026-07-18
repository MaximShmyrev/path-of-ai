import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LessonView } from './LessonView';

describe('LessonView', () => {
  it('рендерит markdown-урок (заголовок и текст)', () => {
    render(<LessonView body={'## Заголовок\n\nТело урока.'} />);
    expect(
      screen.getByRole('heading', { name: 'Заголовок' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Тело урока.')).toBeInTheDocument();
  });

  it('рендерит списки', () => {
    render(<LessonView body={'- первый\n- второй'} />);
    expect(screen.getByText('первый')).toBeInTheDocument();
    expect(screen.getByText('второй')).toBeInTheDocument();
  });
});
