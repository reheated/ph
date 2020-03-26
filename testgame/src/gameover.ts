class GameOverScene extends PH.Scene {
    game: Game;

    constructor(game: Game) {
        super();
        this.game = game;
    }

    draw() {
        this.game.spriteBoxNormal!.draw(this.game.ctx, 60, 60, 200, 80);
        this.game.mainFont!.drawCenteredText(this.game.ctx, "The End", 160, 73);
        this.game.mainFont!.drawCenteredText(this.game.ctx, "A game by Michael Pauley", 160, 90);
        this.game.mainFont!.drawCenteredText(this.game.ctx, "Made for Ludum Dare 45", 160, 107);
        this.game.mainFont!.drawCenteredText(this.game.ctx, "Thanks for playing!", 160, 124);
    }
}