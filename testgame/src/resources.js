(function(){
	"use strict";
	
    var globalResources = null;
    
    // chrome has a bug where the sound end event doesn't fire if you don't hold a reference to the audio object
    var curSource = null;
	
	function Resources()
	{
		// constructor for a collection of resources
		this.data = {};
		this.amtLoaded = {};
		this.requests = [];
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
        this.curTrack = null;
		globalResources = this;

		this.initAudio();
	}
	window.Resources = Resources;

	//////////////////////////////////
	// REQUESTING AND EXTRACTING FILES
	//////////////////////////////////
    
	Resources.prototype.reqImage = function(name)
	{
		// request an image
		this.requests.push([name, ".png", "image/png"]);
		this.numRequests++;
        this.numToDecode++;
	}
	
	Resources.prototype.reqAudio = function(name)
	{
		// request an mp3 sound
		this.requests.push([name, ".mp3", "audio/mpeg"]);
		this.numRequests++;
        this.numToDecode++;
	}
    
    Resources.prototype.reqAscii = function(name)
    {
        // request a text file
        this.requests.push([name, ".txt", "text/plain"]);
        this.numRequests++;
        this.numToDecode++;
    }
    
    Resources.prototype.reqPackage = function(name)
    {
        // requests a package full of the other kinds of files
        this.requests.push([name, '.dat', "application/octet-stream"]);
        this.numRequests++;
        this.numPackagesRequested++;
    }
	
	Resources.prototype.getAllFileSizes = function(callback)
	{
		// start getting all the file sizes
		for(var i = 0; i < this.requests.length; i++)
		{
			var name = this.requests[i][0];
			var ext = this.requests[i][1];
			var mime = this.requests[i][2];
			var filename = name + ext;
			this.getFileSize(filename, mime, 
				this.handleGotFileSize.bind(this, name, callback));
		}
	}
	
	Resources.prototype.getFileSize = function(filename, mime, callback)
	{
		var req = new XMLHttpRequest();
		req.open("HEAD", filename);
        if(req.overrideMimeType) req.overrideMimeType(mime);
		req.onreadystatechange = function() {
			if(req.readyState == req.DONE)
			{
				var bytes = parseInt(req.getResponseHeader("Content-Length"));
				callback(bytes);
			}
		}
		req.send();
	}
	
	Resources.prototype.handleGotFileSize = function(name, callback, size)
	{
		// handle receiving a file size
		this.sizes[name] = size;
		this.numSizesGot++;
		if(this.numSizesGot == this.numRequests)
		{
			this.recomputeLoaded();
			callback();
		}
	}
	
	Resources.prototype.downloadAll = function(callback)
	{
		// start getting all the file sizes
		for(var i = 0; i < this.requests.length; i++)
		{
			var name = this.requests[i][0];
			var ext = this.requests[i][1];
			var mime = this.requests[i][2];
			this.amtLoaded[name] = 0;
			var filename = name + ext;
			this.downloadFile(name, filename, mime,
				this.handleDownloadedFile.bind(this, name, mime, callback));
		}
	}
	
	Resources.prototype.recomputeLoaded = function()
	{
		var denom = 0;
		for(var x in this.sizes)
		{
			if(this.sizes.hasOwnProperty(x))
			{
				denom += this.sizes[x];
			}
		}
		this.totalToLoad = denom;
		
		var numer = 0;
		for(var x in this.amtLoaded)
		{
			if(this.amtLoaded.hasOwnProperty(x))
			{
				numer += this.amtLoaded[x];
			}
		}
		this.totalLoaded = numer;
	}
	
	Resources.prototype.downloadFile = function(name, filename, mime, callback)
	{
		var req = new XMLHttpRequest();
		req.open("GET", filename);
        if(req.overrideMimeType) req.overrideMimeType(mime);
		req.responseType = 'arraybuffer';
		req.onprogress = (function(evt) {
			this.amtLoaded[name] = evt.loaded;
			this.recomputeLoaded();
		}).bind(this);
		req.onreadystatechange = function() {
			if(req.readyState == req.DONE)
			{
				callback(req.response);
			}
		}
		req.send();
	}
	
	Resources.prototype.handleDownloadedFile = function(name, mime, callback, response)
	{
		this.numDownloaded++;
        this.processDownloadedFile(name, mime, callback, response);
    }
    
    Resources.prototype.processDownloadedFile = function(name, mime, callback, response)
    {
		if(mime == "image/png")
		{
			var blob = new Blob([response], {type: mime});
			var result = new Image();
			result.src = URL.createObjectURL(blob);
			result.onload = this.handleProcessedFile.bind(this, callback);
			this.data[name] = result;
		}
		else if(mime == "audio/mpeg")
		{
			var me = this;
			this.audioContext.decodeAudioData(response, (function(buffer)
			{
				this.data[name] = buffer;
				this.handleProcessedFile(callback);
			}).bind(this), function() {me.errorDecoding = true; throw new Error('Could not decode sound');});
		}
        else if(mime == "text/plain") // ascii
        {
            this.data[name] = String.fromCharCode.apply(null, new Uint8Array(response));
			this.handleProcessedFile(callback); // already processed
		}
		else if(mime == "image/svg+xml") // svg
		{
			var txt = String.fromCharCode.apply(null, new Uint8Array(response));
			var svgElem = new DOMParser().parseFromString(txt, 'image/svg+xml');
			this.data[name] = svgElem;
			this.handleProcessedFile(callback);
		}
        else if(mime == "text/html") // html structure (create a DOM object)
        {
            // load the text into an html object to get a DOM
            var txt = String.fromCharCode.apply(null, new Uint8Array(response));
            var domObj = document.createElement('html');
            domObj.innerHTML = txt;
            this.data[name] = domObj;
            this.handleProcessedFile(callback);
        }
        else if(mime == "application/octet-stream") // using this mime type for packages
        {
            var lengthBytes = 4;
            var lengthArray = new Uint8Array(response.slice(0, lengthBytes));
            var jsonLength = 0;
            for(var k = lengthBytes - 1; k >= 0; k--)
            {
                jsonLength = jsonLength * 256 + lengthArray[k];
            }
            var jsonBytes = new Uint8Array(response.slice(lengthBytes, lengthBytes + jsonLength));
            var jsonData = '';
            for(var k = 0; k < jsonBytes.length; k++)
            {
                jsonData += String.fromCharCode(jsonBytes[k]);
			}
            var pack = JSON.parse(jsonData);
            var offset = lengthBytes + jsonLength;
            for(var k = 0; k < pack.length; k++)
            {
                this.numToDecode++;
                var thisData = response.slice(offset + pack[k].start, offset + pack[k].end);
                this.processDownloadedFile(pack[k].name, pack[k].type, callback, thisData);
            }
            this.numPackagesProcessed++;
            this.checkDoneProcessing(callback);
        }
		else
		{
			throw new Error("Don't know how to handle mime type " + mime);
		}
	}
	
	Resources.prototype.handleProcessedFile = function(callback)
	{
		this.numDecoded++;
        this.checkDoneProcessing(callback);
    }
    
    Resources.prototype.checkDoneProcessing = function(callback)
    {
		if(this.numDecoded === this.numToDecode &&
            this.numPackagesProcessed === this.numPackagesRequested)
		{
			callback();
		}
	}
	
	////////
	// AUDIO
	////////

	Resources.prototype.initAudio = function()
	{
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        
		this.audioContext = new AudioContext();
		
		this.soundGainNode = this.audioContext.createGain();
		this.soundGainNode.gain.value = 1.0;
		this.soundGainNode.connect(this.audioContext.destination);
	}

    Resources.prototype.playSound = function(sound, loop)
    {
		var source = this.audioContext.createBufferSource();
		source.buffer = sound;
		if(loop) source.loop = true;
		else source.loop = false;
		source.connect(this.soundGainNode);
		source.start(this.audioContext.currentTime);
		return source;
    }
	
    Resources.prototype.stopSound = function(sound)
    {
		sound.stop(0);
    }
	
})();

