import { ItemCategory, ItemAPI, ItemComponent, registry } from '@sapdon/core'

ItemAPI.createItem('test:stick', ItemCategory.Items, 'stick')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('Stick'),
        ItemComponent.setThrowable(true),
        ItemComponent.setIcon('stick'),
    ))

// 提交所有注册
registry.submit()