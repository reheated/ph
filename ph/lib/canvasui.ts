namespace PH {
    export class CanvasUILayer extends Layer {
        canvasTransformer: CanvasTransformerLayer;
        buttons: CanvasButton[] = [];
        mouseOverButton: CanvasButton | null = null;

        constructor(canvasTransformer: CanvasTransformerLayer) {
            super();
            this.canvasTransformer = canvasTransformer;
        }

        public handleMouseMove() {
            // Process buttons
            let mousePos = this.canvasTransformer.mousePos;
            this.mouseOverButton = null;
            if (mousePos !== null) {
                for (let b of this.buttons) {
                    if (b.handleNewMouseCoords(...mousePos)) {
                        this.mouseOverButton = b;
                    }
                }
            }
            return true;
        }

        public handleMouseDown(button: number) {
            let passThrough = true;
            for (let b of this.buttons) {
                passThrough = b.handleMouseDown(button) && passThrough;
            }
            return passThrough;
        }

        public handleMouseUp(button: number) {
            let passThrough = true;
            for (let b of this.buttons) {
                passThrough = b.handleMouseUp(button) && passThrough;
            }
            return passThrough;
        }

        public addButton(b: CanvasButton) {
            this.buttons.push(b);
        }

        public draw() {
            for (let b of this.buttons) {
                b.draw();
            }
        }

    }
}