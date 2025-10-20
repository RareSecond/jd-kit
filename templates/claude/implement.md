# Implementation Workflow

## Project Context
- **Monorepo Root**: {{MONOREPO_ROOT}}
- **Backend Path**: {{BACKEND_PATH}}
- **Frontend Path**: {{FRONTEND_PATH}}
- **Scripts Path**: {{SCRIPTS_PATH}}

## Steps

1. **Parse GitHub Issue**
   - Read and understand the requirements
   - Identify affected components (frontend/backend)

2. **Run Tests**
   - Backend: `cd {{BACKEND_PATH}} && npm test`
   - Frontend: `cd {{FRONTEND_PATH}} && npm test`

3. **Implement Feature**
   - Write code following project conventions
   - Add necessary tests
   - Update documentation if needed

4. **Verify Implementation**
   - Run tests again to ensure nothing broke
   - Test manually in development mode
   - Check code quality with linter

5. **Commit Changes**
   - Create meaningful commit message
   - Reference the GitHub issue number

## Guidelines
- Follow existing code patterns
- Write tests for new functionality
- Keep commits atomic and focused
- Update relevant documentation
