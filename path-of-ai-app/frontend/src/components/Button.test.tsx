import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('рендерит содержимое и реагирует на клик', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>В путь</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'В путь' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('не вызывает обработчик, когда отключена', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Закрыто
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Закрыто' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
