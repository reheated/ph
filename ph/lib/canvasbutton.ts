namespace PH {

    export class Rect {
        l: number;
        t: number;
        w: number;
        h: number;

        constructor(l: number, t: number, w: number, h: number) {
            this.l = l;
            this.t = t;
            this.w = w;
            this.h = h;
        }

        contains(pos: [number, number]) {
            let [x, y] = pos;
            let result = (x >= this.l && x < this.l + this.w &&
                y >= this.t && y < this.t + this.h);
            return result;
        }

    }

    abstract class CanvasRect extends Rect {
        mouseOver: boolean = false;

        handleNewMouseCoords(mousePos: [number, number] | null) {
            this.mouseOver = mousePos !== null && this.contains(mousePos);
        }
    }

    export class CanvasButton extends CanvasRect {
        ctx: CanvasRenderingContext2D;
        pressedMouseButton: number | null = null;
        clickCallback: (b: CanvasButton, mouseButton: number) => void | null;
        text: string;
        drawer: CanvasButtonDrawer;
        handleButtons: number[]
        tag: any;

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
            return this.handleButtons.indexOf(button) >= 0;
        }

        handleMouseDown(button: number): boolean {
            let ok = this.doHandleButton(button) && this.pressedMouseButton === null;
            if (ok && this.mouseOver) this.pressedMouseButton = button;
            return !this.mouseOver;
        }

        handleMouseUp(button: number) {
            if (this.doHandleButton(button)) {
                let doCallback = this.pressedMouseButton !== null && this.mouseOver;
                this.pressedMouseButton = null;
                if (doCallback) {
                    this.clickCallback(this, button);
                }
            }
            // It seems best to always let a mouse up event pass through the buttons,
            // so that other parts of the game can detect it.
            return true;
        }

        draw() {
            this.drawer.draw(this.ctx, this);
        }
    }

    export abstract class CanvasButtonDrawer {
        abstract draw(ctx: CanvasRenderingContext2D, b: CanvasButton): void;
    }

    export class CanvasButtonSpriteDrawer extends CanvasButtonDrawer {
        sbUnpressed: SpriteBox;
        sbPressed: SpriteBox;
        font: CanvasFont;

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