import { ItemCategory, ItemAPI, ItemComponent, registry } from '@sapdon/core'

// === 演示触发物品：原版材料物品右键不触发 itemUse，须用自定义物品加"可右键使用"组件 ===
// food 组件（营养 0）+ use_modifiers（use_duration 非零）让物品右键产生使用动作 → world.afterEvents.itemUse 触发；
// icon 为自定义色块贴图
function demoItem(identifier: string, texture: string, name: string) {
    ItemAPI.createItem(identifier, ItemCategory.Items, texture)
        .addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName(name),
                ItemComponent.setFoodComponent(true, 0, 0),
                ItemComponent.setUseModifiers(0, 32), // food 必须配套 use_duration（非零），否则右键不可用
                ItemComponent.setMaxStackSize(1)
            )
        );
}

demoItem("sapdon:demo_scale_sp", "demo_scale_sp", "粒子演示：缩放正方体");
demoItem("sapdon:demo_spin_sp", "demo_spin_sp", "粒子演示：旋转正方体");
demoItem("sapdon:demo_ring", "demo_ring", "粒子演示：旋转光环");
demoItem("sapdon:demo_helix", "demo_helix", "粒子演示：螺旋上升");
demoItem("sapdon:demo_sphere", "demo_sphere", "粒子演示：呼吸球体");
demoItem("sapdon:demo_heart", "demo_heart", "粒子演示：心动爱心");
demoItem("sapdon:demo_galaxy", "demo_galaxy", "粒子演示：星系");

// 提交所有注册
registry.submit()
