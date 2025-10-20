import fs from 'fs-extra'
import path from 'path'
import { hashContent } from './hash.js'

const TOOLKIT_VERSION = '1.0.0'

interface TrackedFile {
  version: string
  hash: string
  modified: boolean
  lastSync: string
}

interface ToolkitMeta {
  version: string
  synced: Record<string, TrackedFile>
  variables: Record<string, string>
}

export class FileTracker {
  private metaPath = '.claude/.toolkit-meta.json'

  async read(): Promise<ToolkitMeta> {
    try {
      const exists = await fs.pathExists(this.metaPath)
      if (!exists) {
        return {
          version: TOOLKIT_VERSION,
          synced: {},
          variables: {}
        }
      }
      return await fs.readJSON(this.metaPath)
    } catch (error) {
      return {
        version: TOOLKIT_VERSION,
        synced: {},
        variables: {}
      }
    }
  }

  async write(meta: ToolkitMeta): Promise<void> {
    await fs.ensureDir(path.dirname(this.metaPath))
    await fs.writeJSON(this.metaPath, meta, { spaces: 2 })
  }

  async track(file: string, content: string): Promise<void> {
    const meta = await this.read()
    meta.synced[file] = {
      version: TOOLKIT_VERSION,
      hash: hashContent(content),
      modified: false,
      lastSync: new Date().toISOString()
    }
    await this.write(meta)
  }

  async isModified(file: string): Promise<boolean> {
    const meta = await this.read()
    const tracked = meta.synced[file]
    if (!tracked) return false

    const exists = await fs.pathExists(file)
    if (!exists) return false

    const currentContent = await fs.readFile(file, 'utf-8')
    const currentHash = hashContent(currentContent)

    return currentHash !== tracked.hash
  }

  async updateHash(file: string): Promise<void> {
    const meta = await this.read()
    const tracked = meta.synced[file]
    if (!tracked) return

    const currentContent = await fs.readFile(file, 'utf-8')
    tracked.hash = hashContent(currentContent)
    tracked.modified = false
    tracked.lastSync = new Date().toISOString()

    await this.write(meta)
  }
}
