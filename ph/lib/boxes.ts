namespace PH {
    export class BoxDrawer {
    srcImg: HTMLImageElement;
    tileSize: number;

    constructor(srcImg: HTMLImageElement, tileSize: number) {
        this.srcImg = srcImg;
        this.tileSize = tileSize;
    }

    public drawBox(ctx: CanvasRenderingContext2D, id: number,
        l: number, t: number, w: number, h: number) {
        var htiles = Math.floor(h / this.tileSize);
        var wtiles = Math.floor(w / this.tileSize);
        for (var i = 0; i < htiles; i++) {
            var getI = (i == 0) ? 0 : ((i == htiles - 1) ? 2 : 1);
            for (var j = 0; j < wtiles; j++) {
                var getJ = (j == 0) ? 0 : ((j == wtiles - 1) ? 2 : 1);

                var gety = getI * this.tileSize;
                var getx = (getJ + 3 * id) * this.tileSize;

                var putx = l + j * this.tileSize;
                var puty = t + i * this.tileSize;
                ctx.drawImage(this.srcImg, getx, gety,
                    this.tileSize, this.tileSize, putx, puty, this.tileSize, this.tileSize);
            }
        }
    }

}
}