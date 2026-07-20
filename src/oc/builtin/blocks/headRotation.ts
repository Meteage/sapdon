import { BlockCustomComponent } from "@minecraft/server";

export const HeadRotationBlockComponent: BlockCustomComponent = {
    onPlayerInteract({ block, dimension, player }) {
        if (!player) return;
        const perm = block.permutation as any;
        const current = perm.getState("sapdon:head_rotation") as number;
        const next = (((current ?? 0) + 1) % 16);
        block.setPermutation(
            perm.withState("sapdon:head_rotation", next)
        );
        dimension.playSound("random.click", block.center());
    },
};
