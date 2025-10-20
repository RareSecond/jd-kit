# Refactoring Workflow

## Project Context
- **Monorepo Root**: {{MONOREPO_ROOT}}
- **Backend Path**: {{BACKEND_PATH}}
- **Frontend Path**: {{FRONTEND_PATH}}

## Pre-Refactoring Checklist

1. **Understand Current State**
   - Read existing code thoroughly
   - Identify code smells or issues
   - Document current behavior

2. **Run All Tests**
   - Ensure all tests pass before refactoring
   - Backend: `cd {{BACKEND_PATH}} && npm test`
   - Frontend: `cd {{FRONTEND_PATH}} && npm test`

## Refactoring Steps

1. **Make Small, Incremental Changes**
   - Refactor one thing at a time
   - Run tests after each change
   - Commit frequently

2. **Improve Code Quality**
   - Extract reusable functions
   - Improve naming and clarity
   - Reduce complexity
   - Remove duplication

3. **Maintain Test Coverage**
   - Update tests if needed
   - Add tests for edge cases
   - Ensure coverage doesn't decrease

4. **Document Changes**
   - Update comments if behavior changes
   - Update documentation
   - Add migration notes if needed

## Post-Refactoring Verification

1. **Run Full Test Suite**
   - All tests must pass
   - Check for performance regressions

2. **Code Quality Check**
   - Run linter: `npm run lint`
   - Fix any new warnings

3. **Manual Testing**
   - Test affected features manually
   - Verify nothing broke

## Commit Message Format
```
refactor(scope): brief description

- Detail what was refactored
- Why the refactoring was needed
- Any breaking changes
```
