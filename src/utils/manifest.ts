interface ManifestOptions {
    allow_random_seed?: boolean
    lock_template_options?: boolean
    pack_scope?: string
    base_game_version?: string
    min_engine_version?: string
}

export class AddonSemanticVersion {
    major: number
    minor: number
    patch: number

    constructor(major: number, minor: number, patch: number) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    toString(): string {
        return `[${this.major}, ${this.minor}, ${this.patch}]`;
    }
}

export class AddonManifestHeader {
    name: string
    description: string
    version: AddonSemanticVersion
    uuid: string
    allow_random_seed?: boolean
    lock_template_options?: boolean
    pack_scope?: string
    base_game_version?: string
    min_engine_version?: string

    constructor(name: string, description: string, version: AddonSemanticVersion, uuid: string, options: ManifestOptions = {}) {
        this.name = name;
        this.description = description;
        this.version = version;
        this.uuid = uuid;
        this.allow_random_seed = options.allow_random_seed;
        this.lock_template_options = options.lock_template_options;
        this.pack_scope = options.pack_scope;
        this.base_game_version = options.base_game_version;
        this.min_engine_version = options.min_engine_version;
    }
}

export class AddonManifestModule {
    description: string
    type: string
    uuid: string
    version: AddonSemanticVersion

    constructor(description: string, moduleType: string, uuid: string, version: AddonSemanticVersion) {
        this.description = description;
        this.type = moduleType;
        this.uuid = uuid;
        this.version = version;
    }
}

export class AddonManifestDependency {
    module_name: string
    uuid: string
    version: AddonSemanticVersion

    constructor(name: string, uuid: string, version: AddonSemanticVersion) {
        this.module_name = name;
        this.uuid = uuid;
        this.version = version;
    }
}

export class AddonManifestMetadata {
    authors: string[]
    license: string
    generated_with: string[]
    product_type?: string
    url?: string

    constructor(authors: string[], license: string, generatedWith: string[], productType?: string, url?: string) {
        this.authors = authors;
        this.license = license;
        this.generated_with = generatedWith;
        this.product_type = productType;
        this.url = url;
    }
}

export class AddonManifest {
    format_version: number
    header: AddonManifestHeader
    modules: AddonManifestModule[]
    dependencies: AddonManifestDependency[]
    capabilities?: string[]
    metadata?: AddonManifestMetadata

    constructor(formatVersion: number, header: AddonManifestHeader, modules: AddonManifestModule[], dependencies: AddonManifestDependency[], capabilities: string[] | null = null, metadata: AddonManifestMetadata | null = null) {
        this.format_version = formatVersion;
        this.header = header;
        this.modules = modules;
        this.dependencies = dependencies;
        if (capabilities != null) this.capabilities = capabilities;
        if (metadata != null) this.metadata = metadata;
    }
}
