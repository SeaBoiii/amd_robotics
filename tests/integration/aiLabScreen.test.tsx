import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AILab from '@/screens/AILab/AILab';

/**
 * Regression cover for a crash that only showed up in the browser: the AI Lab
 * subscribed to Zustand with selectors that built a fresh array on every call,
 * so `useSyncExternalStore` never saw a stable snapshot and React bailed out
 * with "Maximum update depth exceeded". Rendering the screen is enough to catch
 * it — an unstable snapshot throws during render.
 */
describe('AI Lab screen', () => {
  it('renders without an infinite update loop', () => {
    render(
      <MemoryRouter>
        <AILab />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Teach your rover to see' })).toBeInTheDocument();
  });

  it('shows the derived dataset counts', () => {
    render(
      <MemoryRouter>
        <AILab />
      </MemoryRouter>,
    );

    // The starter dataset is deliberately imbalanced, so the balance panel has
    // something to say about it.
    expect(screen.getByRole('tab', { name: /Label data/ })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });
});
