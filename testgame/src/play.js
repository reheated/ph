(function () {
    "use strict";

    //////////////
    // BASIC STUFF
    //////////////

    window.MODE_LOADING = 'MODE_LOADING';
    window.MODE_MENU = 'MODE_MENU';
    window.MODE_FARM = 'MODE_FARM';
    window.MODE_MINIGAME = 'MODE_MINIGAME';
    window.MODE_GAMEOVER = 'MODE_GAMEOVER';

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

    var gameState = {
        mode: MODE_LOADING,
    }
    let farmScene = null;
    let minigameScene = null;
    window.convoScene = null;

    async function handleWindowLoad() {
        mainGameCanvas = PH.createCanvas(GAME_WIDTH, GAME_HEIGHT);

        outGameCanvas = document.getElementById('outGameCanvas');
        window.canvasTransformer = new PH.CanvasTransformer(outGameCanvas, mainGameCanvas);

        // Set up canvas contexts
        mainCtx = mainGameCanvas.getContext('2d');
        outCtx = outGameCanvas.getContext('2d');

        // Load a TTF font
        await PH.quickFont("m5x7", "m5x7.ttf");
        mainFont = new PH.NormalFont("m5x7", 16, 7, 10, "#000000");
        
        // Start animation frames.
        requestAnimationFrame(frame);

        // Load the main contents of the game.
        resources.reqPackage('game');
        await resources.get();

        // Set up input handlers.
        outGameCanvas.addEventListener('click', handleClick);
        outGameCanvas.addEventListener('dblclick', handleDoubleClick);
        outGameCanvas.addEventListener('contextmenu', handleClick);
        outGameCanvas.addEventListener('mousedown', handleMouseDown);
        outGameCanvas.addEventListener('mouseup', handleMouseUp);
        outGameCanvas.addEventListener('mousemove', handleMouseMove);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

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
        setMode(MODE_MENU);
    }

    function setMode(mode) {
        gameState.mode = mode;
        gameState.modeStartTime = curTime();
    }

    function drawLoadingMode(errorDecoding) {
        var mbToLoad = (resources.totalToLoad / 1e6).toFixed(1);
        var mbLoaded = (resources.totalLoaded / 1e6).toFixed(1);

        var loadingString = "Loading";
        if (errorDecoding) {
            loadingString = "There was an error decoding the audio";
            subLoadingString = "maybe the connection was lost or there is a problem with your browser?";
        }
        else if (mbToLoad > 0) {
            loadingString += " " + mbLoaded + "/" + mbToLoad + "MB";
        }
        if (resources.numDownloaded === resources.numRequests) {
            loadingString = "Decoding audio\n(this could take a minute)";
        }

        mainCtx.fillstyle = "#154617";
        mainCtx.fillRect(0, 0, 320, 200);
        mainFont.drawText(mainCtx, loadingString, 1, 1);
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
            if(frameRateReporting) {
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

        var cg = (convoScene !== null && convoScene.convoGoing());

        // specific graphics stuff
        if (gameState.mode == MODE_LOADING) {
            drawLoadingMode();
        }
        else if (gameState.mode == MODE_MENU) {
            spriteBoxNormal.draw(mainCtx, 40, 60, 240, 80);
            mainCtx.drawImage(resources.data.title, 47, 70);
            mainFont.drawCenteredText(mainCtx, "Click to start", 160, 120);
        }
        else if (gameState.mode == MODE_GAMEOVER) {
            spriteBoxNormal.draw(mainCtx, 60, 60, 200, 80);
            mainFont.drawCenteredText(mainCtx, "The End", 160, 73);
            mainFont.drawCenteredText(mainCtx, "A Game by Michael Pauley", 160, 90);
            mainFont.drawCenteredText(mainCtx, "Made for Ludum Dare 45", 160, 107);
            mainFont.drawCenteredText(mainCtx, "Thanks for playing!", 160, 124);
        }
        else if (gameState.mode == MODE_FARM) {
            if (!cg) farmScene.update(deltat);
            farmScene.draw();
        }
        else if (gameState.mode == MODE_MINIGAME) {
            if (!cg) minigameScene.update(deltat);
            minigameScene.draw();
        }

        if(convoScene !== null) convoScene.draw(mainCtx);

        // Final drawing stuff
        if (gameState.mode != MODE_LOADING) {
            updateCursor();
            drawCursor();
        }

        // draw the main game canvas onto the out game canvas
        PH.drawScaledCanvas(mainGameCanvas, outCtx);

        // request to call this function again the next frame
        requestAnimationFrame(frame);

        lastFrameTime = t;
    }

    function handleClick(e) {
        if (convoScene.convoGoing()) {
            convoScene.convoHandleClick();
        }
        else if (gameState.mode === MODE_MENU) {
            farmScene = new FarmScene(mainCtx, resources);
            startFarm();
        }
        else if (gameState.mode === MODE_FARM) {
            farmScene.handleClick();
        }
    }

    function handleDoubleClick(e) {
        // don't let event bubble up
        e.preventDefault();
        e.stopPropagation();
        return false;
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

    function handleKeyDown(e) {
        if (gameState.mode == MODE_MINIGAME && !convoScene.convoGoing()) {
            minigameScene.handleKeyDown(e.keyCode);
        }
    }

    function handleKeyUp(e) {
        if (gameState.mode == MODE_MINIGAME && !convoScene.convoGoing()) {
            minigameScene.handleKeyUp(e.keyCode);
        }
    }

    function handleMouseDown(e) {
        handleMouseMove(e);
        if (gameState.mode == MODE_FARM && !convoScene.convoGoing()) {
            farmScene.handleMouseDown();
        }
    }

    function handleMouseUp(e) {
        handleMouseMove(e);
        if (gameState.mode == MODE_FARM && !convoScene.convoGoing()) {
            farmScene.handleMouseUp();
        }
    }

    function handleMouseMove(e) {
        canvasTransformer.handleMouseMove(e.clientX, e.clientY);
        if (gameState.mode == MODE_FARM && !convoScene.convoGoing()) {
            farmScene.handleMouseMove();
        }
    }

    window.onload = handleWindowLoad;

    ///////
    // FARM
    ///////

    function startFarm() {
        setMode(MODE_FARM);
        farmScene.init();
    }

    window.doGameOver = function () {
        setMode(MODE_GAMEOVER);
    }


    ///////////
    // MINIGAME
    ///////////

    let minigamePlayedTimes = 0;
    window.startMinigame = function (shakeLevel, particleLevel, detailLevel, soundLevel, difficultyLevel) {
        setMode(MODE_MINIGAME);
        minigameScene = new MinigameScene(mainCtx, resources, shakeLevel, particleLevel, detailLevel, soundLevel, difficultyLevel, minigamePlayedTimes);
        minigamePlayedTimes++;
    }

    window.endMinigame = function (won) {
        setMode(MODE_FARM);
        farmScene.init();
        farmScene.continue(won);
    }
})();



