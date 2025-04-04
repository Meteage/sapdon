import { EntityComponent } from "./componets/entityComponet.js";
import { Entity } from "./entity.js";
export class DummyEntity extends Entity {
    constructor(identifier, texture, options = {}, behData, resData) {
        super(identifier, texture, options, behData, resData);
        //行为设置
        this.behavior.addComponent(EntityComponent.combineComponents(EntityComponent.setPhysics(false, false), EntityComponent.setPushable(false, false), EntityComponent.setCollisionBox(0.001, 0.001), EntityComponent.setDamageSensor(false)));
        //资源设置
        this.resource.addMaterial("default", "entity_alphatest"); //添加默认材质
        this.resource.addTexture("default", "textures/entity/none"); //添加默认纹理
        this.resource.setGeometry("geometry.cube"); //设置默认几何体
        this.resource.addRenderController("controller.render.cow"); //添加渲染控制器
    }
}
