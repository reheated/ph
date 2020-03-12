namespace PH {
    export class CanvasUILayer {
        canvas: HTMLCanvasElement;
        buttons: CanvasButton[] = [];
        mouseOverButton: CanvasButton | null = null;

        constructor(canvas: HTMLCanvasElement) {
            this.canvas = canvas;
        }

        public handleMouseMove(x: number, y: number) {
            // Process buttons
            this.mouseOverButton = null;
            for (let b of this.buttons) {
                if (b.handleNewMouseCoords(x, y)) {
                    this.mouseOverButton = b;
                }
            }
        }
        
        public handleMouseDown() {
            for (let b of this.buttons) {
                b.handleMouseDown();
            }
        }

        public handleMouseUp() {
            for(let b of this.buttons) {
                b.handleMouseUp();
            }
        }

        public addButton(b: CanvasButton) {
            this.buttons.push(b);
        }

        public drawButtons() {
            for(let b of this.buttons) {
                b.draw();
            }
        }

    }
}