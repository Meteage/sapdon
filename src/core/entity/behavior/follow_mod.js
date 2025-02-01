export class FollowMobBehavior {
    constructor(priority) {
        this.priority = priority;
        this.searchRange = 0;
        this.speedMultiplier = 1.0;
        this.stopDistance = 2.0;
    }

    setPriority(priority) {
        this.priority = priority;
        return this; // 支持链式调用
    }

    setSearchRange(searchRange) {
        this.searchRange = searchRange;
        return this; // 支持链式调用
    }

    setSpeedMultiplier(speedMultiplier) {
        this.speedMultiplier = speedMultiplier;
        return this; // 支持链式调用
    }

    setStopDistance(stopDistance) {
        this.stopDistance = stopDistance;
        return this; // 支持链式调用
    }

    toJSON() {
        if (this.priority === null) {
            throw new Error("Priority must be set for FollowMobBehavior.");
        }

        return new Map().set("minecraft:behavior.follow_mob", 
            {
                priority: this.priority,
                search_range: this.searchRange,
                speed_multiplier: this.speedMultiplier,
                stop_distance: this.stopDistance
            }
        );
    }
}
