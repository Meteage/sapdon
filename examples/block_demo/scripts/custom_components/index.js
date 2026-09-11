// >>> sapdon:custom-component-registry (auto-generated, 请勿手改本块) >>>
import { system as __sapdon_system } from '@minecraft/server';

import { blockdemo_head_rotate } from './blockdemo_head_rotate.js';
import { blockdemo_tick_update } from './blockdemo_tick_update.js';

__sapdon_system.beforeEvents.startup.subscribe((init) => {
  init.blockComponentRegistry.registerCustomComponent('blockdemo:head_rotate', blockdemo_head_rotate);
  init.blockComponentRegistry.registerCustomComponent('blockdemo:tick_update', blockdemo_tick_update);
});
// <<< sapdon:custom-component-registry <<<

