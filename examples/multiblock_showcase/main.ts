import { ItemAPI, ItemCategory, ItemComponent, registry } from '@sapdon/core'

// 符文石阵的激活法杖：挂上 scripts 里 Trigger.useItem 注册的物品自定义组件
ItemAPI.createItem('mbshow:wand', ItemCategory.Items, 'blaze_rod').addComponent(ItemComponent.combineComponents(
    ItemComponent.setDisplayName('§d符文法杖§r（右键符文石阵）'),
    ItemComponent.setMaxStackSize(1),
    ItemComponent.setCustomComponents(['mbshow:wand_activate']),
))

registry.submit()
