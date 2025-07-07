import { AddonRenderController, AddonRenderControllerGroup } from "../addon/index.js"
import { ClientEntity } from "../entity/clientEntity.js"
import { MaterialDesc } from "../type.js"

export class ClientEntityApperance {
    private static renderGroup: AddonRenderControllerGroup | undefined
    static getRenderGroup() {
        return this.renderGroup ?? (this.renderGroup = new AddonRenderControllerGroup('1.19.50'))
    }

    readonly textures: Record<string, string> = {}
    readonly materials: MaterialDesc = { '*': 'material.default' }
    readonly renderControllers: string[] = []

    addRenderController(controller: AddonRenderController) {
        ClientEntityApperance.getRenderGroup().addRenderController(controller)
        this.renderControllers.push(controller.name)
    }

    removeRenderController(controllerId: string) {
        this.renderControllers.splice(this.renderControllers.indexOf(controllerId), 1)
    }

    addTexture(name: string, source: string) {
        this.textures[name] = source
    }

    removeTexture(name: string) {
        delete this.textures[name]
    }

    addMaterial<P extends string = '*'>(name: P, source: string) {
        //@ts-ignore
        this.materials[name] = source
    }

    removeMaterial(name: string) {
        //@ts-ignore
        delete this.materials[name]
    }

    decorate(entityId: string) {
        const entity = ClientEntity.getEntity(entityId)
        if (!entity) {
            throw new Error('entity not found')
        }

        for (const [ name, source ] of Object.values(this.textures)) {
            entity.addTexture(name, source)
        }

        for (const [ name, source ] of Object.entries(this.materials)) {
            entity.addMaterial(name, source)
        }

        for (const controller of this.renderControllers) {
            entity.addRenderController(controller as any)
        }
    }

}