namespace PH {
    export class SpriteBox {
        srcImg: CanvasImageSource;
        tileSize: number;
        multiple: number;

        constructor(srcImg: CanvasImageSource, tileSize: number, multiple: number) {
            this.srcImg = srcImg;
            this.tileSize = tileSize;
            this.multiple = multiple;
        }

        draw(ctx: CanvasRenderingContext2D,
            l: number, t: number, w: number, h: number): void;
        draw(ctx: CanvasRenderingContext2D,
            r: Rect): void;
        draw(ctx: CanvasRenderingContext2D,
            l: number | Rect, t?: number,
            w?: number, h?: number) {
            if (typeof l !== 'number') {
                return this.draw(ctx, l.l, l.t, l.w, l.h);
            }
            else if(typeof t !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
                throw new Error("Invalid parameters to SpriteBox.Draw.");
            }
            else {
                var htiles = Math.floor(h / this.tileSize);
                var wtiles = Math.floor(w / this.tileSize);
                for (var i = 0; i < htiles; i++) {
                    var getI = (i === 0) ? 0 : ((i === htiles - 1) ? 2 : 1);
                    for (var j = 0; j < wtiles; j++) {
                        var getJ = (j === 0) ? 0 : ((j === wtiles - 1) ? 2 : 1);

                        var gety = getI * this.tileSize;
                        var getx = (getJ + 3 * this.multiple) * this.tileSize;

                        var putx = l + j * this.tileSize;
                        var puty = t + i * this.tileSize;
                        ctx.drawImage(this.srcImg, getx, gety,
                            this.tileSize, this.tileSize, putx, puty, this.tileSize, this.tileSize);
                    }
                }
            }
        }

    }
}