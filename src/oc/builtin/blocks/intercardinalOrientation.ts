import { BlockCustomComponent } from "@minecraft/server";

function getIntercardinalDirection(yRotation: number): number {
    yRotation %= 360;
    if (yRotation < 0) yRotation += 360;
    return Math.round(yRotation / 22.5) % 16;
}

export const IntercardinalOrientationComponent: BlockCustomComponent = {
    beforeOnPlayerPlace(event, { params }) {
        const { player } = event;
        if (!player) return;
        const yRotationOffset = (params as any)?.y_rotation_offset ?? 0;
        const yRotation = player.getRotation().y + yRotationOffset;
        const direction = getIntercardinalDirection(yRotation);
        (event.permutationToPlace as any) = (event.permutationToPlace as any).withState("sapdon:head_rotation", direction);
    },
};
