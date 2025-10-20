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
    console.log(chalk.yellow('\nConfig syncing not yet implemented (coming in Phase 2)'))
  }
}
