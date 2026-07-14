import { world, ItemCustomComponent, ItemComponentUseEvent } from "@minecraft/server"
import { NeoGuidebookBridge } from "../../lib/page_bridge"
import pageIds from "../../page_ids.json"

const DEBUG: boolean = false


const bridge = new NeoGuidebookBridge("neo_guidebook", pageIds, { debug: DEBUG })

export const GuiBookItemComponent: ItemCustomComponent = {
    onUse(event: ItemComponentUseEvent, params: any): void {
        const player = event.source
        if (player.typeId != "minecraft:player") return
        if (DEBUG) world.sendMessage(`[NeoGuidebook] onUse by ${player.name}`)
        bridge.show(player, 0)
    }
}
