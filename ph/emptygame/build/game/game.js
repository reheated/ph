"use strict";
var PH;
(function (PH) {
    class Rect {
        constructor(l, t, w, h) {
            this.l = l;
            this.t = t;
            this.w = w;
            this.h = h;
        }
        contains(pos) {
            let [x, y] = pos;
            let result = (x >= this.l && x < this.l + this.w &&
                y >= this.t && y < this.t + this.h);
            return result;
        }
    }
    PH.Rect = Rect;
    class CanvasRect extends Rect {
        constructor() {
            super(...arguments);
            this.mouseOver = false;
        }
        handleNewMouseCoords(mousePos) {
            this.mouseOver = mousePos !== null && this.contains(mousePos);
        }
    }
    class CanvasButton extends CanvasRect {
        constructor(ctx, l, t, w, h, clickCallback, text, drawer, handleButtons, tag) {
            super(l, t, w, h);
            this.pressedMouseButton = null;
            this.ctx = ctx;
            this.clickCallback = clickCallback;
            this.text = text;
            this.drawer = drawer;
            if (handleButtons) {
                this.handleButtons = handleButtons;
            }
            else {
                this.handleButtons = [0];
            }
            this.tag = tag;
        }
        doHandleButton(button) {
            return this.handleButtons.indexOf(button) >= 0;
        }
        handleMouseDown(button) {
            let ok = this.doHandleButton(button) && this.pressedMouseButton === null;
            if (ok && this.mouseOver)
                this.pressedMouseButton = button;
            return !this.mouseOver;
        }
        handleMouseUp(button) {
            if (this.doHandleButton(button)) {
                let doCallback = this.pressedMouseButton !== null && this.mouseOver;
                this.pressedMouseButton = null;
                if (doCallback) {
                    this.clickCallback(this, button);
                }
            }
            // It seems best to always let a mouse up event pass through the buttons,
            // so that other parts of the game can detect it.
            return true;
        }
        draw() {
            this.drawer.draw(this.ctx, this);
        }
    }
    PH.CanvasButton = CanvasButton;
    class CanvasButtonDrawer {
    }
    PH.CanvasButtonDrawer = CanvasButtonDrawer;
    class CanvasButtonSpriteDrawer extends CanvasButtonDrawer {
        constructor(sbUnpressed, sbPressed, font) {
            super();
            this.sbUnpressed = sbUnpressed;
            this.sbPressed = sbPressed;
            this.font = font;
        }
        draw(ctx, b) {
            let sb = (b.pressedMouseButton !== null && b.mouseOver) ? this.sbPressed : this.sbUnpressed;
            sb.draw(ctx, b.l, b.t, b.w, b.h);
            this.font.drawText(ctx, b.text, b.l + 4, b.t + 4);
        }
    }
    PH.CanvasButtonSpriteDrawer = CanvasButtonSpriteDrawer;
})(PH || (PH = {}));
var PH;
(function (PH) {
    class Layer {
        handleLayerAdded() { }
        ;
        handleLayerRemoved() { }
        ;
        draw() { }
        ;
        update(deltat) { return true; }
        handleClick(button) { return true; }
        handleDoubleClick() { return true; }
        handleMouseDown(button) { return true; }
        handleMouseUp(button) { return true; }
        handleMouseMoveClientCoords(clientX, clientY) { }
        handleMouseMove() { }
        handleKeyDown(e) { return true; }
        handleKeyUp(e) { return true; }
    }
    PH.Layer = Layer;
    class LayerManager {
        constructor() {
            this.layers = [];
            this.bottomLayers = [];
            this.mainLayers = [];
            this.topLayers = [];
        }
        updateLayers() {
            let updatedLayers = this.bottomLayers.concat(this.mainLayers).concat(this.topLayers);
            // Call the "remove" function on all layers that get removed.
            for (let s of this.layers) {
                if (updatedLayers.indexOf(s) < 0) {
                    s.handleLayerRemoved();
                }
            }
            // Call the "add" function on all newly added layers
            for (let s of updatedLayers) {
                if (this.layers.indexOf(s) < 0) {
                    s.handleLayerAdded();
                }
            }
            // Actually set the list of layers.
            this.layers = updatedLayers;
        }
        setBottomLayers(...layers) {
            this.bottomLayers = layers;
            this.updateLayers();
        }
        setMainLayers(...layers) {
            this.mainLayers = layers;
            this.updateLayers();
        }
        setTopLayers(...layers) {
            this.topLayers = layers;
            this.updateLayers();
        }
        setupMouseListeners(target) {
            target.addEventListener('click', (e) => this.handleClick(e));
            target.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
            target.addEventListener('contextmenu', (e) => this.handleClick(e));
            target.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            target.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            target.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        }
        setupKeyboardListeners(target) {
            target.addEventListener('keydown', (e) => this.handleKeyDown(e));
            target.addEventListener('keyup', (e) => this.handleKeyUp(e));
        }
        draw() {
            // Draw all the layers, from first to last
            let l = this.layers;
            for (let k = 0; k < l.length; k++) {
                l[k].draw();
            }
        }
        update(deltat) {
            // Update all the layers, from last to first, stopping if we get
            // a false return value.
            let l = this.layers;
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].update(deltat);
                if (!passThrough)
                    break;
            }
        }
        stopBubble(e) {
            // don't let event bubble up
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        handleClick(e) {
            let l = this.layers;
            this.handleMouseMove(e);
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = l[k].handleClick(e.button);
                if (!passThrough)
                    break;
            }
            if (!passThrough)
                return this.stopBubble(e);
        }
        handleDoubleClick(e) {
            let l = this.layers;
            this.handleMouseMove(e);
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = l[k].handleDoubleClick();
                if (!passThrough)
                    break;
            }
            if (!passThrough)
                return this.stopBubble(e);
        }
        handleMouseDown(e) {
            let l = this.layers;
            this.handleMouseMove(e);
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = l[k].handleMouseDown(e.button);
                if (!passThrough)
                    break;
            }
            if (!passThrough)
                return this.stopBubble(e);
        }
        handleMouseUp(e) {
            let l = this.layers;
            this.handleMouseMove(e);
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = l[k].handleMouseUp(e.button);
                if (!passThrough)
                    break;
            }
            if (!passThrough)
                return this.stopBubble(e);
        }
        handleMouseMove(e) {
            let l = this.layers;
            for (let k = l.length - 1; k >= 0; k--) {
                l[k].handleMouseMoveClientCoords(e.clientX, e.clientY);
                l[k].handleMouseMove();
            }
        }
        handleKeyDown(e) {
            let l = this.layers;
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = l[k].handleKeyDown(e);
                if (!passThrough)
                    return;
            }
            if (!passThrough)
                return this.stopBubble(e);
        }
        handleKeyUp(e) {
            let l = this.layers;
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = l[k].handleKeyUp(e);
                if (!passThrough)
                    return;
            }
            if (!passThrough)
                return this.stopBubble(e);
        }
    }
    PH.LayerManager = LayerManager;
})(PH || (PH = {}));
/// <reference path="layer.ts"/>
var PH;
(function (PH) {
    class CanvasCursorLayer extends PH.Layer {
        constructor(ctx, cursorElt, transformer, img, offset) {
            super();
            this.drawCtx = ctx;
            this.cursorElt = cursorElt;
            this.transformer = transformer;
            this.img = img;
            this.offset = offset;
        }
        handleLayerAdded() {
            this.update();
        }
        handleLayerRemoved() {
            this.cursorElt.style.cursor = "";
        }
        update() {
            // hide or show the default cursor
            var newStyle;
            if (this.transformer.mousePos === null) {
                newStyle = "";
            }
            else {
                newStyle = "none";
            }
            this.cursorElt.style.cursor = newStyle;
            return true;
        }
        draw() {
            let mp = this.transformer.mousePos;
            if (mp !== null) {
                let o = this.offset;
                let drawPos = [mp[0] + o[0], mp[1] + o[1]];
                this.drawCtx.drawImage(this.img, ...drawPos);
            }
        }
    }
    PH.CanvasCursorLayer = CanvasCursorLayer;
})(PH || (PH = {}));
var PH;
(function (PH) {
    class CanvasTransformerLayer extends PH.Layer {
        constructor() {
            super(...arguments);
            this.mousePos = null;
        }
    }
    PH.CanvasTransformerLayer = CanvasTransformerLayer;
    class PixelationLayer extends PH.Layer {
        constructor(srcCtx, destCtx) {
            super();
            this.mousePos = null;
            this.srcCtx = srcCtx;
            this.destCtx = destCtx;
        }
        getGameCoordsFromClientCoords(clientX, clientY) {
            var rect = this.destCtx.canvas.getBoundingClientRect();
            // Convert into canvas coordinates.
            // Apply a transformation if the canvas is scaled up
            let w, h, drawScale, tlx, tly;
            if (this.srcCtx.canvas !== null) {
                w = this.srcCtx.canvas.width;
                h = this.srcCtx.canvas.height;
                [drawScale, tlx, tly] = PH.getCanvasScalingParameters(this.srcCtx.canvas, this.destCtx.canvas);
            }
            else {
                w = this.destCtx.canvas.width;
                h = this.destCtx.canvas.height;
                drawScale = 1;
                tlx = 0;
                tly = 0;
            }
            var resX = Math.floor((clientX - rect.left - tlx) / drawScale);
            var resY = Math.floor((clientY - rect.top - tly) / drawScale);
            if (resX < 0 || resX >= w || resY < 0 || resY >= h) {
                return null;
            }
            else {
                return [resX, resY];
            }
        }
        handleMouseMoveClientCoords(clientX, clientY) {
            this.mousePos = this.getGameCoordsFromClientCoords(clientX, clientY);
        }
        draw() {
            this.destCtx.imageSmoothingEnabled = false;
            PH.drawScaledCanvas(this.srcCtx.canvas, this.destCtx);
        }
    }
    PH.PixelationLayer = PixelationLayer;
})(PH || (PH = {}));
var PH;
(function (PH) {
    class CanvasUILayer extends PH.Layer {
        constructor(canvasTransformer) {
            super();
            this.buttons = [];
            this.mouseOverButton = null;
            this.canvasTransformer = canvasTransformer;
        }
        handleMouseMove() {
            // Process buttons
            let mousePos = this.canvasTransformer.mousePos;
            this.mouseOverButton = null;
            for (let b of this.buttons) {
                b.handleNewMouseCoords(mousePos);
                if (b.mouseOver) {
                    this.mouseOverButton = b;
                }
            }
        }
        handleMouseDown(button) {
            let passThrough = true;
            for (let b of this.buttons) {
                passThrough = b.handleMouseDown(button) && passThrough;
            }
            return passThrough;
        }
        handleMouseUp(button) {
            let passThrough = true;
            for (let b of this.buttons) {
                passThrough = b.handleMouseUp(button) && passThrough;
            }
            return passThrough;
        }
        addButton(b) {
            this.buttons.push(b);
        }
        draw() {
            for (let b of this.buttons) {
                b.draw();
            }
        }
    }
    PH.CanvasUILayer = CanvasUILayer;
})(PH || (PH = {}));
var PH;
(function (PH) {
    class CanvasFont {
        drawMultiLineText(ctx, lines, l, t) {
            for (var k = 0; k < lines.length; k++) {
                var y = t + k * this.getLineHeight();
                this.drawText(ctx, lines[k], l, y);
            }
        }
        drawCenteredText(ctx, text, midx, midy) {
            let w = this.getWidthOfText(text);
            var leftx = Math.floor(midx - w / 2);
            var topy = Math.floor(midy - this.getLineHeight() / 2);
            this.drawText(ctx, text, leftx, topy);
        }
        wordWrap(text, maxw) {
            // Word-wrap, to a fixed pixel width.
            let outList = [];
            let cLine = '';
            let rem = text;
            while (rem != '') {
                // get the next word
                let nextSpace = rem.indexOf(' ');
                let nextWord;
                if (nextSpace < 0) {
                    nextWord = rem;
                    rem = '';
                }
                else {
                    nextWord = rem.slice(0, nextSpace);
                    rem = rem.slice(nextSpace + 1);
                }
                // test if the line is OK
                let trialLine = cLine;
                if (trialLine !== '')
                    trialLine += ' ';
                trialLine += nextWord;
                let w = this.getWidthOfText(trialLine);
                if (cLine === '' || w < maxw) {
                    cLine = trialLine;
                }
                else {
                    outList.push(cLine);
                    cLine = nextWord;
                }
            }
            if (cLine != '')
                outList.push(cLine);
            return outList;
        }
    }
    PH.CanvasFont = CanvasFont;
    class SimpleFont extends CanvasFont {
        constructor(fontName, fontSize, letterHeight, lineHeight, fillStyle) {
            super();
            this.fontString = Math.floor(fontSize).toString() + "px " + fontName;
            this.letterHeight = letterHeight;
            this.lineHeight = lineHeight;
            this.fillStyle = fillStyle;
            // Create a dummy canvas context, just for its ability to measure text.
            let dummyCanvas = document.createElement("canvas");
            this.dummyCtx = dummyCanvas.getContext('2d');
            this.dummyCtx.font = this.fontString;
        }
        getLineHeight() {
            return this.lineHeight;
        }
        drawText(ctx, text, x, y) {
            ctx.font = this.fontString;
            ctx.fillStyle = this.fillStyle;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.fillText(text, x, y + this.letterHeight);
        }
        getWidthOfText(text) {
            let mes = this.dummyCtx.measureText(text);
            return mes.width;
        }
    }
    PH.SimpleFont = SimpleFont;
    class PixelFont extends CanvasFont {
        constructor(img, cw, ch, undershoot, lineHeight, startChar, charWidths) {
            super();
            this.yOffset = 0;
            this.img = img;
            this.cw = cw;
            this.ch = ch;
            this.undershoot = undershoot;
            this.lineHeight = lineHeight;
            this.startChar = startChar;
            this.charWidths = charWidths;
        }
        getLineHeight() {
            return this.lineHeight;
        }
        drawText(ctx, text, x, y) {
            var curX = x;
            var curY = y + this.yOffset;
            var modX = Math.floor(this.img.width / this.cw);
            for (var k = 0; k < text.length; k++) {
                var rawCCode = text.charCodeAt(k);
                var modCCode = rawCCode - this.startChar;
                var srcX = (modCCode % modX) * this.cw;
                var srcY = Math.floor(modCCode / modX) * this.ch;
                ctx.drawImage(this.img, srcX, srcY, this.cw, this.ch, curX, curY, this.cw, this.ch);
                if (this.charWidths) {
                    curX += this.charWidths[rawCCode];
                }
                else {
                    curX += this.cw;
                }
                curX -= this.undershoot;
            }
        }
        getWidthOfText(text) {
            if (this.charWidths) {
                let total = 0;
                for (let k = 0; k < text.length; k++) {
                    var rawCCode = text.charCodeAt(k);
                    total += this.charWidths[rawCCode] - this.undershoot;
                }
                return total;
            }
            else {
                return text.length * (this.cw - this.undershoot);
            }
        }
    }
    PH.PixelFont = PixelFont;
})(PH || (PH = {}));
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
;
var PH;
(function (PH) {
    function createCanvas(w, h) {
        let c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }
    PH.createCanvas = createCanvas;
    function getCanvasScalingParameters(srcCanvas, targetCanvas) {
        // Figure out how much to scale up by.
        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let targetW = targetCanvas.width;
        let targetH = targetCanvas.height;
        let drawScale = Math.min(targetW / w, targetH / h);
        drawScale = Math.floor(drawScale);
        if (drawScale < 1)
            drawScale = 1;
        // Figure out the top left point to draw to.
        let tlx = Math.floor((targetW - drawScale * w) / 2);
        let tly = Math.floor((targetH - drawScale * h) / 2);
        return [drawScale, tlx, tly];
    }
    PH.getCanvasScalingParameters = getCanvasScalingParameters;
    function drawScaledCanvas(srcCanvas, targetCtx) {
        // This function draws one canvas onto another, scaling up the size by
        // the maximum possible integer multiple, and centring the picture.
        // For pixel graphics.
        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let [drawScale, tlx, tly] = getCanvasScalingParameters(srcCanvas, targetCtx.canvas);
        targetCtx.drawImage(srcCanvas, 0, 0, w, h, tlx, tly, w * drawScale, h * drawScale);
    }
    PH.drawScaledCanvas = drawScaledCanvas;
    function quickFont(name, url) {
        return __awaiter(this, void 0, void 0, function* () {
            let f = new FontFace(name, "url(" + url + ")");
            yield f.load();
            document.fonts.add(f);
        });
    }
    PH.quickFont = quickFont;
    function curTime() {
        return (new Date()).getTime() / 1000;
    }
    PH.curTime = curTime;
    function resizeCanvasToFullWindow(canvas) {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        if (windowWidth !== canvas.width ||
            windowHeight !== canvas.height) {
            // make sure canvas is the right size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }
    PH.resizeCanvasToFullWindow = resizeCanvasToFullWindow;
    function resetDrawing(ctx, fillStyle) {
        let canvas = ctx.canvas;
        ctx.fillStyle = fillStyle;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    PH.resetDrawing = resetDrawing;
    function delay(seconds) {
        let prom = new Promise((resolve, reject) => {
            setTimeout(() => resolve(), (seconds * 1000));
        });
        return prom;
    }
    PH.delay = delay;
    function changeColor(img, target) {
        let w = img.width;
        let h = img.height;
        let result = createCanvas(w, h);
        let ctx = result.getContext('2d');
        ctx.drawImage(img, 0, 0);
        let imgData = ctx.getImageData(0, 0, w, h);
        for (let k = 0; k < w * h; k++) {
            let offset = k * 4;
            imgData.data[offset] = target[0];
            imgData.data[offset + 1] = target[1];
            imgData.data[offset + 2] = target[2];
        }
        ctx.putImageData(imgData, 0, 0);
        return result;
    }
    PH.changeColor = changeColor;
})(PH || (PH = {}));
/// <reference path="util.ts"/>
var PH;
(function (PH) {
    class FrameManager {
        constructor(settings) {
            // Class to automate calling requestAnimationFrame, frame rate calculations,
            // and scaling graphics for pixellated games.
            this.running = false;
            this.resetTime = null;
            this.frameCount = 0;
            this.lastFrameTime = null;
            this.frameRate = null;
            this.settings = settings;
        }
        start() {
            if (!this.running) {
                this.running = true;
                requestAnimationFrame(() => this.frame());
            }
            this.lastFrameTime = PH.curTime();
        }
        stop() {
            this.running = false;
        }
        frame() {
            window.crash();
            let frameRateInterval = this.settings.frameRateInterval || 5.0;
            let frameRateReporting = this.settings.frameRateReporting || false;
            if (!this.running)
                return;
            var t = PH.curTime();
            let deltat = t - this.lastFrameTime;
            if (this.resetTime === null) {
                this.resetTime = t;
            }
            else if (t > this.resetTime + frameRateInterval) {
                this.frameRate = this.frameCount / (t - this.resetTime);
                this.frameCount = 0;
                this.resetTime += frameRateInterval;
                if (frameRateReporting) {
                    console.log("Framerate: " + this.frameRate.toFixed(1));
                }
            }
            this.frameCount++;
            this.lastFrameTime = t;
            if (this.settings.frameCallback !== undefined) {
                this.settings.frameCallback(deltat);
            }
            requestAnimationFrame(() => this.frame());
        }
    }
    PH.FrameManager = FrameManager;
})(PH || (PH = {}));
var PH;
(function (PH) {
    let PACKAGE_EXT = "dat"; // File extension for packages
    function getFileSize(filename) {
        let req = new XMLHttpRequest();
        req.open("HEAD", filename);
        let prom = new Promise((resolve, reject) => {
            req.onreadystatechange = () => {
                let bytes = parseInt(req.getResponseHeader("Content-Length"));
                resolve(bytes);
            };
            req.onerror = () => reject(new Error("Failed to get file size: " + filename));
            req.send();
        });
        return prom;
    }
    function splitFilename(filename) {
        let dotPos = filename.lastIndexOf('.');
        if (dotPos === -1)
            dotPos = filename.length;
        let name = filename.slice(0, dotPos);
        let ext = filename.slice(dotPos + 1);
        return [name, ext];
    }
    function downloadRawData(filename, onprogress) {
        let req = new XMLHttpRequest();
        req.open("GET", filename);
        req.responseType = 'arraybuffer';
        if (onprogress !== undefined)
            req.onprogress = (event => onprogress(event));
        let prom = new Promise((resolve, reject) => {
            req.onreadystatechange = () => {
                if (req.readyState == req.DONE) {
                    resolve(req.response);
                }
            };
            req.onerror = () => reject(new Error("Failed to download file: " + filename));
            req.send();
        });
        return prom;
    }
    class Loader {
        constructor(audioContext) {
            this.extensionHandlers = {};
            // constructor for a collection of resources
            this.audioContext = audioContext;
            this.addExtensionHandler("png", (response) => processImage(response, "image/png"));
            this.addExtensionHandler("mp3", (response) => this.audioContext.decodeAudioData(response));
            this.addExtensionHandler("flac", (response) => this.audioContext.decodeAudioData(response));
            this.addExtensionHandler("txt", (response) => (new TextDecoder()).decode(response));
            this.addExtensionHandler("svg", processSvg);
            this.addExtensionHandler("html", processHtml);
            this.addExtensionHandler("bff", processBff);
            this.addExtensionHandler("map", processImageMap);
            this.addExtensionHandler(PACKAGE_EXT, (response) => this.processPackage(response));
        }
        addExtensionHandler(ext, fn) {
            this.extensionHandlers[ext] = fn;
        }
        ///////////////////////////////////
        // REQUESTING AND DOWNLOADING FILES
        ///////////////////////////////////
        getFile(filename, progressCallback) {
            return __awaiter(this, void 0, void 0, function* () {
                let result = yield this.getFiles([filename], progressCallback);
                return result[0];
            });
        }
        getFiles(filenames, progressCallback) {
            return __awaiter(this, void 0, void 0, function* () {
                let objects;
                if (progressCallback) {
                    let fileSizes = yield this.getAllFileSizes(filenames);
                    let totalBytes = 0;
                    for (let filename of filenames)
                        totalBytes += fileSizes[filename];
                    let cb = (bytes) => progressCallback(bytes, totalBytes);
                    objects = yield this.downloadAll(filenames, cb);
                }
                else {
                    objects = yield this.downloadAll(filenames);
                }
                return objects;
            });
        }
        //////////////////////////////////////////////////////////////
        // REQUESTING AND EXTRACTING FILES - INTERNAL HELPER FUNCTIONS
        //////////////////////////////////////////////////////////////
        getAllFileSizes(filenames) {
            return __awaiter(this, void 0, void 0, function* () {
                // start getting all the file sizes
                let promises = [];
                let sizes = {};
                for (let i = 0; i < filenames.length; i++) {
                    let filename = filenames[i];
                    promises.push(getFileSize(filename).then((bytes) => {
                        sizes[filename] = bytes;
                    }));
                }
                yield Promise.all(promises);
                return sizes;
            });
        }
        downloadAll(filenames, someLoadedCallback) {
            return __awaiter(this, void 0, void 0, function* () {
                // start getting all the files themselves
                let promises = [];
                let amtLoaded = {};
                for (let i = 0; i < filenames.length; i++) {
                    let filename = filenames[i];
                    let [name, ext] = splitFilename(filename);
                    amtLoaded[name] = 0;
                    promises.push(this.downloadFile(filename, (bytesForFile) => {
                        if (someLoadedCallback) {
                            amtLoaded[filename] = bytesForFile;
                            let total = 0;
                            for (let filename of filenames)
                                total += amtLoaded[filename];
                            someLoadedCallback(total);
                        }
                    }));
                }
                return yield Promise.all(promises);
            });
        }
        downloadFile(filename, someLoadedCallback) {
            return __awaiter(this, void 0, void 0, function* () {
                let cb = someLoadedCallback ? (event) => someLoadedCallback(event.loaded) : undefined;
                let response = yield downloadRawData(filename, cb);
                let [name, ext] = splitFilename(filename);
                let content = yield this.processFile(response, ext);
                return content;
            });
        }
        processFile(response, ext) {
            return __awaiter(this, void 0, void 0, function* () {
                if (ext in this.extensionHandlers) {
                    return this.extensionHandlers[ext](response);
                }
                else {
                    throw new Error("Unrecognized extension: " + ext);
                }
            });
        }
        processPackage(response) {
            return __awaiter(this, void 0, void 0, function* () {
                let lengthBytes = 4;
                let jsonLength = bytesToNumber(new Uint8Array(response.slice(0, lengthBytes)));
                let jsonBytes = new Uint8Array(response.slice(lengthBytes, lengthBytes + jsonLength));
                let jsonData = '';
                for (let k = 0; k < jsonBytes.length; k++) {
                    jsonData += String.fromCharCode(jsonBytes[k]);
                }
                let pack = JSON.parse(jsonData);
                let offset = lengthBytes + jsonLength;
                let names = [];
                let proms = [];
                for (let k = 0; k < pack.length; k++) {
                    let thisData = response.slice(offset + pack[k].start, offset + pack[k].end);
                    let [curName, curExt] = splitFilename(pack[k].filename);
                    names.push(curName);
                    proms.push(this.processFile(thisData, curExt));
                }
                let results = yield Promise.all(proms);
                let d = {};
                for (let k = 0; k < names.length; k++) {
                    if (d.hasOwnProperty(names[k])) {
                        throw new Error("Repeated content name (" + names[k] + ") is not allowed.");
                    }
                    d[names[k]] = results[k];
                }
                return d;
            });
        }
    }
    PH.Loader = Loader;
    function bytesToNumber(bytes) {
        let result = 0;
        let L = bytes.length;
        for (let k = L - 1; k >= 0; k--) {
            result = result * 256 + bytes[k];
        }
        return result;
    }
    function processImage(response, mime) {
        let blob = new Blob([response], { type: mime });
        let result = new Image();
        let prom = new Promise((resolve, reject) => {
            result.onload = () => resolve(result);
            result.src = URL.createObjectURL(blob);
        });
        return prom;
    }
    function processSvg(response) {
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        let svgElem = new DOMParser().parseFromString(txt, 'image/svg+xml');
        return svgElem;
    }
    function processHtml(response) {
        // load the text into an html object to get a DOM
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        let domObj = document.createElement('html');
        domObj.innerHTML = txt;
        return domObj;
    }
    function processBff(response) {
        // create a sprite font from a BFF
        // Check header
        let data = new Uint8Array(response);
        if (data[0] != 0xbf || data[1] != 0xf2) {
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
        let canvas = PH.createCanvas(w, h);
        let ctx = canvas.getContext('2d');
        let outputImageData = ctx.createImageData(w, h);
        // Loop over pixels in the output image
        for (let k = 0; k < w * h; k++) {
            let offsetIn = k * bpp / 8;
            let offsetOut = k * 4;
            // Loop over channels in the output pixel
            for (let l = 0; l < 4; l++) {
                // Decide what the value is, based on the bpp setting
                let value = 0;
                if (bpp == 32) {
                    value = inputImageData[offsetIn + l];
                }
                else if (bpp == 8 && l == 3) {
                    value = inputImageData[offsetIn];
                }
                else {
                    value = 255;
                }
                outputImageData.data[offsetOut + l] = value;
            }
        }
        ctx.putImageData(outputImageData, 0, 0);
        let font = new PH.PixelFont(canvas, cw, ch, 0, ch, startChar, charWidths);
        return font;
    }
    function processImageMap(response) {
        // Process an image map, as produced by the GIMP image map plugin.
        // We just have to convert to text, skip the first two lines, and
        // process the rest as an HTML node.
        let decoder = new TextDecoder();
        let txt = decoder.decode(response);
        txt = txt.split('\n').slice(2).join('\n');
        let domObj = document.createElement('html');
        domObj.innerHTML = txt;
        return domObj;
    }
})(PH || (PH = {}));
var PH;
(function (PH) {
    class SoundFader {
        constructor(audioContext, dur) {
            this.fadeDest = 1.0;
            this.audioContext = audioContext;
            this.soundGainNode = audioContext.createGain();
            this.soundGainNode.gain.value = this.fadeDest;
            this.dur = dur;
        }
        fade(fadeDest) {
            let curT = this.audioContext.currentTime;
            let timeConstant = this.dur / 5;
            this.soundGainNode.gain.cancelScheduledValues(curT);
            this.soundGainNode.gain.setTargetAtTime(fadeDest, curT, timeConstant);
            this.soundGainNode.gain.setValueAtTime(fadeDest, curT + this.dur);
            this.fadeDest = fadeDest;
        }
    }
    class SoundPlayer {
        constructor(audioContext, settings) {
            this.fader = null;
            this.audioContext = audioContext;
            this.settings = settings;
        }
        init() {
            this.fader = new SoundFader(this.audioContext, this.settings.fadeTime || 0.25);
            this.fader.soundGainNode.connect(this.audioContext.destination);
        }
        playSound(sound, loop, startTime) {
            let source = this.audioContext.createBufferSource();
            source.buffer = sound;
            source.loop = loop;
            source.connect(this.fader.soundGainNode);
            source.start(startTime || this.audioContext.currentTime);
            return source;
        }
        stopSound(sound) {
            sound.stop(0);
        }
        toggle() {
            this.fader.fade(1.0 - this.fader.fadeDest);
        }
    }
    PH.SoundPlayer = SoundPlayer;
    class JukeBox {
        constructor(soundPlayer) {
            this.tracks = [];
            this.nextIdx = 0;
            this.curSound = null;
            this.nextSound = null;
            this.nextSoundStartTime = null;
            this.nextTimeout = null;
            this.soundPlayer = soundPlayer;
        }
        setMusic(...tracks) {
            this.cancel();
            this.tracks = tracks;
            let ct = this.soundPlayer.audioContext.currentTime;
            if (tracks.length === 0) {
                this.nextIdx = 0;
                this.curSound = null;
                this.nextSound = null;
            }
            else {
                this.nextIdx = 0;
                this.nextSound = this.startTrack(this.nextIdx, false, ct);
                this.nextSoundStartTime = ct;
                this.queueNextTrack();
            }
        }
        startTrack(idx, loop, startTime) {
            return this.soundPlayer.playSound(this.tracks[idx], loop, startTime);
        }
        cancel() {
            if (this.curSound !== null) {
                this.soundPlayer.stopSound(this.curSound);
                this.curSound = null;
            }
            if (this.nextSound !== null) {
                this.soundPlayer.stopSound(this.nextSound);
                this.nextSound = null;
            }
            if (this.nextTimeout !== null) {
                window.clearTimeout(this.nextTimeout);
                this.nextTimeout = null;
            }
            this.nextIdx = 0;
            this.nextSoundStartTime = null;
        }
        queueNextTrack() {
            if (this.nextSoundStartTime === null) {
                throw new Error("Can't queue next track - haven't started.");
            }
            let curDur = this.tracks[this.nextIdx].duration;
            this.curSound = this.nextSound;
            this.nextIdx = (this.nextIdx + 1) % this.tracks.length;
            this.nextSoundStartTime += curDur;
            this.nextSound = this.startTrack(this.nextIdx, false, this.nextSoundStartTime);
            this.nextTimeout = window.setTimeout(() => {
                this.queueNextTrack();
            }, curDur * 1000);
        }
    }
    PH.JukeBox = JukeBox;
})(PH || (PH = {}));
var PH;
(function (PH) {
    class SpriteBox {
        constructor(srcImg, tileSize, multiple) {
            this.srcImg = srcImg;
            this.tileSize = tileSize;
            this.multiple = multiple;
        }
        draw(ctx, l, t, w, h) {
            if (typeof l !== 'number') {
                return this.draw(ctx, l.l, l.t, l.w, l.h);
            }
            else if (typeof t !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
                throw new Error("Invalid parameters to SpriteBox.Draw.");
            }
            else {
                var htiles = Math.floor(h / this.tileSize);
                var wtiles = Math.floor(w / this.tileSize);
                for (var i = 0; i < htiles; i++) {
                    var getI = (i == 0) ? 0 : ((i == htiles - 1) ? 2 : 1);
                    for (var j = 0; j < wtiles; j++) {
                        var getJ = (j == 0) ? 0 : ((j == wtiles - 1) ? 2 : 1);
                        var gety = getI * this.tileSize;
                        var getx = (getJ + 3 * this.multiple) * this.tileSize;
                        var putx = l + j * this.tileSize;
                        var puty = t + i * this.tileSize;
                        ctx.drawImage(this.srcImg, getx, gety, this.tileSize, this.tileSize, putx, puty, this.tileSize, this.tileSize);
                    }
                }
            }
        }
    }
    PH.SpriteBox = SpriteBox;
})(PH || (PH = {}));
class Game {
    constructor(data, audioContext, mainFont, ctx) {
        this.layerManager = new PH.LayerManager();
        this.minigamePlayedTimes = 0;
        this.data = data;
        this.soundPlayer = new PH.SoundPlayer(audioContext, {});
        this.jukeBox = new PH.JukeBox(this.soundPlayer);
        this.mainFont = mainFont;
        this.ctx = ctx;
        this.layerManager.setupMouseListeners(this.ctx.canvas);
        this.layerManager.setupKeyboardListeners(window);
        this.layerManager.setMainLayers(new MenuLayer(this));
        this.myLayer = new MyLayer(this);
        // Start animation frames.
        let fm = new PH.FrameManager({
            frameCallback: (deltat) => this.frame(deltat)
        });
        fm.start();
    }
    frame(deltat) {
        // Update step.
        this.layerManager.update(deltat);
        // Graphics step.
        PH.resizeCanvasToFullWindow(this.ctx.canvas);
        PH.resetDrawing(this.ctx, "#ffffff");
        this.layerManager.draw();
    }
    endMenu() {
        this.soundPlayer.init();
        this.startMyScene();
    }
    startMyScene() {
        this.layerManager.setMainLayers(this.myLayer);
    }
}
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        window.onerror = null;
        let outGameCanvas = document.getElementById('outGameCanvas');
        outGameCanvas.hidden = false;
        let audioContext = new AudioContext();
        let loader = new PH.Loader(audioContext);
        let ctx = outGameCanvas.getContext('2d');
        // Load a font
        let mainFont = new PH.SimpleFont("Calibri", 16, 16, 16, "#000000");
        // Set up loading sceen
        let loadingScreen = new LoadingScreen(loader, ctx, mainFont);
        // Start animation frames for while the game is loading.
        let fm = new PH.FrameManager({
            frameCallback: (deltat) => {
                PH.resizeCanvasToFullWindow(ctx.canvas);
                PH.resetDrawing(ctx, "#ffffff");
                loadingScreen.draw();
            }
        });
        fm.start();
        // Load the main contents of the game.
        let data = yield loader.getFile('game.dat', (bytes, totalBytes) => loadingScreen.setProgress(bytes, totalBytes));
        fm.stop();
        new Game(data, audioContext, mainFont, ctx);
    });
}
window.onload = start;
class LoadingScreen extends PH.Layer {
    constructor(resources, ctx, font) {
        super();
        this.loadingString = "Loading";
        this.ctx = ctx;
        this.font = font;
    }
    draw() {
        let canvas = this.ctx.canvas;
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.font.drawText(this.ctx, this.loadingString, 1, 1);
    }
    setProgress(bytes, totalBytes) {
        if (bytes === totalBytes) {
            this.loadingString = "Decoding audio (this could take a minute)";
        }
        else {
            let mbLoaded = bytes / 1e6;
            let mbToLoad = totalBytes / 1e6;
            this.loadingString = "Loading " + mbLoaded.toFixed(1) + "/" + mbToLoad.toFixed(1) + "MB";
        }
    }
}
class MenuLayer extends PH.Layer {
    constructor(game) {
        super();
        this.game = game;
    }
    draw() {
        this.game.mainFont.drawCenteredText(this.game.ctx, "Click to start", 160, 120);
    }
    handleClick() {
        this.game.endMenu();
        return false;
    }
}
class MyLayer extends PH.Layer {
    constructor(game) {
        super();
        this.game = game;
    }
    draw() {
        this.game.mainFont.drawText(this.game.ctx, "Hello", 50, 50);
    }
}
//# sourceMappingURL=http://localhost:8080/game/game.js.map