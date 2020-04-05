declare class FontFace {
    constructor(family: string, source: string);
    load(): Promise<FontFace>;
}

declare interface FontFaceSet extends Set<FontFace> { };

declare interface Document {
    fonts: FontFaceSet;
}

namespace PH {
    export type FillStyle = string | CanvasGradient | CanvasPattern;
    export type RGB = [number, number, number];
    export type RGBA = [number, number, number, number];

    export function createCanvas(w: number, h: number): HTMLCanvasElement {
        let c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    export function getCanvasScalingParameters(srcCanvas: HTMLCanvasElement,
        targetCanvas: HTMLCanvasElement): [number, number, number] {
        // Figure out how much to scale up by.
        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let targetW = targetCanvas.width;
        let targetH = targetCanvas.height;
        let drawScale = Math.min(targetW / w, targetH / h);
        drawScale = Math.floor(drawScale);
        if (drawScale < 1) drawScale = 1;

        // Figure out the top left point to draw to.
        let tlx = Math.floor((targetW - drawScale * w) / 2);
        let tly = Math.floor((targetH - drawScale * h) / 2);

        return [drawScale, tlx, tly];
    }

    export function drawScaledCanvas(srcCanvas: HTMLCanvasElement,
        targetCtx: CanvasRenderingContext2D) {
        // This function draws one canvas onto another, scaling up the size by
        // the maximum possible integer multiple, and centring the picture.
        // For pixel graphics.

        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let [drawScale, tlx, tly] = getCanvasScalingParameters(srcCanvas, targetCtx.canvas);
        targetCtx.drawImage(srcCanvas, 0, 0, w, h,
            tlx, tly, w * drawScale, h * drawScale);
    }

    export async function quickFont(name: string, url: string) {
        let f = new FontFace(name, "url(" + url + ")");
        await f.load();
        document.fonts.add(f);
    }

    export function curTime() {
        return (new Date()).getTime() / 1000;
    }

    export function resizeCanvasToFullWindow(canvas: HTMLCanvasElement) {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        if (windowWidth !== canvas.width ||
            windowHeight !== canvas.height) {
            // make sure canvas is the right size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }

    export function resetDrawing(ctx: CanvasRenderingContext2D, fillStyle: FillStyle) {
        let canvas = ctx.canvas;
        ctx.fillStyle = fillStyle;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    export function delay(seconds: number) {
        let prom = new Promise<void>((resolve, reject) => {
            setTimeout(() => resolve(), (seconds * 1000));
        })
        return prom;
    }

    export function changeColor(img: CanvasImageSource, target: RGB) {
        let w = <number>img.width;
        let h = <number>img.height;
        let result = createCanvas(w, h);
        let ctx = result.getContext('2d')!;
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

    function objectKey(name: string) {
        let gameId = (<any>window).gameId;
        if(gameId === undefined) {
            throw new Error("saveObject requires window.gameId to be defined.");
        }
        let key = gameId + "_" + name;
        return key;
    }

    export function saveObject(name: string, data: any) {
        let s = JSON.stringify(data);
        let key = objectKey(name);
        localStorage.setItem(key, s);
    }

    export function isSavedObject(name: string) {
        let key = objectKey(name);
        let s = localStorage.getItem(key);
        return (s !== null);
    }

    export function loadObject(name: string) {
        let key = objectKey(name);
        let s = localStorage.getItem(key);
        if(s === null) {
            throw new Error(`loadObject: key "${key}" not found in localStorage.`);
        }
        return JSON.parse(s);
    }

    export function removeObject(name: string) {
        let key = objectKey(name);
        localStorage.removeItem(key);
    }
}