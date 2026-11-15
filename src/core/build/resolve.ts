import { BlockCustomComponentBuilder } from '../block/blockCustomComponent.js'
import type { RegistryEntry } from '../../utils/registry.js'
import {
    BUILD_PROTOCOL,
    type BuildContext,
    type BuildPacket,
    type BuildPacketFile,
    type BuildSourceFile,
} from '../../utils/protocol.js'
import { INDEX_BEGIN, INDEX_END, SYSTEM_ALIAS } from '../../utils/componentIndex.js'

/**
 * 注册项 → 最终文件包。
 *
 * 这里是「addon 语义」的唯一归属地：贴图图集、自定义组件脚本与注册索引都在这里解析，
 * CLI 收到的已经是可以直接写盘的 JSON / 源码。
 */
export function resolveBuild(entries: RegistryEntry[], ctx: BuildContext): BuildPacket {
    const files: BuildPacketFile[] = []
    const sources: BuildSourceFile[] = []

    let itemTexture: Record<string, unknown> | null = null
    let terrainTexture: Record<string, unknown> | null = null
    let flipbook: unknown = null

    for (const entry of entries) {
        const data: any = entry.data

        // 自定义组件脚本：写到项目源码目录（已存在则由 CLI 跳过）
        if (data && typeof data === 'object' && data._scriptSource) {
            sources.push({
                path: normalize(`${entry.path}${entry.name}.js`),
                content: String(data.source ?? ''),
            })
            continue
        }

        // 纹理数据不落单文件，最后合并进对应的图集
        switch (entry.name) {
            case 'item_texture':
                itemTexture = data
                continue
            case 'terrain_texture':
                terrainTexture = data
                continue
            case 'flipbook_textures':
                flipbook = data
                continue
        }

        files.push({
            root: entry.root,
            path: entry.path,
            name: entry.name,
            data,
        })
    }

    // BlockCustomComponentBuilder 实例：脚本 + 注册索引
    const components: { safeName: string; componentId: string }[] = []
    for (const builder of BlockCustomComponentBuilder.getAllInstances()) {
        const safeName = builder.id().replace(/[^a-zA-Z0-9_]/g, '_')
        sources.push({
            path: `scripts/custom_components/${safeName}.js`,
            content: builder.generateRuntimeCode(),
        })
        components.push({ safeName, componentId: builder.id() })
    }

    // 图集永远写（即使为空），保持历史产物一致
    files.push({
        root: 'resource',
        path: 'textures/',
        name: 'item_texture',
        data: {
            resource_pack_name: ctx.projectName,
            texture_name: 'atlas.items',
            texture_data: { ...scanTextures(ctx.resourceFiles, 'textures/items/'), ...(itemTexture ?? {}) },
        },
    })
    files.push({
        root: 'resource',
        path: 'textures/',
        name: 'terrain_texture',
        data: {
            texture_name: 'atlas.terrain',
            resource_pack_name: ctx.projectName,
            padding: 8,
            num_mip_levels: 4,
            texture_data: { ...scanTextures(ctx.resourceFiles, 'textures/blocks/'), ...(terrainTexture ?? {}) },
        },
    })
    files.push({
        root: 'resource',
        path: 'textures/',
        name: 'flipbook_textures',
        data: flipbook ?? [],
    })

    return {
        protocol: BUILD_PROTOCOL,
        files,
        ...(sources.length > 0 ? { sources } : {}),
        ...(components.length > 0
            ? { indexBlock: { path: 'scripts/custom_components/index.js', content: buildIndexBlock(components) } }
            : {}),
    }
}

/**
 * 扫描资源包里的贴图文件，生成图集条目。
 * @param files 相对 `_RP` 根的文件路径（正斜杠）
 * @param prefix 目录前缀，如 `textures/items/`
 */
function scanTextures(files: readonly string[], prefix: string): Record<string, { textures: string }> {
    const out: Record<string, { textures: string }> = {}
    for (const rel of files) {
        if (!rel.startsWith(prefix) || !rel.endsWith('.png')) continue
        const inner = rel.slice(prefix.length).replace(/\.png$/, '')
        const key = inner.split('/').pop() ?? inner
        out[key] = { textures: `${prefix}${inner}` }
    }
    return out
}

function buildIndexBlock(components: { safeName: string; componentId: string }[]): string {
    const importLines = components.map(({ safeName }) => `import { ${safeName} } from './${safeName}.js';`)
    const registerLines = components.map(({ safeName, componentId }) =>
        `  init.blockComponentRegistry.registerCustomComponent('${componentId}', ${safeName});`
    )
    return [
        INDEX_BEGIN,
        `import { system as ${SYSTEM_ALIAS} } from '@minecraft/server';`,
        '',
        ...importLines,
        '',
        `${SYSTEM_ALIAS}.beforeEvents.startup.subscribe((init) => {`,
        ...registerLines,
        `});`,
        INDEX_END,
    ].join('\n')
}

function normalize(path: string): string {
    return path.replace(/\\/g, '/')
}
