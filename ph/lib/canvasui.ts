namespace PH {
    export class CanvasUILayer extends Layer {
        coordinateLayer: CoordinateLayer;
        buttons: CanvasButton[] = [];
        mouseOverButton: CanvasButton | null = null;

        constructor(coordinateLayer: CoordinateLayer) {
            super();
            this.coordinateLayer = coordinateLayer;
        }

        public handleMouseMove() {
            // Process buttons
            let mousePos = this.coordinateLayer.mousePos;
            this.mouseOverButton = null;
            for (let b of this.buttons) {
                b.handleNewMouseCoords(mousePos)
                if (b.mouseOver) {
                    this.mouseOverButton = b;
                }
            }
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