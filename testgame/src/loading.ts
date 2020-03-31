class LoadingScreen extends PH.Layer {
    ctx: CanvasRenderingContext2D;
    font: PH.Font;
    loadingString = "Loading";

    constructor(resources: PH.Loader, ctx: CanvasRenderingContext2D, font: PH.Font) {
        super();
        this.ctx = ctx;
        this.font = font;
    }

    draw() {
        this.ctx.fillStyle = "#154617";
        this.ctx.fillRect(0, 0, 320, 200);
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