namespace PH {

    /**
     * An axis-aligned rectangle.
     */
    export class Rect {
        /**
         * x-coordinate of the left edge.
         */
        l: number;

        /**
         * y-coordinate of the top edge.
         */
        t: number;

        /**
         * Width.
         */
        w: number;

        /**
         * Height.
         */
        h: number;

        /**
         * Construct a rectangle.
         * 
         * @param l - left
         * @param t - top
         * @param w - width
         * @param h - height
         */
        constructor(l: number, t: number, w: number, h: number) {
            this.l = l;
            this.t = t;
            this.w = w;
            this.h = h;
        }

        /**
         * Returns true if the rectangle contains a given point.
         * 
         * @param pos - The point to test.
         * 
         * @returns true if `pos` is inside `this`; false otherwise.
         */
        contains(pos: [number, number]): boolean {
            let [x, y] = pos;
            let result = (x >= this.l && x < this.l + this.w &&
                y >= this.t && y < this.t + this.h);
            return result;
        }

    }

    /**
     * An axis-aligned rectangle in a canvas.
     *
     * When you have new mouse coordinates, call handleNewMouseCoords(...) and
     * this object will keep track of whether the mouse is over it. This class
     * really exists so that CanvasButton can extend it.
     */
    class CanvasRect extends Rect {
        /**
         * True if the mouse is over this object.
         */
        mouseOver: boolean = false;

        /**
         * Call this function when you have new mouse coordinates, and the
         * object will keep track of whether the mouse is over it. This is taken
         * care of by the CanvasUILayer class.
         * 
         * @param mousePos - Mouse position.
         */
        handleNewMouseCoords(mousePos: MousePosition) {
            this.mouseOver = mousePos !== null && this.contains(mousePos);
        }
    }

    /**
     * A clickable button in a canvas.
     */
    export class CanvasButton extends CanvasRect {
        private ctx: CanvasRenderingContext2D;

        /**
         * The number of the currently pressed mouse button (according to
         * MouseEvent.button), or null if no button is pressed. If several
         * buttons are pressed, this only keeps track of the first.
         */
        pressedMouseButton: number | null = null;

        /**
         * Function to call if this button is clicked. The function will be
         * passed (b, mouseButton), where b is this button, and mouseButton is
         * the number of the mouse button that this button was clicked with.
         */
        clickCallback: ((b: CanvasButton, mouseButton: number) => void) | null;

        /**
         * Text to display on the button.
         */
        text: string;

        private drawer: CanvasButtonDrawer;
        private handleButtons: number[];

        /**
         * An arbitrary object that is associated with this button. If you
         * create a whole bunch of buttons with the same clickCallback function,
         * you can use this tag to tell the buttons apart.
         */
        tag: any;

        /**
         * Create a clickable button in a canvas.
         *
         * @param l - x-coordinate of the left edge.
         * @param t - y-coordinate of the top edge.
         * @param w - Width.
         * @param h - Height.
         * @param clickCallback - Function to call if this button is clicked.
         * The function will be passed (b, mouseButton), where b is this button,
         * and mouseButton is the number of the mouse button that this button
         * was clicked with.
         * @param text - Text to display on the button.
         * @param drawer - A CanvasButtonDrawer object, which determines how to
         * draw this button.
         * @param handleButtons - An array of numbers, determining which mouse buttons
         * this button can be clicked by. For example, if this parameter is [0,
         * 2], then the button will handle clicks by the left and the right
         * mouse button, but not by the middle mouse button. The default is [0].
         * @param tag - An arbitrary object that is associated with this button. If
         * you create a whole bunch of buttons with the same clickCallback
         * function, you can use this tag to tell the buttons apart.
         */
        constructor(ctx: CanvasRenderingContext2D,
            l: number, t: number, w: number, h: number,
            clickCallback: (b: CanvasButton, mouseButton: number) => void | null,
            text: string,
            drawer: CanvasButtonDrawer,
            handleButtons?: number[],
            tag?: any) {
            super(l, t, w, h);
            this.ctx = ctx;
            this.clickCallback = clickCallback;
            this.text = text;
            this.drawer = drawer;
            if (handleButtons) {
                this.handleButtons = handleButtons;
            }
            else {
                this.handleButtons = [0];
            }
            this.tag = tag;
        }

        private doHandleButton(button: number): boolean {
            // Helper function - should we handle this button?
            return this.handleButtons.indexOf(button) >= 0;
        }

        /**
         * Call this function when the button should handle a mouse down event.
         * This is taken care of by the CanvasUILayer class.
         *
         * @param mouseButton - The number of the mouse button pressed,
         * according to MouseEvent.button.
         */
        handleMouseDown(mouseButton: number): boolean {
            let ok = this.doHandleButton(mouseButton) && this.pressedMouseButton === null;
            if (ok && this.mouseOver) this.pressedMouseButton = mouseButton;
            return !this.mouseOver;
        }

        /**
         * Call this function when the button should handle a mouse up event.
         * This is taken care of by the CanvasUILayer class.
         *
         * @param mouseButton - The number of the mouse button released,
         * according to MouseEvent.button.
         */
        handleMouseUp(mouseButton: number) {
            if (this.doHandleButton(mouseButton)) {
                let doCallback = this.pressedMouseButton !== null && this.mouseOver;
                this.pressedMouseButton = null;
                if (doCallback) {
                    if (this.clickCallback !== null) {
                        this.clickCallback(this, mouseButton);
                    }
                    return false;
                }
            }
            return true;
        }

        /**
         * Draw the button.
         */
        draw() {
            this.drawer.draw(this.ctx, this);
        }
    }

    /**
     * Extend this class if you want to make a new method for drawing buttons.
     */
    export abstract class CanvasButtonDrawer {

        /**
         * Draw a button. Calling this function is taken care of by the
         * CanvasUILayer, via the button's draw function.
         *
         * @param ctx - Context to draw to.
         * @param b - Button to draw.
         */
        abstract draw(ctx: CanvasRenderingContext2D, b: CanvasButton): void;
    }

    /**
     * A button drawer that uses sprite boxes. A sprite box represents an image
     * that is broken up into 9 (=3x3) pieces that can be repeated to draw a
     * rectangle. Construct this class with two SpriteBox objects - one for the
     * unpressed look and one for the pressed look - and a font for displaying
     * the text. Then pass it in as a parameter to the CanvasButton constructor.
     */
    export class CanvasButtonSpriteDrawer extends CanvasButtonDrawer {
        sbUnpressed: SpriteBox;
        sbPressed: SpriteBox;
        font: CanvasFont;

        /**
         * Create a canvas button drawer that uses sprite boxes.
         * 
         * @param sbUnpressed - The sprite box for the unpressed look.
         * @param sbPressed - The sprite box for the pressed look.
         * @param font - Font to draw the text with.
         */
        constructor(sbUnpressed: SpriteBox, sbPressed: SpriteBox, font: CanvasFont) {
            super();
            this.sbUnpressed = sbUnpressed;
            this.sbPressed = sbPressed;
            this.font = font;
        }

        draw(ctx: CanvasRenderingContext2D, b: CanvasButton) {
            let sb = (b.pressedMouseButton !== null && b.mouseOver) ? this.sbPressed : this.sbUnpressed;
            sb.draw(ctx, b.l, b.t, b.w, b.h);
            this.font.drawText(ctx, b.text, b.l + 4, b.t + 4);
        }
    }
}