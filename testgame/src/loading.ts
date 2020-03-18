class LoadingScene extends PH.Scene {
    ctx: CanvasRenderingContext2D;
    resources: PH.Resources;

    constructor(ctx: CanvasRenderingContext2D, resources: PH.Resources) {
        super();
        this.ctx = ctx;
        this.resources = resources;
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
            loadingString = "Decoding audio\n(this could take a minute)";
        }

        this.ctx.fillStyle = "#154617";
        this.ctx.fillRect(0, 0, 320, 200);
        window.mainFont.drawText(this.ctx, loadingString, 1, 1);
    }
}