class GameOverScene extends PH.Scene {
    ctx: CanvasRenderingContext2D;
    resources: PH.Resources;

    constructor(ctx: CanvasRenderingContext2D, resources: PH.Resources) {
        super();
        this.ctx = ctx;
        this.resources = resources;
    }

    draw() {
        window.spriteBoxNormal.draw(this.ctx, 60, 60, 200, 80);
        window.mainFont.drawCenteredText(this.ctx, "The End", 160, 73);
        window.mainFont.drawCenteredText(this.ctx, "A Game by Michael Pauley", 160, 90);
        window.mainFont.drawCenteredText(this.ctx, "Made for Ludum Dare 45", 160, 107);
        window.mainFont.drawCenteredText(this.ctx, "Thanks for playing!", 160, 124);
    }
}