import { createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import MainMenuScreen from '../features/main-menu/MainMenuScreen';
import CharacterCreationScreen from '../features/character-creation/CharacterCreationScreen';
import AdventureView from '../features/adventure-map/AdventureView';

export const routeConfig: RouteObject[] = [
  {
    path: '/',
    element: <MainMenuScreen />,
  },
  {
    path: '/character-creation',
    element: <CharacterCreationScreen />,
  },
  {
    path: '/game',
    element: <AdventureView />,
  },
];

export const router = createBrowserRouter(routeConfig);