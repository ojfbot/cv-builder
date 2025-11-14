/**
 * Browser Storage Adapter
 *
 * This provides a storage interface compatible with the FileStorage API
 * but uses browser storage mechanisms (localStorage, IndexedDB, etc.)
 */

export class BrowserStorage {
  constructor(private prefix: string) {}

  async read<T>(key: string): Promise<T> {
    const fullKey = `${this.prefix}:${key}`
    const data = localStorage.getItem(fullKey)
    if (!data) {
      throw new Error(`Item not found: ${key}`)
    }
    return JSON.parse(data) as T
  }

  async write<T>(key: string, data: T): Promise<void> {
    const fullKey = `${this.prefix}:${key}`
    localStorage.setItem(fullKey, JSON.stringify(data))
  }

  async writeText(key: string, content: string): Promise<void> {
    const fullKey = `${this.prefix}:${key}`
    localStorage.setItem(fullKey, content)
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = `${this.prefix}:${key}`
    return localStorage.getItem(fullKey) !== null
  }

  async list(prefix: string = ''): Promise<string[]> {
    const fullPrefix = `${this.prefix}:${prefix}`
    const keys: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(fullPrefix)) {
        // Remove the prefix and extract just the filename
        const relativePath = key.substring(fullPrefix.length)
        keys.push(relativePath)
      }
    }

    return keys
  }

  async delete(key: string): Promise<void> {
    const fullKey = `${this.prefix}:${key}`
    localStorage.removeItem(fullKey)
  }

  async clear(): Promise<void> {
    const keysToDelete: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${this.prefix}:`)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key))
  }
}
