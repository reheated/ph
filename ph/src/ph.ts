import http = require('http');
import connect = require('connect');
import serveStatic = require('serve-static');
import fs = require('fs');

interface PHSettings {
    resources: string;
    static: string;
    staticRoot: string;
    build: string;
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

function copyFilesRecursive(srcPath: string, destPath: string) {
    let staticFiles = getFilesRecursive(srcPath);
    for (let file of staticFiles) {
        // Figure out the destination where this file should be copied to.
        let sp = file.indexOf('/');
        let dest: string;
        if (sp >= 0) {
            dest = destPath + file.slice(sp);
        }
        else {
            dest = destPath + '/' + file;
        }
        fs.copyFileSync(file, dest);
    }
}

class PHWatcher {
    settings: PHSettings;
    server: http.Server | null = null;
    gamePathWatchers: fs.FSWatcher[] = [];

    constructor () {
        this.settings = this.getSettings("ph.json");
    }

    public start() {
        // Get the settings
        this.settings = this.getSettings("ph.json");
        let dataPaths = [this.settings.resources, this.settings.static];

        // Start the web server
        this.server = connect()
            .use(<connect.HandleFunction>serveStatic(this.settings.build, {}))
            .listen(this.settings.port);

        // Start the resource watcher.
        this.rebundle();
        this.gamePathWatchers = [];
        for (let path of dataPaths) {
            this.gamePathWatchers.push(fs.watch(path, { 'recursive': true },
                () => this.rebundle()));
        }
    }

    private getSettings(filename: string): PHSettings {
        let settingsString = fs.readFileSync(filename, "utf8");
        return JSON.parse(settingsString);
    }

    public stop() {
        this.server!.close();
        for (let w of this.gamePathWatchers) {
            w.close();
        }
    }

    public restart() {
        this.stop();
        this.start();
        console.log('ph watcher restarting');
    }

    public rebundle() {
        // Repackage all the resources
        console.log((new Date()).toJSON() + ": Rebundling");

        // Check the settings
        let failed = false;
        for(let entry of ['resources', 'static', 'staticRoot', 'build', 'serveFolder'])
        {
            let s = <string>this.settings[entry];
            if(s.indexOf('.') >= 0 || s.indexOf('/') >= 0 || s.indexOf('\\') >= 0)
            {
                console.log("Setting \"" + entry + "\" must not contain the characters \\, /, .");
                failed = true;
            }
        }
        if(failed) return;

        // Get all the files in the resource directory
        let resourceFiles = getFilesRecursive(this.settings.resources);

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
                let shortFileName = file.slice(this.settings.resources.length + 1);

                // Create a record which will get put at the start of the bundle.
                fileInfo.push(
                    {
                        "filename": shortFileName,
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

        // Write to the file
        let gamePath = this.settings.build + "/" + this.settings.serveFolder;
        fs.mkdirSync(gamePath, { recursive: true });
        let bundlePath = gamePath + "/" + this.settings.bundleFilename;
        fs.writeFileSync(bundlePath, fullBuffer);

        // Now copy all the static files over
        if (fs.existsSync(this.settings.static))
        {
            copyFilesRecursive(this.settings.static, gamePath);
        }

        // Copy in the static root files
        if (fs.existsSync(this.settings.staticRoot))
        {
            copyFilesRecursive(this.settings.staticRoot, this.settings.build);
        }
    }

}

console.log('ph watcher starting');
let phWatcher = new PHWatcher();
phWatcher.start();
