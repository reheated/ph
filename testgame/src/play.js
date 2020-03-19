(function () {
    "use strict";

    //////////////
    // BASIC STUFF
    //////////////

    var GAME_ID = "ld45";
    var GAME_TITLE = "Juicefruit Orchard";

    var GAME_WIDTH = 320;
    var GAME_HEIGHT = 200;

    let frameRateReporting = false;
    let frameRateInterval = 5.0;

    let resources = new PH.Resources();
    var outGameCanvas = null;
    var outCtx = null
    var mainGameCanvas = null;
    var mainCtx = null;
    window.mainFont = null;
    window.spriteBoxNormal = null;
    window.spriteBoxButton = null;
    window.spriteBoxPressed = null;
    window.spriteBoxPlot = null;
    window.spriteBoxConvo = null;
    window.buttonDrawer = null;

    let farmScene = null;
    let minigameScene = null;
    let loadingScene = null;
    let menuScene = null;
    let gameOverScene = null;
    let sceneList = new PH.SceneList();
    window.convoScene = null;

    async function handleWindowLoad() {
        mainGameCanvas = PH.createCanvas(GAME_WIDTH, GAME_HEIGHT);

        outGameCanvas = document.getElementById('outGameCanvas');
        window.canvasTransformer = new PH.CanvasTransformer(outGameCanvas, mainGameCanvas);

        // Set up canvas contexts
        mainCtx = mainGameCanvas.getContext('2d');
        outCtx = outGameCanvas.getContext('2d');

        sceneList.setupMouseListeners(outGameCanvas, (x, y) => window.canvasTransformer.handleMouseMove(x, y));
        sceneList.setupKeyboardListeners(window);

        loadingScene = new LoadingScene(mainCtx, resources);
        sceneList.scenes = [loadingScene];

        // Load a TTF font
        await PH.quickFont("m5x7", "m5x7.ttf");
        mainFont = new PH.NormalFont("m5x7", 16, 7, 10, "#000000");

        // Start animation frames.
        requestAnimationFrame(frame);

        // Load the main contents of the game.
        resources.reqPackage('game');
        await resources.get();

        // Initialize subsystems.
        window.spriteBoxNormal = new PH.SpriteBox(resources.data.boxes, 4, 0);
        window.spriteBoxButton = new PH.SpriteBox(resources.data.boxes, 4, 1);
        window.spriteBoxPressed = new PH.SpriteBox(resources.data.boxes, 4, 2);
        window.spriteBoxPlot = new PH.SpriteBox(resources.data.boxes, 4, 3);
        window.spriteBoxConvo = new PH.SpriteBox(resources.data.boxes, 4, 4);

        window.buttonDrawer = new PH.CanvasButtonSpriteDrawer(
            spriteBoxButton, spriteBoxPressed, mainFont);
        convoScene = new ConvoScene(mainCtx, resources);

        // Start the game.
        menuScene = new MenuScene(mainCtx, resources);
        sceneList.scenes = [menuScene];
    }

    function drawCursor() {
        if (canvasTransformer.mousePos !== null) {
            mainCtx.drawImage(resources.data.cursor, ...canvasTransformer.mousePos);
        }
    }

    window.curTime = function () {
        return (new Date()).getTime() / 1000;
    }

    var frameResetTime = null;
    var frameCount = 0;
    var lastFrameTime = null;

    function frame() {
        // keeping track of framerate
        var t = curTime();
        if (frameResetTime === null) {
            frameResetTime = t;
        }
        else if (t > frameResetTime + frameRateInterval) {
            window.frameRate = frameCount / (t - frameResetTime);
            frameCount = 0;
            frameResetTime += frameRateInterval;
            if (frameRateReporting) {
                console.log("Framerate: " + window.frameRate.toFixed(1));
            }
        }
        frameCount++;
        var deltat = t - lastFrameTime;

        // Common graphics stuff

        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        if (windowWidth !== outGameCanvas.width ||
            windowHeight !== outGameCanvas.height) {
            // make sure canvas is the right size
            outGameCanvas.width = window.innerWidth;
            outGameCanvas.height = window.innerHeight;
            // output canvas should pixellate
            outCtx.msImageSmoothingEnabled = false;
            outCtx.imageSmoothingEnabled = false;
        }

        //mainCtx.resetTransform();
        mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        mainCtx.fillStyle = "#154617";
        mainCtx.fillRect(0, 0, outGameCanvas.width, outGameCanvas.height);

        sceneList.update(deltat);
        sceneList.draw();

        if (convoScene !== null) convoScene.draw(mainCtx);

        // Final drawing stuff
        if (sceneList.scenes[0] !== loadingScene) {
            updateCursor();
            drawCursor();
        }

        // draw the main game canvas onto the out game canvas
        PH.drawScaledCanvas(mainGameCanvas, outCtx);

        // request to call this function again the next frame
        requestAnimationFrame(frame);

        lastFrameTime = t;
    }

    function updateCursor() {
        // hide or show the default cursor
        var newStyle;
        if (canvasTransformer.mousePos === null) {
            newStyle = "";
        }
        else {
            newStyle = "none";
        }
        outGameCanvas.style.cursor = newStyle;
    }

    window.onload = handleWindowLoad;

    ///////
    // FARM
    ///////

    window.startFarm = function () {
        farmScene = new FarmScene(mainCtx, resources);
        sceneList.scenes = [farmScene, convoScene];
        farmScene.init();
    }

    window.doGameOver = function () {
        gameOverScene = new GameOverScene(mainCtx, resources);
        sceneList.scenes = [gameOverScene];
    }


    ///////////
    // MINIGAME
    ///////////

    let minigamePlayedTimes = 0;
    window.startMinigame = function (shakeLevel, particleLevel, detailLevel, soundLevel, difficultyLevel) {
        minigameScene = new MinigameScene(mainCtx, resources, shakeLevel, particleLevel, detailLevel, soundLevel, difficultyLevel, minigamePlayedTimes);
        sceneList.scenes = [minigameScene, convoScene];
        minigamePlayedTimes++;
    }

    window.endMinigame = function (won) {
        sceneList.scenes = [farmScene, convoScene];
        farmScene.init();
        farmScene.continue(won);
    }
})();



