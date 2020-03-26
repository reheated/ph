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

    export async function quickImage(src: string): Promise<HTMLImageElement> {
        // Download an image. Runs as a promise.
        let img = new Image();
        let prom = new Promise<HTMLImageElement>((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Failed to load image."));
            img.src = src;
        });
        return prom;
    }

    export async function quickFont(name: string, url: string) {
        let f = new FontFace(name, "url(" + url + ")");
        await f.load();
        document.fonts.add(f);
    }

    export function partImage(img: HTMLImageElement, l: number, t: number,
        w: number, h: number, scale: number): HTMLImageElement {
        // Create a new image by extracting the specified rectangle
        // from an existing image.
        let canv = document.createElement("canvas");
        canv.width = w * scale;
        canv.height = h * scale;
        let ctx = canv.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, l, t, w, h, 0, 0, w * scale, h * scale);
        let result = document.createElement("img");
        result.src = canv.toDataURL();
        return result;
    }

    export function curTime() {
        return (new Date()).getTime() / 1000;
    }

    export class FrameCounter {
        resetTime: number | null = null;
        frameCount: number = 0;
        lastFrameTime: number;
        public frameRate: number | null = null;
        reporting: boolean;
        interval: number;

        constructor(reporting: boolean, interval: number) {
            this.reporting = reporting;
            this.interval = interval;
            this.lastFrameTime = curTime();
        }

        public update() {
            var t = PH.curTime();
            let deltat = t - this.lastFrameTime;
            if (this.resetTime === null) {
                this.resetTime = t;
            }
            else if (t > this.resetTime + this.interval) {
                this.frameRate = this.frameCount / (t - this.resetTime);
                this.frameCount = 0;
                this.resetTime += this.interval;
                if (this.reporting) {
                    console.log("Framerate: " + this.frameRate.toFixed(1));
                }
            }
            this.frameCount++;

            this.lastFrameTime = t;
            return deltat;
        }
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

}