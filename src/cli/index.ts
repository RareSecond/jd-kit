#!/usr/bin/env node
import { Command } from 'commander'
import { syncCommand } from './commands/sync.js'
import { runCommand } from './commands/run.js'
import { listCommand } from './commands/list.js'
import { initCommand } from './commands/init.js'
import { checkForUpdates } from './utils/update-notifier.js'

// Check for updates in the background (non-blocking)
checkForUpdates().catch(() => {})

const program = new Command()

program
  .name('jd-kit')
  .description('Development toolkit CLI')
  .version('1.0.0')

program
  .command('init')
  .description('Initialize JD-Kit in your project')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(initCommand)

program
  .command('sync')
  .description('Sync toolkit resources to project')
  .option('--claude', 'Sync Claude commands')
  .option('--configs', 'Sync configuration files')
  .option('--update', 'Update existing synced files')
  .action(syncCommand)

program
  .command('run <script>')
  .description('Run a toolkit script')
  .action(runCommand)

program
  .command('list')
  .description('List available toolkit resources')
  .option('--scripts', 'List only scripts')
  .option('--configs', 'List only configurations')
  .option('--commands', 'List only Claude commands')
  .action(listCommand)

program.parse()
