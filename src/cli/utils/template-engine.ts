import fs from 'fs-extra'
import path from 'path'

export class TemplateEngine {
  constructor(private variables: Record<string, string>) {}

  render(template: string): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => this.variables[key] || match
    )
  }

  async renderFile(templatePath: string, outputPath: string): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf-8')
    const rendered = this.render(template)
    await fs.ensureDir(path.dirname(outputPath))
    await fs.writeFile(outputPath, rendered, 'utf-8')
  }
}
