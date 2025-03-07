export class AddonSemanticVersion {
    constructor(major: any, minor: any, patch: any);
    major: any;
    minor: any;
    patch: any;
    toString(): string;
}
export class AddonManifestHeader {
    constructor(name: any, description: any, version: any, uuid: any, options?: {});
    name: any;
    description: any;
    version: any;
    uuid: any;
    allow_random_seed: any;
    lock_template_options: any;
    pack_scope: any;
    base_game_version: any;
    min_engine_version: any;
}
export class AddonManifestModule {
    constructor(description: any, moduleType: any, uuid: any, version: any);
    description: any;
    type: any;
    uuid: any;
    version: any;
}
export class AddonManifestDependency {
    constructor(name: any, uuid: any, version: any);
    module_name: any;
    uuid: any;
    version: any;
}
export class AddonManifestMetadata {
    constructor(authors: any, license: any, generatedWith: any, productType: any, url: any);
    authors: any;
    license: any;
    generated_with: any;
    product_type: any;
    url: any;
}
export class AddonManifest {
    constructor(formatVersion: any, header: any, modules: any, dependencies: any, capabilities?: any, metadata?: any);
    format_version: any;
    header: any;
    modules: any;
    dependencies: any;
    capabilities: any;
    metadata: any;
}
