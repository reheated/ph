class Game {

    //////////////
    // BASIC STUFF
    //////////////

    GAME_WIDTH = 320;
    GAME_HEIGHT = 200;

    public resources: PH.Resources;
    public canvasTransformer: PH.CanvasTransformer;
    public mainFont: PH.Font;
    public buttonDrawer: PH.CanvasButtonSpriteDrawer;
    public spriteBoxNormal: PH.SpriteBox;
    public spriteBoxButton: PH.SpriteBox;
    public spriteBoxPressed: PH.SpriteBox;
    public spriteBoxPlot: PH.SpriteBox;
    public spriteBoxConvo: PH.SpriteBox;

    outCtx: CanvasRenderingContext2D;
    ctx: CanvasRenderingContext2D;

    sceneList = new PH.SceneList();
    farmScene: FarmScene;
    menuScene: MenuScene;
    public convoScene: ConvoScene;
    gameOverScene: GameOverScene;
    cursorScene: PH.CanvasCursorScene;
    minigamePlayedTimes = 0;
    fc: PH.FrameCounter;

    constructor(resources: PH.Resources, outCtx: CanvasRenderingContext2D, ctx: CanvasRenderingContext2D,
        mainFont: PH.Font) {
        this.resources = resources;
        this.outCtx = outCtx;
        this.ctx = ctx;
        this.mainFont = mainFont;

        this.canvasTransformer = new PH.CanvasTransformer(this.outCtx.canvas, this.ctx.canvas);

        // Initialize subsystems.
        this.fc = new PH.FrameCounter(false, 5.0);

        this.spriteBoxNormal = new PH.SpriteBox(this.resources.data.boxes, 4, 0);
        this.spriteBoxButton = new PH.SpriteBox(this.resources.data.boxes, 4, 1);
        this.spriteBoxPressed = new PH.SpriteBox(this.resources.data.boxes, 4, 2);
        this.spriteBoxPlot = new PH.SpriteBox(this.resources.data.boxes, 4, 3);
        this.spriteBoxConvo = new PH.SpriteBox(this.resources.data.boxes, 4, 4);

        this.buttonDrawer = new PH.CanvasButtonSpriteDrawer(
            this.spriteBoxButton, this.spriteBoxPressed, this.mainFont);

        this.sceneList.setupMouseListeners(this.outCtx.canvas, (x, y) => this.canvasTransformer.handleMouseMove(x, y));
        this.sceneList.setupKeyboardListeners(window);
            
        this.convoScene = new ConvoScene(this);
        this.menuScene = new MenuScene(this);
        this.farmScene = new FarmScene(this);
        this.gameOverScene = new GameOverScene(this);
        this.cursorScene = new PH.CanvasCursorScene(this.ctx, this.outCtx.canvas,
            this.canvasTransformer, this.resources.data.cursor, [0, 0]);

        // Start the game.
        this.sceneList.scenes = [this.menuScene, this.cursorScene];
        
        // Start animation frames.
        requestAnimationFrame(() => this.frame());
    }

    frame() {
        // Keep track of framerate, and get the time step since the last frame.
        var deltat = this.fc.update();
        
        // Update step.
        this.sceneList.update(deltat);

        // Graphics step.
        PH.resizeCanvasToFullWindow(this.outCtx.canvas);
        this.outCtx.imageSmoothingEnabled = false;
        PH.resetDrawing(this.ctx, "#154617");
        this.sceneList.draw();

        // draw the main game canvas onto the out game canvas
        PH.drawScaledCanvas(this.ctx.canvas, this.outCtx);

        // request to call this function again the next frame
        requestAnimationFrame(() => this.frame());
    }

    ////////
    // CONVO
    ////////

    public convoEnqueue(speaker: string | null, msg: string | null, callback: (() => void) | void) {
        this.convoScene!.convoEnqueue(speaker, msg, callback);
    }

    ///////
    // FARM
    ///////

    public startFarm(firstTime: boolean) {
        this.sceneList.scenes = [this.farmScene!, this.convoScene!, this.cursorScene!];
        this.farmScene!.init(firstTime);
    }

    public doGameOver() {
        this.sceneList.scenes = [this.gameOverScene!, this.cursorScene!];
    }


    ///////////
    // MINIGAME
    ///////////

    public startMinigame(shakeLevel: number, particleLevel: number, detailLevel: number,
        soundLevel: number, difficultyLevel: number) {
        let minigameScene = new MinigameScene(this, shakeLevel,
            particleLevel, detailLevel, soundLevel, difficultyLevel, this.minigamePlayedTimes);
        this.sceneList.scenes = [minigameScene, this.convoScene!, this.cursorScene!];
        this.minigamePlayedTimes++;
    }

    public endMinigame(won: boolean) {
        this.sceneList.scenes = [this.farmScene!, this.convoScene!, this.cursorScene!];
        this.farmScene!.init(false);
        this.farmScene!.continue(won);
    }
}

class Startup {
    GAME_WIDTH = 320;
    GAME_HEIGHT = 200;

    ctx: CanvasRenderingContext2D | null = null;
    outCtx: CanvasRenderingContext2D | null = null;
    loadingScene: LoadingScene | null = null;
    loaded: boolean = false;

    frame() {
        if(this.loaded) return; // Done loading. Don't draw, or request another frame

        PH.resizeCanvasToFullWindow(this.outCtx!.canvas);
        this.outCtx!.imageSmoothingEnabled = false;
        if(this.loadingScene !== null) {
            this.loadingScene.draw();
        }
        PH.drawScaledCanvas(this.ctx!.canvas, this.outCtx!);

        // request to call this function again the next frame
        requestAnimationFrame(() => this.frame());
    }

    async start() {
        let mainGameCanvas = PH.createCanvas(this.GAME_WIDTH, this.GAME_HEIGHT);
        let outGameCanvas = <HTMLCanvasElement>document.getElementById('outGameCanvas')!;
        let resources = new PH.Resources();
        
        // Set up canvas contexts
        this.outCtx = outGameCanvas.getContext('2d')!;
        this.ctx = mainGameCanvas.getContext('2d')!;

        // Load a TTF font
        await PH.quickFont("m5x7", "m5x7.ttf");
        let mainFont = new PH.NormalFont("m5x7", 16, 7, 10, "#000000");
        
        // Set up loading scene
        this.loadingScene = new LoadingScene(resources, this.ctx, mainFont);

        // Start animation frames.
        requestAnimationFrame(() => this.frame());

        // Load the main contents of the game.
        resources.reqPackage('game');
        await resources.get();

        this.loaded = true;
        new Game(resources, this.outCtx, this.ctx, mainFont);
    }

}

window.onload = () => {
    let startup = new Startup();
    startup.start();
}