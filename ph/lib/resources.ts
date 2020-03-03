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

class Resources {
    public data: { [key: string]: any } = {};
    public amtLoaded: { [key: string]: number } = {};
    public requests: PHRequest[] = [];
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

    //////////////////////////////////
    // REQUESTING AND EXTRACTING FILES
    //////////////////////////////////

    public reqImage(name: string) {
        // request an image
        this.requests.push(new PHRequest(name, ".png", "image/png"));
        this.numRequests++;
        this.numToDecode++;
    }

    public reqAudio(name: string) {
        // request an mp3 sound
        this.requests.push(new PHRequest(name, ".mp3", "audio/mpeg"));
        this.numRequests++;
        this.numToDecode++;
    }

    public reqAscii(name: string) {
        // request a text file
        this.requests.push(new PHRequest(name, ".txt", "text/plain"));
        this.numRequests++;
        this.numToDecode++;
    }

    public reqPackage(name: string) {
        // requests a package full of the other kinds of files
        this.requests.push(new PHRequest(name, '.dat', "application/octet-stream"));
        this.numRequests++;
        this.numPackagesRequested++;
    }

    public getAllFileSizes(callback: () => void) {
        // start getting all the file sizes
        for (var i = 0; i < this.requests.length; i++) {
            let r = this.requests[i];
            var filename = r.name + r.ext;
            this.getFileSize(filename, r.mime,
                this.handleGotFileSize.bind(this, r.name, callback));
        }
    }

    public handleGotFileSize(name: string, callback: () => void, size: number) {
        // handle receiving a file size
        this.sizes[name] = size;
        this.numSizesGot++;
        if (this.numSizesGot == this.numRequests) {
            this.recomputeLoaded();
            callback();
        }
    }

    public downloadAll(callback: () => void) {
        // start getting all the file sizes
        for (var i = 0; i < this.requests.length; i++) {
            let r = this.requests[i];
            this.amtLoaded[r.name] = 0;
            var filename = r.name + r.ext;
            this.downloadFile(r.name, filename, r.mime,
                this.handleDownloadedFile.bind(this, r.name, r.mime, callback));
        }
    }

    //////////////////////////////////////////////////////////////
    // REQUESTING AND EXTRACTING FILES - INTERNAL HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////

    getFileSize(filename: string, mime: string, callback: (size: number) => void) {
        var req = new XMLHttpRequest();
        req.open("HEAD", filename);
        if (req.overrideMimeType) req.overrideMimeType(mime);
        req.onreadystatechange = function () {
            if (req.readyState == req.DONE) {
                var bytes = parseInt(req.getResponseHeader("Content-Length")!);
                callback(bytes);
            }
        }
        req.send();
    }

    updateAmtLoaded(name: string, evt: ProgressEvent<EventTarget>)
    {
        this.amtLoaded[name] = evt.loaded;
        this.recomputeLoaded();
    }

    recomputeLoaded() {
        var denom = 0;
        for (var x in this.sizes) {
            if (this.sizes.hasOwnProperty(x)) {
                denom += this.sizes[x];
            }
        }
        this.totalToLoad = denom;

        var numer = 0;
        for (var x in this.amtLoaded) {
            if (this.amtLoaded.hasOwnProperty(x)) {
                numer += this.amtLoaded[x];
            }
        }
        this.totalLoaded = numer;
    }

    downloadFile(name: string, filename: string, mime: string, callback: (response: any) => void) {
        var req = new XMLHttpRequest();
        req.open("GET", filename);
        if (req.overrideMimeType) req.overrideMimeType(mime);
        req.responseType = 'arraybuffer';
        req.onprogress = evt => this.updateAmtLoaded(name, evt);
        req.onreadystatechange = function () {
            if (req.readyState == req.DONE) {
                callback(req.response);
            }
        }
        req.send();
    }

    handleDownloadedFile(name: string, mime: string, callback: () => void, response: any) {
        this.numDownloaded++;
        this.processDownloadedFile(name, mime, callback, response);
    }

    processDownloadedFile(name: string, mime: string, callback: () => void, response: any) {
        if (mime == "image/png") {
            var blob = new Blob([response], { type: mime });
            var result = new Image();
            result.src = URL.createObjectURL(blob);
            result.onload = () => this.handleProcessedFile(name, result, callback);
        }
        else if (mime == "audio/mpeg") {
            var me = this;
            this.audioContext!.decodeAudioData(response, 
                (buffer: AudioBuffer) => this.handleProcessedFile(name, buffer, callback),
                function () { me.errorDecoding = true; throw new Error('Could not decode sound'); });
        }
        else if (mime == "text/plain") // ascii
        {
            let decoder = new TextDecoder();
            this.handleProcessedFile(name, decoder.decode(response), callback);
        }
        else if (mime == "image/svg+xml") // svg
        {
            let decoder = new TextDecoder();
            var txt = decoder.decode(response);
            var svgElem = new DOMParser().parseFromString(txt, 'image/svg+xml');
            this.handleProcessedFile(name, svgElem, callback);
        }
        else if (mime == "text/html") // html structure (create a DOM object)
        {
            // load the text into an html object to get a DOM
            let decoder = new TextDecoder();
            var txt = decoder.decode(response);
            var domObj = document.createElement('html');
            domObj.innerHTML = txt;
            this.handleProcessedFile(name, domObj, callback);
        }
        else if (mime == "application/octet-stream") // using this mime type for packages
        {
            var lengthBytes = 4;
            var lengthArray = new Uint8Array(response.slice(0, lengthBytes));
            var jsonLength = 0;
            for (var k = lengthBytes - 1; k >= 0; k--) {
                jsonLength = jsonLength * 256 + lengthArray[k];
            }
            var jsonBytes = new Uint8Array(response.slice(lengthBytes, lengthBytes + jsonLength));
            var jsonData = '';
            for (var k = 0; k < jsonBytes.length; k++) {
                jsonData += String.fromCharCode(jsonBytes[k]);
            }
            var pack = JSON.parse(jsonData);
            var offset = lengthBytes + jsonLength;
            for (var k = 0; k < pack.length; k++) {
                this.numToDecode++;
                var thisData = response.slice(offset + pack[k].start, offset + pack[k].end);
                this.processDownloadedFile(pack[k].name, pack[k].type, callback, thisData);
            }
            this.numPackagesProcessed++;
            this.checkDoneProcessing(callback);
        }
        else {
            throw new Error("Don't know how to handle mime type " + mime);
        }
    }

    handleProcessedFile(name: string, content: any, callback: () => void) {
        this.data[name] = content;
        this.numDecoded++;
        this.checkDoneProcessing(callback);
    }

    checkDoneProcessing(callback: () => void) {
        if (this.numDecoded === this.numToDecode &&
            this.numPackagesProcessed === this.numPackagesRequested) {
            callback();
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
        var source = this.audioContext!.createBufferSource();
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
