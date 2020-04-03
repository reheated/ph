class MyLayer extends PH.Layer {

    game: Game;

    constructor(game: Game) {
        super();
        this.game = game;
    }

    draw() {
        this.game.mainFont.drawText(this.game.ctx, "Hello", 50, 50);
    }

}
