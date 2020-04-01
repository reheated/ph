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

    export class Loader {
        audioContext: AudioContext;

        constructor(audioContext: AudioContext) {
            // constructor for a collection of resources
            this.audioContext = audioContext;
        }

        ///////////////////////////////////
        // REQUESTING AND DOWNLOADING FILES
        ///////////////////////////////////

        async getFile(filename: string, progressCallback?: (mb: number, totalMB: number) => void) {
            let result = await this.getFiles([filename], progressCallback);
            return result[0];
        }

        async getFiles(filenames: string[], progressCallback?: (bytes: number, totalBytes: number) => void): Promise<any[]> {
            let fileSizes = await this.getAllFileSizes(filenames);
            let totalBytes = 0;
            for (let filename of filenames) totalBytes += fileSizes[filename];
            let cb = progressCallback ? (bytes: number) => progressCallback(bytes, totalBytes) : undefined;
            let objects = await this.downloadAll(filenames, cb);
            return objects;
        }

        //////////////////////////////////////////////////////////////
        // REQUESTING AND EXTRACTING FILES - INTERNAL HELPER FUNCTIONS
        //////////////////////////////////////////////////////////////

        private async getAllFileSizes(filenames: string[]) {
            // start getting all the file sizes
            let promises: Promise<void>[] = [];
            let sizes: { [key: string]: number } = {};
            for (let i = 0; i < filenames.length; i++) {
                let filename = filenames[i];
                promises.push(getFileSize(filename).then((bytes) => {
                    sizes[filename] = bytes;
                }));
            }
            await Promise.all(promises);
            return sizes;
        }

        private async downloadAll(filenames: string[], someLoadedCallback?: (bytesSoFar: number) => void) {
            // start getting all the files themselves
            let promises: Promise<void>[] = [];
            let amtLoaded: { [key: string]: number } = {};
            for (let i = 0; i < filenames.length; i++) {
                let filename = filenames[i];
                let [name, ext] = splitFilename(filename);
                amtLoaded[name] = 0;
                promises.push(this.downloadFile(filename, (bytesForFile) => {
                    if (someLoadedCallback) {
                        amtLoaded[filename] = bytesForFile;
                        let total = 0;
                        for (let filename of filenames) total += amtLoaded[filename];
                        someLoadedCallback(total);
                    }
                }));
            }
            return await Promise.all(promises);
        }

        private async downloadFile(filename: string, someLoadedCallback?: (bytesSoFar: number) => void) {
            let cb = someLoadedCallback ? (event: ProgressEvent<EventTarget>) => someLoadedCallback(event.loaded) : undefined;
            let response = await downloadRawData(filename, cb);
            let [name, ext] = splitFilename(filename);
            let content = await this.processFile(response, ext);
            return content;
        }

        private async processFile(response: any, ext: string): Promise<any> {
            if (ext == "png") {
                return await processImage(response, "image/png");
            }
            else if (ext == "mp3" || ext == "flac") {
                return await this.audioContext!.decodeAudioData(response);
            }
            else if (ext == "txt") { // ascii
                let decoder = new TextDecoder();
                return decoder.decode(response);
            }
            else if (ext == "svg") { // svg
                return processSvg(response);
            }
            else if (ext == "html") { // html structure (create a DOM object)
                return processHtml(response);
            }
            else if (ext == "bff") { // Bitmap font file - from CBFG
                return processBff(response);
            }
            else if (ext == PACKAGE_EXT) { // package
                let lengthBytes = 4;
                let jsonLength = bytesToNumber(new Uint8Array(response.slice(0, lengthBytes)));
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
                    if (d.hasOwnProperty(names[k])) {
                        throw new Error("Repeated content name (" + names[k] + ") is not allowed.");
                    }
                    d[names[k]] = results[k];
                }
                return d;
            }
            else {
                throw new Error("Unrecognized extension: " + ext);
            }
        }
    }

    function bytesToNumber(bytes: Uint8Array) {
        let result = 0;
        let L = bytes.length;
        for (let k = L - 1; k >= 0; k--) {
            result = result * 256 + bytes[k];
        }
        return result;
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

    function processBff(response: any) {
        // create a sprite font from a BFF

        // Check header
        let data = new Uint8Array(response);
        if(data[0] != 0xbf || data[1] != 0xf2) {
            throw new Error("File is not valid BFF2 format.");
        }

        // Extract all the information
        let w = bytesToNumber(data.slice(2, 6));
        let h = bytesToNumber(data.slice(6, 10));
        let cw = bytesToNumber(data.slice(10, 14));
        let ch = bytesToNumber(data.slice(14, 18));
        let bpp = data[18];
        let startChar = data[19];
        let charWidths = Array.from(data.slice(20, 20 + 256));
        let inputImageData = data.slice(20 + 256);

        // Create the image
        let canvas = createCanvas(w, h);
        let ctx = canvas.getContext('2d')!;
        let outputImageData = ctx.createImageData(w, h);
        // Loop over pixels in the output image
        for(let k = 0; k < w * h; k++) {
            let offsetIn = k * bpp / 8;
            let offsetOut = k * 4;
            // Loop over channels in the output pixel
            for(let l = 0; l < 4; l++) {
                // Decide what the value is, based on the bpp setting
                let value: number = 0;
                if(bpp == 32) {
                    value = inputImageData[offsetIn + l];
                }
                else if(bpp == 8 && l == 3) {
                    value = inputImageData[offsetIn];
                }
                else {
                    value = 255;
                }

                outputImageData.data[offsetOut + l] = value;
            }
        }
        ctx.putImageData(outputImageData, 0, 0);

        let font = new PixelFont(canvas, cw, ch, 0, ch, startChar, charWidths);

        return font;
    }

}