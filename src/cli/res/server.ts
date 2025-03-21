import fs from 'fs'
import path from 'path'
import { classStr } from './fileResource.js'
import lodash from 'lodash'
import cp from 'child_process'

const debounce = lodash.debounce

export function walk(
    dir: string,
    onfile: (file: string, filePath: string) => void,
    ondir: (file: string, filePath: string) => void
) {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file)
        if (fs.statSync(filePath).isDirectory()) {
            ondir(file, dir)
            walk(filePath, onfile, ondir)
        } else {
            onfile(file, dir)
        }
    })
}

enum ResourceHintType {
    File,
    Dir,
}

interface DirResourceHint {
    type: ResourceHintType.Dir
    name: string
    children: Record<string, FileResourceHint | DirResourceHint>
}

interface FileResourceHint {
    type: ResourceHintType.File
    name: string
    origin: string
}

function jsIdentifier(name: string) {
    return name.replaceAll('.', '_').replaceAll('-', '_').replaceAll('@', '$')
}

function generateResourceHint(resDir: string): DirResourceHint {
    const rootHint: DirResourceHint = {
        type: ResourceHintType.Dir,
        name: resDir,
        children: {}
    }
    const dirHints: Record<string, DirResourceHint> = {
        [resDir]: rootHint
    }

    let currentHint = rootHint

    walk(resDir, (file, dir) => {
        const basename = path.basename(file)
        const name = jsIdentifier(basename.slice(0, basename.lastIndexOf('.')))
        const frh: FileResourceHint = {
            type: ResourceHintType.File,
            name,
            origin: path.join(dir, file)
        }
        
        currentHint.children[name] = frh
    }, (dir, dirParent) => {
        const name = jsIdentifier(dir)
        const parentHint = dirHints[dirParent]
        const nHint: DirResourceHint = {
            type: ResourceHintType.Dir,
            name,
            children: {}
        }
        parentHint.children[name] = nHint
        dirHints[path.join(dirParent, dir)] = nHint
        currentHint = nHint
    })

    return rootHint
}

function generateHintFile(hint: DirResourceHint, targetPath: string) {
    const root = {}

    function traverse(hint: DirResourceHint, parent: any) {
        for (const key in hint.children) {
            const child = hint.children[key]
            if (child.type === ResourceHintType.File) {
                parent[child.name] = `<fn>${child.origin}</fn>`
            } else {
                const nParent = {}
                parent[child.name] = nParent
                traverse(child, nParent)
            }
        }
    }

    traverse(hint, root)

    const preloadClasses = [
        classStr
    ].join(';\n')
    const content = `\n;export default ${JSON.stringify(root, null, 2)}`
        .replace(/"\<fn\>(.*)\<\/fn\>"/g, `FileResource.get('$1').ptr()`)

    fs.writeFileSync(targetPath, preloadClasses + content)
}

function checkCwd(cwd: string) {
    if (!fs.existsSync(path.join(cwd, 'build.config'))) {
        console.log('无法生成资源目录，请 cd 到项目根目录下执行 sapdon res')
        return false
    }

    return true
}

export function watchResourceDir() {
    const cwd = process.cwd()
    if (!checkCwd(cwd)) {
        return
    }
    fs.watch(path.join(cwd, 'res'), { recursive: true }, debounce((a, b) => {
        cp.execSync('sapdon res')
    }, 1000))
}

export function initResourceDir() {
    const cwd = process.cwd()
    const resDir = path.join(cwd, 'res')
    if (!checkCwd(cwd)) {
        return
    }

    if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir)
    }

    const resourceHint = generateResourceHint(resDir)
    generateHintFile(resourceHint, path.join(cwd, 'res.ts'))
}