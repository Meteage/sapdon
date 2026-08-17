import { ItemCategory, ItemAPI, ItemComponent, registry, DummyEntity, EntityAPI } from '@sapdon/core'

const dummy = EntityAPI.createDummyEntity("sapdon:color_particle", "textures/entity/none");

dummy.behavior.addProperty("sapdon:float_color_red",  {
    "type": "float",
    "range": [0.001, 0.999],
    "default": 0.999,
    "client_sync": true
});
dummy.behavior.addProperty("sapdon:float_color_green",  {
    "type": "float",
    "range": [0.001, 0.999],
    "default": 0.999,
    "client_sync": true
});
dummy.behavior.addProperty("sapdon:float_color_blue",  {
    "type": "float",
    "range": [0.001, 0.999],
    "default": 0.999,
    "client_sync": true
});
dummy.behavior.addProperty("sapdon:float_lifetime",  {
    "type": "float",
    "range": [0.001, 99.999],
    "default": 4.999,
    "client_sync": true
});

dummy.resource.addAnimation("particle_player", "animation.color_particle.loop");
dummy.resource.addParticleEffect("color_particle", "sapdon:color_particle");
dummy.resource.setScript("animate",["particle_player"]);

// === 演示触发物品：原版材料物品右键不触发 itemUse，须用自定义物品加"可右键使用"组件 ===
// food 组件（营养 0）让物品右键产生使用动作 → world.afterEvents.itemUse 触发；icon 为自定义色块贴图
function demoItem(identifier: string, texture: string, name: string) {
    ItemAPI.createItem(identifier, ItemCategory.Items, texture)
        .addComponent(
            ItemComponent.combineComponents(
                ItemComponent.setDisplayName(name),
                ItemComponent.setFoodComponent(true, 0, 0),
                ItemComponent.setMaxStackSize(1)
            )
        );
}

demoItem("sapdon:demo_scale_sp", "demo_scale_sp", "粒子演示：spawnParticle 缩放");
demoItem("sapdon:demo_spin_sp", "demo_spin_sp", "粒子演示：spawnParticle 旋转");
demoItem("sapdon:demo_scale_ent", "demo_scale_ent", "粒子演示：实体 缩放");
demoItem("sapdon:demo_spin_ent", "demo_spin_ent", "粒子演示：实体 旋转");

// 提交所有注册
registry.submit()