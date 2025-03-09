export function projectCanBuild(projectPath: any, projectName: any): boolean;
export namespace scriptBundler {
    let __projectPath: string;
    function js(source: any, target: any): void;
    function ts(source: any, target: any, tname?: string, sname?: string): Promise<void>;
}
export function buildProject(projectPath: string, projectName: string): Promise<void>;
