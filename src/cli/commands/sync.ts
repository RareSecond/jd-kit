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
  hooks?: boolean
  npmScripts?: boolean
  workflows?: boolean
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

async function syncHooks(update: boolean = false): Promise<void> {
  console.log(chalk.blue('\nSyncing Claude Hooks...\n'))

  const tracker = new FileTracker()
  const templateDir = path.resolve(__dirname, '../../../templates/claude/hooks')

  // Check if template directory exists
  const templateDirExists = await fs.pathExists(templateDir)
  if (!templateDirExists) {
    console.log(chalk.yellow(`\nHooks template directory not found: ${templateDir}`))
    return
  }

  // Ensure .claude/hooks directory exists
  await fs.ensureDir('.claude/hooks')

  // Sync hook scripts
  const hookFiles = await fs.readdir(templateDir)
  const shellScripts = hookFiles.filter(f => f.endsWith('.sh'))

  let syncedCount = 0
  let skippedCount = 0

  for (const script of shellScripts) {
    const outputPath = `.claude/hooks/${script}`
    const exists = await fs.pathExists(outputPath)

    if (exists && !update) {
      console.log(chalk.gray(`⏭️  Skipped ${script} (already exists)`))
      skippedCount++
      continue
    }

    if (exists && update) {
      const modified = await tracker.isModified(outputPath)
      if (modified) {
        const choice = await promptOverwrite(script)
        if (choice === 'skip') {
          console.log(chalk.gray(`⏭️  Skipped ${script} (keeping local version)`))
          skippedCount++
          continue
        }
        if (choice === 'backup') {
          await fs.copy(outputPath, `${outputPath}.backup`)
          console.log(chalk.blue(`📦 Backed up to ${script}.backup`))
        }
      }
    }

    // Copy the hook script
    const sourcePath = path.join(templateDir, script)
    await fs.copy(sourcePath, outputPath)

    // Make it executable
    await fs.chmod(outputPath, '755')

    // Track the file
    const content = await fs.readFile(outputPath, 'utf-8')
    await tracker.track(outputPath, content)

    console.log(chalk.green(`✓ Synced ${script}`))
    syncedCount++
  }

  // Sync settings.json (merge hooks into existing settings)
  const settingsTemplatePath = path.resolve(__dirname, '../../../templates/claude/settings.json')
  const settingsOutputPath = '.claude/settings.json'

  if (await fs.pathExists(settingsTemplatePath)) {
    const templateSettings = await fs.readJSON(settingsTemplatePath)
    let existingSettings: Record<string, unknown> = {}

    if (await fs.pathExists(settingsOutputPath)) {
      try {
        existingSettings = await fs.readJSON(settingsOutputPath)
      } catch {
        // If parsing fails, start fresh
        existingSettings = {}
      }
    }

    // Merge hooks configuration (template hooks take precedence)
    const mergedSettings = {
      ...existingSettings,
      hooks: templateSettings.hooks
    }

    await fs.writeJSON(settingsOutputPath, mergedSettings, { spaces: 2 })
    console.log(chalk.green(`✓ Updated .claude/settings.json with hooks configuration`))
  }

  console.log()
  console.log(chalk.green(`✓ Synced ${syncedCount} hook(s)`))
  if (skippedCount > 0) {
    console.log(chalk.gray(`  Skipped ${skippedCount} hook(s)`))
  }

  console.log()
  console.log(chalk.blue('📋 Hooks configured:'))
  console.log(chalk.gray('  • PostToolUse (Edit|Write): Auto-format with Prettier/ESLint'))
  console.log(chalk.gray('  • Stop/SubagentStop: Quality gate (typecheck, lint, format)'))
  console.log()
  console.log(chalk.yellow('⚠️  Note: The quality-gate.sh hook expects these npm scripts:'))
  console.log(chalk.gray('  • npm run typecheck'))
  console.log(chalk.gray('  • npm run lint:check'))
  console.log(chalk.gray('  • npm run prettier:check'))
  console.log(chalk.blue('\n💡 Tip: Run `jd-kit sync --npm-scripts` to add these scripts to your package.json'))
}

async function syncNpmScripts(): Promise<void> {
  console.log(chalk.blue('\nNpm Scripts Configuration'))
  console.log('Select your project type to add quality check scripts:\n')

  const { projectType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'projectType',
      message: 'Select project type:',
      choices: [
        { name: 'Backend (NestJS/Node.js) - uses tsc --noEmit', value: 'backend' },
        { name: 'Frontend (Vite/React) - uses tsc -b', value: 'frontend' },
        { name: 'Monorepo Root - runs across workspaces', value: 'monorepo' }
      ]
    }
  ])

  // Load the scripts template
  const templatePath = path.resolve(__dirname, `../../../templates/configs/scripts.${projectType}.json`)
  const template = await fs.readJSON(templatePath)

  // Check if package.json exists
  const packageJsonPath = 'package.json'
  if (!await fs.pathExists(packageJsonPath)) {
    console.log(chalk.red('\n❌ No package.json found in current directory'))
    return
  }

  // Read existing package.json
  const packageJson = await fs.readJSON(packageJsonPath)
  const existingScripts = packageJson.scripts || {}

  // Check for conflicts
  const newScripts = template.scripts
  const conflicts: string[] = []
  const toAdd: Record<string, string> = {}

  for (const [name, command] of Object.entries(newScripts)) {
    if (existingScripts[name] && existingScripts[name] !== command) {
      conflicts.push(name)
    } else if (!existingScripts[name]) {
      toAdd[name] = command as string
    }
  }

  if (Object.keys(toAdd).length === 0 && conflicts.length === 0) {
    console.log(chalk.green('\n✓ All scripts already exist in package.json'))
    return
  }

  // Show what will be added
  if (Object.keys(toAdd).length > 0) {
    console.log(chalk.blue('\nScripts to add:'))
    for (const [name, command] of Object.entries(toAdd)) {
      console.log(chalk.green(`  + ${name}: "${command}"`))
    }
  }

  // Handle conflicts
  if (conflicts.length > 0) {
    console.log(chalk.yellow('\nConflicting scripts (already exist with different commands):'))
    for (const name of conflicts) {
      console.log(chalk.yellow(`  ⚠ ${name}`))
      console.log(chalk.gray(`    Current: "${existingScripts[name]}"`))
      console.log(chalk.gray(`    Template: "${newScripts[name]}"`))
    }

    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Overwrite conflicting scripts?',
        default: false
      }
    ])

    if (overwrite) {
      for (const name of conflicts) {
        toAdd[name] = newScripts[name] as string
      }
    }
  }

  if (Object.keys(toAdd).length === 0) {
    console.log(chalk.yellow('\nNo scripts to add'))
    return
  }

  // Confirm
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Add ${Object.keys(toAdd).length} script(s) to package.json?`,
      default: true
    }
  ])

  if (!confirm) {
    console.log(chalk.yellow('Cancelled'))
    return
  }

  // Update package.json
  packageJson.scripts = {
    ...existingScripts,
    ...toAdd
  }

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 })

  console.log(chalk.green(`\n✓ Added ${Object.keys(toAdd).length} script(s) to package.json`))
  console.log(chalk.blue('\nAdded scripts:'))
  for (const name of Object.keys(toAdd)) {
    console.log(chalk.gray(`  • npm run ${name}`))
  }
}

async function syncWorkflows(): Promise<void> {
  console.log(chalk.blue('\nGitHub Workflow Selection'))
  console.log('Select which workflow to add:\n')

  const { workflow } = await inquirer.prompt([
    {
      type: 'list',
      name: 'workflow',
      message: 'Select workflow template:',
      choices: [
        { name: 'Code Quality (Basic) - typecheck, lint, prettier', value: 'code-quality' },
        { name: 'Code Quality (Full) - includes Prisma, PostgreSQL, Orval', value: 'code-quality-full' }
      ]
    }
  ])

  // Ensure .github/workflows directory exists
  await fs.ensureDir('.github/workflows')

  const templatePath = path.resolve(__dirname, `../../../templates/github/workflows/${workflow}.yml`)
  const outputPath = '.github/workflows/code-quality.yml'

  const exists = await fs.pathExists(outputPath)
  if (exists) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: chalk.yellow(`${outputPath} already exists. Overwrite?`),
        default: false
      }
    ])

    if (!overwrite) {
      console.log(chalk.gray('Skipped workflow sync'))
      return
    }
  }

  await fs.copy(templatePath, outputPath)

  console.log(chalk.green(`\n✓ Created ${outputPath}`))

  if (workflow === 'code-quality') {
    console.log(chalk.blue('\n📋 Basic workflow includes:'))
    console.log(chalk.gray('  • Checkout, Node.js setup, npm ci'))
    console.log(chalk.gray('  • npm run cq (typecheck, lint, prettier)'))
    console.log(chalk.yellow('\n💡 Uncomment Prisma/Orval sections if needed'))
  } else {
    console.log(chalk.blue('\n📋 Full workflow includes:'))
    console.log(chalk.gray('  • Checkout, Node.js setup, npm ci'))
    console.log(chalk.gray('  • Prisma generate + PostgreSQL setup'))
    console.log(chalk.gray('  • Schema drift detection'))
    console.log(chalk.gray('  • Orval API client generation'))
    console.log(chalk.gray('  • npm run cq'))
    console.log(chalk.yellow('\n⚠️  You may need to add TimescaleDB setup if using it'))
  }
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  console.log(chalk.bold('\n🛠️  JD-Kit Sync\n'))

  if (!options.claude && !options.configs && !options.hooks && !options.npmScripts && !options.workflows) {
    console.log(chalk.yellow('Please specify what to sync:'))
    console.log('  --claude       Sync Claude commands')
    console.log('  --configs      Sync configuration files')
    console.log('  --hooks        Sync Claude hooks (quality gate, auto-format)')
    console.log('  --npm-scripts  Add quality check scripts to package.json')
    console.log('  --workflows    Add GitHub workflow templates')
    console.log('\nExample: jd-kit sync --claude')
    return
  }

  if (options.claude) {
    await syncClaudeCommands(options.update)
  }

  if (options.configs) {
    await syncConfigs()
  }

  if (options.hooks) {
    await syncHooks(options.update)
  }

  if (options.npmScripts) {
    await syncNpmScripts()
  }

  if (options.workflows) {
    await syncWorkflows()
  }
}
