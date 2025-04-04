export namespace Navigation {
    function walk(options?: {
        avoid_damage_blocks?: boolean | undefined;
        avoid_portals?: boolean | undefined;
        avoid_sun?: boolean | undefined;
        avoid_water?: boolean | undefined;
        blocks_to_avoid?: any[] | undefined;
        can_breach?: boolean | undefined;
        can_break_doors?: boolean | undefined;
        can_jump?: boolean | undefined;
        can_open_doors?: boolean | undefined;
        can_open_iron_doors?: boolean | undefined;
        can_pass_doors?: boolean | undefined;
        can_path_from_air?: boolean | undefined;
        can_path_over_lava?: boolean | undefined;
        can_path_over_water?: boolean | undefined;
        can_sink?: boolean | undefined;
        can_swim?: boolean | undefined;
        can_walk?: boolean | undefined;
        can_walk_in_lava?: boolean | undefined;
        is_amphibious?: boolean | undefined;
    }): Map<any, any>;
}
