namespace PH {
    /**
     * This class facilitates drawing rectangles on a canvas, using specialised
     * spritesheets.
     */
    export class SpriteBox {
        private ctx: CanvasRenderingContext2D;
        private srcImg: CanvasImageSource;
        private tileSize: number;
        private multiple: number;

        private patternT: CanvasPattern;
        private patternL: CanvasPattern;
        private patternC: CanvasPattern;
        private patternR: CanvasPattern;
        private patternB: CanvasPattern;

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
         * @param ctx - The drawing context.
         * @param tileSize - Width and height of the grid tiles.
         * @param multiple - Since an image can contain the graphics for several
         * different spriteboxes, this parameter is needed to identify which
         * grid to use.
         */
        constructor(ctx: CanvasRenderingContext2D, srcImg: CanvasImageSource, tileSize: number, multiple: number) {
            // Initialise
            this.ctx = ctx;
            this.srcImg = srcImg;
            this.tileSize = tileSize;
            this.multiple = multiple;

            // Create some CanvasPattern objects, which will be used in the draw routine
            // to draw the repeating portions.
            let ts = tileSize;
            let off = multiple * ts * 3;
            this.patternT = ctx.createPattern(partialImage(srcImg, off + ts, 0, ts, ts), 'repeat')!;
            this.patternL = ctx.createPattern(partialImage(srcImg, off, ts, ts, ts), 'repeat')!;
            this.patternC = ctx.createPattern(partialImage(srcImg, off + ts, ts, ts, ts), 'repeat')!;
            this.patternR = ctx.createPattern(partialImage(srcImg, off + 2 * ts, ts, ts, ts), 'repeat')!;
            this.patternB = ctx.createPattern(partialImage(srcImg, off + ts, 2 * ts, ts, ts), 'repeat')!;
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
        draw(l: number, t: number, w: number, h: number): void;

        /**
         * Draw a sprite box. For best results, r.w and r.h should be a multiple
         * of this.tileSize.
         *
         * @param r - Coordinates of the rectangle to draw.
         */
        draw(r: Rect): void;


        draw(l: number | Rect, t?: number,
            w?: number, h?: number) {
            if (typeof l !== 'number') {
                return this.draw(l.l, l.t, l.w, l.h);
            }
            else if(typeof t !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
                throw new Error("Invalid parameters to SpriteBox.Draw.");
            }
            else {
                let ctx = this.ctx;
                let ts = this.tileSize;

                // Translate the context so that we can do all our drawing as if
                // the top-left of the drawing is (0, 0). That way, fillRect
                // accesses the correct regions of the CanvasPattern objects.

                ctx.translate(l, t);

                // top edge
                ctx.fillStyle = this.patternT;
                ctx.fillRect(ts, 0, w - 2 * ts, ts);

                // left edge
                ctx.fillStyle = this.patternL;
                ctx.fillRect(0, ts, ts, h - 2 * ts);

                // center
                ctx.fillStyle = this.patternC;
                ctx.fillRect(ts, ts, w - 2 * ts, h - 2 * ts);

                // right edge
                ctx.fillStyle = this.patternR;
                ctx.fillRect(w - ts, ts, ts, h - 2 * ts);

                // bottom edge
                ctx.fillStyle = this.patternB;
                ctx.fillRect(ts, h - ts, w - 2 * ts, ts);

                // corners
                let si = this.srcImg;
                let off = this.multiple * ts * 3;
                ctx.drawImage(si, off, 0, ts, ts, 0, 0, ts, ts);
                ctx.drawImage(si, off + ts * 2, 0, ts, ts, w - ts, 0, ts, ts);
                ctx.drawImage(si, off, ts * 2, ts, ts, 0, h - ts, ts, ts);
                ctx.drawImage(si, off + ts * 2, ts * 2, ts, ts, w - ts, h - ts, ts, ts);
                
                ctx.translate(-l, -t);
            }
        }

    }
}