#!/usr/bin/env node
import {program} from 'commander';
import inquirer from 'inquirer';
import path from 'path';

import { initProject } from './init.js';
import { buildProject } from './build.js';

process.removeAllListeners('warning');
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
            name:"min_engine_version",
            message: "Minimum Engine Version:",
            default: "1.19.50",
        }
    ]).then((answers) => {
        const projectPath = path.join(process.cwd(), projectName);
        console.log('项目路径:', projectPath);
        initProject(projectPath, answers);
    });
});

program.command("build <project-name>").description("Build the project").action((projectName) => {
    console.log("Building the project...");
    const projectPath = path.join(process.cwd(), projectName);
    buildProject(projectPath, path.basename(projectName));
});



program.parse(program.argv);