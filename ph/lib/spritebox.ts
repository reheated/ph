namespace PH {
    /**
     * This class facilitates drawing rectangles on a canvas, using specialised
     * spritesheets.
     */
    export class SpriteBox {
        private srcImg: CanvasImageSource;
        private tileSize: number;
        private multiple: number;

        /**
         * Construct the SpriteBox.
         *
         * @param srcImage An image containing the graphics for one or more
         * spritebox grids. The image should have the following dimensions:
         *
         *      (3 * tileSize * N) * (3 * tileSize),
         *
         * where N is the number of grids in the image. Each grid should have
         * the following dimensions:
         *
         *      (3 * tileSize) * (3 * tileSize).
         *
         * It is a 3 x 3 grid, and each tile in the grid has width and height
         * equal to tileSize. The four corner tiles will be used to draw the
         * corners of rectangles. The four mid-edge tiles will be repeated to
         * draw the edges of rectangles. And the center tile will be repeated to
         * draw the interior of rectangles.
         * @param tileSize - Width and height of the grid tiles.
         * @param multiple - Since an image can contain the graphics for several
         * different spriteboxes, this parameter is needed to identify which
         * grid to use.
         */
        constructor(srcImg: CanvasImageSource, tileSize: number, multiple: number) {
            this.srcImg = srcImg;
            this.tileSize = tileSize;
            this.multiple = multiple;
        }

        /**
         * Draw a sprite box. For best results, w and h should be a multiple of
         * this.tileSize.
         *
         * @param l - x-coordinate of the left edge.
         * @param t - y-coordinate of the top edge.
         * @param w - Width.
         * @param h - Height.
         */
        draw(ctx: CanvasRenderingContext2D,
            l: number, t: number, w: number, h: number): void;

        /**
         * Draw a sprite box. For best results, r.w and r.h should be a multiple
         * of this.tileSize.
         *
         * @param r - Coordinates of the rectangle to draw.
         */
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