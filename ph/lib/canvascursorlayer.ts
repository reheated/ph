/// <reference path="layer.ts"/>

namespace PH {

    /**
     * This class draws a mouse cursor using an image.
     *
     * Call this object's "draw" function every frame to get the cursor. If you
     * need to switch back to the operating system's normal mouse cursor, call
     * handleLayerRemoved.
     *
     * Alternatively, add this object to a LayerManager, which will make the
     * function calls automatically.
     */
    export class CanvasCursorLayer extends Layer {
        private drawCtx: CanvasRenderingContext2D;
        private cursorElt: HTMLElement;
        private mpp: MousePositionProvider;
        private img: CanvasImageSource;
        private hotSpot: [number, number];

        /**
         * Construct the cursor object.
         *
         * @param ctx - Context to draw the cursor on
         * @param cursorElt - The HTML element where we need to hide the
         * operating system's mouse cursor. Typically this will be the canvas
         * that you are displaying the game on. But it might not be the same
         * canvas as ctx.canvas; for example, if you are drawing your game on an
         * off-screen canvas and then scaling that up onto an on-screen canvas.
         * @param mousePositionProvider - a MousePositionProvider that will be used to
         * determine the mouse coordinates.
         * @param img - Image to use as the mouse cursor.
         * @param hotSpot - (x, y) coordinates of the mouse cursor's hot spot,
         * measured in pixels. [0, 0] is the top left.
         */
        constructor(ctx: CanvasRenderingContext2D,
            cursorElt: HTMLElement,
            mousePositionProvider: MousePositionProvider,
            img: CanvasImageSource,
            hotSpot: [number, number]) {
            super();
            this.drawCtx = ctx;
            this.cursorElt = cursorElt;
            this.mpp = mousePositionProvider;
            this.img = img;
            this.hotSpot = hotSpot;
        }

        /**
         * Remove this cursor drawer, ensuring that the operating system's
         * original mouse cursor is replaced.
         */
        handleLayerRemoved() {
            this.cursorElt.style.cursor = "";
        }

        /**
         * Draw the mouse cursor.
         */
        draw() {
            // hide or show the default cursor
            var newStyle;
            if (this.mpp.mousePos === null) {
                newStyle = "";
            }
            else {
                newStyle = "none";
            }
            this.cursorElt.style.cursor = newStyle;

            let mp = this.mpp.mousePos;
            if (mp !== null) {
                let hs = this.hotSpot;
                let drawPos: [number, number] = [mp[0] - hs[0], mp[1] - hs[1]];
                this.drawCtx.drawImage(this.img, ...drawPos);
            }
        }
    }
}