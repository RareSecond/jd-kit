#!/usr/bin/env node
import { Command } from 'commander'
import { syncCommand } from './commands/sync.js'

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
