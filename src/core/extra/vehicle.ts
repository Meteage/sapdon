import { RideableSeat } from "../type.js"

export class BaseVehicle {
    readonly seats: RideableSeat[] = []

    addSeat(seat: RideableSeat) {
        this.seats.push(seat)
        return this
    }

    removeSeat(index: number) {
        this.seats.splice(index, 1)
        return this
    }

    getSeat(index: number): RideableSeat | undefined {
        return this.seats[index]
    }

    readonly collisionBox = {
        width: 1,
        height: 1,
    }

    riderControlled: boolean = true
    autoStep = 1.1

    constructor(
        public readonly id: string,
        public readonly model: string,
        public readonly renderController: string,
    ) {}
}