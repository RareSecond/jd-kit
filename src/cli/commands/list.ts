import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import fs from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ScriptMetadata {
  name: string
  description: string
  file: string
  category: string
}

interface ScriptsManifest {
  scripts: ScriptMetadata[]
  categories: Record<string, { name: string; description: string }>
}

async function loadScriptsManifest(): Promise<ScriptsManifest> {
  // Try dist/scripts first (for compiled package)
  let manifestPath = path.resolve(__dirname, '../../scripts/scripts.json')

  if (!await fs.pathExists(manifestPath)) {
    // Fall back to src/scripts (for npm package)
    manifestPath = path.resolve(__dirname, '../../../src/scripts/scripts.json')
  }

  return await fs.readJSON(manifestPath)
}

interface ListOptions {
  scripts?: boolean
  configs?: boolean
  commands?: boolean
}

export async function listCommand(options: ListOptions): Promise<void> {
  console.log(chalk.bold('\n📋 JD-Kit Resources\n'))

  const showAll = !options.scripts && !options.configs && !options.commands

  // List Scripts
  if (options.scripts || showAll) {
    try {
      const manifest = await loadScriptsManifest()

      console.log(chalk.bold.blue('Available Scripts:\n'))

      // Group scripts by category
      const scriptsByCategory: Record<string, ScriptMetadata[]> = {}
      manifest.scripts.forEach(script => {
        if (!scriptsByCategory[script.category]) {
          scriptsByCategory[script.category] = []
        }
        scriptsByCategory[script.category].push(script)
      })

      // Display by category
      Object.entries(scriptsByCategory).forEach(([categoryKey, scripts]) => {
        const category = manifest.categories[categoryKey]
        console.log(chalk.yellow(`  ${category?.name || categoryKey}`))
        if (category?.description) {
          console.log(chalk.gray(`  ${category.description}\n`))
        }

        scripts.forEach(script => {
          console.log(`    ${chalk.green(script.name)}`)
          console.log(`    ${chalk.gray(script.description)}`)
          console.log()
        })
      })

      console.log(chalk.gray('  Usage: jd-kit run <script-name>\n'))
    } catch (error) {
      console.log(chalk.red('  Error loading scripts manifest'))
    }
  }

  // List Configs
  if (options.configs || showAll) {
    console.log(chalk.bold.blue('Shareable Configurations:\n'))

    const configs = [
      { name: 'ESLint Root', path: '@jdansercoer/jd-kit/configs/eslint', description: 'Root ESLint config with TypeScript + Perfectionist' },
      { name: 'Prettier', path: '@jdansercoer/jd-kit/configs/.prettierrc', description: 'Code formatting preferences (.prettierrc)' },
      { name: 'ESLint Backend Example', path: 'templates/configs', description: 'Example backend ESLint config (extends root)' },
      { name: 'ESLint Frontend Example', path: 'templates/configs', description: 'Example frontend ESLint config (React, extends root)' }
    ]

    configs.forEach(config => {
      console.log(`  ${chalk.green(config.name)}`)
      console.log(`  ${chalk.gray(config.description)}`)
      console.log(`  ${chalk.cyan('Import:')} ${config.path}`)
      console.log()
    })

    console.log(chalk.gray('  Usage: jd-kit sync --configs\n'))
  }

  // List Claude Commands
  if (options.commands || showAll) {
    console.log(chalk.bold.blue('Claude Command Templates:\n'))

    const commands = [
      { name: 'implement.md', description: 'Feature implementation workflow' },
      { name: 'refactor.md', description: 'Code refactoring checklist' },
      { name: 'cq-fix.md', description: 'Code quality checks and fixes' }
    ]

    commands.forEach(command => {
      console.log(`  ${chalk.green(command.name)}`)
      console.log(`  ${chalk.gray(command.description)}`)
      console.log()
    })

    console.log(chalk.gray('  Usage: jd-kit sync --claude\n'))
  }
}
