namespace PH {

    /**
     * Object consisting of a collection of clickable buttons. Call addButton to
     * add a new button. Call this object's handleMouseMove, handleMouseDown and
     * handleMouseUp functions when the events arise, and it will take care of
     * the mouse button logic. Call draw every frame.
     *
     * Alternatively, add this object to a LayerManager and it can take care of
     * the function calls for you.
     */
    export class CanvasUILayer extends Layer {
        private mpp: MousePositionProvider;

        /**
         * List of buttons.
         */
        buttons: CanvasButton[] = [];

        /**
         * The button that the mouse is currently over, or null if the mouse is
         * not over any button.
         */
        mouseOverButton: CanvasButton | null = null;

        /**
         * Construct a canvas UI layer.
         *
         * @param mpp - a MousePositionProvider that will be used to determine
         * the mouse coordinates.
         */
        constructor(mpp: MousePositionProvider) {
            super();
            this.mpp = mpp;
        }

        /**
         * Handle button logic for mouse move events.
         */
        handleMouseMove() {
            // Process buttons
            let mousePos = this.mpp.mousePos;
            this.mouseOverButton = null;
            for (let b of this.buttons) {
                b.handleNewMouseCoords(mousePos)
                if (b.mouseOver) {
                    this.mouseOverButton = b;
                }
            }
        }

        /**
         * Handle button logic for mouse down events.
         *
         * @param mouseButton - Number of the mouse button pressed, according to
         * MouseEvent.button.
         */
        handleMouseDown(mouseButton: number) {
            let passThrough = true;
            for (let b of this.buttons) {
                passThrough = b.handleMouseDown(mouseButton) && passThrough;
            }
            return passThrough;
        }

        /**
         * Handle button logic for mouse up events.
         *
         * @param mouseButton - Number of the mouse button released, according
         * to MouseEvent.button.
         */
        handleMouseUp(mouseButton: number) {
            let passThrough = true;
            for (let b of this.buttons) {
                passThrough = b.handleMouseUp(mouseButton) && passThrough;
            }
            return passThrough;
        }

        /**
         * Add a button to the UI.
         */
        addButton(b: CanvasButton) {
            this.buttons.push(b);
        }

        /**
         * Draw the UI.
         */
        draw() {
            for (let b of this.buttons) {
                b.draw();
            }
        }

    }
}