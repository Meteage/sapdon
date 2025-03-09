/**
 * 同步复制文件
 * @param {string} src 源文件路径
 * @param {string} dest 目标文件路径
 */
export function copyFileSync(src: string, dest: string): void;
export function dirname(importMeta: any): string;
export function asyncImport(path: any): Promise<any>;
export function generateUUID(): `${string}-${string}-${string}-${string}-${string}`;
export function pathNotExist(filePath: any): boolean;
export function readFile(filePath: any): string;
export function saveFile(filePath: string, data: string): void;
export function copyFolder(sourcePath: any, destinationPath: any): void;
