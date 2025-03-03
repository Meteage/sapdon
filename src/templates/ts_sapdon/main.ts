import { ItemCategory } from '@core/factory/ItemExtra.js'
import { ItemAPI, ItemComponent } from '@core/index.js'

ItemAPI.createItem('test:stick', ItemCategory.Items, 'stick')
    .addComponent(ItemComponent.combineComponents(
        ItemComponent.setDisplayName('Stick'),
        ItemComponent.setThrowable(true),
        ItemComponent.setIcon('stick'),
    ))