import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LevelUpOverlay } from './LevelUpOverlay';

describe('LevelUpOverlay', () => {
  it('показывает новый уровень, когда видим', () => {
    render(<LevelUpOverlay visible level={3} />);
    expect(screen.getByText(/уровень 3/i)).toBeInTheDocument();
  });

  it('ничего не рендерит, когда скрыт', () => {
    const { container } = render(<LevelUpOverlay visible={false} level={3} />);
    expect(container).toBeEmptyDOMElement();
  });
});
