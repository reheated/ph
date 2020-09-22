import http = require('http');
import connect = require('connect');
import serveStatic = require('serve-static');
import compression = require('compression');
import fs = require('fs');
import path = require('path');


let PHJSON = "ph.json";

// Number of milliseconds between checking if we need to rebundle
let CHECK_INTERVAL = 100;

// Sometimes the bundling process fails in a way beyond our control,
// e.g., if files got deleted in the middle of trying to rebundle.
// This is the number of milliseconds before trying again if the bundle failed.
let RETRY_INTERVAL = 2500;

// If we retry too many times in a row and it's still failing, something
// really is wrong, and we should let the exception fall through.
let MAX_RETRIES = 3;

interface PHSettings {
    dirResources: string;
    dirStatic: string;
    dirStaticRoot: string;
    dirTemplate: string;
    dirBuild: string;
    dirAux: string;
    sourcemap: string,
    serveFolder: string;
    bundleFilename: string;
    port: number;
    allowRemote: boolean;
    resourceExtensions: string[];

    [key: string]: any;
}

function getFilesRecursive(path: string): string[] {
    // Walk the directory structure, getting a list of files
    let result: string[] = [];
    let subdirs: string[] = [];

    let files = fs.readdirSync(path);
    for (let file of files) {
        let longPath = path + '/' + file;
        if (fs.lstatSync(longPath).isDirectory()) subdirs.push(longPath);
        else result.push(longPath);
    }

    for (let subdir of subdirs) {
        result = result.concat(getFilesRecursive(subdir));
    }

    return result;
}

function relativeFile(srcPath: string, destPath: string, file: string) {
    let ok = true;
    if (file.indexOf(srcPath) !== 0) {
        ok = false;
    }
    if (file.length > srcPath.length &&
        file[srcPath.length] !== "/" && file[srcPath.length] !== "\\") {
        ok = false;
    }
    if (!ok) {
        throw new Error("relativeFile: file is not contained in srcPath.");
    }
    return destPath + file.slice(srcPath.length);
}

class CopyError extends Error {
    constructor() {
        super("Failed to copy file(s)");
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

function tryCopyFileSync(src: string, dest: string) {
    try {
        fs.copyFileSync(src, dest);
    }
    catch {
        throw new CopyError();
    }
}

function copyFilesRecursive(srcPath: string, destPath: string) {
    let staticFiles = getFilesRecursive(srcPath);
    for (let file of staticFiles) {
        // Figure out the destination where this file should be copied to.
        let dest = relativeFile(srcPath, destPath, file);
        let dir = path.dirname(dest);
        fs.mkdirSync(dir, { recursive: true });
        tryCopyFileSync(file, dest);
    }
}

function isPathPrefix(testPrefix: string, path: string) {
    // Return true if path lies under testPrefix in the file hierarchy.
    if (path.indexOf(testPrefix) !== 0) return false;
    if (path === testPrefix) return true;
    let c = path[testPrefix.length];
    if (c === '/' || c === '\\') return true;
    return false;
}

function fillTemplate(contents: string, subs: { [key: string]: any }) {
    let re = /\$\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
    let lastEnd = 0;
    let pieces: string[] = [];
    let errKeys = new Set<string>();
    while (true) {
        // Find the next occurrence of "${...}".
        let nextMatch = re.exec(contents);
        if (nextMatch === null) break;
        pieces.push(contents.slice(lastEnd, nextMatch.index));
        let matchStr = nextMatch[0];
        lastEnd = nextMatch.index + matchStr.length;
        // Look up the key in settings.
        let curKey = nextMatch[1];
        if (subs.hasOwnProperty(curKey)) {
            // Found it.
            pieces.push(subs[curKey]);
        }
        else {
            // Didn't find it. We'll keep a list of such errors, and
            // report the error at the end
            pieces.push(matchStr);
            errKeys.add(curKey);
        }
    }
    pieces.push(contents.slice(lastEnd));

    if (errKeys.size > 0) {
        console.error(`\x1b[31mThe following substitution keys were not found in the settings: \x1b[33m${Array.from(errKeys).join(", ")}\x1b[31m.\x1b[0m`);
    }
    return pieces.join('');
}

function checkSettings(settings: PHSettings): boolean {
    let ok = true;
    for (let entry of ['dirResources', 'dirStatic', 'dirStaticRoot',
        'dirTemplate', 'dirBuild', 'dirAux', 'serveFolder']) {
        let s = <string>settings[entry];
        if (s.indexOf('.') >= 0 || s.indexOf('/') >= 0 || s.indexOf('\\') >= 0) {
            console.log("Setting \"" + entry + "\" must not contain the characters \\, /, .");
            ok = false;
        }
    }
    return ok;
}

function bundle(settings: PHSettings) {
    // Repackage all the resources
    // Check the settings
    if (!checkSettings(settings)) return;

    // Get all the files in the resource directory
    let resourceFiles: string[];
    if (fs.existsSync(settings.dirResources)) {
        resourceFiles = getFilesRecursive(settings.dirResources);
    }
    else {
        resourceFiles = [];
    }

    let buffers: Buffer[] = [];
    let fileInfo = [];
    let curLength = 0;
    let exts = new Set(settings.resourceExtensions)
    for (let file of resourceFiles) {
        // Extract the file extension and the main part of the filename
        let splitName = file.split('.');
        let ext: string;
        if (splitName.length > 1) {
            ext = splitName[splitName.length - 1];
        }
        else {
            ext = "";
        }

        // Only process if we recognise the file extension.
        if (exts.has(ext)) {
            let curBuffer = fs.readFileSync(file);
            buffers.push(curBuffer);

            // Cut off the "resources/" part from the start of the filename
            let shortFilename = file.slice(settings.dirResources.length + 1);

            // Create a record which will get put at the start of the bundle.
            fileInfo.push(
                {
                    "filename": shortFilename,
                    "start": curLength,
                    "end": curLength + curBuffer.length
                }
            )
            curLength += curBuffer.length;
        }
    }

    let jsonString = JSON.stringify(fileInfo);
    let lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(jsonString.length, 0);
    buffers.splice(0, 0, ...[lengthBuffer, Buffer.from(jsonString)]);

    // Make everything into one big buffer.
    let fullBuffer = Buffer.concat(buffers);

    // We're ready to copy everything over. Make sure the game path exists.
    fs.mkdirSync(settings.dirBuild, { recursive: true });

    // Clean up by deleting the files in the build directory
    let buildFiles = getFilesRecursive(settings.dirBuild);
    for (let filename of buildFiles) {
        fs.unlinkSync(filename);
    }

    // Copy the compiled javascript files over
    if (fs.existsSync(settings.dirAux)) {
        for (let filename of getFilesRecursive(settings.dirAux)) {
            if (filename.slice(filename.length - 3) === ".js") {
                let dest = relativeFile(settings.dirAux, settings.dirBuild, filename);
                tryCopyFileSync(filename, dest);
            }
        }
    }

    // Write fullBuffer to the user-specified bundle filename
    let bundlePath = settings.dirBuild + "/" + settings.bundleFilename;
    fs.writeFileSync(bundlePath, fullBuffer);

    // Now copy all the static files over
    if (fs.existsSync(settings.dirStatic)) {
        copyFilesRecursive(settings.dirStatic, settings.dirBuild);
    }

    // Run template substitution on all the files in the template folder
    if (fs.existsSync(settings.dirTemplate)) {
        let templateFiles = getFilesRecursive(settings.dirTemplate);
        for (let file of templateFiles) {
            let destFile = relativeFile(settings.dirTemplate, settings.dirBuild, file);
            let contents = fs.readFileSync(file, "utf8");
            let result = fillTemplate(contents, settings);
            fs.writeFileSync(destFile, result, { encoding: "utf8" });
        }
    }
}

function getSettings(filename: string): PHSettings {
    let settingsString = fs.readFileSync(filename, "utf8");
    return JSON.parse(settingsString);
}

class PHWatcher {
    settings: PHSettings;
    server: http.Server | null = null;
    gamePathWatchers: fs.FSWatcher[] = [];
    dirty = true;
    watchTimeout: NodeJS.Timeout | null = null;
    retryTimeout: NodeJS.Timeout | null = null;
    retries = 0;

    constructor() {
        this.settings = getSettings(PHJSON);
    }

    start() {
        // Get the settings
        if (!checkSettings(this.settings)) return;

        // Start the web server
        let hostname = this.settings.allowRemote ? "0.0.0.0" : "127.0.0.1";
        this.server = connect()
            .use(<connect.HandleFunction>compression())
            .use('/' + this.settings.serveFolder,
                <connect.HandleFunction>serveStatic(this.settings.dirBuild, {}))
            .use(<connect.HandleFunction>serveStatic(this.settings.dirStaticRoot, {}))
            .use('/sourcemap',
                <connect.HandleFunction>serveStatic(this.settings.dirAux, {}))
            .listen(this.settings.port, hostname);

        // Start the resource watcher.
        this.gamePathWatchers = [fs.watch('.', { 'recursive': true },
            (eventType, filename) => this.checkFileChange(filename))];
        this.watchTimeout = setTimeout(() => this.checkDirty(), CHECK_INTERVAL);
    }

    private checkDirty() {
        if (this.dirty) {
            this.dirty = false;
            this.rebundle();
        }
        this.watchTimeout = setTimeout(() => this.checkDirty(), CHECK_INTERVAL);
    }

    stop(): Promise<void> {
        if (this.watchTimeout !== null) clearTimeout(this.watchTimeout);
        this.watchTimeout = null;
        for (let w of this.gamePathWatchers) {
            w.close();
        }
        return new Promise<void>((resolve, reject) => {
            this.server!.close(() => resolve());
        });
    }

    async restart() {
        await this.stop();
        this.settings = getSettings(PHJSON);
        this.start();
        console.log((new Date()).toJSON() + ": Restarting");
    }

    checkFileChange(filename: string) {
        // A file got changed. Check if it should trigger a restart or rebundle.
        let doRebundle = false;

        // If ph.json changed restart all the stuff.
        if (filename === PHJSON) {
            this.restart();
            return;
        }

        // If a file in one of these special folders changed, trigger a rebundle.
        for (let curPath of [
            this.settings.dirResources, this.settings.dirStatic,
            this.settings.dirTemplate, this.settings.dirAux]) {
            if (isPathPrefix(curPath, filename)) doRebundle = true;
        }

        if (doRebundle) this.dirty = true;
    }

    rebundle() {
        if (this.retryTimeout !== null) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        console.log((new Date()).toJSON() + ": Bundling");
        this.settings = getSettings(PHJSON);
        try {
            bundle(this.settings);
            this.retries = 0;
        }
        catch (err) {
            this.retries += 1;
            if (err instanceof CopyError) {
                if(this.retries >= MAX_RETRIES) {
                    console.log(`Copy failed too many times (${this.retries}).`)
                    throw err;
                }
                console.log(`Copy failed (attempt ${this.retries}). Will retry in a moment...`);
                this.retryTimeout = setTimeout(() => {
                    this.dirty = true;
                }, RETRY_INTERVAL);
            }
            else {
                throw err;
            }
        }
    }
}

function initGame() {
    let files = fs.readdirSync('.');
    if (files.length > 0) {
        console.log("The directory is not empty. Please run init in an empty directory.");
        return;
    }
    let phPath = __dirname.replace(/\\/g, '/');
    let srcPath = phPath + "/emptygame";
    copyFilesRecursive(srcPath, '.');
    fs.unlinkSync("./localtsconfig.json");
    initLocal();
    console.log("Initialized a new game here. I suggest adding the following entries to your version control ignore list:")
    console.log("build/**");
    console.log("phaux/**");
    console.log("localtsconfig.json");
    console.log("game.code-workspace");
}

function initLocal() {
    let ltcFile = "./localtsconfig.json";
    let gcwFile = "./game.code-workspace";
    let checkFiles = [ltcFile, gcwFile];
    let existsFiles = [];
    for (let curFile of checkFiles) {
        if (fs.existsSync(curFile)) existsFiles.push(curFile);
    }
    if (existsFiles.length > 0) {
        console.log(`The following files already exist: ${existsFiles.join(", ")}.`);
        console.log("Local initialisation would clobber these files.");
        return;
    }
    let phPath = __dirname.replace(/\\/g, '/');
    // write the localtsconfig.json file
    let ltc = { "include": [phPath + "/lib/**/*", "src/**/*"] }
    let ltsJson = JSON.stringify(ltc, null, 4);
    fs.writeFileSync(ltcFile, ltsJson, { encoding: "utf8" });
    // write game.code-workspace.
    let gcw = { "folders": [{ "path": phPath }, { "path": "." }] };
    let gcwJson = JSON.stringify(gcw, null, 4);
    fs.writeFileSync(gcwFile, gcwJson, { encoding: "utf8" });
}

if (process.argv.length <= 2) {
    console.log("Usage: node ph.js build|watch|init|initlocal");
    process.exit(0);
}
let command = process.argv[2]
if (command === "build") {
    console.log((new Date()).toJSON() + ": Bundling");
    let settings = getSettings(PHJSON);
    bundle(settings);
}
else if (command === "watch") {
    console.log("pH watcher starting");
    let phWatcher = new PHWatcher();
    phWatcher.start();
}
else if (command === "init") {
    initGame();
}
else if (command === "initlocal") {
    initLocal();
}
else {
    console.log(`Unrecognized command: ${command}`);
}
