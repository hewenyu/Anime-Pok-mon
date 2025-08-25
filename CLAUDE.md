# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese anime-style Pokémon battle simulator built as an educational platform for learning modern frontend development. The project uses React with TypeScript and includes AI-powered story generation, turn-based battle mechanics, and comprehensive game state management. The project is structured as a single-page application with modular feature organization.

**Important**: This project is for educational purposes only and should not be used commercially or for copyright infringement.

## Development Environment Setup

All development work should be done in the `server/` directory:

```bash
cd server
npm install
npm run dev      # Start development server
npm run build    # Build for production
npm run test     # Run tests
```

## Common Commands

### Code Quality
```bash
npm run lint         # Check linting issues
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
```

### Testing
```bash
npm run test         # Run all tests with Vitest
```

### Pre-commit Workflow
1. `npm run format` - Format code
2. `npm run lint` - Check linting
3. `npm run lint:fix` - Fix auto-fixable issues
4. `npm run build` - Verify build succeeds

## Project Architecture

### Feature-Based Structure
The codebase follows a feature-based architecture organized under `server/features/`:

- **`features/adventure/`** - Main game story flow and AI-powered narrative
- **`features/battle/`** - Turn-based Pokémon battle system
- **`features/character/`** - Player profile and team management
- **`features/ui/`** - Shared UI components

Each feature includes:
- `components/` - React components for that feature
- `store/` - Zustand state management (feature-specific)
- `index.ts` - Feature exports

### Core Architecture Files

- **`types.ts`** - Comprehensive TypeScript definitions for the entire game system
- **`store/gameStore.ts`** - Central game state management using Zustand
- **`services/`** - External service integrations (AI, battle logic)
- **`utils/`** - Utility functions and data processing
- **`constants.ts`** - Game constants and configuration

### Key Technical Patterns

1. **State Management**: Uses Zustand for both global game state and feature-specific state
2. **AI Integration**: Integrates Google Gemini API for story generation and NPC interactions
3. **Component Architecture**: Functional components with TypeScript, following React best practices
4. **Data Flow**: Unidirectional data flow with centralized state updates

## Key Game Systems

### Battle System
- Turn-based combat with move effects, status conditions, and type advantages
- Complex move effects system supporting multi-hit, recoil, healing, and status changes
- Battle history tracking and detailed logging

### Story Engine
- AI-powered narrative generation with structured responses
- Event-driven system for game state changes
- NPC interaction system with dialogue history

### Save System
- Local storage-based save/load functionality
- Multiple save slot support
- Game state serialization and validation

## Configuration Files

- **`vite.config.ts`** - Vite bundler configuration with environment variable handling
- **`tsconfig.json`** - TypeScript configuration with strict mode enabled
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`postcss.config.js`** - PostCSS configuration for Tailwind

## Environment Variables

The project requires a `.env` file in the `server/` directory:
```
GEMINI_API_KEY=your_api_key_here
GOOGLE_GEMINI_BASE_URL=optional_custom_base_url
```

## Testing Strategy

- **Vitest** for unit and integration tests
- **@testing-library/react** for component testing
- **jsdom** environment for DOM testing
- Tests located alongside source files with `.test.ts` extension

## Code Standards

### TypeScript
- Strict mode enabled with comprehensive type checking
- No `any` types - use proper typing throughout
- Interface definitions in `types.ts` for shared types

### React Patterns
- Functional components with hooks
- Custom hooks for complex logic (`hooks/` directory)
- Props interfaces defined inline or imported from `types.ts`

### Styling
- Tailwind CSS for styling
- CSS modules for component-specific styles (`.module.css`)
- Consistent spacing and responsive design patterns

## Important Notes

- All user-facing text must be in Chinese (游戏界面需使用中文)
- Pokemon data and images are referenced by ID with local caching
- AI responses are structured with specific event triggers for game state changes
- Battle system implements authentic Pokémon mechanics including type advantages and status effects

## File Naming Conventions

- React components: `PascalCase.tsx`
- Utilities and services: `camelCase.ts`
- Types and interfaces: Defined in `types.ts`
- Test files: `fileName.test.ts`
- CSS modules: `ComponentName.module.css`