import { cacheSync } from "@sapdon/utils/cache.js"
import path from "path"
import os from "os"
import { getBuildConfig } from "./buildConfig.js"

const MC_PATH = process.env.MC_PATH
const MC_BETA_PATH = process.env.MC_BETA_PATH

const MC_INSTALL_PATH = {
    MAIN: 'AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/',
    BETA: 'AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/'
}

export function mojangPath() {
    return cacheSync(
        'McInstallPath.Main',
        () => MC_PATH || path.join(os.homedir(), MC_INSTALL_PATH.MAIN)
    )
}

export function betaPath() {
    return cacheSync(
        'McInstallPath.Beta',
        () => MC_BETA_PATH || path.join(os.homedir(), MC_INSTALL_PATH.BETA)
    )
}

export function getGamePath() {
    return getBuildConfig().versionType === 'beta'? betaPath() : mojangPath()
}