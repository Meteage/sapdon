
// 定义语义化版本号类
export class AddonSemanticVersion {
    constructor(major, minor, patch) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    toString() {
        return `[${this.major}, ${this.minor}, ${this.patch}]`;
    }
}

// 定义头部信息类
export class AddonManifestHeader {
    constructor(name, description, version, uuid, options = {}) {
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

// 定义模块信息类
export class AddonManifestModule {
    constructor(description, moduleType, uuid, version) {
        this.description = description;
        this.type = moduleType;
        this.uuid = uuid;
        this.version = version;
    }
}

// 定义依赖信息类
export class AddonManifestDependency {
    constructor(name, uuid, version) {
        this.module_name = name;
        this.uuid = uuid;
        this.version = version;
    }
}

// 定义元数据信息类
export class AddonManifestMetadata {
    constructor(authors, license, generatedWith, productType, url) {
        this.authors = authors;
        this.license = license;
        this.generated_with = generatedWith;
        this.product_type = productType;
        this.url = url;
    }
}

// 定义清单文件类
export class AddonManifest {
    constructor(formatVersion, header, modules, dependencies, capabilities=null, metadata=null) {
        this.format_version = formatVersion;
        this.header = header;
        this.modules = modules;
        this.dependencies = dependencies;
        if(capabilities != null) this.capabilities = capabilities;
        if(metadata != null) this.metadata = metadata;
    }
}

