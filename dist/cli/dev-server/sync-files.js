import { readFileSync } from "fs";
import { cliRequest } from "./client.js";
import { copyFolder } from "../utils.js";
import path from "path";
export async function syncDevFilesClient(projectPath, projectName) {
    await cliRequest('sync-files', projectPath, projectName);
}
export async function syncDevFilesServer(projectPath, projectName) {
    const buildConfig = JSON.parse(readFileSync(path.join(projectPath, "build.config")));
    const buildDir = path.join(projectPath, buildConfig.defaultConfig.buildDir);
    const buildBehDirPath = path.join(buildDir, `${projectName}_BP`);
    const buildResDirPath = path.join(buildDir, `${projectName}_RP`);
    copyFolder(buildBehDirPath, path.join(buildConfig.mojangPath, "development_behavior_packs/", `${projectName}_BP/`));
    copyFolder(buildResDirPath, path.join(buildConfig.mojangPath, "development_resource_packs/", `${projectName}_RP/`));
}
