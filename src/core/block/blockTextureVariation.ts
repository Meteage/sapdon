export interface TextureVariation {
  path: string
  weight?: number
}

export interface TextureEntry {
  textures: string | TextureVariation[]
}

export class TextureVariationConfig {
  private textureData: Record<string, TextureEntry> = {}

  addTexture(name: string, path: string): this {
    this.textureData[name] = { textures: path }
    return this
  }

  addTextureWithVariations(name: string, variations: TextureVariation[]): this {
    this.textureData[name] = { textures: variations }
    return this
  }

  toObject(): { texture_data: Record<string, TextureEntry> } {
    return { texture_data: { ...this.textureData } }
  }
}
