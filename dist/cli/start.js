#!/usr/bin/env node
import { program } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import os from 'os';
import { fileURLToPath as fileURLToPath$1 } from 'url';
import fs, { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';
import cp from 'child_process';
import fs$1 from 'fs/promises';
import http from 'http';
import { rollup } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import ts from '@rollup/plugin-typescript';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import json from '@rollup/plugin-json';
import 'rollup-plugin-visualizer';
import lodash from 'lodash';

const generateUUID = () => {
    return randomUUID();
};
/**
 * 同步复制文件
 * @param {string} src 源文件路径
 * @param {string} dest 目标文件路径
 */
//@ts-ignore
function copyFileSync(src, dest) {
    try {
        fs.copyFileSync(src, dest);
    }
    catch (err) {
        console.error("文件复制失败：", err);
    }
}
//检查路径
//@ts-ignore
const pathNotExist = filePath => {
    return !fs.existsSync(filePath);
};
//读取文件
//@ts-ignore
const readFile = filePath => {
    try {
        return fs.readFileSync(filePath, "utf8");
    }
    catch (error) {
        console.log(error);
    }
    return null;
};
/**
 * 保存文件
 * @param {string} filePath 绝对路径
 * @param {string} data 数据
 */
//@ts-ignore
const saveFile = (filePath, data) => {
    // 确保目录存在
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    // 创建文件并写入内容
    fs.writeFile(filePath, data, err => {
        if (err) {
            return console.error(err);
        }
    });
};
//@ts-ignore
const copyFolder = (sourcePath, destinationPath) => {
    // 确保目录存在
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath)) {
        console.log(`Source path ${sourcePath} does not exist.`);
        return;
    }
    // 检查目标路径是否存在，如果不存在则创建它
    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath);
    }
    // 获取源路径下的所有文件和文件夹
    const files = fs.readdirSync(sourcePath);
    // 遍历文件和文件夹
    files.forEach(file => {
        const sourceFile = path.join(sourcePath, file);
        const destinationFile = path.join(destinationPath, file);
        // 判断是文件还是文件夹
        if (fs.lstatSync(sourceFile).isDirectory()) {
            // 如果是文件夹，则递归调用copyFolder函数
            copyFolder(sourceFile, destinationFile);
        }
        else {
            // 如果是文件，则直接复制到目标路径
            fs.copyFileSync(sourceFile, destinationFile);
        }
    });
};
//@ts-ignore
function dirname(importMeta) {
    const __filename = fileURLToPath(importMeta.url);
    const __dirname = path.dirname(__filename);
    return __dirname;
}
function getBuildConfig() {
    const pwd = globalObject.projectPath ?? process.cwd();
    const configFile = path.join(pwd, 'build.config');
    if (!fs.existsSync(configFile)) {
        throw new Error('未找到项目配置文件，请先初始化项目');
    }
    return JSON.parse(fs.readFileSync(configFile));
}

// 获取当前文件的路径
const __filename$2 = fileURLToPath$1(import.meta.url);
// 获取当前文件的目录
const __dirname$2 = path.dirname(__filename$2);

const templateMapping = {
    js: 'js_sapdon',
    ts: 'ts_sapdon'
};

function initMojangPath(projectPath) {
    const mojangPath = path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/");
    const betaPath = path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/");
    const buildConfigPath = path.join(projectPath, './build.config');
    const buildConfig = JSON.parse(fs.readFileSync(buildConfigPath));
    buildConfig.mojangPath = mojangPath;
    buildConfig.betaPath = betaPath;
    saveFile(buildConfigPath, JSON.stringify(buildConfig, null, 2));
}

const initProject = (projectPath, data) => {
    console.log(1, data);
    //检查项目目录是否存在
    //如果不存在则创建项目目录
    //从模板下载项目文件
    //根据用户输入的项目信息生成项目配置文件
    //根据用户选择是否生成脚本文件，生成脚本文件
    if(!pathNotExist(projectPath)) {
        console.log("项目名称已存在，创建项目目录失败");
        return
    }
    //模版目录
    const templateDir = path.join(__dirname$2, `../../src/templates/${templateMapping[data.language || 'js']}`);
    copyFolder(templateDir, projectPath);

    //生成模组介绍文件
    saveFile(path.join(projectPath, "mod.info"), JSON.stringify(data, null, 2));

    //执行npm i
    cp.execSync('npm i', { cwd: projectPath, stdio: 'inherit' });
};

const initNPMProject = (projectPath, data) => {
    //检查项目文件是否存在
    //如果不存在则创建项目
    //从模板下载项目文件
    //根据用户输入的项目信息生成项目配置文件
    //根据用户选择是否生成脚本文件，生成脚本文件
    if(!pathNotExist(path.join(projectPath, "mod.info"))||!pathNotExist(path.join(projectPath, "main.mjs"))||!pathNotExist(path.join(projectPath, "scripts"))||!pathNotExist(path.join(projectPath, "build.config"))) {
        console.log("项目已存在...");
        return
    }
    //模版目录
    const templateDir = path.join(__dirname$2, "../templates/js_sapdon");
    copyFolder(templateDir, projectPath);

    //生成模组介绍文件
    saveFile(path.join(projectPath, "mod.info"), JSON.stringify(data, null, 2));
};

// 读取package.json文件并提取信息
const readPackageJson = (dir) => {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            return {
                name: path.basename(dir),
                description: packageJson.description || "A new sapdon project",
                author: packageJson.author || "Sapdon",
                version: packageJson.version || "1.0.0"
            }
        } catch (error) {
            console.error("读取package.json文件时出错:", error);
            return null
        }
    } else {
        return null
    }
};

const globalObject = {};

/**
 * 递归遍历目录，收集所有 PNG 文件的路径
 * @param {string} directory - 要遍历的目录
 * @param {string} basePath - 基础路径（用于计算相对路径）
 * @param {string} prefix - 路径前缀（如 "textures/items/"）
 * @returns {Promise<Object>} - 返回一个对象，键为文件名，值为相对路径（不带 .png 后缀）
 */
const traverseDirectory = async (directory, basePath, prefix = "") => {
  const texturesSet = {};

  const files = await fs$1.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStats = await fs$1.stat(filePath);

    if (fileStats.isDirectory()) {
      // 如果是目录，递归遍历
      const subDirectoryTextures = await traverseDirectory(filePath, basePath, prefix);
      Object.assign(texturesSet, subDirectoryTextures);
    } else if (file.endsWith(".png")) {
      // 如果是 PNG 文件，提取文件名并生成 texture_data
      const fileName = path.basename(file, ".png"); // 去掉 .png 后缀
      const relativePath = path.relative(basePath, filePath).replace(/\.png$/, ""); // 去掉 .png 后缀
      const normalizedPath = `${prefix}${relativePath.replace(/\\/g, "/")}`; // 确保路径使用正斜杠

      texturesSet[fileName] = {
        textures: normalizedPath,
      };
    }
  }

  return texturesSet;
};

/**
 * 生成 JSON 文件
 * @param {string} outputPath - 输出的 JSON 文件路径
 * @param {Object} jsonData - 要写入的 JSON 数据
 * @param {string} successMessage - 成功时的日志消息
 */
const generateJsonFile = async (outputPath, jsonData, successMessage) => {
  try {
    const jsonString = JSON.stringify(jsonData, null, 2);
    await fs$1.writeFile(outputPath, jsonString);
    console.log(successMessage);
  } catch (err) {
    console.error("Error writing JSON file:", err);
  }
};

/**
 * 生成 block_texture.json 文件
 * @param {string} itemTexturesPath - 包含 PNG 文件的根目录
 * @param {string} outputPath - 输出的 JSON 文件路径
 * @param {string} projectName - 项目名称
 */
async function generateBlockTextureJson(itemTexturesPath, outputPath, projectName, userTerrainTextures) {
  try {
    // 递归遍历目录，获取所有 PNG 文件的路径
    const itemTexturesSet = await traverseDirectory(itemTexturesPath, itemTexturesPath,"textures/blocks/");
    
    // 合并用户自定义的texture_data
    if(userTerrainTextures){
      Object.assign(itemTexturesSet,userTerrainTextures);
    }

    // 生成 JSON 数据
    const jsonData = {
      texture_name: "atlas.terrain",
      resource_pack_name: projectName,
      padding: 8,
      num_mip_levels: 4,
      texture_data: itemTexturesSet,
    };

    // 写入文件
    await generateJsonFile(outputPath, jsonData, "Block texture JSON file generated successfully.");
  } catch (err) {
    console.error("Error generating block texture JSON:", err);
  }
}

/**
 * 生成 item_texture.json 文件
 * @param {string} itemTexturesPath - 包含 PNG 文件的根目录
 * @param {string} outputPath - 输出的 JSON 文件路径
 */
async function generateItemTextureJson(itemTexturesPath, outputPath,projectName,userItemTextures) {
  try {
    // 递归遍历目录，获取所有 PNG 文件的路径
    const itemTexturesSet = await traverseDirectory(itemTexturesPath, itemTexturesPath, "textures/items/");

    // 合并用户自定义的texture_data
    if(userItemTextures){
      Object.assign(itemTexturesSet,userItemTextures);
    }

    // 生成 JSON 数据
    const jsonData = {
      resource_pack_name: projectName,
      texture_name: "atlas.items",
      texture_data: itemTexturesSet,
    };

    // 写入文件
    await generateJsonFile(outputPath, jsonData, "Item texture JSON file generated successfully.");
  } catch (err) {
    console.error("Error generating item texture JSON:", err);
  }
}

class ItemTextureManager {
    static item_texture_sets = new Map();
    static getItemTextureSet(){
        return this.item_texture_sets;
    }
    static getItemTextures(){
        return Object.fromEntries(this.item_texture_sets);
    }
    static registerTextureData(texture_name,texture_data){
        this.item_texture_sets.set(texture_name,texture_data);
    }
    static registerTexture(texture_name,texture_path){
        this.registerTextureData(texture_name,{textures:texture_path});
    }
}

class terrainTextureManager {
    static terrain_texture_sets = new Map();
    static getTerrainTextureSet(){
        return this.terrain_texture_sets;
    }
    static getTerrainTextures(){
        return Object.fromEntries(this.terrain_texture_sets);
    }
    static registerTextureData(texture_name,texture_data){
        this.terrain_texture_sets.set(texture_name,texture_data);
    }
    static registerTexture(texture_name,texture_path){
        this.registerTextureData(texture_name,{textures:texture_path});
    }
}

const FlipbookTextures = {
    flipbook_textures: [],
    registerFlipbookTexture(atlas_tile,texture,ticks_per_frame,options = {}){
        const flipbook_texture = {"atlas_tile":atlas_tile,"flipbook_texture":texture,ticks_per_frame};
        Object.assign(flipbook_texture,options);
        this.flipbook_textures.push(flipbook_texture);
    }
};

if (!Symbol.metadata) {
    //@ts-ignore
    Symbol.metadata = Symbol('[[metadata]]');
}
function getMetadata(target) {
    return target?.[Symbol.metadata];
}

// 因为无法判断其他代码实现的接口是否真的是RawType，所以用Symbol来标记
// 只要不export，其他代码就无法访问这个Symbol， 确保了唯一性
const IS_RAW_SYMBOL = Symbol('isRawJSON');
function isRawJSON(v) {
    return v?.[IS_RAW_SYMBOL] === true;
}

const rawTypes = [
    'string', 'boolean', 'number', 'undefined'
];
function jsonEncoderReplacer(_, v) {
    if (typeof v === null) {
        return null;
    }
    if (rawTypes.includes(typeof v)) {
        return JSON.rawJSON(v);
    }
    if (typeof v === 'object') {
        if (JSON.isRawJSON(v)) {
            return v;
        }
        if (isRawJSON(v)) {
            // 字符串再包装一遍
            return JSON.rawJSON(v.rawJSON);
        }
        return v;
    }
    if (typeof v === 'bigint') {
        return JSON.rawJSON(v.toString());
    }
    throw new Error('Unexpected value');
}
const defaultSerializer = instance => {
    return structuredClone(instance);
};
const serializerSymbol = Symbol('serializer');
const serializerMapping = new WeakMap();
function serialize(inst) {
    const ctor = Reflect.getPrototypeOf(inst)?.constructor;
    if (!ctor) {
        throw new Error('Cannot serialize an instance of an anonymous class');
    }
    const serializer = getMetadata(ctor)?.[serializerSymbol]
        ?? serializerMapping.get(ctor)
        // 兼容旧版本， 未来会移除
        ?? inst.toJson?.bind?.(inst)
        ?? defaultSerializer;
    return serializer(inst);
}
const jsonEncodeDecoder = {
    encode(value) {
        return JSON.stringify(value, jsonEncoderReplacer);
    },
    decode: JSON.parse
};
function encode(value, encodeDecoder = jsonEncodeDecoder) {
    return encodeDecoder.encode(value);
}
function decode(value, encodeDecoder = jsonEncodeDecoder) {
    return encodeDecoder.decode(value);
}

const devServerConfig = {
    port: 49037
};

const {
    port: port$1
} = devServerConfig;

async function cliRequest(path, ...params) {
    try {
        await fetch(`http://localhost:${port$1}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: encode(params)
        });
    } catch (error) {
        console.error(error);
        console.error('尝试在构建脚本中使用 server.startDevServer() 启动开发服务器');
    }
}

const { port } = devServerConfig;
class DevelopmentServer {
    cliServerHandlers = new Map();
    listening = false;
    isListening() {
        return this.listening;
    }
    bootstrap() {
        this.listening = true;
        const svr = http.createServer(async (req, res) => {
            const handler = this.cliServerHandlers.get((req.url ?? '/').slice(1));
            if (handler) {
                try {
                    const { promise, resolve, reject } = Promise.withResolvers();
                    let buf = Buffer.alloc(0);
                    req.on('data', chunk => buf = Buffer.concat([buf, chunk]));
                    req.on('end', () => {
                        try {
                            resolve(decode(buf));
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                    await handler(...await promise);
                }
                catch (error) {
                    console.error(error);
                    res.writeHead(500);
                    res.end();
                    return;
                }
                res.writeHead(200);
                res.end();
            }
            else {
                res.writeHead(404);
                res.end();
            }
        }).listen(port, () => console.log(`Dev Server listening on port ${port}`));
        svr.on('error', () => this.listening = false);
        return svr;
    }
    handle(url, handler) {
        this.cliServerHandlers.set(url, handler);
    }
    getHandler(url) {
        return this.cliServerHandlers.get(url);
    }
    interceptHandler(url, interceptor) {
        const currentHandler = this.getHandler(url) ?? Function.prototype;
        const newHandler = interceptor(currentHandler);
        this.cliServerHandlers.set(url, newHandler);
        return newHandler;
    }
}
const server = new DevelopmentServer();

class UISystemRegistry {
    static #ui_system_map = {}
    static #ui_def_list = []
    // 注册 UISystem
    static registerUISystem(ui_system) {
        const ui_system_path = ui_system.path + ui_system.name + ".json";
        this.#ui_system_map[ui_system_path] = ui_system;
    }

    // 添加外部 UI 定义
    static addOuterUIdefs(ui_defs) {
        if (!Array.isArray(ui_defs)) {
            throw new Error("参数必须是一个数组")
        }
        this.#ui_def_list.concat(ui_defs);
    }

    static submit() {
        cliRequest("register-ui/def", this.#ui_def_list);
        cliRequest("register-ui/system", this.#ui_system_map);
    }
}

class UISystemRegistryServer {
    // 私有静态字段
    static #ui_system_map = {}
    static #ui_def_list = []

    // 获取所有注册的 UISystem
    static getUISystemList() {
        return Object.values(this.#ui_system_map)
    }

    // 获取 UI 定义列表（剔除 "ui/server_form"）
    static getUIdefList() {
        const combinedList = this.#ui_def_list.concat(Object.keys(this.#ui_system_map));
        return combinedList.filter(item => item !== "ui/server_form")
    }

    static startServer() {
        server.handle('register-ui/system', systems => {
            this.#ui_system_map = systems;
        });

        server.handle('register-ui/def', defs => {
            this.#ui_def_list = defs;
        });
    }
}

const clientRegistryData = [];
/**
 * Client
 */
class GRegistry {
    /**
     * 生成注册器
     * @param {string} name 文件名字
     * @param {string} root 根目录，如 "behavior"、"resource" 等
     * @param {string} path 数据的路径，如 "blocks/"、"items/"、"recipes/" 等
     * @param {string | object} data 实例 必须包含 toJson 方法
     */
    static register(name, root, path, data) {
        data = data === 'string'
            ? JSON.parse(data)
            : serialize(data);
        clientRegistryData.push({ name, root, path, data });
    }
    static submit() {
        cliRequest('submitGregistry', clientRegistryData);
    }
}
/**
 * Server
 */
class GRegistryServer {
    static dataList = [];
    static getDataList() {
        return [...GRegistryServer.dataList];
    }
    static startServer() {
        server.handle('submitGregistry', (data) => {
            //@ts-ignore
            // console.log(data.map(item => item.data.description))
            this.dataList = data;
        });
        server.handle('log', (...info) => {
            console.log.apply(console, info);
        });
    }
}
var registry;
(function (registry) {
    function submit() {
        GRegistry.submit();
        UISystemRegistry.submit();
        cliRequest('submit', {});
    }
    registry.submit = submit;
    function log(...info) {
        cliRequest('log', ...info);
    }
    registry.log = log;
})(registry || (registry = {}));

/**
 * 处理 blocks.json 数据
 * @param {Object} data blocks.json 数据
 * @returns {Object} 处理后的 blocks 数据
 */
const processBlocksData = (data) => {
    const textures_arr = data.textures;

    // 检查 textures 数组长度
    if (textures_arr.length !== 6) {
        console.warn(`blocks.json 的 textures 数组长度不为 6，实际长度: ${textures_arr.length}`);
        return {}
    }

    // 构建 blocks 数据
    const blocks = {};
    blocks[data.identifier] = {
        textures: {
            up: textures_arr[0],
            down: textures_arr[1],
            east: textures_arr[2],
            west: textures_arr[3],
            south: textures_arr[4],
            north: textures_arr[5]
        }
    };

    return blocks
};

/**
 * Server
 * 加载并执行模组文件
 * @param {string} modPath 模组文件路径
 * @param {string} buildPath 构建目录路径
 * @param {string} projectName 项目名
 */
const generateAddon = async (modPath, buildPath, projectName) => {
    try {
        const buildBehDirPath = path.join(buildPath, `${projectName}_BP`);
        const buildResDirPath = path.join(buildPath, `${projectName}_RP`);
        const resDir = (...name) => path.join(buildResDirPath, ...name);

        // 初始化 blocks.json 数据
        const blocksJsonPath = path.join(buildBehDirPath, "blocks.json");
        const blocks = { "format_version": "1.20.20" };

        //生成item_texture.json
        const item_texture_dir = resDir("textures/items");
        const item_texture_json_path = resDir("textures/item_texture.json");
        generateItemTextureJson(item_texture_dir, item_texture_json_path, projectName, ItemTextureManager.getItemTextures());

        //生成terrain_texture.json
        const terrain_texture_dir = resDir("textures/blocks");
        const terrain_texture_json_path = resDir("textures/terrain_texture.json");
        generateBlockTextureJson(terrain_texture_dir, terrain_texture_json_path, projectName, terrainTextureManager.getTerrainTextures());

        //生成flipbook_textures.json
        const flipbook_textures_path = resDir("textures/flipbook_textures.json");
        saveFile(flipbook_textures_path, JSON.stringify(FlipbookTextures.flipbook_textures, null, 2));

        //_ui_defs.json
        const ui_def = UISystemRegistryServer.getUIdefList();
        saveFile(resDir("ui/_ui_defs.json"), JSON.stringify({ "ui_defs": ui_def }, null, 2));

        UISystemRegistryServer.getUISystemList().forEach((ui_system) => {
            if (ui_system.path) {
                saveFile(resDir(ui_system.path, `${ui_system.name}.json`), JSON.stringify(ui_system, null, 2));
            }
        });

        // 从全局注册表中获取数据
        const dataList = GRegistryServer.getDataList();
        // console.log("dataList:", dataList)
        // 遍历数据并保存到相应的目录
        dataList.forEach(({ name, root, path: dataPath, data }) => {
            // 处理 blocks.json 数据
            if (dataPath === "blocks/") {
                const processedBlocks = processBlocksData(data);
                Object.assign(blocks, processedBlocks);
            }

            // 根据数据类型确定根目录
            const rootPath = root === "behavior" ? `${projectName}_BP` : `${projectName}_RP`;
            const buildRootPath = path.join(buildPath, rootPath);

            // 拼接文件路径
            const filePath = path.join(buildRootPath, dataPath, `${name}.json`);

            // 保存文件
            saveFile(filePath, JSON.stringify(data, null, 2));
        });

        // 保存 blocks.json
        console.log("保存 blocks.json 文件:", blocksJsonPath);
        saveFile(blocksJsonPath, JSON.stringify(blocks, null, 2));

        console.log(`已加载并执行 ${modPath} 文件！`);
    } catch (err) {
        console.error(`加载或执行 ${modPath} 失败：${err.message}`);
        console.error(err.stack); // 打印堆栈跟踪以便调试
    }
};

// 定义头部信息类
class AddonManifestHeader {
    constructor(name, description, version, uuid, options = {}) {
        this.name = name;
        this.description = description;
        this.version = version;
        this.uuid = uuid;
        this.allow_random_seed = options.allow_random_seed;
        this.lock_template_options = options.lock_template_options;
        this.pack_scope = options.pack_scope;
        this.base_game_version = options.base_game_version;
        this.min_engine_version = options.min_engine_version;
    }
}

// 定义模块信息类
class AddonManifestModule {
    constructor(description, moduleType, uuid, version) {
        this.description = description;
        this.type = moduleType;
        this.uuid = uuid;
        this.version = version;
    }
}

// 定义元数据信息类
class AddonManifestMetadata {
    constructor(authors, license, generatedWith, productType, url) {
        this.authors = authors;
        this.license = license;
        this.generated_with = generatedWith;
        this.product_type = productType;
        this.url = url;
    }
}

// 定义清单文件类
class AddonManifest {
    constructor(formatVersion, header, modules, dependencies, capabilities=null, metadata=null) {
        this.format_version = formatVersion;
        this.header = header;
        this.modules = modules;
        this.dependencies = dependencies;
        if(capabilities != null) this.capabilities = capabilities;
        if(metadata != null) this.metadata = metadata;
    }
}

async function syncDevFilesServer(projectPath, projectName) {
    const buildConfig = JSON.parse(readFileSync(path.join(projectPath, "build.config")));
    const buildDir = path.join(projectPath, buildConfig.defaultConfig.buildDir);
    const buildBehDirPath = path.join(buildDir, `${projectName}_BP`);
    const buildResDirPath = path.join(buildDir, `${projectName}_RP`);
    copyFolder(buildBehDirPath, path.join(buildConfig.mojangPath, "development_behavior_packs/", `${projectName}_BP/`));
    copyFolder(buildResDirPath, path.join(buildConfig.mojangPath, "development_resource_packs/", `${projectName}_RP/`));
}

async function writeLib(projectPath) {
    const projectModules = path.join(projectPath, "node_modules");
    const rootDir = path.join(dirname(import.meta), '../');
    const corePath = path.join(rootDir, 'core');
    const cliPath = path.join(rootDir, 'cli');
    const ocPath = path.join(rootDir, 'oc');
    const targetCorePath = path.join(projectModules, '@sapdon/core');
    const targetCliPath = path.join(projectModules, '@sapdon/cli');
    const targetOcPath = path.join(projectModules, '@sapdon/oc');

    fs.cpSync(corePath, targetCorePath, { recursive: true, force: true });
    fs.cpSync(cliPath, targetCliPath, { recursive: true, force: true });
    fs.cpSync(ocPath, targetOcPath, { recursive: true, force: true });

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
    fs.writeFileSync(path.join(targetOcPath, 'package.json'), JSON.stringify({
        name: '@sapdon/oc',
        main: 'index.js',
        version: '1.0.0',
    }));
}

const classStr = `import fs from 'fs'
export class FileResource  {
    static cache: Record<string, FileResource> = {}
    static fileSystemLoader = (uri: string) => fs.readFileSync(uri)

    private _res: any

    /**
     * 不要调用构造器!
     * 使用 FileResource.get(uri) 方法获取实例
     * @param origin 
     */
    constructor(public origin: string) {
        this.origin = origin
        FileResource.cache[origin] = this
    }

    /**
     * @param uri 
     * @returns {FileResource}
     */
    static get(uri: string) {
        if (uri in FileResource.cache) {
            return FileResource.cache[uri]
        }
        return new FileResource(uri)
    }

    load(loader=FileResource.fileSystemLoader) {
        if (this._res) {
            return this._res
        }
        const content = loader(this.origin)
        this._res = content
        return content
    }

    clear() {
        delete FileResource.cache[this.origin]
    }

    loadWithoutCache(loader=FileResource.fileSystemLoader) {
        return loader(this.origin)
    }

    ptr() {
        const func = () => this.load()
        return Object.assign(func, this)
    }
}`;

const debounce$1 = lodash.debounce;
function walk(dir, onfile, ondir) {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            ondir(file, dir);
            walk(filePath, onfile, ondir);
        }
        else {
            onfile(file, dir);
        }
    });
}
var ResourceHintType;
(function (ResourceHintType) {
    ResourceHintType[ResourceHintType["File"] = 0] = "File";
    ResourceHintType[ResourceHintType["Dir"] = 1] = "Dir";
})(ResourceHintType || (ResourceHintType = {}));
function jsIdentifier(name) {
    return name.replaceAll('.', '_').replaceAll('-', '_').replaceAll('@', '$');
}
function generateResourceHint(resDir) {
    const rootHint = {
        type: ResourceHintType.Dir,
        name: resDir,
        children: {}
    };
    const dirHints = {
        [resDir]: rootHint
    };
    let currentHint = rootHint;
    walk(resDir, (file, dir) => {
        const basename = path.basename(file);
        const name = jsIdentifier(basename.slice(0, basename.lastIndexOf('.')));
        const frh = {
            type: ResourceHintType.File,
            name,
            origin: path.join(dir, file)
        };
        currentHint.children[name] = frh;
    }, (dir, dirParent) => {
        const name = jsIdentifier(dir);
        const parentHint = dirHints[dirParent];
        const nHint = {
            type: ResourceHintType.Dir,
            name,
            children: {}
        };
        parentHint.children[name] = nHint;
        dirHints[path.join(dirParent, dir)] = nHint;
        currentHint = nHint;
    });
    return rootHint;
}
function generateHintFile(hint, targetPath) {
    const root = {};
    function traverse(hint, parent) {
        for (const key in hint.children) {
            const child = hint.children[key];
            if (child.type === ResourceHintType.File) {
                parent[child.name] = `<fn>${child.origin}</fn>`;
            }
            else {
                const nParent = {};
                parent[child.name] = nParent;
                traverse(child, nParent);
            }
        }
    }
    traverse(hint, root);
    const preloadClasses = [
        classStr
    ].join(';\n');
    const content = `\n;export default ${JSON.stringify(root, null, 2)}`
        .replace(/"\<fn\>(.*)\<\/fn\>"/g, `FileResource.get('$1').ptr()`);
    fs.writeFileSync(targetPath, preloadClasses + content);
}
function checkCwd(cwd) {
    if (!fs.existsSync(path.join(cwd, 'build.config'))) {
        console.log('无法生成资源目录，请 cd 到项目根目录下执行 sapdon res');
        return false;
    }
    return true;
}
function watchResourceDir() {
    const cwd = process.cwd();
    if (!checkCwd(cwd)) {
        return;
    }
    fs.watch(path.join(cwd, 'res'), { recursive: true }, debounce$1((a, b) => {
        cp.execSync('sapdon res');
    }, 3000));
}
function initResourceDir() {
    // js 项目无法使用资源目录短链接
    const { defaultConfig } = getBuildConfig();
    if (defaultConfig.buildEntry.endsWith('js')) {
        return;
    }
    const cwd = process.cwd();
    const resDir = path.join(cwd, 'res');
    if (!checkCwd(cwd)) {
        return;
    }
    if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir);
    }
    const resourceHint = generateResourceHint(resDir);
    generateHintFile(resourceHint, path.join(cwd, 'res.ts'));
}

const debounce = lodash.debounce;

function hmr(projectPath, projectName) {
    const { buildDir, useHMR } = getBuildConfig().defaultConfig;
    watchResourceDir();
    if (useHMR) {
        fs.watch(projectPath, { recursive: true }, debounce(async (eventType, filename) => {
            if (!eventType || !filename) {
                return
            }
    
            if (filename.startsWith('.') || filename.startsWith(buildDir)) {
                return
            }
    
            if (filename.endsWith('.js') || filename.endsWith('.ts')) {
                process.stdout.write(`File ${filename} changed, reloading...\r`);
                await buildProject(projectPath, projectName);
                console.log(`Reloaded ${filename}`);
            }
        }), 1000);
    }
}

function startDevServer() {
    if (server.isListening()) {
        return;
    }
    server.bootstrap();
}

// 获取当前文件的目录路径
const __filename$1 = fileURLToPath$1(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);

//读取配置文件
// const pathConfig = JSON.parse(readFile(path.join(__dirname, "./build.config")))

const rollupIgnores = [
    'rollup',
    'typescript',
    '@sapdon/core',
    '@sapdon/cli',
    '@minecraft',
];

//脚本打包器
const scriptBundler = {
    __projectPath: path.join(__dirname$1, '../../'),

    js: async (source, target, tname='index.js', sname='index.js') => {
        const tmpFile = path.join(scriptBundler.__projectPath, '.tmp', `sapdon-${crypto.randomUUID()}.js`);
        try {
            const bundle = await rollup({
                input: path.join(source, sname),
                plugins: [
                    nodeResolve({
                        preferBuiltins: true
                    }),
                    //@ts-ignore
                    commonjs(),
                    //@ts-ignore
                    json(),
                    // visualizer({ open: true }),  //可视化分析, 打包出问题取消注释这一行
                ],
                external(name) {
                    for (const candidate of rollupIgnores) {
                        if (name.includes(candidate)) {
                            return true
                        }
                    }
                    return false
                }
            });
    
            await bundle.write({
                file: tmpFile,
                format: 'esm',
            });
    
            bundle.close();
            fs.cpSync(tmpFile, path.join(target, tname));
        } catch (e) {
            console.error(e);
        } finally {
            fs.rmSync(tmpFile, {
                recursive: true,
                force: true
            });
        }
    },

    //ts先通过rollup处理后再复制
    ts: async (source, target, tname='index.js', sname='index.ts') => {
        // console.log(source, target, tname)
        const tmpFile = path.join(scriptBundler.__projectPath, '.tmp', `sapdon-${crypto.randomUUID()}.js`);
        try {
            const bundle = await rollup({
                input: path.join(source, sname),
                plugins: [
                    typescriptPaths(),
                    nodeResolve({
                        preferBuiltins: true
                    }),
                    //@ts-ignore
                    ts({
                        tsconfig: path.join(scriptBundler.__projectPath, 'tsconfig.json'),
                    }),
                    //@ts-ignore
                    commonjs(),
                    //@ts-ignore
                    json(),
                    // visualizer({ open: true }),  //可视化分析, 打包出问题取消注释这一行
                ],
                external(name) {
                    for (const candidate of rollupIgnores) {
                        if (name.includes(candidate)) {
                            return true
                        }
                    }
                    return false
                }
            });
    
            await bundle.write({
                file: tmpFile,
                format: 'esm',
            });
    
            bundle.close();
            fs.cpSync(tmpFile, path.join(target, tname));
        } catch (e) {
            console.error(e);
        } finally {
            fs.rmSync(tmpFile, {
                recursive: true,
                force: true
            });
        }
    }
};

async function bundleScripts(projectPath, scriptPath, element) {
    const sourcePath = path.join(projectPath, element.path);
    const elementType = element.type || 'js';

    scriptBundler.__projectPath = projectPath;
    scriptBundler[elementType](sourcePath, scriptPath);
}

async function runOnChild(targetFilePath) {
    const { promise, resolve } = Promise.withResolvers();
    cp.fork(targetFilePath, { stdio: 'inherit' }).on('exit', resolve);
    return promise
}

async function runScript(src) {
    if (src.endsWith('.ts')) {
        const randomName = '.' + crypto.randomUUID() + '.js';
        const sourceDir = path.dirname(src);
        const sourceFileName = src.replace(sourceDir, '');
        const targetFilePath = path.join(sourceDir, '.tmp', randomName);

        await scriptBundler.ts(sourceDir, sourceDir + '/.tmp', randomName, sourceFileName);
        try {
            await runOnChild(targetFilePath);
        } catch (e) {
            console.error(e);
        } finally {
            fs.rmSync(targetFilePath, { force: true });
        }
        return
    }

    await runOnChild(src);
}

function projectCanBuild(projectPath) {
    console.log("开始构建项目");
    console.log("项目路径：" + projectPath);
    //检查项目是否存在
    if (pathNotExist(projectPath)) {
        console.log("项目不存在");
        return false
    }
    //检查项目是否有build.config文件
    if (pathNotExist(path.join(projectPath, "build.config"))) {
        console.log("项目没有build.config文件");
        return false
    }

    return true
}

//构建项目
/**
 * `server`
 * 
 * 在使用前使用 `projectCanBuild` 确保项目可以构建
 * @param {string} projectPath 
 * @param {string} projectName 
 */
const buildProject = async (projectPath, projectName) => {
    //读取build.config文件
    const buildConfigPath = path.join(projectPath, "build.config");
    const buildConfig = JSON.parse(readFile(buildConfigPath));
    //读取mod.info文件
    const modInfoPath = path.join(projectPath, "mod.info");
    const modInfo = JSON.parse(readFile(modInfoPath));
    const min_engine_version = versionStringToArray(modInfo.min_engine_version);

    const buildDirPath = path.join(projectPath, buildConfig.defaultConfig.buildDir);
    const buildBehDirPath = path.join(buildDirPath, `${projectName}_BP/`);
    const buildResDirPath = path.join(buildDirPath, `${projectName}_RP/`);

    const absoluteModPath = path.join(projectPath, buildConfig.defaultConfig.buildEntry);

    if (!server.isListening()) {
        //生成manifest.json文件
        //判断manifest.json是否已经生成过了，生成过了就不用生成
        const manifestPath = path.join(buildBehDirPath, "manifest.json");
        if (pathNotExist(manifestPath)) {
            const behManifest = generateBehManifest(
                modInfo.name,
                modInfo.description,
                modInfo.version,
                {
                    min_engine_version: min_engine_version,
                },
                buildConfig.defaultConfig.dependencies,
                buildConfig.defaultConfig.scriptEntry
            );

            const resManifest = generateResManifest(
                modInfo.name,
                modInfo.description,
                modInfo.version,
                {
                    min_engine_version: min_engine_version,
                },
                []
            );

            //BP
            saveFile(path.join(buildBehDirPath, "manifest.json"), behManifest);
            //RP
            saveFile(path.join(buildResDirPath, "manifest.json"), resManifest);
        }

        //复制pack_icon.png
        const packIconPath = path.join(projectPath, "pack_icon.png");

        copyFileSync(packIconPath, path.join(buildBehDirPath, "pack_icon.png"));
        copyFileSync(packIconPath, path.join(buildResDirPath, "pack_icon.png"));

        const resources = buildConfig.resources;
        resources.forEach(element => {
            const sourcePath = path.join(projectPath, element.path);
            copyFolder(sourcePath, buildResDirPath);
        });

        // 在客户端启动前启动服务器
        startDevServer();
        GRegistryServer.startServer();
        UISystemRegistryServer.startServer();
        server.handle('submit', () => {
            //只有当buildMode为development时才加载用户modjs文件
            if (buildConfig.defaultConfig.buildMode === "development") {
                //动态加载用户modjs文件
                generateAddon(absoluteModPath, buildDirPath, projectName);
            }
        });

        hmr(projectPath, projectName);
    }

    const scripts = buildConfig.scripts;
    const scriptPath = path.join(buildBehDirPath, "scripts/");

    for (const element of scripts) {
        await bundleScripts(projectPath, scriptPath, element);
    }

    await runScript(absoluteModPath);
    await syncDevFilesServer(projectPath, projectName);
};

function versionStringToArray(versionString) {
    // 使用 split 方法将字符串按 '.' 分割成数组
    const parts = versionString.split('.');

    // 使用 map 方法将每个部分转换为数字
    const versionArray = parts.map(part => Number(part));

    return versionArray
}

const generateBehManifest = (name, description, version, options = {}, dependencies = [], entry) => {
    console.log("开始生成behavior_packs/manifest.json");
    console.log("Entry:", entry);
    const header = new AddonManifestHeader(
        (name + "_BP"),
        description,
        versionStringToArray(version),
        generateUUID(),
        options
    );
    const module = new AddonManifestModule(
        "行为模块",
        "data",
        generateUUID(),
        versionStringToArray(version)
    );
    const script_module = new AddonManifestModule(
        "脚本模块",
        "script",
        generateUUID(),
        versionStringToArray(version)
    );
    if (entry) { script_module.entry = entry; }

    const metadata = new AddonManifestMetadata(
        ["@sapdon"],
        "MIT",
        {
            "sapdon": ["1.0.0"]
        },
        "addon",
        "https://github.com/junjun260/sapdon"
    );

    const manifest = new AddonManifest(
        2,//格式版本
        header,
        [module, script_module],
        dependencies,
        null,
        metadata
    );

    return JSON.stringify(manifest, null, 2)
};

const generateResManifest = (name, description, version, options = {}, dependencies = []) => {
    const header = new AddonManifestHeader(
        (name + "_RP"),
        description,
        versionStringToArray(version),
        generateUUID(),
        options
    );
    const module = new AddonManifestModule(
        "资源模块",
        "resources",
        generateUUID(),
        versionStringToArray(version)
    );

    const metadata = new AddonManifestMetadata(
        ["@sapdon"],
        "MIT",
        {
            "sapdon": ["1.0.0"]
        },
        "addon",
        "https://github.com/junjun260/sapdon"
    );

    const manifest = new AddonManifest(
        2,//格式版本
        header,
        [module],
        [],
        null,
        metadata
    );

    return JSON.stringify(manifest, null, 2)
};

const __filename = fileURLToPath$1(import.meta.url);
const __dirname = path.dirname(__filename);

process.removeAllListeners('warning');

async function start() {
    // 额外添加的init方法
    program.command("init").description("初始化一个基于NodeJS的项目").action(() => {
        const currentDir = process.cwd();
        const packageJsonPath = path.join(currentDir, 'package.json');
        let packageJsonData;
        if (!fs.existsSync(packageJsonPath)) {
            console.error("没有找到package.json文件，请使改用create命令进行创建。");
            return
        }

        try {
            packageJsonData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        } catch (error) {
            console.error("读取package.json文件时出错:", error);
            console.log("请使改用create命令进行创建。");
            return
        }

        // 添加或更新scripts字段
        packageJsonData.scripts = {
            ...packageJsonData.scripts,
            init: "sapdon init",
            pack: "sapdon pack",
            config: "sapdon config"
        };

        try {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonData, null, 2), 'utf-8');
        } catch (error) {
            console.error("写入package.json文件时出错:", error);
            return
        }

        inquirer.prompt([
            {
                type: "input",
                name: "min_engine_version",
                message: "最低引擎版本:",
                default: "1.19.50"
            }
        ]).then((answers) => {
            initNPMProject(currentDir, { ...readPackageJson(currentDir), ...answers });
            console.log("请使用命令sapdon config配置框架的build.config文件。");
        });
    });

    program.command("create <project-name>").description("Create a new project").action((projectName) => {
        inquirer.prompt([
            {
                type: "input",
                name: "name",
                message: "Project Name:",
                default: path.basename(projectName)
            },
            {
                type: "input",
                name: "description",
                message: "Project Description:",
                default: "A new sapdon project"
            },
            {
                type: "input",
                name: "author",
                message: "Author Name:",
                default: "Sapdon"
            },
            {
                type: "input",
                name: "version",
                message: "Project Version:",
                default: "1.0.0"
            },
            {
                type: "input",
                name: "min_engine_version",
                message: "Minimum Engine Version:",
                default: "1.19.50",
            },
            {
                type: "input",
                name: "language",
                message: "Language:(js/ts)",
                default: "ts",
            },
        ]).then((answers) => {
            const projectPath = path.join(process.cwd(), projectName);
            console.log('项目路径:', projectPath);
            initProject(projectPath, answers);
            initMojangPath(projectPath);
            writeLib(projectPath);
        });
    });

    program.command("build <project-name>").description("Build the project").action((projectName) => {
        console.log("Building the project...");
        const projectPath = path.join(process.cwd(), projectName);
        globalObject.projectPath = projectPath;
        initResourceDir();
        if (projectCanBuild(projectPath)) {
            buildProject(projectPath, path.basename(projectPath));
        }
    });

    // pack 命令
    program.command("pack").description("Pack the current project").action(() => {
        console.log("Packing the current project...");
        const projectPath = process.cwd();
        if (projectCanBuild(projectPath)) {
            buildProject(projectPath, path.basename(projectPath));
        }
    });

    program.command('lib').description('Generate lib files for development server.').action(() => {
        const projectPath = process.cwd();
        writeLib(projectPath);
    });

    program.command('res').description('Generate resource hints.').action(() => {
        initResourceDir();  
    });

    // 配置build.config文件的命令
    program.command("config").description("Configure build.config file").action(() => {
        const buildConfigPath = path.join(__dirname, "./build.config");
        let buildConfigData;

        try {
            buildConfigData = JSON.parse(readFile(buildConfigPath));
        } catch (error) {
            console.error("读取build.config文件时出错:", error);
            return
        }

        inquirer.prompt([
            {
                type: "input",
                name: "mojangPath",
                message: "Mojang Path (must end with LocalState/games/com.mojang/):",
                default: path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/")
            },
            {
                type: "input",
                name: "mojangBetaPath",
                message: "Mojang Beta Path (must end with LocalState/games/com.mojang/):",
                default: path.join(os.homedir(), "AppData/Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/")
            }
        ]).then((answers) => {
            try {
                fs.writeFileSync(buildConfigPath, JSON.stringify({ ...buildConfigData, ...answers }, null, 2), 'utf-8');
                console.log("build.config文件已更新。");
            } catch (error) {
                console.error("写入build.config文件时出错:", error);
            }
        });
    });

    program.parse(program.argv);
}

start();
