import inquirer from 'inquirer'
import chalk from 'chalk'
import fs from 'fs-extra'
import { syncCommand } from './sync.js'

interface InitOptions {
  yes?: boolean
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(chalk.bold('\n🚀 JD-Kit Initialization\n'))
  console.log(chalk.gray('Set up your project with JD-Kit toolkit\n'))

  // Check if already initialized
  const metaExists = await fs.pathExists('.claude/.toolkit-meta.json')
  if (metaExists && !options.yes) {
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'JD-Kit is already initialized in this project. Reinitialize?',
        default: false
      }
    ])

    if (!proceed) {
      console.log(chalk.blue('\n✓ Initialization cancelled\n'))
      return
    }
  }

  let setupChoices: string[] = []

  if (options.yes) {
    // Non-interactive mode: set up everything
    setupChoices = ['claude', 'configs']
  } else {
    // Interactive mode: ask what to set up
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'setup',
        message: 'What would you like to set up?',
        choices: [
          {
            name: 'Claude command templates (recommended)',
            value: 'claude',
            checked: true
          },
          {
            name: 'Shareable configurations (ESLint, Prettier, TypeScript)',
            value: 'configs',
            checked: true
          }
        ]
      }
    ])

    setupChoices = answers.setup
  }

  if (setupChoices.length === 0) {
    console.log(chalk.yellow('\n⚠️  No resources selected\n'))
    return
  }

  // Run sync for selected resources
  console.log()
  for (const choice of setupChoices) {
    if (choice === 'claude') {
      await syncCommand({ claude: true, update: false })
      console.log()
    } else if (choice === 'configs') {
      await syncCommand({ configs: true, update: false })
      console.log()
    }
  }

  // Suggest adding scripts to package.json
  console.log(chalk.bold('📝 Next Steps\n'))

  const packageJsonPath = './package.json'
  if (await fs.pathExists(packageJsonPath)) {
    console.log(chalk.blue('Consider adding these scripts to your package.json:\n'))
    console.log(chalk.gray('  "scripts": {'))
    console.log(chalk.gray('    "cq:fix": "jd-kit run cq-fix",'))
    console.log(chalk.gray('    ...'))
    console.log(chalk.gray('  }'))
    console.log()
  }

  console.log(chalk.blue('Available commands:\n'))
  console.log('  • ' + chalk.green('jd-kit list') + ' - List all available resources')
  console.log('  • ' + chalk.green('jd-kit run <script>') + ' - Run a toolkit script')
  console.log('  • ' + chalk.green('jd-kit sync --claude --update') + ' - Update Claude commands')
  console.log()

  console.log(chalk.green.bold('✨ Initialization complete!\n'))
}
