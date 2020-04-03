class LoadingScreen extends PH.Layer {
    ctx: CanvasRenderingContext2D;
    font: PH.CanvasFont;
    loadingString = "Loading";

    constructor(resources: PH.Loader, ctx: CanvasRenderingContext2D, font: PH.CanvasFont) {
        super();
        this.ctx = ctx;
        this.font = font;
    }

    draw() {
        let canvas = this.ctx.canvas
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.font.drawText(this.ctx, this.loadingString, 1, 1);
    }

    setProgress(bytes: number, totalBytes: number) {
        if (bytes === totalBytes) {
            this.loadingString = "Decoding audio (this could take a minute)";
        }
        else {
            let mbLoaded = bytes / 1e6;
            let mbToLoad = totalBytes / 1e6;
            this.loadingString = "Loading " + mbLoaded.toFixed(1) + "/" + mbToLoad.toFixed(1) + "MB";
        }

    }
}