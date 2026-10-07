import { cacheSync } from "@sapdon/utils/cache.js"
import path from "path"
import os from "os"
import fs from "fs"
import { getBuildConfig } from "./buildConfig.js"

const MC_PATH = process.env.MC_PATH
const MC_BETA_PATH = process.env.MC_BETA_PATH

const MC_INSTALL_PATH = {
    MAIN: 'AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang',
    // 新版预览版（Windows）与正式版一样使用 Roaming 布局，数据目录名就叫 "Minecraft Bedrock Preview"
    BETA: 'AppData/Roaming/Minecraft Bedrock Preview/Users/Shared/games/com.mojang',
    // 旧版预览版的 UWP LocalState 布局，仅在新布局不存在时兜底
    BETA_LEGACY: 'AppData/Local/Packages/Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe/LocalState/games/com.mojang/'
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
        () => {
            if (MC_BETA_PATH) return MC_BETA_PATH
            const beta = path.join(os.homedir(), MC_INSTALL_PATH.BETA)
            // 新布局优先；未安装/未运行过新版预览版时回退旧布局，避免部署到不存在的目录
            return fs.existsSync(beta) ? beta : path.join(os.homedir(), MC_INSTALL_PATH.BETA_LEGACY)
        }
    )
}

export function getGamePath() {
    return getBuildConfig().versionType === 'beta'? betaPath() : mojangPath()
}