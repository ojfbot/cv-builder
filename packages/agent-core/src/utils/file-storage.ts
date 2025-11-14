import { promises as fs } from 'fs'
import path from 'path'

export class FileStorage {
  constructor(private baseDir: string) {}

  async read<T>(filePath: string): Promise<T> {
    const fullPath = path.join(this.baseDir, filePath)
    const content = await fs.readFile(fullPath, 'utf-8')
    return JSON.parse(content) as T
  }

  async write<T>(filePath: string, data: T): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath)
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  async writeText(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath)
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async list(dirPath: string): Promise<string[]> {
    const fullPath = path.join(this.baseDir, dirPath)
    try {
      return await fs.readdir(fullPath)
    } catch {
      return []
    }
  }
}
