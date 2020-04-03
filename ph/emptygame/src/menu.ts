class MenuLayer extends PH.Layer {
    game: Game;

    constructor(game: Game) {
        super();
        this.game = game;
    }

    draw() {
        this.game.mainFont.drawCenteredText(this.game.ctx, "Click to start", 160, 120);
    }

    handleClick(): boolean {
        this.game.endMenu();
        return false;
    }
}