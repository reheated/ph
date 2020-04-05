/// <reference path="layer.ts"/>

namespace PH {
    export class CanvasCursorLayer extends Layer {
        drawCtx: CanvasRenderingContext2D;
        cursorElt: HTMLElement;
        coordinateLayer: CoordinateLayer;
        img: CanvasImageSource;
        offset: [number, number];

        constructor(ctx: CanvasRenderingContext2D,
            cursorElt: HTMLElement,
            coordinateLayer: CoordinateLayer,
            img: CanvasImageSource,
            offset: [number, number]) {
            super();
            this.drawCtx = ctx;
            this.cursorElt = cursorElt;
            this.coordinateLayer = coordinateLayer;
            this.img = img;
            this.offset = offset;
        }

        handleLayerAdded() {
            this.update();
        }

        handleLayerRemoved() {
            this.cursorElt.style.cursor = "";
        }

        update() {
            // hide or show the default cursor
            var newStyle;
            if (this.coordinateLayer.mousePos === null) {
                newStyle = "";
            }
            else {
                newStyle = "none";
            }
            this.cursorElt.style.cursor = newStyle;
            return true;
        }

        draw() {
            let mp = this.coordinateLayer.mousePos;
            if (mp !== null) {
                let o = this.offset;
                let drawPos: [number, number] = [mp[0] + o[0], mp[1] + o[1]];
                this.drawCtx.drawImage(this.img, ...drawPos);
            }
        }
    }
}