import { Serializer } from "../../../utils/index.js"

export class NearestAttackableTargetBehavor{
    constructor(priority,entity_types){
        this.priority = priority;
        this.must_reach = true;
        this.must_see = true;
        this.entity_types = entity_types;
    }
    setMustReach(must_reach){
        this.must_reach = must_reach;
    }
    setMustSee(must_see){
        this.must_see = must_see;
    }

    @Serializer
    toObject(){
        return new Map().set("minecraft:behavior.nearest_attackable_target",{
                "priority": this.priority,
                "must_reach": this.must_reach,
                "must_see": this.must_see,
                "entity_types": this.entity_types
            });
    }
}