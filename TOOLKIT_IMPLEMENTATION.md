# @jdansercoer/jd-kit - Implementation Guide

**Date Created**: 2025-10-20
**Purpose**: Shareable NPM package/CLI for standardizing development setup across projects

## Executive Summary

This toolkit solves the problem of maintaining consistent development tooling (configs, scripts, Claude commands, workflows) across multiple projects. Instead of copying files or manually syncing changes, projects install `@jdansercoer/jd-kit` and selectively adopt standard configurations.

**Core Features**:
1. Shareable ESLint, Prettier, TypeScript configs (extend pattern)
2. Claude command syncing with project-specific variables
3. Reusable npm scripts (direct reference pattern)
4. CLI tool for initialization and syncing

## Architecture Decisions

### 1. Repository Structure

**Decision**: Create separate repository `jd-kit` (not subfolder in monorepo)

**Rationale**:
- Independent versioning and release cycle
- Standard pattern for shareable tooling
- Easy consumption via `npm install @jdansercoer/jd-kit`
- Can be used across unrelated projects
- Potential to open source

**Recommended Structure**:
```
jd-kit/
├── src/
│   ├── cli/
│   │   ├── index.ts                    # CLI entry point
│   │   ├── commands/
│   │   │   ├── sync.ts                 # Sync command
│   │   │   ├── init.ts                 # Initialize project
│   │   │   ├── run.ts                  # Run toolkit scripts
│   │   │   └── list.ts                 # List available resources
│   │   └── utils/
│   │       ├── file-tracker.ts         # Track synced files
│   │       ├── template-engine.ts      # Variable substitution
│   │       └── hash.ts                 # File integrity checking
│   │
│   ├── configs/
│   │   ├── eslint.config.js            # Shareable ESLint config
│   │   ├── prettier.config.js          # Shareable Prettier config
│   │   ├── tsconfig.base.json          # Base TypeScript config
│   │   └── playwright.config.ts        # Base Playwright config
│   │
│   └── scripts/
│       ├── cq-fix.ts                   # Code quality fix
│       ├── setup-github.ts             # GitHub CLI setup
│       └── init-worktree.ts            # Git worktree management
│
├── templates/
│   ├── claude/
│   │   ├── implement.md                # Implementation workflow
│   │   ├── refactor.md                 # Refactoring workflow
│   │   ├── analysis-expert.md          # Feature breakdown
│   │   ├── cq-fix.md                   # Code quality checks
│   │   ├── read-issue.md               # Issue parsing
│   │   └── _variables.json             # Variable definitions
│   │
│   ├── github/
│   │   └── workflows/
│   │       └── ci.yml                  # CI workflow template
│   │
│   └── env/
│       └── .env.template               # Environment template
│
├── examples/
│   ├── fullstack-monorepo/             # Example usage
│   └── simple-api/
│
├── docs/
│   ├── README.md
│   ├── claude-commands.md
│   └── configs.md
│
├── package.json
├── tsconfig.json
└── README.md
```

### 2. NPM Script Approach

**Decision**: Direct reference pattern (not merging)

**Example - Consumer Project**:
```json
{
  "devDependencies": {
    "@jdansercoer/jd-kit": "^1.0.0"
  },
  "scripts": {
    "cq:fix": "jd-kit run cq:fix",
    "init-worktree": "jd-kit run init-worktree",
    "setup:github": "jd-kit run setup:github",

    "dev": "concurrently \"npm:dev:*\"",
    "dev:frontend": "cd frontend && vite",
    "dev:backend": "cd backend && nest start"
  }
}
```

**Rationale**:
- Simple and explicit
- No magic merging or file generation
- Users see exactly what's being called
- Easy to override: just change the script
- Toolkit scripts can be updated independently

**Alternative Considered**: Script merging/installation
- Rejected due to complexity
- Would require managing package.json mutations
- Harder to debug and understand

### 3. Claude Command Syncing

**Decision**: File copying with tracking (not symlinks or includes)

**How It Works**:

1. **Toolkit provides templates** with variables:
```markdown
<!-- templates/claude/implement.md -->
# Implementation Workflow

## Project Context
- **Monorepo Root**: {{MONOREPO_ROOT}}
- **Backend Path**: {{BACKEND_PATH}}
- **Frontend Path**: {{FRONTEND_PATH}}

## Steps
1. Parse GitHub issue
2. Run tests at {{BACKEND_PATH}}
3. Implement feature
...
```

2. **CLI syncs and substitutes variables**:
```bash
$ jd-kit sync --claude
? Monorepo root path: .
? Backend path: backend
? Frontend path: frontend
✓ Synced 5 commands to .claude/commands/
✓ Created .claude/.toolkit-meta.json
```

3. **Tracking file maintains state** (`.claude/.toolkit-meta.json`):
```json
{
  "version": "1.2.0",
  "synced": {
    "implement.md": {
      "version": "1.2.0",
      "hash": "abc123def456...",
      "modified": false,
      "lastSync": "2025-10-20T10:30:00Z"
    },
    "refactor.md": {
      "version": "1.2.0",
      "hash": "def456abc123...",
      "modified": true,
      "lastSync": "2025-10-20T10:30:00Z"
    }
  },
  "variables": {
    "MONOREPO_ROOT": ".",
    "BACKEND_PATH": "backend",
    "FRONTEND_PATH": "frontend",
    "SCRIPTS_PATH": ".claude/lib"
  }
}
```

4. **Update detection**:
```bash
$ jd-kit sync --claude --update
⚠ implement.md was modified locally
  1. Keep local version
  2. Overwrite with toolkit version
  3. Show diff
  4. Create backup and update
? Choose: 4
✓ Backed up to implement.md.backup
✓ Updated 4 commands, skipped 1
```

**Rationale**:
- Claude needs actual `.md` files (can't use symlinks/dynamic includes)
- Allows local customization when needed
- Version tracking prevents accidental overwrites
- Can detect and merge updates intelligently
- Hash-based change detection

**Alternatives Considered**:
- **Symlinks**: Auto-updates but breaks on toolkit changes, no customization
- **Include directives**: Requires custom parser, non-standard
- **No tracking**: Manual management, error-prone

### 4. Shareable Config Pattern

**Decision**: Standard extend pattern (like `@typescript-eslint/eslint-plugin`)

**Example - ESLint**:

Toolkit exports base config:
```javascript
// src/configs/eslint.config.js
export default [
  {
    ignores: ['**/dist', '**/node_modules'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      // ... standard rules
    }
  }
]
```

Consumer extends it:
```javascript
// Project's eslint.config.js
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

**Same pattern for**:
- Prettier: `export default { ...config }`
- TypeScript: `"extends": "@jdansercoer/jd-kit/configs/tsconfig.base.json"`
- Playwright: `import { defineConfig } from '@jdansercoer/jd-kit/configs/playwright'`

## Implementation Phases

### Phase 1: Minimal Viable Toolkit (Week 1)

**Goal**: Get basic CLI working with Claude command sync

**Tasks**:
1. Initialize npm package
   ```bash
   npm init -y
   npm install -D typescript @types/node commander chalk
   ```

2. Create basic CLI structure
   ```typescript
   // src/cli/index.ts
   #!/usr/bin/env node
   import { Command } from 'commander'
   import { syncCommand } from './commands/sync'

   const program = new Command()

   program
     .name('jd-kit')
     .description('Development toolkit CLI')
     .version('1.0.0')

   program
     .command('sync')
     .description('Sync toolkit resources to project')
     .option('--claude', 'Sync Claude commands')
     .option('--configs', 'Sync configuration files')
     .option('--update', 'Update existing synced files')
     .action(syncCommand)

   program.parse()
   ```

3. Implement Claude command sync
   ```typescript
   // src/cli/commands/sync.ts
   export async function syncCommand(options: {
     claude?: boolean
     configs?: boolean
     update?: boolean
   }) {
     if (options.claude) {
       await syncClaudeCommands(options.update)
     }
     // ... other sync operations
   }
   ```

4. Copy Claude commands from monorepo to `templates/claude/`

5. Test in monorepo:
   ```bash
   npm install @jdansercoer/jd-kit@file:../jd-kit
   npx jd-kit sync --claude
   ```

**Deliverable**: Working CLI that can sync Claude commands

### Phase 2: Config Extraction (Week 2)

**Goal**: Extract shareable configs (ESLint, Prettier, TypeScript)

**Tasks**:
1. Extract current configs from monorepo
2. Make them extendable (remove project-specific parts)
3. Add to `src/configs/`
4. Export from package.json:
   ```json
   {
     "exports": {
       ".": "./dist/cli/index.js",
       "./configs/eslint": "./dist/configs/eslint.config.js",
       "./configs/prettier": "./dist/configs/prettier.config.js",
       "./configs/tsconfig.base.json": "./src/configs/tsconfig.base.json"
     }
   }
   ```
5. Test extending in monorepo
6. Add `jd-kit sync --configs` command

**Deliverable**: Working shareable configs

### Phase 3: Script Management (Week 3)

**Goal**: Make reusable scripts accessible

**Tasks**:
1. Extract reusable scripts (cq-fix, setup-github, init-worktree)
2. Implement `jd-kit run <script>` command
3. Add script discovery: `jd-kit list scripts`
4. Document available scripts

**Deliverable**: `jd-kit run` command working

### Phase 4: Polish & Documentation (Week 4)

**Goal**: Production-ready toolkit

**Tasks**:
1. Comprehensive README with examples
2. Add `jd-kit init` command for new projects
3. Add update notifications
4. Create example projects
5. Set up GitHub Actions for toolkit repo
6. Publish to npm (scoped package)

**Deliverable**: Published package, complete documentation

## Key Implementation Details

### File Tracking System

```typescript
// src/cli/utils/file-tracker.ts
interface TrackedFile {
  version: string
  hash: string
  modified: boolean
  lastSync: string
}

interface ToolkitMeta {
  version: string
  synced: Record<string, TrackedFile>
  variables: Record<string, string>
}

export class FileTracker {
  private metaPath = '.claude/.toolkit-meta.json'

  async track(file: string, content: string): Promise<void> {
    const meta = await this.read()
    meta.synced[file] = {
      version: TOOLKIT_VERSION,
      hash: hashContent(content),
      modified: false,
      lastSync: new Date().toISOString()
    }
    await this.write(meta)
  }

  async isModified(file: string): Promise<boolean> {
    const meta = await this.read()
    const tracked = meta.synced[file]
    if (!tracked) return false

    const currentContent = await fs.readFile(file, 'utf-8')
    const currentHash = hashContent(currentContent)

    return currentHash !== tracked.hash
  }

  // ... more methods
}
```

### Template Engine

```typescript
// src/cli/utils/template-engine.ts
export class TemplateEngine {
  constructor(private variables: Record<string, string>) {}

  render(template: string): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => this.variables[key] || match
    )
  }

  async renderFile(templatePath: string, outputPath: string): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf-8')
    const rendered = this.render(template)
    await fs.writeFile(outputPath, rendered, 'utf-8')
  }
}
```

### Sync Logic

```typescript
// src/cli/commands/sync.ts
async function syncClaudeCommands(update: boolean = false): Promise<void> {
  const tracker = new FileTracker()
  const meta = await tracker.read()

  // Get or prompt for variables
  const variables = meta.variables || await promptForVariables()
  const engine = new TemplateEngine(variables)

  // Get template files
  const templateDir = path.join(__dirname, '../../../templates/claude')
  const templates = await fs.readdir(templateDir)

  for (const template of templates) {
    if (template.startsWith('_')) continue // Skip metadata files

    const outputPath = `.claude/commands/${template}`
    const exists = await fs.pathExists(outputPath)

    if (exists && !update) {
      console.log(`⏭️  Skipped ${template} (already exists)`)
      continue
    }

    if (exists && update) {
      const modified = await tracker.isModified(outputPath)
      if (modified) {
        const choice = await promptOverwrite(template)
        if (choice === 'skip') continue
        if (choice === 'backup') {
          await fs.copy(outputPath, `${outputPath}.backup`)
        }
      }
    }

    // Render and write
    const templatePath = path.join(templateDir, template)
    await engine.renderFile(templatePath, outputPath)

    // Track the file
    const content = await fs.readFile(outputPath, 'utf-8')
    await tracker.track(outputPath, content)

    console.log(`✓ Synced ${template}`)
  }

  // Update variables in meta
  meta.variables = variables
  await tracker.write(meta)
}
```

## Package Configuration

### package.json

```json
{
  "name": "@jdansercoer/jd-kit",
  "version": "1.0.0",
  "description": "Development toolkit for standardizing project setup",
  "author": "Jasper Dansercoer",
  "license": "MIT",
  "type": "module",
  "bin": {
    "jd-kit": "./dist/cli/index.js"
  },
  "exports": {
    ".": "./dist/cli/index.js",
    "./configs/eslint": "./dist/configs/eslint.config.js",
    "./configs/prettier": "./dist/configs/prettier.config.js",
    "./configs/tsconfig.base.json": "./src/configs/tsconfig.base.json",
    "./configs/playwright": "./dist/configs/playwright.config.js"
  },
  "files": [
    "dist",
    "templates",
    "src/configs"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.0",
    "fs-extra": "^11.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/fs-extra": "^11.0.0",
    "typescript": "^5.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Usage Examples

### In Consumer Projects

**Initial Setup**:
```bash
npm install --save-dev @jdansercoer/jd-kit
npx jd-kit init
```

**Sync Claude Commands**:
```bash
npx jd-kit sync --claude
# Prompts for project-specific paths
# Creates .claude/commands/ with customized templates
```

**Use Shareable Configs**:
```javascript
// eslint.config.js
import jdKit from '@jdansercoer/jd-kit/configs/eslint'
export default [...jdKit]
```

**Use Toolkit Scripts**:
```json
{
  "scripts": {
    "cq:fix": "jd-kit run cq:fix"
  }
}
```

**Update Commands**:
```bash
npx jd-kit sync --claude --update
# Detects local modifications
# Prompts for conflict resolution
```

**List Available Resources**:
```bash
npx jd-kit list
# Shows available commands, configs, scripts
```

## Testing Strategy

### During Development

1. **Local linking**:
   ```bash
   # In jd-kit repo
   npm link

   # In consumer project
   npm link @jdansercoer/jd-kit
   ```

2. **File reference** (faster iteration):
   ```bash
   npm install @jdansercoer/jd-kit@file:../jd-kit
   ```

### Test Cases

1. Fresh project initialization
2. Syncing commands with different variable values
3. Updating commands with local modifications
4. Extending configs with overrides
5. Running toolkit scripts

### Example Projects

Create `examples/` directory with:
- `fullstack-monorepo/` - Mimics the current monorepo structure
- `simple-api/` - Simple NestJS API
- `react-app/` - Simple React app

Each should have working setup using jd-kit.

## Migration Plan for Existing Monorepo

### Step 1: Create jd-kit Repo
```bash
gh repo create jd-kit --private --clone
cd jd-kit
npm init -y
# ... setup structure
```

### Step 2: Extract Current Assets
```bash
# Copy Claude commands
cp -r ../monorepo/.claude/commands/ ./templates/claude/
# Convert to templates (add {{variables}})

# Copy configs
cp ../monorepo/eslint.config.js ./src/configs/
# Make generic (remove project-specific parts)
```

### Step 3: Test in Monorepo
```bash
cd ../monorepo
npm install --save-dev @jdansercoer/jd-kit@file:../jd-kit
npx jd-kit sync --claude
# Verify commands work
```

### Step 4: Publish
```bash
cd ../jd-kit
npm publish --access public
# Or scope to private: npm publish --access restricted
```

### Step 5: Use Published Version
```bash
cd ../monorepo
npm install --save-dev @jdansercoer/jd-kit@^1.0.0
```

## Future Enhancements

### V1.1 - Enhanced Features
- `jd-kit init --template=<template>` - Project templates
- `jd-kit upgrade` - Interactive upgrade with changelog
- `jd-kit doctor` - Verify toolkit setup

### V1.2 - Advanced Syncing
- Custom template repositories
- Plugin system for additional commands
- Auto-detection of project type

### V2.0 - Team Features
- Team-wide preset management
- Shared variable sets
- Compliance checking

## References

### Similar Projects to Study
- `@typescript-eslint/eslint-plugin` - Config pattern
- `create-react-app` - Template system
- `eslint-config-airbnb` - Shareable config
- `husky` - Script hooks pattern

### Key Files to Extract from Monorepo
- `.claude/commands/*.md` - All Claude commands
- `eslint.config.js` - ESLint config
- `prettier.config.js` - Prettier config (if exists)
- `playwright.config.ts` - E2E test config
- `tsconfig.json` - TypeScript base config
- `package.json` scripts - Reusable scripts

## Success Criteria

### Phase 1 Complete When:
- ✅ CLI runs `jd-kit sync --claude`
- ✅ Commands copied to `.claude/commands/`
- ✅ Variables substituted correctly
- ✅ `.toolkit-meta.json` created and tracks files

### Phase 2 Complete When:
- ✅ Can extend ESLint config in consumer project
- ✅ Can extend Prettier config
- ✅ Can extend TypeScript config
- ✅ `jd-kit sync --configs` works

### Phase 3 Complete When:
- ✅ `jd-kit run cq:fix` executes successfully
- ✅ All reusable scripts accessible
- ✅ `jd-kit list scripts` shows available scripts

### Phase 4 Complete When:
- ✅ Published to npm
- ✅ Complete README with examples
- ✅ Working example projects
- ✅ Successfully used in 2+ projects

## Questions to Consider

1. **Versioning**: Use semver, update major version for breaking template changes
2. **Publishing**: GitHub Packages (private) or npm (public)? Recommend npm public for portfolio
3. **Naming**: `@jdansercoer/jd-kit` requires npm scope setup
4. **Monorepo**: Start simple (single package), expand to monorepo if needed (separate config packages)
5. **License**: MIT for open source, or proprietary?

## Getting Started

**First Command to Run**:
```bash
mkdir jd-kit
cd jd-kit
npm init -y
git init
gh repo create jd-kit --private --source=. --remote=origin --push
```

**Then in new Claude conversation**:
> "I have this TOOLKIT_IMPLEMENTATION.md file. Let's implement Phase 1 - start with the CLI structure and Claude command syncing."

---

**Document Version**: 1.0
**Last Updated**: 2025-10-20
**Status**: Ready for Implementation
