let GAME_WIDTH = 320;
let GAME_HEIGHT = 200;

class Game {

    //////////////
    // BASIC STUFF
    //////////////

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
    convoScene: ConvoScene;
    cursorScene: PH.CanvasCursorScene;
    minigamePlayedTimes = 0;

    constructor(resources: PH.Resources, outCtx: CanvasRenderingContext2D, ctx: CanvasRenderingContext2D,
        mainFont: PH.Font) {
        this.resources = resources;
        this.outCtx = outCtx;
        this.ctx = ctx;
        this.mainFont = mainFont;

        this.canvasTransformer = new PH.CanvasTransformer(this.outCtx.canvas, this.ctx.canvas);

        // Initialize subsystems.
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
        this.farmScene = new FarmScene(this);
        this.cursorScene = new PH.CanvasCursorScene(this.ctx, this.outCtx.canvas,
            this.canvasTransformer, this.resources.data.cursor, [0, 0]);

        // Start the game.
        this.sceneList.scenes = [new MenuScene(this), this.cursorScene];

        // Start animation frames.
        let fm = new PH.FrameManager({
            frameCallback: (deltat) => this.frame(deltat),
            pixelArtMode: [this.ctx, this.outCtx]
        });
        fm.start();
    }

    frame(deltat: number) {
        // Update step.
        this.sceneList.update(deltat);

        // Graphics step.
        PH.resizeCanvasToFullWindow(this.outCtx.canvas);
        PH.resetDrawing(this.ctx, "#154617");
        this.sceneList.draw();
    }

    public convoEnqueue(speaker: string | null, msg: string | null, callback: (() => void) | void) {
        this.convoScene.convoEnqueue(speaker, msg, callback);
    }

    public startFarm(firstTime: boolean) {
        this.sceneList.scenes = [this.farmScene, this.convoScene, this.cursorScene];
        this.farmScene.init(firstTime);
    }

    public doGameOver() {
        this.sceneList.scenes = [new GameOverScene(this), this.cursorScene!];
    }

    public startMinigame(shakeLevel: number, particleLevel: number, detailLevel: number,
        soundLevel: number, difficultyLevel: number) {
        let minigameScene = new MinigameScene(this, shakeLevel,
            particleLevel, detailLevel, soundLevel, difficultyLevel, this.minigamePlayedTimes);
        this.sceneList.scenes = [minigameScene, this.convoScene!, this.cursorScene!];
        this.minigamePlayedTimes++;
    }

    public endMinigame(won: boolean) {
        this.sceneList.scenes = [this.farmScene!, this.convoScene!, this.cursorScene!];
        this.farmScene.continueFromMinigame(won);
    }
}

async function start() {
    let mainGameCanvas = PH.createCanvas(GAME_WIDTH, GAME_HEIGHT);
    let outGameCanvas = <HTMLCanvasElement>document.getElementById('outGameCanvas')!;
    let resources = new PH.Resources();

    // Set up canvas contexts
    let outCtx = outGameCanvas.getContext('2d')!;
    let ctx = mainGameCanvas.getContext('2d')!;

    // Load a TTF font
    await PH.quickFont("m5x7", "m5x7.ttf");
    let mainFont = new PH.NormalFont("m5x7", 16, 7, 10, "#000000");

    // Set up loading scene
    let loadingScene = new LoadingScene(resources, ctx, mainFont);

    // Start animation frames for while the game is loading.
    let fm = new PH.FrameManager({
        frameCallback: (deltat) => {
            PH.resizeCanvasToFullWindow(outCtx.canvas);
            loadingScene.draw();
        },
        pixelArtMode: [ctx, outCtx]
    });
    fm.start();

    // Load the main contents of the game.
    resources.reqPackage('game');
    await resources.get();

    fm.stop();
    new Game(resources, outCtx, ctx, mainFont);
}

window.onload = start;
