export type MaterialDesc<Parts extends string = '*'> = Record<Parts | '*', `material.${string}`>
export interface RideableComponent {
    controllingSeat: number
    crouchingSkipInteract: boolean
    familyTypes: string[]
    interactText: string
    onRiderEnterEvent: string
    onRiderExitEvent: string
    passengerMaxWidth: number
    pullInEntities: boolean
    seatCount: number
    seats: Partial<RideableSeat>[]
}

export type RideableComponentDesc = Partial<RideableComponent>

export interface RideableSeat {
    camera_relax_distance_smoothing: number
    lock_rider_rotation: number
    max_rider_count: number
    min_rider_count: number
    position: [ number, number, number]
    rotate_rider_by: string
    third_person_camera_radius: number
}