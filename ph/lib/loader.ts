namespace PH {
    /**
     * File extension for packages
     */
    let PACKAGE_EXT = "dat";

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
                if (req.readyState === req.DONE) {
                    resolve(req.response);
                }
            }
            req.onerror = () => reject(new Error("Failed to download file: " + filename));
            req.send();
        });
        return prom;
    }

    /**
     * Performs pre-loading.
     *
     * Use getFile to get a file, or getFiles to get a list of files. The loader
     * automatically converts the downloaded file into an appropriate object,
     * making its decisions based on the file extension. (It comes with a bunch
     * of pre-constructed handlers for various file types, and you can add your
     * own handlers using addExtensionHandler.)
     *
     * If a file's extension is equal to the value of PH.PACKAGE_EXT, then the
     * loader will treat it as a package produced by the PH tool. This will
     * result in an object whose keys are filenames contained in the package
     * (with extensions removed) and values are the corresponding data.
     */
    export class Loader {
        /**
         * An audioContext, used for decoding audio files.
         */
        audioContext: AudioContext;

        /**
         * Maps file extensions to handler functions. A handler function takes a
         * response (req.response value from an XMLHttpRequest) and returns an
         * object in a usable form.
         */
        extensionHandlers: { [key: string]: (response: any) => Promise<any> } = {};

        /**
         * Construct a loader.
         * 
         * @param audioContext - An audioContext, used for decoding audio files.
         */
        constructor(audioContext: AudioContext) {
            // constructor for a collection of resources
            this.audioContext = audioContext;

            this.addExtensionHandler("png", (response) => processImage(response, "image/png"));
            this.addExtensionHandler("mp3", (response) => this.audioContext!.decodeAudioData(response));
            this.addExtensionHandler("flac", (response) => this.audioContext!.decodeAudioData(response));
            this.addExtensionHandler("txt", (response) => (new TextDecoder()).decode(response));
            this.addExtensionHandler("svg", processSvg);
            this.addExtensionHandler("html", processHtml);
            this.addExtensionHandler("bff", processBff);
            this.addExtensionHandler("map", processImageMap);
            this.addExtensionHandler(PACKAGE_EXT, (response) => this.processPackage(response));
        }

        /**
         * Add an extension handler function.
         *
         * @param ext - File extension (e.g. "mp3").
         * @param fn - Handler function. A handler function takes a response
         * (req.response value from an XMLHttpRequest) and returns an object in
         * a usable form.
         */
        addExtensionHandler(ext: string, fn: (response: any) => any) {
            this.extensionHandlers[ext] = fn;
        }

        ///////////////////////////////////
        // REQUESTING AND DOWNLOADING FILES
        ///////////////////////////////////

        /**
         * Download and decode one file. Awaitable.
         *
         * @param filename - The URL to download
         * @param progressCallback - A function that will be called whenever
         * progress is made on the download. It should take two parameters:
         * bytes, the number of bytes downloaded so far, and totalBytes, the
         * total size of the download.
         *
         * @returns A promise resolving to the decoded resource (image, sound,
         * etc.).
         */
        async getFile(filename: string, progressCallback?: (bytes: number, totalBytes: number) => void) {
            let result = await this.getFiles([filename], progressCallback);
            return result[0];
        }

        /**
         * Download and decode several files. Awaitable.
         *
         * @param filenames - An array of the URLs to download
         * @param progressCallback - A function that will be called whenever
         * progress is made on the download. It should take two parameters:
         * bytes, the number of bytes downloaded so far, and totalBytes, the
         * total size of the downloads.
         *
         * @returns A promise resolving to a list of the decoded resources
         * (images, sounds, etc.).
         */
        async getFiles(filenames: string[], progressCallback?: (bytes: number, totalBytes: number) => void): Promise<any[]> {
            let objects: any[];
            if (progressCallback) {
                let fileSizes = await this.getAllFileSizes(filenames);
                let totalBytes = 0;
                for (let filename of filenames) totalBytes += fileSizes[filename];
                let cb = (bytes: number) => progressCallback(bytes, totalBytes);
                objects = await this.downloadAll(filenames, cb);
            }
            else {
                objects = await this.downloadAll(filenames);
            }
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
            let promises: Promise<any>[] = [];
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
            if (ext in this.extensionHandlers) {
                return this.extensionHandlers[ext](response);
            }
            else {
                throw new Error("Unrecognized extension: " + ext);
            }
        }

        private async processPackage(response: any): Promise<any> {
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
    }

    /**
     * Turn a Uint8Array into a number, assuming least significant byte first.
     * 
     * @param bytes - A Uint8Array with an encoded number.
     * 
     * @returns The number.
     */
    function bytesToNumber(bytes: Uint8Array) {
        let result = 0;
        let L = bytes.length;
        for (let k = L - 1; k >= 0; k--) {
            result = result * 256 + bytes[k];
        }
        return result;
    }

    /**
     * Create an image from downloaded data. Awaitable.
     * 
     * @param response - The downloaded data (response from an XMLHttpRequest).
     * @param mime - The mime type, e.g. "image/png" for a PNG file.
     * 
     * @returns A promise resolving to the image (as an HTMLImageElement).
     */
    function processImage(response: any, mime: string): Promise<HTMLImageElement> {
        let blob = new Blob([response], { type: mime });
        let result = new Image();
        let prom = new Promise<HTMLImageElement>((resolve, reject) => {
            result.onload = () => resolve(result);
            result.src = URL.createObjectURL(blob);
        })
        return prom;
    }

    /**
     * Create an SVG document from downloaded data.
     * 
     * @param response - The downloaded data (response from an XMLHttpRequest).
     * 
     * @returns An SVG document.
     */
    function processSvg(response: any): Document {
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        let svgElem = new DOMParser().parseFromString(txt, 'image/svg+xml');
        return svgElem;
    }

    /**
     * Create an HTML document from downloaded data.
     * 
     * @param response - The downloaded data (response from an XMLHttpRequest).
     * 
     * @returns An HTML document.
     */
    function processHtml(response: any): HTMLHtmlElement {
        // load the text into an html object to get a DOM
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        let domObj = document.createElement('html');
        domObj.innerHTML = txt;
        return domObj;
    }

    /**
     * Create a pixel font from a BFF (Bitmap Font File), which is the native
     * output format of Codehead's Bitmap Font Generator. 
     *
     * @param response - The downloaded data (response from an XMLHttpRequest).
     *
     * @returns a PixelFont constructed from the BFF. You may need to set the
     * yOffset and lineHeight values manually. You might also like to change thea
     * color of the font, which you can do with something like the following:
     *
     *     font.img = PH.changeImageColor(mainFont.img, [0, 0, 0]);
     */
    function processBff(response: any) {
        // create a sprite font from a BFF

        // Check header
        let data = new Uint8Array(response);
        if (data[0] !== 0xbf || data[1] !== 0xf2) {
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
        for (let k = 0; k < w * h; k++) {
            let offsetIn = k * bpp / 8;
            let offsetOut = k * 4;
            // Loop over channels in the output pixel
            for (let l = 0; l < 4; l++) {
                // Decide what the value is, based on the bpp setting
                let value: number = 0;
                if (bpp === 32) {
                    value = inputImageData[offsetIn + l];
                }
                else if (bpp === 8 && l === 3) {
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

    /**
     * Process an image map, as produced by the GIMP image map plugin. 
     *
     * @param response - The downloaded data (response from an XMLHttpRequest).
     *
     * @returns An HTML document containing the map element.
     */
    function processImageMap(response: any): any {
        // We just have to convert to text, skip the first two lines, and
        // process the rest as an HTML node.
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        txt = txt.split('\n').slice(2).join('\n');
        let domObj = document.createElement('html');
        domObj.innerHTML = txt;
        return domObj;
    }

}
