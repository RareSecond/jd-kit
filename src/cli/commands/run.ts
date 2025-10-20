import { spawn } from 'child_process'
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

export async function runCommand(scriptName: string): Promise<void> {
  console.log(chalk.bold(`\n🚀 Running script: ${scriptName}\n`))

  try {
    // Load scripts manifest
    const manifest = await loadScriptsManifest()

    // Find the script
    const script = manifest.scripts.find(s => s.name === scriptName)

    if (!script) {
      console.log(chalk.red(`❌ Script '${scriptName}' not found\n`))
      console.log(chalk.blue('Available scripts:'))
      manifest.scripts.forEach(s => {
        console.log(`  ${chalk.green(s.name)} - ${s.description}`)
      })
      console.log()
      console.log(chalk.gray(`Run 'jd-kit list' to see all available scripts`))
      process.exit(1)
    }

    // Resolve script path (try both dist/scripts and src/scripts)
    let scriptPath = path.resolve(__dirname, '../../scripts', script.file)

    if (!await fs.pathExists(scriptPath)) {
      // Fall back to src/scripts (for npm package)
      scriptPath = path.resolve(__dirname, '../../../src/scripts', script.file)
    }

    // Check if script exists
    if (!await fs.pathExists(scriptPath)) {
      console.log(chalk.red(`❌ Script file not found: ${scriptPath}`))
      process.exit(1)
    }

    console.log(chalk.gray(`Executing: ${script.description}\n`))

    // Run the script using tsx (TypeScript executor)
    const proc = spawn('tsx', [scriptPath], {
      stdio: 'inherit',
      shell: true
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        process.exit(code || 1)
      }
    })

    proc.on('error', (error) => {
      console.error(chalk.red(`\n❌ Failed to execute script: ${error.message}`))
      process.exit(1)
    })

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    process.exit(1)
  }
}
