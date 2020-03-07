namespace PH {

    export class CanvasUI {
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
            
            canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
        }

        getGameCoordsFromClientCoords(x: number, y: number) {
            var rect = this.canvas.getBoundingClientRect();
            var resX = Math.floor(x - rect.left);
            var resY = Math.floor(y - rect.top);
            if (resX < 0 || resX >= rect.width || resY < 0 || resY >= rect.height) {
                return null;
            }
            else {
                return [resX, resY];
            }
        }

        handleMouseMove(e: MouseEvent) {
            let x = e.clientX;
            let y = e.clientY;
            var rect = this.canvas.getBoundingClientRect();

            // Apply a transformation if the canvas is scaled up
            let w, h, drawScale, tlx, tly: number;
            if (this.srcCanvas !== null) {
                w = this.srcCanvas.width;
                h = this.srcCanvas.height;
                [drawScale, tlx, tly] = getCanvasScalingParameters(this.srcCanvas, this.canvas);
            }
            else
            {
                w = this.canvas.width;
                h = this.canvas.height;
                drawScale = 1;
                tlx = 0;
                tly = 0;
            }

            var resX = Math.floor((x - rect.left - tlx) / drawScale);
            var resY = Math.floor((y - rect.top - tly) / drawScale);
            if (resX < 0 || resX >= w || resY < 0 || resY >= h) {
                this.mouseX = null;
                this.mouseY = null;
            }
            else {
                this.mouseX = resX;
                this.mouseY = resY;
            }
        }

    }

}