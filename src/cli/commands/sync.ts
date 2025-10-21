import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { FileTracker } from '../utils/file-tracker.js'
import { TemplateEngine } from '../utils/template-engine.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface SyncOptions {
  claude?: boolean
  configs?: boolean
  update?: boolean
}

async function promptForVariables(): Promise<Record<string, string>> {
  console.log(chalk.blue('\nClaude Command Configuration'))
  console.log('Please provide project-specific paths:\n')

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'MONOREPO_ROOT',
      message: 'Monorepo root path:',
      default: '.'
    },
    {
      type: 'input',
      name: 'BACKEND_PATH',
      message: 'Backend path (workspace name):',
      default: 'backend'
    },
    {
      type: 'input',
      name: 'FRONTEND_PATH',
      message: 'Frontend path (workspace name):',
      default: 'frontend'
    },
    {
      type: 'input',
      name: 'BACKEND_URL',
      message: 'Backend development URL:',
      default: 'http://localhost:3000/api'
    },
    {
      type: 'input',
      name: 'FRONTEND_URL',
      message: 'Frontend development URL:',
      default: 'http://localhost:5173'
    },
    {
      type: 'input',
      name: 'SCRIPTS_PATH',
      message: 'Scripts path:',
      default: '.claude/lib'
    }
  ])

  return answers
}

async function promptOverwrite(filename: string): Promise<'skip' | 'overwrite' | 'backup'> {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.yellow(`${filename} was modified locally. What would you like to do?`),
      choices: [
        { name: 'Keep local version (skip)', value: 'skip' },
        { name: 'Overwrite with toolkit version', value: 'overwrite' },
        { name: 'Create backup and update', value: 'backup' }
      ]
    }
  ])

  return choice
}

async function syncClaudeCommands(update: boolean = false): Promise<void> {
  const tracker = new FileTracker()
  const meta = await tracker.read()

  // Get or prompt for variables
  let variables = meta.variables
  if (!variables || Object.keys(variables).length === 0) {
    variables = await promptForVariables()
  } else if (!update) {
    console.log(chalk.blue('Using existing configuration:'))
    Object.entries(variables).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })
    console.log()
  }

  const engine = new TemplateEngine(variables)

  // Get template files - navigate from dist/cli/commands to templates/claude
  const templateDir = path.resolve(__dirname, '../../../templates/claude')

  // Check if template directory exists
  const templateDirExists = await fs.pathExists(templateDir)
  if (!templateDirExists) {
    console.log(chalk.yellow(`\nTemplate directory not found: ${templateDir}`))
    console.log(chalk.blue('Creating example templates...'))
    await fs.ensureDir(templateDir)
    console.log(chalk.green('✓ Created templates/claude/ directory'))
    console.log(chalk.yellow('\nPlease add your Claude command templates to templates/claude/'))
    return
  }

  const templates = await fs.readdir(templateDir)
  const mdTemplates = templates.filter(t => t.endsWith('.md') && !t.startsWith('_'))

  if (mdTemplates.length === 0) {
    console.log(chalk.yellow('\nNo template files found in templates/claude/'))
    console.log(chalk.blue('Add .md files to templates/claude/ to sync them'))
    return
  }

  let syncedCount = 0
  let skippedCount = 0

  for (const template of mdTemplates) {
    const outputPath = `.claude/commands/${template}`
    const exists = await fs.pathExists(outputPath)

    if (exists && !update) {
      console.log(chalk.gray(`⏭️  Skipped ${template} (already exists)`))
      skippedCount++
      continue
    }

    if (exists && update) {
      const modified = await tracker.isModified(outputPath)
      if (modified) {
        const choice = await promptOverwrite(template)
        if (choice === 'skip') {
          console.log(chalk.gray(`⏭️  Skipped ${template} (keeping local version)`))
          skippedCount++
          continue
        }
        if (choice === 'backup') {
          await fs.copy(outputPath, `${outputPath}.backup`)
          console.log(chalk.blue(`📦 Backed up to ${template}.backup`))
        }
      }
    }

    // Render and write
    const templatePath = path.join(templateDir, template)
    await engine.renderFile(templatePath, outputPath)

    // Track the file
    const content = await fs.readFile(outputPath, 'utf-8')
    await tracker.track(outputPath, content)

    console.log(chalk.green(`✓ Synced ${template}`))
    syncedCount++
  }

  // Update variables in meta
  meta.variables = variables
  await tracker.write(meta)

  console.log()
  console.log(chalk.green(`✓ Synced ${syncedCount} command(s)`))
  if (skippedCount > 0) {
    console.log(chalk.gray(`  Skipped ${skippedCount} command(s)`))
  }
  console.log(chalk.blue(`✓ Created .claude/.toolkit-meta.json`))
}

async function syncConfigs(): Promise<void> {
  console.log(chalk.blue('\nConfiguration File Selection'))
  console.log('Select which config files to sync:\n')

  const { configs } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'configs',
      message: 'Select configuration files:',
      choices: [
        { name: 'ESLint Root (eslint.config.js)', value: 'eslint', checked: true },
        { name: 'Prettier (.prettierrc)', value: 'prettier', checked: true },
        { name: 'ESLint Backend Example (backend/eslint.config.js)', value: 'eslint-backend' },
        { name: 'ESLint Frontend Example (frontend/eslint.config.mjs)', value: 'eslint-frontend' },
        { name: 'TypeScript Backend (backend/tsconfig.json + tsconfig.build.json)', value: 'ts-backend' },
        { name: 'TypeScript Frontend (frontend/tsconfig.*.json)', value: 'ts-frontend' }
      ]
    }
  ])

  if (configs.length === 0) {
    console.log(chalk.yellow('No configs selected'))
    return
  }

  const configMap: Record<string, { source: string; dest: string; instructions: string }> = {
    'eslint': {
      source: path.resolve(__dirname, '../../../src/configs/eslint.config.js'),
      dest: 'eslint.config.js',
      instructions: 'Root ESLint config copied. Extend this in your backend/frontend workspaces.'
    },
    'prettier': {
      source: path.resolve(__dirname, '../../../src/configs/.prettierrc'),
      dest: '.prettierrc',
      instructions: 'Prettier config copied to root.'
    },
    'eslint-backend': {
      source: path.resolve(__dirname, '../../../templates/configs/backend.eslint.config.js'),
      dest: 'backend/eslint.config.js',
      instructions: 'Backend ESLint example copied. Adjust the import path to point to your root config.'
    },
    'eslint-frontend': {
      source: path.resolve(__dirname, '../../../templates/configs/frontend.eslint.config.mjs'),
      dest: 'frontend/eslint.config.mjs',
      instructions: 'Frontend ESLint example copied. Adjust the import path to point to your root config.'
    }
  }

  console.log()
  for (const configKey of configs) {
    // Handle TypeScript backend (multiple files)
    if (configKey === 'ts-backend') {
      const files = [
        { source: 'backend.tsconfig.json', dest: 'backend/tsconfig.json' },
        { source: 'backend.tsconfig.build.json', dest: 'backend/tsconfig.build.json' }
      ]

      for (const file of files) {
        const sourcePath = path.resolve(__dirname, '../../../templates/configs', file.source)
        const exists = await fs.pathExists(file.dest)
        if (exists) {
          console.log(chalk.yellow(`⚠️  ${file.dest} already exists - skipping`))
        } else {
          await fs.copy(sourcePath, file.dest)
          console.log(chalk.green(`✓ Created ${file.dest}`))
        }
      }
      console.log(chalk.gray('  Backend TypeScript config copied (NestJS/CommonJS setup).'))
      continue
    }

    // Handle TypeScript frontend (multiple files)
    if (configKey === 'ts-frontend') {
      const files = [
        { source: 'frontend.tsconfig.json', dest: 'frontend/tsconfig.json' },
        { source: 'frontend.tsconfig.app.json', dest: 'frontend/tsconfig.app.json' },
        { source: 'frontend.tsconfig.node.json', dest: 'frontend/tsconfig.node.json' }
      ]

      for (const file of files) {
        const sourcePath = path.resolve(__dirname, '../../../templates/configs', file.source)
        const exists = await fs.pathExists(file.dest)
        if (exists) {
          console.log(chalk.yellow(`⚠️  ${file.dest} already exists - skipping`))
        } else {
          await fs.copy(sourcePath, file.dest)
          console.log(chalk.green(`✓ Created ${file.dest}`))
        }
      }
      console.log(chalk.gray('  Frontend TypeScript config copied (Vite/React setup).'))
      continue
    }

    const config = configMap[configKey]
    if (!config) continue

    const exists = await fs.pathExists(config.dest)
    if (exists) {
      console.log(chalk.yellow(`⚠️  ${config.dest} already exists - skipping`))
      console.log(chalk.gray(`   ${config.instructions}`))
      continue
    }

    await fs.copy(config.source, config.dest)
    console.log(chalk.green(`✓ Created ${config.dest}`))
    console.log(chalk.gray(`  ${config.instructions}`))
  }

  console.log()
  console.log(chalk.green('✓ Config sync complete!'))
  console.log(chalk.blue('💡 Tip: You can also import these configs directly without copying'))
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  console.log(chalk.bold('\n🛠️  JD-Kit Sync\n'))

  if (!options.claude && !options.configs) {
    console.log(chalk.yellow('Please specify what to sync:'))
    console.log('  --claude   Sync Claude commands')
    console.log('  --configs  Sync configuration files')
    console.log('\nExample: jd-kit sync --claude')
    return
  }

  if (options.claude) {
    await syncClaudeCommands(options.update)
  }

  if (options.configs) {
    await syncConfigs()
  }
}
