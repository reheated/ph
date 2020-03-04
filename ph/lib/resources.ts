namespace PH {

    class PHRequest {
        name: string;
        ext: string;
        mime: string;

        constructor(name: string, ext: string, mime: string) {
            this.name = name;
            this.ext = ext;
            this.mime = mime;
        }
    }

    export class Resources {
        public data: { [key: string]: any } = {};
        public amtLoaded: { [key: string]: number } = {};
        public requests: PHRequest[] = [];
        public sizes: { [key: string]: number } = {};

        loadedCallback: (() => void) | null = null;
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

        audioContext: AudioContext | null = null;
        soundGainNode: GainNode | null = null;

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
            this.initAudio();
        }

        ///////////////////////////////////
        // REQUESTING AND DOWNLOADING FILES
        ///////////////////////////////////

        public reqImage(name: string) {
            // request an image
            this.reqContent(name, ".png", "image/png");
        }

        public reqAudio(name: string) {
            // request an mp3 sound
            this.reqContent(name, ".mp3", "audio/mpeg");
        }

        public reqAscii(name: string) {
            // request a text file
            this.reqContent(name, ".txt", "text/plain");
        }

        public reqImageMap(name: string) {
            // request an image map
            this.reqContent(name, ".map", "text/html");
        }

        public reqSvg(name: string) {
            // Request an SVG
            this.reqContent(name, ".svg", "image/svg+xml");
        }

        public reqPackage(name: string) {
            // requests a package full of the other kinds of files
            this.requests.push(new PHRequest(name, '.dat', "application/octet-stream"));
            this.numRequests++;
            this.numPackagesRequested++;
        }

        public get(loadedCallback: () => void) {
            this.loadedCallback = loadedCallback;
            this.getAllFileSizes();
        }

        //////////////////////////////////////////////////////////////
        // REQUESTING AND EXTRACTING FILES - INTERNAL HELPER FUNCTIONS
        //////////////////////////////////////////////////////////////

        reqContent(name: string, ext: string, mime: string) {
            this.requests.push(new PHRequest(name, ext, mime));
            this.numRequests++;
            this.numToDecode++;
        }

        getAllFileSizes() {
            // start getting all the file sizes
            for (let i = 0; i < this.requests.length; i++) {
                let r = this.requests[i];
                let filename = r.name + r.ext;
                this.getFileSize(name, filename, r.mime);
            }
        }

        getFileSize(name: string, filename: string, mime: string) {
            let req = new XMLHttpRequest();
            req.open("HEAD", filename);
            if (req.overrideMimeType) req.overrideMimeType(mime);
            req.onreadystatechange = () => this.handleFileSizeReadyStateChange(name, req);
            req.send();
        }

        handleFileSizeReadyStateChange(name: string, req: XMLHttpRequest) {
            // handle receiving a file size
            if (req.readyState == req.DONE) {
                let bytes = parseInt(req.getResponseHeader("Content-Length")!);
                this.sizes[name] = bytes;
                this.numSizesGot++;
                if (this.numSizesGot == this.numRequests) {
                    // We got all the file sizes, time to start downloading the files for real.
                    this.recomputeLoaded();
                    this.downloadAll();
                }
            }
        }

        downloadAll() {
            // start getting all the files themselves
            for (let i = 0; i < this.requests.length; i++) {
                let r = this.requests[i];
                this.amtLoaded[r.name] = 0;
                let filename = r.name + r.ext;
                this.downloadFile(r.name, filename, r.mime);
            }
        }

        updateAmtLoaded(name: string, evt: ProgressEvent<EventTarget>) {
            this.amtLoaded[name] = evt.loaded;
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

        downloadFile(name: string, filename: string, mime: string) {
            let req = new XMLHttpRequest();
            req.open("GET", filename);
            if (req.overrideMimeType) req.overrideMimeType(mime);
            req.responseType = 'arraybuffer';
            req.onprogress = evt => this.updateAmtLoaded(name, evt);
            req.onreadystatechange = () => this.handleDownloadFileReadyStateChange(name, mime, req);
            req.send();
        }

        handleDownloadFileReadyStateChange(name: string, mime: string, req: XMLHttpRequest) {
            if (req.readyState == req.DONE) {
                this.numDownloaded++;
                this.processDownloadedFile(name, mime, req.response);
            }
        }

        processDownloadedFile(name: string, mime: string, response: any) {
            if (mime == "image/png") {
                let blob = new Blob([response], { type: mime });
                let result = new Image();
                result.src = URL.createObjectURL(blob);
                result.onload = () => this.handleProcessedFile(name, result);
            }
            else if (mime == "audio/mpeg") {
                let me = this;
                this.audioContext!.decodeAudioData(response,
                    (buffer: AudioBuffer) => this.handleProcessedFile(name, buffer),
                    function () { me.errorDecoding = true; throw new Error('Could not decode sound'); });
            }
            else if (mime == "text/plain") // ascii
            {
                let decoder = new TextDecoder();
                this.handleProcessedFile(name, decoder.decode(response));
            }
            else if (mime == "image/svg+xml") // svg
            {
                let decoder = new TextDecoder();
                let txt = decoder.decode(response);
                let svgElem = new DOMParser().parseFromString(txt, 'image/svg+xml');
                this.handleProcessedFile(name, svgElem);
            }
            else if (mime == "text/html") // html structure (create a DOM object)
            {
                // load the text into an html object to get a DOM
                let decoder = new TextDecoder();
                let txt = decoder.decode(response);
                let domObj = document.createElement('html');
                domObj.innerHTML = txt;
                this.handleProcessedFile(name, domObj);
            }
            else if (mime == "application/octet-stream") // using this mime type for packages
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
                for (let k = 0; k < pack.length; k++) {
                    this.numToDecode++;
                    let thisData = response.slice(offset + pack[k].start, offset + pack[k].end);
                    this.processDownloadedFile(pack[k].name, pack[k].type, thisData);
                }
                this.numPackagesProcessed++;
                this.checkDoneProcessing();
            }
            else {
                throw new Error("Don't know how to handle mime type " + mime);
            }
        }

        handleProcessedFile(name: string, content: any) {
            this.data[name] = content;
            this.numDecoded++;
            this.checkDoneProcessing();
        }

        checkDoneProcessing() {
            if (this.numDecoded === this.numToDecode &&
                this.numPackagesProcessed === this.numPackagesRequested) {
                if (this.loadedCallback !== null) {
                    this.loadedCallback();
                }
            }
        }


        ////////
        // AUDIO
        ////////

        public initAudio() {
            window.AudioContext = window.AudioContext;

            this.audioContext = new AudioContext();

            this.soundGainNode = this.audioContext.createGain();
            this.soundGainNode.gain.value = 1.0;
            this.soundGainNode.connect(this.audioContext.destination);
        }

        public playSound(sound: AudioBuffer, loop: boolean): AudioBufferSourceNode {
            let source = this.audioContext!.createBufferSource();
            source.buffer = sound;
            source.loop = loop;
            source.connect(this.soundGainNode!);
            source.start(this.audioContext!.currentTime);
            return source;
        }

        public stopSound(sound: AudioBufferSourceNode) {
            sound.stop(0);
        }

    }

}