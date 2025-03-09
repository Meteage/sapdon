import { readFileSync } from "fs";
import { cliRequest } from "./client.js";
import { copyFolder, dirname } from "../utils.js";
import path from "path";
import fs from 'fs';
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
export async function writeLib(projectPath) {
    const projectModules = path.join(projectPath, "node_modules");
    const rootDir = path.join(dirname(import.meta), '../../');
    const corePath = path.join(rootDir, 'core');
    const cliPath = path.join(rootDir, 'cli');
    const targetCorePath = path.join(projectModules, '@sapdon/core');
    const targetCliPath = path.join(projectModules, '@sapdon/cli');
    fs.cpSync(corePath, targetCorePath, { recursive: true, force: true });
    fs.cpSync(cliPath, targetCliPath, { recursive: true, force: true });
    fs.writeFileSync(path.join(targetCorePath, 'package.json'), JSON.stringify({
        name: '@sapdon/core',
        main: 'index.js',
        version: '1.0.0',
    }));
    fs.writeFileSync(path.join(targetCliPath, 'package.json'), JSON.stringify({
        name: '@sapdon/cli',
        main: 'index.js',
        version: '1.0.0',
    }));
}
