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

### Sync Claude Commands

Sync Claude command templates to your project with custom variables:

```bash
npx jd-kit sync --claude
```

This will:
1. Prompt you for project-specific paths (monorepo root, backend, frontend, etc.)
2. Copy templates from the toolkit to `.claude/commands/`
3. Replace template variables (e.g., `{{BACKEND_PATH}}`) with your values
4. Create a `.claude/.toolkit-meta.json` file to track synced files

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
- `--configs` - Sync configuration files (coming in Phase 2)
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

## Shareable Configs (Coming in Phase 2)

Extend the toolkit's base configurations in your project:

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

```json
{
  "extends": "@jdansercoer/jd-kit/configs/tsconfig.base.json",
  "compilerOptions": {
    // Project-specific settings
  }
}
```

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
│   │   │   └── sync.ts           # Sync command
│   │   └── utils/
│   │       ├── file-tracker.ts   # File tracking system
│   │       ├── template-engine.ts # Variable substitution
│   │       └── hash.ts           # File hashing
│   ├── configs/                  # Shareable configs (Phase 2)
│   └── scripts/                  # Reusable scripts (Phase 3)
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

### Phase 2: Config Extraction (Next)
- [ ] Shareable ESLint config
- [ ] Shareable Prettier config
- [ ] Shareable TypeScript config
- [ ] `jd-kit sync --configs` command

### Phase 3: Script Management
- [ ] Extract reusable scripts
- [ ] `jd-kit run <script>` command
- [ ] `jd-kit list` command

### Phase 4: Polish
- [ ] `jd-kit init` for new projects
- [ ] Update notifications
- [ ] Example projects
- [ ] Publish to npm

## Contributing

This is a personal toolkit, but suggestions are welcome!

## License

MIT © Jasper Dansercoer
