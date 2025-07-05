import mcResourcePacks from './data_rp.json' with { type: 'json' }
import mcBehaviorPacks from './data_bp.json' with { type: 'json' }

type BehaviorLiterals = 'beh' | 'behavior' | 'behaviour'
type ResourceLiterals = 'res' | 'resource'

export class NativeEntityData {
 
    static getDataById(type: BehaviorLiterals | ResourceLiterals, id: string) {
        if (type === 'res' || type ==='resource') {
            return this.getResource(id)
        }

        return this.getBehavior(id)
    }

    static getBehavior(id: string) {
        return (mcBehaviorPacks as any)?.[id]
    }

    static getResource(id: string) {
        return (mcResourcePacks as any)?.[id]
    }

}