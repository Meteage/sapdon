import { EntityAPI, registry, UISystemRegistry } from '@sapdon/core'

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

// 提交所有注册
registry.submit();