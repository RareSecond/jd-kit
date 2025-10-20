# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-20

### Added

#### CLI Commands
- **`jd-kit init`** - Interactive initialization command for new projects
  - Prompts for resource selection (Claude commands, configs)
  - Non-interactive mode with `--yes` flag
  - Suggests helpful next steps after initialization
- **`jd-kit sync`** - Sync toolkit resources to your project
  - `--claude` flag to sync Claude command templates
  - `--configs` flag to sync configuration files
  - `--update` flag to update existing synced files
  - Interactive conflict resolution for modified files
- **`jd-kit run <script>`** - Run toolkit scripts in your project
  - Executes TypeScript scripts using tsx
  - Scripts run in project context
- **`jd-kit list`** - List all available toolkit resources
  - `--scripts` flag to show only scripts
  - `--configs` flag to show only configurations
  - `--commands` flag to show only Claude commands
  - Category-based organization

#### Claude Command Templates
- **implement.md** - Feature implementation workflow with project-specific paths
- **refactor.md** - Safe refactoring checklist with verification steps
- **cq-fix.md** - Code quality checks and auto-fixing guide
- Template variable substitution system:
  - `{{MONOREPO_ROOT}}` - Root path of the monorepo
  - `{{BACKEND_PATH}}` - Backend workspace path
  - `{{FRONTEND_PATH}}` - Frontend workspace path
  - `{{BACKEND_URL}}` - Backend development URL
  - `{{FRONTEND_URL}}` - Frontend development URL
  - `{{SCRIPTS_PATH}}` - Shared scripts path
- File tracking system (`.toolkit-meta.json`)
  - Hash-based change detection
  - Version tracking
  - Smart update handling with conflict resolution

#### Shareable Configurations
- **ESLint Config** - TypeScript + Perfectionist plugin
  - Recommended TypeScript rules
  - Test file configurations
  - E2E test support
  - Global ignores for common build artifacts
- **Prettier Config** - Minimal, opinionated formatting
  - Consistent quote props
  - Object wrapping preferences
- **TypeScript Configs**
  - **Base** - Flexible foundation for any project
  - **Backend** - NestJS/Node.js optimized (CommonJS, decorators, relaxed strictness)
  - **Frontend** - React/Vite optimized (ESNext, strict mode, JSX support)

#### Reusable Scripts
- **cq-fix** - Code quality fix script
  - Runs typecheck, lint, and prettier:fix concurrently
  - Color-coded output per task
  - Summary of pass/fail status
- Scripts manifest system (`scripts.json`)
  - Category-based organization
  - Metadata for each script (name, description, file, category)

#### Features
- **Update Notifications** - Check for new versions automatically
  - 24-hour caching to avoid spamming npm registry
  - Non-blocking checks
  - Clear upgrade instructions
- **File Tracking** - Smart syncing with modification detection
  - SHA-256 hash-based change detection
  - Backup creation before overwrites
  - Skip unchanged files
- **Interactive Prompts** - User-friendly CLI experience
  - Checkbox selections for multiple choices
  - Confirmation prompts for destructive actions
  - Default values for quick setup

### Technical Details
- Built with TypeScript 5.9
- Uses Commander.js for CLI
- Inquirer for interactive prompts
- Chalk for colored output
- fs-extra for enhanced file operations
- tsx for running TypeScript scripts

### Package Configuration
- Scoped package: `@jdansercoer/jd-kit`
- ESM module format
- Comprehensive exports for all resources
- Peer dependencies marked as optional
- Includes dist, templates, src/configs, and src/scripts in package

---

## Future Versions

### Planned for 1.1.0
- Additional reusable scripts (git worktree management, GitHub setup)
- Custom template repositories support
- Enhanced variable system with validation

### Planned for 1.2.0
- Plugin system for extensibility
- Auto-detection of project type
- Compliance checking tools

### Planned for 2.0.0
- Team-wide preset management
- Shared variable sets across team
- Advanced template features
