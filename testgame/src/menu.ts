class MenuLayer extends PH.Layer {
    game: Game;

    constructor(game: Game) {
        super();
        this.game = game;
    }

    draw() {
        this.game.spriteBoxNormal!.draw(this.game.ctx, 40, 60, 240, 80);
        this.game.ctx.drawImage(this.game.resources.data.title, 47, 70);
        this.game.mainFont!.drawCenteredText(this.game.ctx, "Click to start", 160, 120);
    }

    handleClick(): boolean {
        this.game.startFarm(true);
        return false;
    }
}