import { ItemCategory, ItemAPI, ItemComponent, BlockAPI, BlockComponent, registry } from '@sapdon/core'

ItemAPI.createItem('test:stick', ItemCategory.Items, 'stick')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('Stick'),
        ItemComponent.setThrowable(true),
        ItemComponent.setIcon('stick'),
    ))

BlockAPI.createBasicBlock('test:block', 'construction', ['block_texture'])
    .addComponent(BlockComponent.setFriction(0.6))
    .addComponent(BlockComponent.setMapColor('#888888'))

// 提交所有注册
registry.submit()