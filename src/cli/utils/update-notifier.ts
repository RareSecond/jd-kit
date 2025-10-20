import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PACKAGE_NAME = '@jdansercoer/jd-kit'
const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours
const CACHE_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.jd-kit-update-check')

interface UpdateCache {
  lastCheck: number
  latestVersion?: string
}

async function getLocalVersion(): Promise<string> {
  const packageJsonPath = path.resolve(__dirname, '../../../package.json')
  const packageJson = await fs.readJSON(packageJsonPath)
  return packageJson.version
}

async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`)
    if (!response.ok) return null
    const data = await response.json()
    return data.version
  } catch {
    return null
  }
}

async function readCache(): Promise<UpdateCache | null> {
  try {
    if (!await fs.pathExists(CACHE_FILE)) return null
    const cache = await fs.readJSON(CACHE_FILE)
    return cache
  } catch {
    return null
  }
}

async function writeCache(cache: UpdateCache): Promise<void> {
  try {
    await fs.writeJSON(CACHE_FILE, cache)
  } catch {
    // Silently fail if we can't write cache
  }
}

function compareVersions(current: string, latest: string): boolean {
  // Simple semver comparison
  const currentParts = current.split('.').map(Number)
  const latestParts = latest.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true
    if (latestParts[i] < currentParts[i]) return false
  }

  return false
}

export async function checkForUpdates(): Promise<void> {
  try {
    const cache = await readCache()
    const now = Date.now()

    // Check if we should fetch the latest version
    let latestVersion: string | null = null

    if (!cache || now - cache.lastCheck > CHECK_INTERVAL) {
      // Time to check for updates
      latestVersion = await getLatestVersion()

      if (latestVersion) {
        await writeCache({
          lastCheck: now,
          latestVersion
        })
      }
    } else {
      // Use cached version
      latestVersion = cache.latestVersion || null
    }

    if (!latestVersion) return

    const localVersion = await getLocalVersion()

    if (compareVersions(localVersion, latestVersion)) {
      console.log()
      console.log(chalk.yellow('╭───────────────────────────────────────────────╮'))
      console.log(chalk.yellow('│') + '                                               ' + chalk.yellow('│'))
      console.log(chalk.yellow('│') + '   ' + chalk.white('Update available! ') + chalk.gray(`${localVersion}`) + ' → ' + chalk.green(`${latestVersion}`) + '      ' + chalk.yellow('│'))
      console.log(chalk.yellow('│') + '                                               ' + chalk.yellow('│'))
      console.log(chalk.yellow('│') + '   Run: ' + chalk.cyan('npm update @jdansercoer/jd-kit') + '      ' + chalk.yellow('│'))
      console.log(chalk.yellow('│') + '                                               ' + chalk.yellow('│'))
      console.log(chalk.yellow('╰───────────────────────────────────────────────╯'))
      console.log()
    }
  } catch {
    // Silently fail - we don't want to break the CLI if update check fails
  }
}
