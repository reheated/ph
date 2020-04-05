namespace PH {

    /**
     * An object that takes care of converting between on-screen (client) and
     * off-screen (game) coordinates.
     *
     * For example, in a 320x200 pixel game, you might want to use a coordinate
     * system where the x range is 0-319 and the y-range is 0-199. But your
     * graphics will typically be scaled up, and you'll need to be able to
     * convert between the scaled and non-scaled coordinates. Derivatives of
     * this class take care of the calculations.
     */
    export abstract class CoordinateLayer extends Layer {
        /**
         * Mouse coordinates, in measured in off-screen coordinates.
         */
        mousePos: [number, number] | null = null;

        /**
         * Convert on-screen (client) coordinates to off-screen (game) coordinates.
         * 
         * @param clientCoords - On-screen coordinates.
         * 
         * @returns Off-screen coordinates.
         */
        abstract fromClientCoords(clientCoords: [number, number]): [number, number];

        /**
         * Call this function when there are new mouse coordinates, so that the
         * object can keep track of the off-screen coordinates.
         *
         * Alternatively, add this object to a LayerManager, and it will take
         * care of the function call for you.
         */
        handleMouseMoveClientCoords(clientCoords: [number, number] | null) {
            this.mousePos = (clientCoords === null) ? null : this.fromClientCoords(clientCoords);
        }

    }

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
     * off-screen canvas. Also, call handleMouseMoveClientCoords when there are
     * new mouse coordinates.
     *
     * Alternatively, add this class to a LayerManager (position it after all
     * your off-screen drawing), and it will take care of the calls for you.
     */
    export class PixelationLayer extends CoordinateLayer {
        /**
         * 2D context for off-screen drawing.
         */
        srcCtx: CanvasRenderingContext2D;

        /**
         * 2D context of an on-screen canvas. The PixelationLayer will scale up
         * the graphics and draw it here.
         */
        destCtx: CanvasRenderingContext2D;

        mousePos: [number, number] | null = null;

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

        /**
         * Transfer the graphics from the off-screen canvas to the on-screen
         * canvas, scaling it up.
         */
        draw() {
            this.destCtx.imageSmoothingEnabled = false;
            drawPixelScaledCanvas(this.srcCtx.canvas, this.destCtx);
        }
    }

    /**
     * Class that provides a simple coordinate system, where [0, 0] represents
     * the center of the canvas, and the box [-1, 1] x [-1, 1] is guaranteed to
     * be contained in the visible region, and a 1:1 aspect ratio is maintained.
     *
     * Call this object's update function every frame. Also call
     * handleMouseMoveClientCoords whenever there are new mouse coordinates.
     *
     * Alternatively, add this object to a LayerManager and it will take care of
     * the calls for you.
     */
    export class CentralCoordinateLayer extends CoordinateLayer {
        /**
         * 2D context of the canvas.
         */
        ctx: CanvasRenderingContext2D;
        mousePos: [number, number] | null = null;

        /**
         * Width of the canvas, in off-screen coordinates.
         */
        w: number;

        /**
         * Height of the canvas, in off-screen coordinates.
         */
        h: number;

        /**
         * Scaling factor.
         */
        scale: number;

        /**
         * Construct the central coordinate layer.
         * 
         * @param ctx 2D context of the canvas.
         */
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
            return [w/scale, h/scale, scale];
        }

        fromClientCoords(clientCoords: [number, number]): [number, number] {
            let x = clientCoords[0] / this.scale - this.w / 2;
            let y = clientCoords[1] / this.scale - this.h / 2;
            return [x, y];
        }

        /**
         * Convert off-screen (game) coordinates to on-screen (client) coordinates.
         * 
         * @param gameCoords - Off-screen coordinates.
         * 
         * @returns On-screen coordinates.
         */
        toClientCoords(gameCoords: [number, number]): [number, number] {
            let x = (gameCoords[0] + this.w / 2) * this.scale;
            let y = (gameCoords[1] + this.h / 2) * this.scale;
            return [x, y];
        }
    }

}