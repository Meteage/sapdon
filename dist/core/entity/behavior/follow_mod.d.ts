export class FollowMobBehavior {
    constructor(priority: any);
    priority: any;
    searchRange: number;
    speedMultiplier: number;
    stopDistance: number;
    setPriority(priority: any): this;
    setSearchRange(searchRange: any): this;
    setSpeedMultiplier(speedMultiplier: any): this;
    setStopDistance(stopDistance: any): this;
    toJSON(): Map<any, any>;
}
