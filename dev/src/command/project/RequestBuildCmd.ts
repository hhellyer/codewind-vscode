/*******************************************************************************
 * Copyright (c) 2018 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

import Project from "../../codewind/project/Project";

import Log from "../../Logger";
import Requester from "../../codewind/project/Requester";
import Translator from "../../constants/strings/translator";
import StringNamespaces from "../../constants/strings/StringNamespaces";

const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

export default async function requestBuildCmd(project: Project): Promise<void> {
    if (project.state.isBuilding) {
        vscode.window.showWarningMessage(Translator.t(StringNamespaces.CMD_MISC, "projectAlreadyBuilding", { projectName: project.name }));
        return;
    }
    /*
    if (project.autoBuildEnabled) {
        vscode.window.showWarningMessage(Translator.t(StringNamespaces.CMD_MISC, "explicitBuildNotNecessary", { projectName: project.name }));
        // still do the build, though.
    }*/

    if (project.connection.remote) {
        Log.i(`Copying updated files from ${project.localPath} to ${project.connection.host}`);
        await copyChangedFiles(project);
    } else {
        Log.i(`Local build from local file system at ${project.localPath}`);
    }

    Log.i(`Request build for project ${project.name}`);
    Requester.requestBuild(project);
}

async function copyChangedFiles(project: Project) : Promise<void> {
    // Get the last sync as ms since 1970 for comparison against
    // file timestamps.
    const lastSync: number = project.lastSync.getTime();
    // Set the last sync time *before* we copy so we can't miss changes.
    project.lastSync = new Date(Date.now());
    Log.i(`Last sync time for ${lastSync}`);
    // Recursively scan and copy any file newer than lastSync.
    const copyList = await scanForChangedFiles(project.localPath.path, project.localPath.path, lastSync);

    Log.i(`Will copy: ${copyList.join(",")}`);

    const copyPromises: Array<Promise<void>> = [];
    for (const fileToCopy of copyList) {
        copyPromises.push(Requester.uploadFile(project, fileToCopy));
    }
    await Promise.all(copyPromises);
}

async function scanForChangedFiles(basePath: string, currentPath: string, timestamp: number): Promise<string[]> {
    const files = await readdirAsync(currentPath);
    const fileList: string[] = [];
    for (const file of files) {
        const currentFile = path.join(currentPath, file);
        // Filter early so we don't search in directories that will be filtered out.
        if (isIgnored(basePath, currentFile)) {
            continue;
        }
        const stats = await statAsync(currentFile);
        if (stats.isFile() && stats.mtimeMs > timestamp) {
            fileList.push(currentFile);
        } else if (stats.isDirectory()) {
            Log.i(`Scanning subdir: ${currentFile}`);
            fileList.push(...(await scanForChangedFiles(basePath, currentFile, timestamp)));
        }
    }
    return fileList;
}

function isIgnored(basePath: string, file: string): boolean {
    // TODO - Obey real ignore rules.
    Log.i(`Checking ${file}`);
    const trimmedFile = file.slice(basePath.length);
    const ignorePatterns = ["^/\.git"].map((s) => new RegExp(s));
    for (const p of ignorePatterns) {
        if (p.test(trimmedFile)) {
            return true;
        }
    }
    return false;
}
