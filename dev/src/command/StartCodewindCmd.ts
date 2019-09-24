/*******************************************************************************
 * Copyright (c) 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

// import * as vscode from "vscode";

import Log from "../Logger";
import LocalCodewindManager from "../codewind/connection/local/LocalCodewindManager";

export default async function startLocalCodewindCmd(): Promise<void> {
    Log.i("Start Local Codewind Cmd");
    await LocalCodewindManager.instance.startCodewind();
}
