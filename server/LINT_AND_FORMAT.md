# Code Linting and Formatting

This project uses ESLint for code linting and Prettier for code formatting to maintain consistent code quality and style.

## Available Scripts

### Linting
- `npm run lint` - Check all files for linting issues
- `npm run lint:fix` - Automatically fix linting issues where possible

### Formatting
- `npm run format` - Format all files using Prettier
- `npm run format:check` - Check if files are properly formatted (without modifying)

## Configuration Files

- `.eslintrc.json` - ESLint configuration for TypeScript/React
- `.prettierrc` - Prettier formatting rules
- `.prettierignore` - Files/directories to exclude from formatting

## Usage Examples

```bash
# Check specific files for linting issues
npx eslint src/components/MyComponent.tsx

# Format specific files
npx prettier --write src/components/MyComponent.tsx

# Check and fix linting issues for the entire project
npm run lint:fix

# Format all project files
npm run format
```

## Pre-commit Workflow (Recommended)

1. Format your code: `npm run format`
2. Check for linting issues: `npm run lint`
3. Fix any remaining issues: `npm run lint:fix`
4. Build to ensure everything works: `npm run build`

## Configuration Details

### ESLint Rules
- TypeScript strict mode enabled
- React hooks and JSX support
- Prettier integration for formatting
- Warning for console.log, error for debugger
- Unused variables with underscore prefix ignored

### Prettier Rules
- Single quotes preferred
- 2-space indentation
- 80 character line width
- Trailing commas (ES5)
- LF line endings