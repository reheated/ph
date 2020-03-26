namespace PH {
    export class CanvasUI {
        canvas: HTMLCanvasElement;
        buttons: CanvasButton[] = [];
        mouseOverButton: CanvasButton | null = null;

        constructor(canvas: HTMLCanvasElement) {
            this.canvas = canvas;
        }

        public handleMouseMove(mousePos: [number, number] | null) {
            // Process buttons
            this.mouseOverButton = null;
            if (mousePos !== null) {
                for (let b of this.buttons) {
                    if (b.handleNewMouseCoords(...mousePos)) {
                        this.mouseOverButton = b;
                    }
                }
            }
        }

        public handleMouseDown() {
            for (let b of this.buttons) {
                b.handleMouseDown();
            }
        }

        public handleMouseUp() {
            for (let b of this.buttons) {
                b.handleMouseUp();
            }
        }

        public addButton(b: CanvasButton) {
            this.buttons.push(b);
        }

        public drawButtons() {
            for (let b of this.buttons) {
                b.draw();
            }
        }

    }
}