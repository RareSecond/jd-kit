# @jdansercoer/jd-kit

A development toolkit for standardizing project setup across multiple projects. Provides shareable configurations, Claude command templates, and reusable scripts.

## Features

- 🎯 **Claude Command Syncing** - Share and sync Claude AI command templates with project-specific variables
- ⚙️ **Shareable Configs** - ESLint, Prettier, TypeScript, and Playwright configurations
- 📦 **Reusable Scripts** - Common development scripts accessible across projects
- 🔄 **Smart Updates** - Track changes and update synced files intelligently

## Installation

```bash
npm install --save-dev @jdansercoer/jd-kit
```

## Quick Start

### Initialize in Your Project

The easiest way to get started:

```bash
npx jd-kit init
```

This interactive command will:
- Ask what you want to set up (Claude commands, configs, or both)
- Sync selected resources to your project
- Show helpful next steps

### Or Sync Resources Individually

**Sync Claude Commands:**

```bash
npx jd-kit sync --claude
```

This will:
1. Prompt you for project-specific paths (monorepo root, backend, frontend, etc.)
2. Copy templates from the toolkit to `.claude/commands/`
3. Replace template variables (e.g., `{{BACKEND_PATH}}`) with your values
4. Create a `.claude/.toolkit-meta.json` file to track synced files

**Sync Configuration Files:**

```bash
npx jd-kit sync --configs
```

**List Available Resources:**

```bash
npx jd-kit list
```

### Update Synced Commands

When the toolkit is updated, sync the latest templates:

```bash
npx jd-kit sync --claude --update
```

If you've modified files locally, you'll be prompted to:
- Keep your local version
- Overwrite with the toolkit version
- Create a backup and update

## Available Commands

### `jd-kit sync`

Sync toolkit resources to your project.

**Options:**
- `--claude` - Sync Claude command templates
- `--configs` - Sync configuration files
- `--update` - Update existing synced files

**Examples:**
```bash
# Initial sync
npx jd-kit sync --claude

# Update existing files
npx jd-kit sync --claude --update

# Sync both commands and configs
npx jd-kit sync --claude --configs
```

### `jd-kit run <script>`

Run a toolkit script in your project.

**Examples:**
```bash
# Run code quality fix
npx jd-kit run cq-fix
```

### `jd-kit list`

List all available toolkit resources (scripts, configs, commands).

**Options:**
- `--scripts` - List only scripts
- `--configs` - List only configurations
- `--commands` - List only Claude commands

**Examples:**
```bash
# List everything
npx jd-kit list

# List only scripts
npx jd-kit list --scripts

# List only configs
npx jd-kit list --configs
```

## Claude Command Templates

The toolkit includes the following Claude command templates:

- **implement.md** - Step-by-step implementation workflow
- **refactor.md** - Safe refactoring checklist
- **cq-fix.md** - Code quality checks and fixes

### Template Variables

Templates use `{{VARIABLE}}` syntax for project-specific values:

- `{{MONOREPO_ROOT}}` - Root path of the monorepo (default: `.`)
- `{{BACKEND_PATH}}` - Path to backend application (default: `backend`)
- `{{FRONTEND_PATH}}` - Path to frontend application (default: `frontend`)
- `{{BACKEND_URL}}` - Backend development URL (default: `http://localhost:3000/api`)
- `{{FRONTEND_URL}}` - Frontend development URL (default: `http://localhost:5173`)
- `{{SCRIPTS_PATH}}` - Path to shared scripts (default: `.claude/lib`)

### How It Works

1. **First Sync**: You provide values for the variables
2. **Template Processing**: Variables are replaced in the templates
3. **File Tracking**: A hash of each file is stored in `.claude/.toolkit-meta.json`
4. **Update Detection**: When updating, the toolkit compares file hashes to detect local modifications
5. **Smart Merging**: Modified files prompt you for conflict resolution

## File Tracking

The toolkit maintains a `.claude/.toolkit-meta.json` file:

```json
{
  "version": "1.0.0",
  "synced": {
    "implement.md": {
      "version": "1.0.0",
      "hash": "abc123...",
      "modified": false,
      "lastSync": "2025-10-20T10:30:00Z"
    }
  },
  "variables": {
    "MONOREPO_ROOT": ".",
    "BACKEND_PATH": "backend",
    "FRONTEND_PATH": "frontend"
  }
}
```

This allows the toolkit to:
- Track which files came from the toolkit
- Detect local modifications
- Preserve your variable configuration

## Reusable Scripts

The toolkit provides reusable development scripts that you can run directly.

### Running Scripts

```bash
npx jd-kit run <script-name>
```

### Available Scripts

- **cq-fix** - Run code quality checks with auto-fixing (typecheck, lint, prettier)

Run `jd-kit list --scripts` to see all available scripts with descriptions.

### How Scripts Work

Scripts are TypeScript files that run in your project context. They use your project's npm scripts (like `npm run typecheck`, `npm run lint`, `npm run prettier:fix`) so they work with your existing setup.

**Example: Running code quality fix**
```bash
npx jd-kit run cq-fix
```

This will run three checks concurrently:
- TypeScript type checking
- ESLint with auto-fix
- Prettier formatting

## Shareable Configs

The toolkit provides shareable configuration files for ESLint, Prettier, and TypeScript. You can either **copy** them to your project or **import** them directly.

### Syncing Config Files

Copy config files to your project:

```bash
npx jd-kit sync --configs
```

This will prompt you to select which configs to copy. The toolkit will check if files already exist and skip them to avoid overwriting your custom configurations.

### Importing Configs

Alternatively, import configs directly without copying:

### ESLint

```javascript
// eslint.config.js
import jdKitConfig from '@jdansercoer/jd-kit/configs/eslint'

export default [
  ...jdKitConfig,
  {
    // Project-specific overrides
    rules: {
      'custom-rule': 'error'
    }
  }
]
```

### Prettier

```javascript
// prettier.config.js
import jdKitConfig from '@jdansercoer/jd-kit/configs/prettier'

export default {
  ...jdKitConfig,
  // Project-specific overrides
}
```

### TypeScript

The toolkit provides three TypeScript configurations:

**Base Config** - Flexible base configuration:
```json
{
  "extends": "@jdansercoer/jd-kit/configs/tsconfig.base.json",
  "compilerOptions": {
    // Project-specific settings
  }
}
```

**Backend Config** - NestJS/Node.js optimized (CommonJS, decorators, relaxed strictness):
```json
{
  "extends": "@jdansercoer/jd-kit/configs/tsconfig.backend.json",
  "compilerOptions": {
    // Additional backend settings
  }
}
```

**Frontend Config** - React/Vite optimized (ESNext, strict mode, JSX):
```json
{
  "extends": "@jdansercoer/jd-kit/configs/tsconfig.frontend.json",
  "compilerOptions": {
    // Additional frontend settings
  }
}
```

### What's Included

**ESLint Config:**
- TypeScript ESLint rules
- Perfectionist plugin for sorting
- Test file configurations
- Recommended code quality rules

**Prettier Config:**
- Consistent quote props
- Object wrapping preferences

**TypeScript Configs:**
- Modern ES targets
- Path aliases support
- Appropriate strictness levels for backend/frontend

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing Locally

Link the package for local testing:

```bash
# In jd-kit directory
npm link

# In your project
npm link @jdansercoer/jd-kit
```

Or use file reference:

```bash
npm install @jdansercoer/jd-kit@file:../jd-kit
```

## Project Structure

```
jd-kit/
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI entry point
│   │   ├── commands/
│   │   │   ├── sync.ts           # Sync command
│   │   │   ├── run.ts            # Run script command
│   │   │   └── list.ts           # List resources command
│   │   └── utils/
│   │       ├── file-tracker.ts   # File tracking system
│   │       ├── template-engine.ts # Variable substitution
│   │       └── hash.ts           # File hashing
│   ├── configs/                  # Shareable configs
│   │   ├── eslint.config.js
│   │   ├── prettier.config.js
│   │   ├── tsconfig.base.json
│   │   ├── tsconfig.backend.json
│   │   └── tsconfig.frontend.json
│   └── scripts/                  # Reusable scripts
│       ├── cq-fix.ts             # Code quality fix script
│       └── scripts.json          # Scripts manifest
├── templates/
│   └── claude/                   # Claude command templates
│       ├── implement.md
│       ├── refactor.md
│       ├── cq-fix.md
│       └── _variables.json       # Variable definitions
├── dist/                         # Build output
└── package.json
```

## Roadmap

### Phase 1: Minimal Viable Toolkit ✅
- ✅ CLI with sync command
- ✅ Claude command syncing
- ✅ File tracking system
- ✅ Template variable substitution

### Phase 2: Config Extraction ✅
- ✅ Shareable ESLint config
- ✅ Shareable Prettier config
- ✅ Shareable TypeScript config (Base, Backend, Frontend)
- ✅ `jd-kit sync --configs` command

### Phase 3: Script Management ✅
- ✅ Extract reusable scripts
- ✅ `jd-kit run <script>` command
- ✅ `jd-kit list` command

### Phase 4: Polish ✅
- ✅ `jd-kit init` for new projects
- ✅ Update notifications
- ✅ .npmignore and package.json metadata
- ✅ CHANGELOG.md
- [ ] Example projects (future)
- [ ] Publish to npm (ready when you are!)

## Contributing

This is a personal toolkit, but suggestions are welcome!

## License

MIT © Jasper Dansercoer
