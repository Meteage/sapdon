import { GameMode, ItemStack, Player, system, world, EntityComponentTypes } from "@minecraft/server";
import "./sapdon_lib/sapdon_system.js"
import { FarmerGolem } from "./golems/FarmerGolem.js";
import { BaseGolem } from "./core/BaseGolem.js";
import { GOLEM_FARMER_TYPE, GOLEM_TARGET_TYPE, GOLEM_PROPERTY } from "./core/types.js";

let numberId = 0;
const MAX_GOLEM_COUNT = 16;
let restored = false;

function restoreGolems() {
  if (restored) return
  restored = true

  numberId = (world.getDynamicProperty("golem_next_id") as number) || 0

  for (const player of world.getAllPlayers()) {
    const dim = player.dimension

    const targets = dim.getEntities({ type: GOLEM_TARGET_TYPE })
    for (const t of targets) {
      if (t.isValid) t.remove()
    }

    const golems = dim.getEntities({ type: GOLEM_FARMER_TYPE })
    for (const g of golems) {
      const idx = g.getProperty(GOLEM_PROPERTY) as number
      if (idx === undefined || BaseGolem.activeGolems.has(idx)) continue

      const homeKey = `golem_home_${idx}`
      const homeStr = world.getDynamicProperty(homeKey) as string
      const homePos = homeStr
        ? ((p => ({ x: p[0], y: p[1], z: p[2] }))(homeStr.split(',').map(Number)))
        : g.location

      new FarmerGolem(dim, idx, homePos, g)
    }
  }
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { itemStack, player: source, block } = event;
  if (!itemStack || itemStack.typeId !== 'golem_craft:farm_golem_summon') return
  if (block.typeId !== "minecraft:chest") {
    source.sendMessage("§7请在箱子上使用召唤物")
    return
  }

  event.cancel = true

  system.run(() => {
    const dim = source.dimension
    const spawnPos = { x: block.location.x + 0.5, y: block.location.y, z: block.location.z + 0.5 }

    const lore = itemStack.getLore()
    let golemIndex: number | undefined
    for (const line of lore) {
      const match = line.match(/^golem_index:(\d+)$/)
      if (match) {
        golemIndex = parseInt(match[1])
        break
      }
    }

    let assignedIndex: number
    if (golemIndex !== undefined) {
      if (BaseGolem.activeGolems.has(golemIndex)) {
        source.sendMessage("§c该编号的傀儡已在世界中")
        return
      }
      new FarmerGolem(dim, golemIndex, spawnPos)
      assignedIndex = golemIndex
    } else {
      if (BaseGolem.activeGolems.size >= MAX_GOLEM_COUNT) {
        source.sendMessage("§c世界中最多只能存在16个傀儡")
        return
      }
      new FarmerGolem(dim, numberId, spawnPos)
      assignedIndex = numberId
      numberId++
      world.setDynamicProperty("golem_next_id", numberId)
    }

    world.setDynamicProperty(`golem_home_${assignedIndex}`, `${spawnPos.x},${spawnPos.y},${spawnPos.z}`)

    if (source.getGameMode() === GameMode.Survival) {
      const container = source.getComponent(EntityComponentTypes.Inventory)?.container
      if (container) {
        const slotItem = container.getItem(source.selectedSlotIndex)
        if (slotItem && itemStack && slotItem.typeId === itemStack.typeId) {
          slotItem.amount--
          if (slotItem.amount <= 0) {
            container.setItem(source.selectedSlotIndex, undefined)
          } else {
            container.setItem(source.selectedSlotIndex, slotItem)
          }
        }
      }
    }
  })
})

world.afterEvents.entityHitEntity.subscribe((event) => {
  if (!(event.damagingEntity instanceof Player)) return
  const player = event.damagingEntity

  const container = player.getComponent(EntityComponentTypes.Inventory)?.container
  if (!container) return
  const heldItem = container.getItem(player.selectedSlotIndex)
  if (!heldItem || heldItem.typeId !== 'golem_craft:golem_capture') return

  const hitEntity = event.hitEntity
  if (hitEntity.typeId !== 'more_golem:frame_golem') return

  const golemIndex = hitEntity.getProperty("more_golem:golem_index") as number
  const golem = BaseGolem.activeGolems.get(golemIndex)
  if (!golem) return

  const pos = hitEntity.location
  golem.remove()

  const summonStack = new ItemStack('golem_craft:farm_golem_summon', 1)
  summonStack.setLore([`golem_index:${golemIndex}`])
  player.dimension.spawnItem(summonStack, pos)
})

world.afterEvents.playerSpawn.subscribe((event) => {
    const initId = system.runInterval(() => {
        if (world.getAllPlayers().length > 0) {
            system.clearRun(initId)
            restoreGolems()
        }
    })
    system.runTimeout(() => {
        const player = event.player;
        player.sendMessage("欢迎来到稻田傀儡模组示例！作者：Meteage");
        if (player?.hasTag("gaven_guidebook")) return;
        player.sendMessage("本模组仅供学习交流使用，请勿用于商业用途！");
        player.sendMessage("作者B站：俊俊君啊11111");
        player?.addTag("gaven_guidebook");
        player?.runCommand(`give @s sapdon:neo_guidebook 1`);
    }, 5 * 20);
});
