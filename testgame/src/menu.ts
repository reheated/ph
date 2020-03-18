class MenuScene extends PH.Scene {
    ctx: CanvasRenderingContext2D;
    resources: PH.Resources;

    constructor(ctx: CanvasRenderingContext2D, resources: PH.Resources) {
        super();
        this.ctx = ctx;
        this.resources = resources;
    }

    draw() {
        window.spriteBoxNormal.draw(this.ctx, 40, 60, 240, 80);
        this.ctx.drawImage(this.resources.data.title, 47, 70);
        window.mainFont.drawCenteredText(this.ctx, "Click to start", 160, 120);
    }

    handleClick(): boolean {
        window.startFarm();
        return false;
    }
}