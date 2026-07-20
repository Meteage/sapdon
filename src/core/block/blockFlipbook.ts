export interface FlipbookEntry {
  flipbook_texture: string
  atlas_tile?: string
  ticks_per_frame?: number
  blend_frames?: boolean
  replicate?: number
}

export class FlipbookTextureConfig {
  private entries: FlipbookEntry[] = []

  addEntry(entry: FlipbookEntry): this {
    this.entries.push(entry)
    return this
  }

  addEntries(entries: FlipbookEntry[]): this {
    for (const entry of entries) {
      this.entries.push(entry)
    }
    return this
  }

  toObject(): { flipbook_textures: FlipbookEntry[] } {
    return { flipbook_textures: [...this.entries] }
  }
}
