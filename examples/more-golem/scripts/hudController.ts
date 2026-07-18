import { system, world } from "@minecraft/server";

const STATE_PREFIX = "ui.hud.red_progress_states.";
const MAX_SPEED = 10;

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const vel = player.getVelocity();
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        const state = Math.min(Math.floor((speed / MAX_SPEED) * 10), 9);
        player.runCommand(`title @s title ${STATE_PREFIX}${state}`);
    }
}, 2);
