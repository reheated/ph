/// <reference path="layer.ts"/>

namespace PH {

    /**
     * This class draws a mouse cursor using an image.
     *
     * To get the cursor to work, you need to call this object's "draw" function
     * every frame, and call "handleMouseMove" as part of your mousemove
     * handler. If you need to switch back to the operating system's normal
     * mouse cursor, call handleLayerRemoved.
     *
     * Alternatively, add this object to a LayerManager, which will make the
     * function calls automatically.
     */
    export class CanvasCursorLayer extends Layer {
        private drawCtx: CanvasRenderingContext2D;
        private cursorElt: HTMLElement;
        private img: CanvasImageSource;
        private hotSpot: [number, number];
        private mousePos: MousePosition = null;

        /**
         * Construct the cursor object.
         *
         * @param ctx - Context to draw the cursor on
         * @param cursorElt - The HTML element where we need to hide the
         * operating system's mouse cursor. Typically this will be the canvas
         * that you are displaying the game on. But it might not be the same
         * canvas as ctx.canvas; for example, if you are drawing your game on an
         * off-screen canvas and then scaling that up onto an on-screen canvas.
         * @param img - Image to use as the mouse cursor.
         * @param hotSpot - (x, y) coordinates of the mouse cursor's hot spot,
         * measured in pixels. [0, 0] is the top left.
         */
        constructor(ctx: CanvasRenderingContext2D,
            cursorElt: HTMLElement,
            img: CanvasImageSource,
            hotSpot: [number, number]) {
            super();
            this.drawCtx = ctx;
            this.cursorElt = cursorElt;
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

        handleMouseMove(mousePos: MousePosition) {
            this.mousePos = mousePos;
        }

        /**
         * Draw the mouse cursor.
         */
        draw() {
            // hide or show the default cursor
            var newStyle;
            if (this.mousePos === null) {
                newStyle = "";
            }
            else {
                newStyle = "none";
            }
            this.cursorElt.style.cursor = newStyle;

            let mp = this.mousePos;
            if (mp !== null) {
                let hs = this.hotSpot;
                let drawPos: [number, number] = [mp[0] - hs[0], mp[1] - hs[1]];
                this.drawCtx.drawImage(this.img, ...drawPos);
            }
        }
    }
}