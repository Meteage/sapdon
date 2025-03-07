import { readFileSync } from "fs";
import { cliRequest } from "./client.js";
import { copyFolder } from "./utils.js";
export async function syncDevFilesClient(projectPath, projectName) {
    await cliRequest('sync-files', projectPath, projectName);
}
export async function syncDevFilesServer(projectPath, projectName) {
    const buildConfig = JSON.parse(readFileSync(path.join(projectPath, "./build.config")));
    copyFolder(buildBehDirPath, path.join(buildConfig.mojangPath, "development_behavior_packs/", `${projectName}_BP/`));
    copyFolder(buildResDirPath, path.join(buildConfig.mojangPath, "development_resource_packs/", `${projectName}_RP/`));
}
