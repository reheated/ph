/// <reference path="layer.ts"/>

namespace PH {
    export class CanvasCursorLayer extends Layer {
        drawCtx: CanvasRenderingContext2D;
        cursorElt: HTMLElement;
        transformer: CanvasTransformer;
        img: HTMLImageElement;
        offset: [number, number];

        constructor(ctx: CanvasRenderingContext2D,
            cursorElt: HTMLElement,
            transformer: CanvasTransformer,
            img: HTMLImageElement,
            offset: [number, number]) {
            super();
            this.drawCtx = ctx;
            this.cursorElt = cursorElt;
            this.transformer = transformer;
            this.img = img;
            this.offset = offset;
        }

        add() {
            this.update();
        }

        remove() {
            this.cursorElt.style.cursor = "";
        }

        update() {
            // hide or show the default cursor
            var newStyle;
            if (this.transformer.mousePos === null) {
                newStyle = "";
            }
            else {
                newStyle = "none";
            }
            this.cursorElt.style.cursor = newStyle;
            return true;
        }

        draw() {
            let mp = this.transformer.mousePos;
            if (mp !== null) {
                let o = this.offset;
                let drawPos: [number, number] = [mp[0] + o[0], mp[1] + o[1]];
                this.drawCtx.drawImage(this.img, ...drawPos);
            }
        }
    }
}