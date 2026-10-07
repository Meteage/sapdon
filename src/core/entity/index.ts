export * from './basicEntity.js'
export * from './clientEntity.js'
export * from './displayItemEntity.js'
export * from './dummyEntity.js'
export * from './entity.js'
export * from './nativeEntity.js'
export * from './projectile.js'
export * from './behavior/followMob.js'
export * from './behavior/followParent.js'
export * from './behavior/randomStroll.js'
export * from './behavior/tempt.js'
export * from './behavior/nearestAttackableTarget.js'
export * from './behavior/pickupItem.js'
export * from './behavior/moveTowardsHomeRestriction.js'
export * from './behavior/goHome.js'
export * from './bundles/BasicMoveBundle.js'
export * from './bundles/basicBundle.js'
export * from './componets/entityComponet.js'
export * from './data/nativeEntityData.js'
export * from './navigation/walk.js'

// `type.ts` 里的 rideable 三件套：`componets/entityComponet.js` 只在 JSDoc 里引用它们
// （type-only，不能值 import），而 `extra/` 不在 core 的导出链上 —— 于是这份别名没有入口
// 可达 ⇒ `core/index.d.ts` 里会出现**悬空类型名**，`EntityComponent.setRideable` 的返回类型
// 也会整体退化成参数类型。这里显式导出这三个（**不是** `export *`，避免把 `type.ts` 里
// 其它内部类型一并扩成公开面），公开面与 3.6.0 持平。
export type { RideableComponent, RideableComponentDesc, RideableSeat } from '../type.js'