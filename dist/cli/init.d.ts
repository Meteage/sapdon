export function initMojangPath(projectPath: any): void;
export function initProject(projectPath: any, data: any): void;
export function initNPMProject(projectPath: any, data: any): void;
export function readPackageJson(dir: any): {
    name: string;
    description: any;
    author: any;
    version: any;
};
