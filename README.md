# Anime-Pok-mon

二次元宝可梦对战

## Code Quality & CI/CD

This project includes automated code quality checks that run on every pull request:

- **ESLint**: Code linting for TypeScript/React
- **Prettier**: Code formatting enforcement  
- **Build Validation**: Ensures code compiles successfully

### Local Development

Before submitting a PR, run these commands in the `server/` directory:

```bash
# Check and fix linting issues
npm run lint:fix

# Format code
npm run format

# Verify everything is ready
npm run build
```

### Automated Checks

All pull requests automatically run:
- Linting validation with ESLint
- Code formatting check with Prettier
- Build compilation test

These checks must pass before code can be merged.
