import { ItemCategory, ItemAPI, ItemComponent } from '@sapdon/core'

ItemAPI.createItem('test:stick', ItemCategory.Items, 'stick')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('Stick'),
        ItemComponent.setThrowable(true),
        ItemComponent.setIcon('stick'),
    ))