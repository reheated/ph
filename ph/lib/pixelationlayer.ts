namespace PH {

    /**
     * Helper function for intermediate calculations used in PixelationLayer.
     *
     * @param srcCanvas - Off-screen canvas.
     * @param destCanvas - On-screen canvas.
     *
     * @returns [scaling factor, x-coordinate of left edge, y-coordinate of top
     * edge].
     */
    function getCanvasPixelScalingParameters(srcCanvas: HTMLCanvasElement,
        destCanvas: HTMLCanvasElement): [number, number, number] {
        // Figure out how much to scale up by.
        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let destW = destCanvas.width;
        let destH = destCanvas.height;
        let drawScale = Math.min(destW / w, destH / h);
        drawScale = Math.floor(drawScale);
        if (drawScale < 1) drawScale = 1;

        // Figure out the top left point to draw to.
        let tlx = Math.floor((destW - drawScale * w) / 2);
        let tly = Math.floor((destH - drawScale * h) / 2);

        return [drawScale, tlx, tly];
    }

    /**
     * Helper function used to do the drawing in the PixelationLayer.
     *
     * @param srcCanvas - Off-screen canvas.
     * @param destCtx - 2D context of the on-screen canvas.
     */
    function drawPixelScaledCanvas(srcCanvas: HTMLCanvasElement,
        destCtx: CanvasRenderingContext2D) {
        // This function draws one canvas onto another, scaling up the size by
        // the maximum possible integer multiple, and centring the picture. For
        // pixel graphics.

        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let [drawScale, tlx, tly] = getCanvasPixelScalingParameters(srcCanvas, destCtx.canvas);
        destCtx.drawImage(srcCanvas, 0, 0, w, h,
            tlx, tly, w * drawScale, h * drawScale);
    }

    /**
     * Class to help with the graphics for a pixelated game.
     *
     * You construct this class with two 2D contexts. srcCtx is the context of
     * an off-screen canvas, where you will actually be drawing all your
     * graphics. destCtx is the context of an on-screen canvas. This class takes
     * care of scaling up the graphics by an integer scaling factor, which
     * ensures that you get evenly-scaled-up graphics in the end. It also takes
     * care of converting on-screen mouse coordinates into game coordinates.
     *
     * Call draw every frame, after you've finished all your drawing on the
     * off-screen canvas. Also, call handleMouseMove when there are new mouse
     * coordinates.
     *
     * Alternatively, add this class to a LayerManager (position it after all
     * your off-screen drawing), and it will take care of the calls for you.
     */
    export class PixelationLayer extends Layer {
        /**
         * 2D context for off-screen drawing.
         */
        srcCtx: CanvasRenderingContext2D;

        /**
         * 2D context of an on-screen canvas. The PixelationLayer will scale up
         * the graphics and draw it here.
         */
        destCtx: CanvasRenderingContext2D;

        /**
         * Construct the pixelation layer.
         *
         * @param srcCtx - 2D context for off-screen drawing.
         * @param destCtx - 2D context of an on-screen canvas. The
         * PixelationLayer will scale up the graphics and draw it here.
         */
        constructor(srcCtx: CanvasRenderingContext2D, destCtx: CanvasRenderingContext2D) {
            super();
            this.srcCtx = srcCtx;
            this.destCtx = destCtx;
        }

        /**
         * Convert on-screen coordinates to off-screen (game) coordinates.
         * 
         * @param canvasCoords - On-screen coordinates.
         * 
         * @returns Off-screen coordinates.
         */
        fromCanvasCoords(canvasCoords: [number, number]): [number, number] {
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

            var resX = Math.floor((canvasCoords[0] - tlx) / drawScale);
            var resY = Math.floor((canvasCoords[1] - tly) / drawScale);
            
            return [resX, resY];
        }

        /**
         * Get the visible rectangle, in game coordinates.
         * 
         * @returns The visible rectangle.
         */
        rect(): Rect {
            let canvas = this.srcCtx.canvas;
            return new Rect(0, 0, canvas.width, canvas.height);
        }

        /**
         * Transform the mouse position from on-screen canvas coordinates to
         * off-screen canvas coordinates.
         * 
         * @param mousePos: On-screen canvas coordinates.
         * 
         * @returns Off-screen canvas coordinates.
         */
        transformMousePosition(mousePos: MousePosition): MousePosition {
            mousePos = (mousePos === null) ? null : this.fromCanvasCoords(mousePos);
            if(mousePos === null) mousePos = null;
            else mousePos = this.rect().contains(mousePos)? mousePos: null;
            return mousePos;
        }

        /**
         * Transfer the graphics from the off-screen canvas to the on-screen
         * canvas, scaling it up.
         */
        draw() {
            this.destCtx.imageSmoothingEnabled = false;
            drawPixelScaledCanvas(this.srcCtx.canvas, this.destCtx);
        }
    }

}