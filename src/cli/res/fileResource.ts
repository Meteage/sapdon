import fs from 'fs'

export class FileResource  {
    static cache: Record<string, FileResource> = {}
    static fileSystemLoader = (uri: string) => fs.readFileSync(uri)

    private _res: any

    /**
     * 不要调用构造器!
     * 使用 FileResource.get(uri) 方法获取实例
     * @param origin 
     */
    private constructor(public origin: string) {
        this.origin = origin
        FileResource.cache[origin] = this
    }

    /**
     * @param uri 
     * @returns {FileResource}
     */
    static get(uri: string) {
        if (uri in FileResource.cache) {
            return FileResource.cache[uri]
        }
        return new FileResource(uri)
    }

    load(loader=FileResource.fileSystemLoader) {
        if (this._res) {
            return this._res
        }
        const content = loader(this.origin)
        this._res = content
        return content
    }

    clear() {
        delete FileResource.cache[this.origin]
    }

    loadWithoutCache(loader=FileResource.fileSystemLoader) {
        return loader(this.origin)
    }

    ptr() {
        const func = () => this.load()
        return Object.assign(func, this)
    }
}

export const classStr = `import fs from 'fs'
export class FileResource  {
    static cache: Record<string, FileResource> = {}
    static fileSystemLoader = (uri: string) => fs.readFileSync(uri)

    private _res: any

    /**
     * 不要调用构造器!
     * 使用 FileResource.get(uri) 方法获取实例
     * @param origin 
     */
    constructor(public origin: string) {
        this.origin = origin
        FileResource.cache[origin] = this
    }

    /**
     * @param uri 
     * @returns {FileResource}
     */
    static get(uri: string) {
        if (uri in FileResource.cache) {
            return FileResource.cache[uri]
        }
        return new FileResource(uri)
    }

    load(loader=FileResource.fileSystemLoader) {
        if (this._res) {
            return this._res
        }
        const content = loader(this.origin)
        this._res = content
        return content
    }

    clear() {
        delete FileResource.cache[this.origin]
    }

    loadWithoutCache(loader=FileResource.fileSystemLoader) {
        return loader(this.origin)
    }

    ptr() {
        const func = () => this.load()
        return Object.assign(func, this)
    }
}`