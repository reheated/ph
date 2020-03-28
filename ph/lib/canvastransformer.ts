namespace PH {

    export abstract class CanvasTransformerLayer extends Layer {
        mousePos: [number, number] | null = null;
    }

    export class PixelationLayer extends Layer {
        srcCtx: CanvasRenderingContext2D;
        destCtx: CanvasRenderingContext2D;
        mousePos: [number, number] | null = null;

        constructor(srcCtx: CanvasRenderingContext2D, destCtx: CanvasRenderingContext2D) {
            super();
            this.srcCtx = srcCtx;
            this.destCtx = destCtx;
        }

        getGameCoordsFromClientCoords(clientX: number, clientY: number):
            [number, number] | null {
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

            var resX = Math.floor((clientX - rect.left - tlx) / drawScale);
            var resY = Math.floor((clientY - rect.top - tly) / drawScale);
            if (resX < 0 || resX >= w || resY < 0 || resY >= h) {
                return null;
            }
            else {
                return [resX, resY];
            }
        }

        handleMouseMoveClientCoords(clientX: number, clientY: number) {
            this.mousePos = this.getGameCoordsFromClientCoords(clientX, clientY);
        }

        draw() {
            this.destCtx.imageSmoothingEnabled = false;
            PH.drawScaledCanvas(this.srcCtx.canvas, this.destCtx);
        }
    }

}