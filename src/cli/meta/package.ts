import { cacheSync } from "@sapdon/utils/cache.js"
import path from "path"
import { dirname } from "../utils.js"
import packageJson from '../../../package.json' with { type: "json" }

export function getPackageJson() {
    return cacheSync(
        path.join(dirname(import.meta), '../../../package.json'),
        () => packageJson
    )
}
