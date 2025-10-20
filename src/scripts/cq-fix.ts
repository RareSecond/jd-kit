#!/usr/bin/env node

/**
 * Code Quality Fix Script
 * Runs typecheck, linting, and prettier formatting concurrently
 */

import { spawn } from 'child_process'
import chalk from 'chalk'

interface ScriptResult {
  name: string
  success: boolean
  output: string
}

function runCommand(command: string, args: string[], name: string, color: string): Promise<ScriptResult> {
  return new Promise((resolve) => {
    console.log(chalk.hex(color)(`[${name}] Starting...`))

    const proc = spawn(command, args, {
      shell: true,
      stdio: 'pipe'
    })

    let output = ''

    proc.stdout?.on('data', (data) => {
      const text = data.toString()
      output += text
      process.stdout.write(chalk.hex(color)(`[${name}] `) + text)
    })

    proc.stderr?.on('data', (data) => {
      const text = data.toString()
      output += text
      process.stderr.write(chalk.hex(color)(`[${name}] `) + text)
    })

    proc.on('close', (code) => {
      const success = code === 0
      if (success) {
        console.log(chalk.hex(color)(`[${name}] `) + chalk.green('✓ Completed'))
      } else {
        console.log(chalk.hex(color)(`[${name}] `) + chalk.red(`✗ Failed (exit code: ${code})`))
      }
      resolve({ name, success, output })
    })

    proc.on('error', (error) => {
      console.error(chalk.hex(color)(`[${name}] `) + chalk.red(`Error: ${error.message}`))
      resolve({ name, success: false, output: error.message })
    })
  })
}

async function main() {
  console.log(chalk.bold('\n🔧 Code Quality Fix\n'))
  console.log(chalk.gray('Running typecheck, linting, and formatting...\n'))

  const startTime = Date.now()

  // Run all checks concurrently
  const results = await Promise.all([
    runCommand('npm', ['run', 'typecheck'], 'typecheck', '#FFD700'),
    runCommand('npm', ['run', 'lint'], 'lint', '#4169E1'),
    runCommand('npm', ['run', 'prettier:fix'], 'prettier', '#32CD32')
  ])

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  // Summary
  console.log(chalk.bold('\n📊 Summary\n'))

  const allPassed = results.every(r => r.success)

  results.forEach(result => {
    const icon = result.success ? chalk.green('✓') : chalk.red('✗')
    console.log(`${icon} ${result.name}: ${result.success ? chalk.green('passed') : chalk.red('failed')}`)
  })

  console.log(chalk.gray(`\nCompleted in ${duration}s`))

  if (allPassed) {
    console.log(chalk.green.bold('\n✨ All checks passed!\n'))
    process.exit(0)
  } else {
    console.log(chalk.red.bold('\n❌ Some checks failed\n'))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exit(1)
})
