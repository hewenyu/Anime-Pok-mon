import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
// This import will fail initially, which is correct for TDD.
import { routeConfig } from './Router.tsx';

describe('App Routing', () => {
  it('renders MainMenuScreen for the root path ("/")', async () => {
    const router = createMemoryRouter(routeConfig, {
      initialEntries: ['/'],
    });

    render(<RouterProvider router={router} />);

    // Using findByText is a good practice for components that might render asynchronously.
    expect(await screen.findByText('MainMenuScreen')).toBeInTheDocument();
  });

  it('renders CharacterCreationScreen for the "/character-creation" path', async () => {
    const router = createMemoryRouter(routeConfig, {
      initialEntries: ['/character-creation'],
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('创建你的角色')).toBeInTheDocument();
  });

  it('renders AdventureView for the "/game" path', async () => {
    const router = createMemoryRouter(routeConfig, {
      initialEntries: ['/game'],
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('AdventureView')).toBeInTheDocument();
  });
});