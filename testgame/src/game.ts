let GAME_WIDTH = 320;
let GAME_HEIGHT = 200;

class Game {

    //////////////
    // BASIC STUFF
    //////////////

    data: {[key: string]: any};
    pixelationLayer: PH.PixelationLayer;
    mainFont: PH.CanvasFont;
    buttonDrawer: PH.CanvasButtonSpriteDrawer;
    spriteBoxNormal: PH.SpriteBox;
    spriteBoxButton: PH.SpriteBox;
    spriteBoxPressed: PH.SpriteBox;
    spriteBoxPlot: PH.SpriteBox;
    spriteBoxConvo: PH.SpriteBox;

    outCtx: CanvasRenderingContext2D;
    ctx: CanvasRenderingContext2D;

    soundPlayer: PH.SoundPlayer;
    jukeBox: PH.JukeBox;

    layerManager = new PH.LayerManager();
    farmLayer: FarmLayer;
    convoLayer: ConvoLayer;
    minigamePlayedTimes = 0;

    constructor(data: {[key: string]: any}, audioContext: AudioContext, mainFont: PH.CanvasFont, pixelationLayer: PH.PixelationLayer) {
        this.data = data;
        this.soundPlayer = new PH.SoundPlayer(audioContext, {});
        this.jukeBox = new PH.JukeBox(this.soundPlayer);
        this.mainFont = mainFont;
        this.pixelationLayer = pixelationLayer;
        this.ctx = pixelationLayer.srcCtx;
        this.outCtx = pixelationLayer.destCtx;

        // Initialize subsystems.
        this.spriteBoxNormal = new PH.SpriteBox(this.data.boxes, 4, 0);
        this.spriteBoxButton = new PH.SpriteBox(this.data.boxes, 4, 1);
        this.spriteBoxPressed = new PH.SpriteBox(this.data.boxes, 4, 2);
        this.spriteBoxPlot = new PH.SpriteBox(this.data.boxes, 4, 3);
        this.spriteBoxConvo = new PH.SpriteBox(this.data.boxes, 4, 4);

        this.buttonDrawer = new PH.CanvasButtonSpriteDrawer(
            this.spriteBoxButton, this.spriteBoxPressed, this.mainFont);

        this.layerManager.setupMouseListeners(this.outCtx.canvas);
        this.layerManager.setupKeyboardListeners(window);

        this.convoLayer = new ConvoLayer(this);
        this.farmLayer = new FarmLayer(this);
        let cursorLayer = new PH.CanvasCursorLayer(this.ctx, this.outCtx.canvas,
            this.pixelationLayer, this.data.cursor, [0, 0]);

        this.layerManager.setTopLayers(cursorLayer, this.pixelationLayer)
        this.layerManager.setMainLayers(new MenuLayer(this));

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

    // Mode Changes

    endMenu() {
        this.soundPlayer.init();

        this.startFarm(true);
        //this.startFarm(false);
    }

    startFarm(firstTime: boolean) {
        this.layerManager.setMainLayers(this.farmLayer, this.farmLayer.uiLayer, this.convoLayer);
        if(firstTime) this.farmLayer.firstTime();
    }

    doGameOver() {
        this.layerManager.setMainLayers(new GameOverLayer(this));
    }

    startMinigame(shakeLevel: number, particleLevel: number, detailLevel: number,
        soundLevel: number, difficultyLevel: number) {
        let minigameLayer = new MinigameLayer(this, shakeLevel,
            particleLevel, detailLevel, soundLevel, difficultyLevel, this.minigamePlayedTimes);
        this.layerManager.setMainLayers(minigameLayer, this.convoLayer);
        this.minigamePlayedTimes++;
    }

    endMinigame(won: boolean) {
        this.layerManager.setMainLayers(this.farmLayer, this.farmLayer.uiLayer, this.convoLayer);
        this.farmLayer.continueFromMinigame(won);
    }
}

async function start() {
    let mainGameCanvas = PH.createCanvas(GAME_WIDTH, GAME_HEIGHT);
    let outGameCanvas = <HTMLCanvasElement>document.getElementById('outGameCanvas')!;
    let audioContext = new AudioContext();
    let loader = new PH.Loader(audioContext);

    // Set up canvas contexts
    let outCtx = outGameCanvas.getContext('2d')!;
    let ctx = mainGameCanvas.getContext('2d')!;
    let pixelationLayer = new PH.PixelationLayer(ctx, outCtx);

    // Load a font
    let mainFont = <PH.PixelFont>await loader.getFile('m5x7.bff');
    mainFont.img = PH.changeColor(mainFont.img, [0, 0, 0]);
    mainFont.yOffset = -4;
    mainFont.lineHeight = 10;

    // Set up loading sceen
    let loadingScreen = new LoadingScreen(loader, ctx, mainFont);

    // Start animation frames for while the game is loading.
    let fm = new PH.FrameManager({
        frameCallback: (deltat) => {
            PH.resizeCanvasToFullWindow(outCtx.canvas);
            PH.resetDrawing(ctx, "#154617");
            loadingScreen.draw();
            pixelationLayer.draw();
        }
    });
    fm.start();

    // Load the main contents of the game.
    let data = await loader.getFile('game.dat', (bytes, totalBytes) => loadingScreen.setProgress(bytes, totalBytes));

    fm.stop();
    new Game(data, audioContext, mainFont, pixelationLayer);
}

window.onload = start;
