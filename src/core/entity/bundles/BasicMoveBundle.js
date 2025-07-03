import { EntityComponent } from "../componets/entityComponet.js";
import { BasicBundle } from "./basicBundle.js";

//移动捆绑包
export const BasicMovementBundle = new BasicBundle();

BasicMovementBundle.addComponents([
  //speed
  EntityComponent.setMovement(0.2),
  EntityComponent.setMovementBasic()
])
