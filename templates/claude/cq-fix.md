# Code Quality Fix

## Project Context
- **Monorepo Root**: {{MONOREPO_ROOT}}
- **Backend Path**: {{BACKEND_PATH}}
- **Frontend Path**: {{FRONTEND_PATH}}

## Code Quality Checks

1. **Run Linter**
   - Backend: `cd {{BACKEND_PATH}} && npm run lint`
   - Frontend: `cd {{FRONTEND_PATH}} && npm run lint`

2. **Auto-fix Issues**
   - Backend: `cd {{BACKEND_PATH}} && npm run lint:fix`
   - Frontend: `cd {{FRONTEND_PATH}} && npm run lint:fix`

3. **Check Formatting**
   - Run Prettier: `npm run format:check`
   - Auto-format: `npm run format`

4. **Type Checking** (if TypeScript)
   - Backend: `cd {{BACKEND_PATH}} && npm run type-check`
   - Frontend: `cd {{FRONTEND_PATH}} && npm run type-check`

## Common Issues to Fix

- Unused imports
- Missing types
- Inconsistent formatting
- Console statements in production code
- Deprecated API usage
- Security vulnerabilities

## After Fixing

1. **Verify Changes**
   - Run tests to ensure nothing broke
   - Review changes before committing

2. **Commit**
   - Use meaningful commit message
   - Example: `chore: fix linting issues`
