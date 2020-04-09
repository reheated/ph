class Game {

    data: {[key: string]: any};
    mainFont: PH.CanvasFont;
    ctx: CanvasRenderingContext2D;

    soundPlayer: PH.SoundPlayer;
    jukeBox: PH.JukeBox;

    layerManager = new PH.LayerManager();

    myLayer: MyLayer;

    constructor(data: {[key: string]: any}, audioContext: AudioContext, mainFont: PH.CanvasFont, ctx: CanvasRenderingContext2D) {
        this.data = data;
        this.soundPlayer = new PH.SoundPlayer(audioContext, {});
        this.jukeBox = new PH.JukeBox(this.soundPlayer);
        this.mainFont = mainFont;
        this.ctx = ctx;

        this.layerManager.setupMouseListeners(this.ctx.canvas);
        this.layerManager.setupKeyboardListeners(window);

        this.layerManager.setMainLayers(new MenuLayer(this));

        this.myLayer = new MyLayer(this);
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
        PH.resizeCanvasToSizeOnScreen(this.ctx.canvas);
        PH.fillCanvas(this.ctx, "#ffffff");
        this.layerManager.draw();
    }

    endMenu() {
        this.startMyScene();
    }

    startMyScene() {
        this.layerManager.setMainLayers(this.myLayer);
    }

}

async function start() {
    window.onerror = null;

    let outGameCanvas = <HTMLCanvasElement>document.getElementById('outGameCanvas')!;
    outGameCanvas.hidden = false;
    let audioContext = new AudioContext();
    let loader = new PH.Loader(audioContext);

    let ctx = outGameCanvas.getContext('2d')!;
    
    // Load a font
    let mainFont = new PH.SimpleFont("Calibri", 16, 1.0, "#000000");

    // Set up loading sceen
    let loadingScreen = new LoadingScreen(loader, ctx, mainFont);

    // Start animation frames for while the game is loading.
    let fm = new PH.FrameManager({
        frameCallback: (deltat) => {
            PH.resizeCanvasToSizeOnScreen(ctx.canvas);
            PH.fillCanvas(ctx, "#ffffff");
            loadingScreen.draw();
        }
    });
    fm.start();

    // Load the main contents of the game.
    let data = await loader.getFile('game.dat', (bytes, totalBytes) => loadingScreen.setProgress(bytes, totalBytes));

    fm.stop();
    new Game(data, audioContext, mainFont, ctx);
}

window.onload = start;
