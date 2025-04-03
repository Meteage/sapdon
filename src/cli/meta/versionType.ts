import { cacheSync } from "@sapdon/utils/cache.js"
import path from "path"
import os from "os"
import { getBuildConfig } from "./buildConfig.js"

const MC_INSTALL_PATH = {
    MAIN: 'AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/',
    BETA: 'AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/'
}

export function mojangPath() {
    return cacheSync(
        'McInstallPath.Main',
        () => path.join(os.homedir(), MC_INSTALL_PATH.MAIN)
    )
}

export function betaPath() {
    return cacheSync(
        'McInstallPath.Beta',
        () => path.join(os.homedir(), MC_INSTALL_PATH.BETA)
    )
}

export function getGamePath() {
    return getBuildConfig().versionType === 'beta'? betaPath() : mojangPath()
}