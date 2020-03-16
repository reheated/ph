namespace PH {
    abstract class CanvasRect {
        public l: number;
        public t: number;
        public w: number;
        public h: number;
        public mouseOver: boolean = false;

        constructor(l: number, t: number, w: number, h: number) {
            this.l = l;
            this.t = t;
            this.w = w;
            this.h = h;
        }

        public handleNewMouseCoords(x: number | null, y: number | null): boolean {
            let mo: boolean;
            if (x == null || y == null) {
                mo = false;
            }
            else {
                mo = (x >= this.l && x < this.l + this.w &&
                    y >= this.t && y < this.t + this.h);
            }
            this.mouseOver = mo;
            return this.mouseOver;
        }
    }

    export class CanvasButton extends CanvasRect {
        ctx: CanvasRenderingContext2D;
        public pressed: boolean = false;
        clickCallback: () => void | null;
        public text: string;
        drawer: CanvasButtonDrawer;

        constructor(ctx: CanvasRenderingContext2D,
            l: number, t: number, w: number, h: number,
            clickCallback: () => void | null,
            text: string,
            drawer: CanvasButtonDrawer) {
            super(l, t, w, h);
            this.ctx = ctx;
            this.clickCallback = clickCallback;
            this.text = text;
            this.drawer = drawer;
        }

        public handleMouseDown() {
            if (this.mouseOver) this.pressed = true;
        }

        public handleMouseUp() {
            let doCallback = this.pressed && this.mouseOver;
            this.pressed = false;
            if(doCallback) {
                this.clickCallback();
            }
        }

        public draw() {
            this.drawer.draw(this.ctx, this);
        }
    }

    export abstract class CanvasButtonDrawer {
        public abstract draw(ctx: CanvasRenderingContext2D, b: CanvasButton): void;
    }

    export class CanvasButtonSpriteDrawer extends CanvasButtonDrawer {
        sbUnpressed: SpriteBox;
        sbPressed: SpriteBox;
        font: Font;

        constructor(sbUnpressed: SpriteBox, sbPressed: SpriteBox, font: Font) {
            super();
            this.sbUnpressed = sbUnpressed;
            this.sbPressed = sbPressed;
            this.font = font;
        }

        draw(ctx: CanvasRenderingContext2D, b: CanvasButton) {
            let sb = (b.pressed && b.mouseOver)? this.sbPressed : this.sbUnpressed;
            sb.draw(ctx, b.l, b.t, b.w, b.h);
            this.font.drawText(ctx, b.text, b.l + 4, b.t + 4);
        }
    }
}