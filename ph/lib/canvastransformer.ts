namespace PH {

    export class CanvasTransformer {
        canvas: HTMLCanvasElement;
        srcCanvas: HTMLCanvasElement | null;

        mouseX: number | null = null;
        mouseY: number | null = null;

        constructor(canvas: HTMLCanvasElement, srcCanvas: HTMLCanvasElement | null = null) {
            // "canvas" should be the canvas that is being displayed in the HTML
            // document. If there is another canvas being drawn offscreen and then
            // scaled up using drawScaledCanvas, you can pass it in as the second
            // parameter, and this class will transform mouse coordinates back to
            // that canvas.

            this.canvas = canvas;
            this.srcCanvas = srcCanvas;
        }

        public getGameCoordsFromClientCoords(x: number, y: number) {
            var rect = this.canvas.getBoundingClientRect();
            // Convert into canvas coordinates.
            // Apply a transformation if the canvas is scaled up
            let w, h, drawScale, tlx, tly: number;
            if (this.srcCanvas !== null) {
                w = this.srcCanvas.width;
                h = this.srcCanvas.height;
                [drawScale, tlx, tly] = getCanvasScalingParameters(this.srcCanvas, this.canvas);
            }
            else {
                w = this.canvas.width;
                h = this.canvas.height;
                drawScale = 1;
                tlx = 0;
                tly = 0;
            }

            var resX = Math.floor((x - rect.left - tlx) / drawScale);
            var resY = Math.floor((y - rect.top - tly) / drawScale);
            if (resX < 0 || resX >= w || resY < 0 || resY >= h) {
                return [null, null];
            }
            else {
                return [resX, resY];
            }
        }

        public handleMouseMove(clientX: number, clientY: number) {
            [this.mouseX, this.mouseY] = this.getGameCoordsFromClientCoords(
                clientX, clientY);
        }

    }

}