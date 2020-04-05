namespace PH {

    export abstract class CoordinateLayer extends Layer {
        mousePos: [number, number] | null = null;

        abstract fromClientCoords(clientCoords: [number, number]): [number, number];

        handleMouseMoveClientCoords(clientCoords: [number, number] | null) {
            this.mousePos = (clientCoords === null) ? null : this.fromClientCoords(clientCoords);
        }

    }

    function getCanvasPixelScalingParameters(srcCanvas: HTMLCanvasElement,
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

    function drawPixelScaledCanvas(srcCanvas: HTMLCanvasElement,
        targetCtx: CanvasRenderingContext2D) {
        // This function draws one canvas onto another, scaling up the size by
        // the maximum possible integer multiple, and centring the picture.
        // For pixel graphics.

        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let [drawScale, tlx, tly] = getCanvasPixelScalingParameters(srcCanvas, targetCtx.canvas);
        targetCtx.drawImage(srcCanvas, 0, 0, w, h,
            tlx, tly, w * drawScale, h * drawScale);
    }

    export class PixelationLayer extends CoordinateLayer {
        srcCtx: CanvasRenderingContext2D;
        destCtx: CanvasRenderingContext2D;
        mousePos: [number, number] | null = null;

        constructor(srcCtx: CanvasRenderingContext2D, destCtx: CanvasRenderingContext2D) {
            super();
            this.srcCtx = srcCtx;
            this.destCtx = destCtx;
        }

        fromClientCoords(clientCoords: [number, number]): [number, number] {
            var rect = this.destCtx.canvas.getBoundingClientRect();
            // Convert into canvas coordinates.
            // Apply a transformation if the canvas is scaled up
            let w, h, drawScale, tlx, tly: number;
            if (this.srcCtx.canvas !== null) {
                w = this.srcCtx.canvas.width;
                h = this.srcCtx.canvas.height;
                [drawScale, tlx, tly] = getCanvasPixelScalingParameters(this.srcCtx.canvas, this.destCtx.canvas);
            }
            else {
                w = this.destCtx.canvas.width;
                h = this.destCtx.canvas.height;
                drawScale = 1;
                tlx = 0;
                tly = 0;
            }

            var resX = Math.floor((clientCoords[0] - rect.left - tlx) / drawScale);
            var resY = Math.floor((clientCoords[1] - rect.top - tly) / drawScale);
            return [resX, resY];
        }

        draw() {
            this.destCtx.imageSmoothingEnabled = false;
            drawPixelScaledCanvas(this.srcCtx.canvas, this.destCtx);
        }
    }

    export class CentralCoordinateLayer extends CoordinateLayer {
        ctx: CanvasRenderingContext2D;
        mousePos: [number, number] | null = null;
        w: number;
        h: number;
        scale: number;

        constructor(ctx: CanvasRenderingContext2D) {
            super();
            this.ctx = ctx;
            [this.w, this.h, this.scale] = this.getScale();
        }

        update(deltat: number) {
            [this.w, this.h, this.scale] = this.getScale();
            return true;
        }

        private getScale() {
            let w = this.ctx.canvas.width;
            let h = this.ctx.canvas.height;
            let scale = Math.min(w, h) / 2;
            return [w, h, scale];
        }

        fromClientCoords(clientCoords: [number, number]): [number, number] {
            let x = (clientCoords[0] - this.w / 2) / this.scale;
            let y = (clientCoords[1] - this.h / 2) / this.scale;
            return [x, y];
        }

        toClientCoords(gameCoords: [number, number]): [number, number] {
            let x = gameCoords[0] * this.scale + this.w / 2;
            let y = gameCoords[1] * this.scale + this.h / 2;
            return [x, y];
        }
    }

}