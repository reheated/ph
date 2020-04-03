import http = require('http');
import connect = require('connect');
import serveStatic = require('serve-static');
import compression = require('compression');
import minimatch = require("minimatch");
import fs = require('fs');

let PHJSON = "ph.json";
let CHECK_INTERVAL = 100;

interface PHSettings {
    resources: string;
    static: string;
    staticRoot: string;
    template: string;
    build: string;
    preserveGlobs: string;
    serveFolder: string;
    bundleFilename: string;
    port: number;
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
    if(!ok) {
        throw new Error("relativeFile: file is not contained in srcPath.");
    }
    return destPath + file.slice(srcPath.length);
}

function copyFilesRecursive(srcPath: string, destPath: string) {
    let staticFiles = getFilesRecursive(srcPath);
    for (let file of staticFiles) {
        // Figure out the destination where this file should be copied to.
        let dest = relativeFile(srcPath, destPath, file);
        fs.copyFileSync(file, dest);
    }
}

function isPathPrefix(testPrefix: string, path: string) {
    // Return true if path lies under testPrefix in the file hierarchy.
    if (path.indexOf(testPrefix) !== 0) return false;
    if (path === testPrefix) return true;
    let c = path[testPrefix.length];
    if (c == '/' || c == '\\') return true;
    return false;
}

function fillTemplate(contents: string, subs: {[key: string]: any}) {
    let re = /\$\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
    let lastEnd = 0;
    let pieces: string[] = [];
    let errKeys = new Set<string>();
    while(true) {
        // Find the next occurrence of "${...}".
        let nextMatch = re.exec(contents);
        if(nextMatch === null) break;
        pieces.push(contents.slice(lastEnd, nextMatch.index));
        let matchStr = nextMatch[0];
        lastEnd = nextMatch.index + matchStr.length;
        // Look up the key in settings.
        let curKey = nextMatch[1];
        if(subs.hasOwnProperty(curKey)) {
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
    
    if(errKeys.size > 0) {
        console.error(`\x1b[31mThe following substitution keys were not found in the settings: \x1b[33m${Array.from(errKeys).join(", ")}\x1b[31m.\x1b[0m`);
    }
    return pieces.join('');
}

class PHWatcher {
    settings: PHSettings;
    server: http.Server | null = null;
    gamePathWatchers: fs.FSWatcher[] = [];
    dataPaths: string[] = [];
    dirty = true;
    watchTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.settings = this.getSettings(PHJSON);
    }

    start() {
        // Get the settings
        if (!this.checkSettings()) return;
        this.dataPaths = [
            this.settings.resources, this.settings.static,
            this.settings.staticRoot, this.settings.template];

        // Start the web server
        this.server = connect()
            .use(<connect.HandleFunction>compression())
            .use(<connect.HandleFunction>serveStatic(this.settings.build, {}))
            .listen(this.settings.port);

        // Start the resource watcher.
        this.gamePathWatchers = [fs.watch('.', { 'recursive': true },
            (eventType, filename) => this.checkFileChange(filename))];
        this.watchTimeout = setTimeout(() => this.checkDirty(), CHECK_INTERVAL);
    }

    private checkDirty() {
        if(this.dirty) {
            this.dirty = false;
            this.rebundle();
        }
        this.watchTimeout = setTimeout(() => this.checkDirty(), CHECK_INTERVAL);
    }

    private getSettings(filename: string): PHSettings {
        let settingsString = fs.readFileSync(filename, "utf8");
        return JSON.parse(settingsString);
    }

    stop() {
        if(this.watchTimeout !== null) clearTimeout(this.watchTimeout);
        this.watchTimeout = null;
        this.server!.close();
        for (let w of this.gamePathWatchers) {
            w.close();
        }
    }

    restart() {
        this.stop();
        this.settings = this.getSettings(PHJSON);
        this.start();
        console.log('ph watcher restarting');
    }

    private checkSettings(): boolean {
        let ok = true;
        for (let entry of ['resources', 'static', 'staticRoot', 'template', 'build', 'serveFolder']) {
            let s = <string>this.settings[entry];
            if (s.indexOf('.') >= 0 || s.indexOf('/') >= 0 || s.indexOf('\\') >= 0) {
                console.log("Setting \"" + entry + "\" must not contain the characters \\, /, .");
                ok = false;
            }
        }
        return ok;
    }

    checkFileChange(filename: string) {
        // does the location of this file indicate that we need to rebundle?
        let doRebundle = false;

        if (filename === PHJSON) doRebundle = true;

        for (let curPath of this.dataPaths) {
            if (isPathPrefix(curPath, filename)) doRebundle = true;
        }

        if (doRebundle) this.dirty = true;
    }

    rebundle() {
        // Repackage all the resources
        console.log((new Date()).toJSON() + ": Rebundling");
        this.settings = this.getSettings(PHJSON);

        // Check the settings
        if (!this.checkSettings()) return;

        // Get all the files in the resource directory
        let resourceFiles: string[];
        if (fs.existsSync(this.settings.static)) {
            resourceFiles = getFilesRecursive(this.settings.resources);
        }
        else {
            resourceFiles = [];
        }

        let buffers: Buffer[] = [];
        let fileInfo = [];
        let curLength = 0;
        let exts = new Set(this.settings.resourceExtensions)
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
                let shortFilename = file.slice(this.settings.resources.length + 1);

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
        let gamePath = this.settings.build + "/" + this.settings.serveFolder;
        fs.mkdirSync(gamePath, { recursive: true });

        // Clean up by deleting the files in the build directory, except for those
        // excluded by the preserveRegEx setting.
        let buildFiles = getFilesRecursive(this.settings.build);
        for (let filename of buildFiles) {
            // Cut off the base directory
            let shortFilename = filename.slice(this.settings.build.length + 1);
            let preserve = false;
            for (let glob of this.settings.preserveGlobs) {
                preserve = preserve || minimatch(shortFilename, glob);
            }
            if (!preserve) fs.unlinkSync(filename);
        }

        // Write fullBuffer to the user-specified bundle filename
        let bundlePath = gamePath + "/" + this.settings.bundleFilename;
        fs.writeFileSync(bundlePath, fullBuffer);

        // Now copy all the static files over
        if (fs.existsSync(this.settings.static)) {
            copyFilesRecursive(this.settings.static, gamePath);
        }

        // Copy in the static root files
        if (fs.existsSync(this.settings.staticRoot)) {
            copyFilesRecursive(this.settings.staticRoot, this.settings.build);
        }

        // Run template substitution on all the files in the template folder
        if (fs.existsSync(this.settings.template)) {
            let templateFiles = getFilesRecursive(this.settings.template);
            for(let file of templateFiles) {
                let destFile = relativeFile(this.settings.template, gamePath, file);
                let contents = fs.readFileSync(file, "utf8");
                let result = fillTemplate(contents, this.settings);
                fs.writeFileSync(destFile, result, {encoding: "utf8"});
            }
        }
    }

}

console.log('ph watcher starting');
let phWatcher = new PHWatcher();
phWatcher.start();
