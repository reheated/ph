namespace PH {
    let PACKAGE_EXT = "dat"; // File extension for packages

    function getFileSize(filename: string) {
        let req = new XMLHttpRequest();
        req.open("HEAD", filename);
        let prom = new Promise<number>((resolve, reject) => {
            req.onreadystatechange = () => {
                let bytes = parseInt(req.getResponseHeader("Content-Length")!);
                resolve(bytes);
            };
            req.onerror = () => reject(new Error("Failed to get file size: " + filename));
            req.send();
        })
        return prom;
    }

    function splitFilename(filename: string): [string, string] {
        let dotPos = filename.lastIndexOf('.');
        if (dotPos === -1) dotPos = filename.length;
        let name = filename.slice(0, dotPos);
        let ext = filename.slice(dotPos + 1);
        return [name, ext];
    }

    function downloadRawData(filename: string, onprogress?: (event: ProgressEvent<EventTarget>) => void) {
        let req = new XMLHttpRequest();
        req.open("GET", filename);
        req.responseType = 'arraybuffer';
        if (onprogress !== undefined) req.onprogress = (event => onprogress(event));
        let prom = new Promise<any>((resolve, reject) => {
            req.onreadystatechange = () => {
                if (req.readyState == req.DONE) {
                    resolve(req.response);
                }
            }
            req.onerror = () => reject(new Error("Failed to download file: " + filename));
            req.send();
        });
        return prom;
    }

    export class Resources {
        public data: { [key: string]: any } = {};
        public amtLoaded: { [key: string]: number } = {};
        public requests: string[] = [];
        public sizes: { [key: string]: number } = {};

        numSizesGot: number = 0;
        numRequests: number = 0;
        numToDecode: number = 0;
        numPackagesRequested: number = 0;
        numPackagesProcessed: number = 0;
        numDownloaded: number = 0;
        numDecoded: number = 0;
        totalLoaded: number = 0;
        totalToLoad: number = 0;
        errorDecoding: boolean = false;

        audioContext: AudioContext;

        constructor() {
            // constructor for a collection of resources
            this.sizes = {};
            this.numSizesGot = 0;
            this.numRequests = 0;
            this.numToDecode = 0;
            this.numPackagesRequested = 0;
            this.numPackagesProcessed = 0;
            this.numDownloaded = 0;
            this.numDecoded = 0;
            this.totalLoaded = 0;
            this.totalToLoad = 0;
            this.errorDecoding = false;
            this.audioContext = new AudioContext();
        }

        ///////////////////////////////////
        // REQUESTING AND DOWNLOADING FILES
        ///////////////////////////////////

        public async get() {
            await this.getAllFileSizes();
            this.recomputeLoaded();
            await this.downloadAll();
        }

        //////////////////////////////////////////////////////////////
        // REQUESTING AND EXTRACTING FILES - INTERNAL HELPER FUNCTIONS
        //////////////////////////////////////////////////////////////

        public reqPackage(name: string) {
            // requests a package full of the other kinds of files
            this.requests.push(name + ".dat");
            this.numRequests++;
            this.numPackagesRequested++;
        }

        async getAllFileSizes() {
            // start getting all the file sizes
            let promises: Promise<void>[] = [];
            for (let i = 0; i < this.requests.length; i++) {
                let filename = this.requests[i];
                promises.push(getFileSize(filename).then((bytes) => {
                    let [name, ext] = splitFilename(filename);
                    this.sizes[name] = bytes;
                    this.numSizesGot++;
                }));
            }
            await Promise.all(promises);
        }

        async downloadAll() {
            // start getting all the files themselves
            let promises: Promise<void>[] = [];
            for (let i = 0; i < this.requests.length; i++) {
                let filename = this.requests[i];
                let [name, ext] = splitFilename(filename);
                this.amtLoaded[name] = 0;
                promises.push(this.downloadFile(filename));

            }
            await Promise.all(promises);
        }

        async downloadFile(filename: string) {
            let response = await downloadRawData(filename,
                (event) => this.updateAmtLoaded(filename, event));
            this.numDownloaded++;
            let [name, ext] = splitFilename(filename);
            let content = await this.processFile(response, ext);
            if(ext === PACKAGE_EXT) {
                for(let key in content) {
                    this.data[key] = content[key];
                }
            }
            else {
                this.data[name] = content;
            }
        }

        updateAmtLoaded(filename: string, event: ProgressEvent<EventTarget>) {
            let [name, ext] = splitFilename(filename);
            this.amtLoaded[name] = event.loaded;
            this.recomputeLoaded();
        }

        recomputeLoaded() {
            let denom = 0;
            for (let x in this.sizes) {
                if (this.sizes.hasOwnProperty(x)) {
                    denom += this.sizes[x];
                }
            }
            this.totalToLoad = denom;

            let numer = 0;
            for (let x in this.amtLoaded) {
                if (this.amtLoaded.hasOwnProperty(x)) {
                    numer += this.amtLoaded[x];
                }
            }
            this.totalLoaded = numer;
        }

        async processFile(response: any, ext: string): Promise<any> {
            if (ext == "png") {
                return await processImage(response, "image/png");
            }
            else if (ext == "mp3" || ext == "flac") {
                return await this.audioContext!.decodeAudioData(response);
            }
            else if (ext == "txt") // ascii
            {
                let decoder = new TextDecoder();
                return decoder.decode(response);
            }
            else if (ext == "svg") // svg
            {
                return processSvg(response);
            }
            else if (ext == "html") // html structure (create a DOM object)
            {
                return processHtml(response);
            }
            else if (ext == PACKAGE_EXT) // package
            {
                let lengthBytes = 4;
                let lengthArray = new Uint8Array(response.slice(0, lengthBytes));
                let jsonLength = 0;
                for (let k = lengthBytes - 1; k >= 0; k--) {
                    jsonLength = jsonLength * 256 + lengthArray[k];
                }
                let jsonBytes = new Uint8Array(response.slice(lengthBytes, lengthBytes + jsonLength));
                let jsonData = '';
                for (let k = 0; k < jsonBytes.length; k++) {
                    jsonData += String.fromCharCode(jsonBytes[k]);
                }
                let pack = JSON.parse(jsonData);
                let offset = lengthBytes + jsonLength;
                let names: string[] = [];
                let proms: Promise<any>[] = [];
                for (let k = 0; k < pack.length; k++) {
                    let thisData = response.slice(offset + pack[k].start, offset + pack[k].end);
                    let [curName, curExt] = splitFilename(pack[k].filename);
                    names.push(curName);
                    proms.push(this.processFile(thisData, curExt));
                }
                let results = await Promise.all(proms);
                let d: { [key: string]: any } = {};
                for (let k = 0; k < names.length; k++) {
                    d[names[k]] = results[k];
                }
                return d;
            }
            else {
                throw new Error("Don't know how to handle extension " + ext);
            }
        }
    }

    function processImage(response: any, mime: string): Promise<HTMLImageElement> {
        let blob = new Blob([response], { type: mime });
        let result = new Image();
        let prom = new Promise<HTMLImageElement>((resolve, reject) => {
            result.onload = () => resolve(result);
            result.src = URL.createObjectURL(blob);
        })
        return prom;
    }

    function processSvg(response: any): Document {
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        let svgElem = new DOMParser().parseFromString(txt, 'image/svg+xml');
        return svgElem;
    }

    function processHtml(response: any): HTMLHtmlElement {
        // load the text into an html object to get a DOM
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        let domObj = document.createElement('html');
        domObj.innerHTML = txt;
        return domObj;
    }

}
