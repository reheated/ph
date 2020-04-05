namespace PH {

    export abstract class CoordinateLayer extends Layer {
        mousePos: [number, number] | null = null;

        abstract fromClientCoords(clientCoords: [number, number]): [number, number];

        handleMouseMoveClientCoords(clientCoords: [number, number] | null) {
            this.mousePos = (clientCoords === null) ? null : this.fromClientCoords(clientCoords);
        }

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
                [drawScale, tlx, tly] = getCanvasScalingParameters(this.srcCtx.canvas, this.destCtx.canvas);
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
            PH.drawScaledCanvas(this.srcCtx.canvas, this.destCtx);
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