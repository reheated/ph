class LoadingScene extends PH.Scene {
    resources: PH.Resources;
    ctx: CanvasRenderingContext2D;
    font: PH.Font;

    constructor(resources: PH.Resources, ctx: CanvasRenderingContext2D, font: PH.Font) {
        super();
        this.resources = resources;
        this.ctx = ctx;
        this.font = font;
    }

    draw() {
        let mbToLoad = (this.resources.totalToLoad / 1e6);
        let mbLoaded = (this.resources.totalLoaded / 1e6).toFixed(1);

        let loadingString = "Loading";
        if (this.resources.errorDecoding) {
            loadingString = "There was an error decoding the audio";
        }
        else if (mbToLoad > 0) {
            loadingString += " " + mbLoaded + "/" + mbToLoad.toFixed(1) + "MB";
        }
        if (this.resources.numDownloaded === this.resources.numRequests) {
            loadingString = "Decoding audio (this could take a minute)";
        }

        this.ctx.fillStyle = "#154617";
        this.ctx.fillRect(0, 0, 320, 200);
        this.font.drawText(this.ctx, loadingString, 1, 1);
    }
}