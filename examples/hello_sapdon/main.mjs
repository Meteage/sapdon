import { ItemAPI, ItemCategory, registry } from '@sapdon/core'

ItemAPI.createItem("hello_sapdon:my_item", ItemCategory.Items, "masterball");

registry.submit()
