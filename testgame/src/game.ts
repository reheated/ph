let GAME_WIDTH = 320;
let GAME_HEIGHT = 200;

class Game {

    //////////////
    // BASIC STUFF
    //////////////

    resources: PH.Resources;
    pixelationLayer: PH.PixelationLayer;
    mainFont: PH.Font;
    buttonDrawer: PH.CanvasButtonSpriteDrawer;
    spriteBoxNormal: PH.SpriteBox;
    spriteBoxButton: PH.SpriteBox;
    spriteBoxPressed: PH.SpriteBox;
    spriteBoxPlot: PH.SpriteBox;
    spriteBoxConvo: PH.SpriteBox;

    outCtx: CanvasRenderingContext2D;
    ctx: CanvasRenderingContext2D;

    layerManager = new PH.LayerManager();
    farmLayer: FarmLayer;
    convoLayer: ConvoLayer;
    cursorLayer: PH.CanvasCursorLayer;
    minigamePlayedTimes = 0;

    constructor(resources: PH.Resources, outCtx: CanvasRenderingContext2D, ctx: CanvasRenderingContext2D,
        mainFont: PH.Font) {
        this.resources = resources;
        this.outCtx = outCtx;
        this.ctx = ctx;
        this.mainFont = mainFont;

        this.pixelationLayer = new PH.PixelationLayer(this.ctx, this.outCtx);

        // Initialize subsystems.
        this.spriteBoxNormal = new PH.SpriteBox(this.resources.data.boxes, 4, 0);
        this.spriteBoxButton = new PH.SpriteBox(this.resources.data.boxes, 4, 1);
        this.spriteBoxPressed = new PH.SpriteBox(this.resources.data.boxes, 4, 2);
        this.spriteBoxPlot = new PH.SpriteBox(this.resources.data.boxes, 4, 3);
        this.spriteBoxConvo = new PH.SpriteBox(this.resources.data.boxes, 4, 4);

        this.buttonDrawer = new PH.CanvasButtonSpriteDrawer(
            this.spriteBoxButton, this.spriteBoxPressed, this.mainFont);

        this.layerManager.setupMouseListeners(this.outCtx.canvas);
        this.layerManager.setupKeyboardListeners(window);

        this.convoLayer = new ConvoLayer(this);
        this.farmLayer = new FarmLayer(this);
        this.cursorLayer = new PH.CanvasCursorLayer(this.ctx, this.outCtx.canvas,
            this.pixelationLayer, this.resources.data.cursor, [0, 0]);

        // Start the game.
        this.layerManager.setLayers(new MenuLayer(this), this.cursorLayer, this.pixelationLayer);

        // Start animation frames.
        let fm = new PH.FrameManager({
            frameCallback: (deltat) => this.frame(deltat)
        });
        fm.start();
    }

    frame(deltat: number) {
        // Update step.
        this.layerManager.update(deltat);

        // Graphics step.
        PH.resizeCanvasToFullWindow(this.outCtx.canvas);
        PH.resetDrawing(this.ctx, "#154617");
        this.layerManager.draw();
    }

    convoEnqueue(speaker: string | null, msg: string | null, callback: (() => void) | void) {
        this.convoLayer.convoEnqueue(speaker, msg, callback);
    }

    startFarm(firstTime: boolean) {
        this.layerManager.setLayers(this.farmLayer, this.farmLayer.uiLayer, this.convoLayer, this.cursorLayer, this.pixelationLayer);
        this.farmLayer.init(firstTime);
    }

    doGameOver() {
        this.layerManager.setLayers(new GameOverLayer(this), this.cursorLayer, this.pixelationLayer);
    }

    startMinigame(shakeLevel: number, particleLevel: number, detailLevel: number,
        soundLevel: number, difficultyLevel: number) {
        let minigameLayer = new MinigameLayer(this, shakeLevel,
            particleLevel, detailLevel, soundLevel, difficultyLevel, this.minigamePlayedTimes);
        this.layerManager.setLayers(minigameLayer, this.convoLayer, this.cursorLayer, this.pixelationLayer);
        this.minigamePlayedTimes++;
    }

    endMinigame(won: boolean) {
        this.layerManager.setLayers(this.farmLayer, this.convoLayer, this.cursorLayer, this.pixelationLayer);
        this.farmLayer.continueFromMinigame(won);
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

    // Set up loading sceen
    let loadingScreen = new LoadingScreen(resources, ctx, mainFont);

    // Start animation frames for while the game is loading.
    let fm = new PH.FrameManager({
        frameCallback: (deltat) => {
            PH.resizeCanvasToFullWindow(outCtx.canvas);
            loadingScreen.draw();
        }
    });
    fm.start();

    // Load the main contents of the game.
    resources.reqPackage('game');
    await resources.get();

    fm.stop();
    new Game(resources, outCtx, ctx, mainFont);
}

window.onload = start;
