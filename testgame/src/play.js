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

    let resources = new PH.Resources();
    var outGameCanvas = null;
    var outCtx = null
    var mainGameCanvas = null;
    var mainCtx = null;
    window.mainFont = null;

    var gameState = {
        mode: MODE_LOADING,
    }

    async function handleWindowLoad() {
        mainGameCanvas = PH.createCanvas(GAME_WIDTH, GAME_HEIGHT);

        outGameCanvas = document.getElementById('outGameCanvas');
        window.canvasui = new PH.CanvasUI(outGameCanvas, mainGameCanvas);

        // Set up canvas contexts
        mainCtx = mainGameCanvas.getContext('2d');
        outCtx = outGameCanvas.getContext('2d');

        // Load a pixel font first, before the rest of the content,
        // so we can display progress.
        let fontImg = await PH.quickImage("cellphone.png");
        mainFont = new PH.FixedWidthPixelFont(fontImg, 7, 9, 0, 32);

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

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Initialize subsystems.
        boxesInit(resources);
        convoInit(resources);

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
        mainFont.drawText(mainCtx, loadingString, 0, 0);
    }

    function drawCursor() {
        if (canvasui.mouseX !== null) {
            mainCtx.drawImage(resources.data.cursor, canvasui.mouseX, canvasui.mouseY);
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
        else if (t > frameResetTime + 1) {
            window.frameRate = frameCount;
            frameCount = 0;
            frameResetTime = t;
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

        var cg = convoGoing();

        // specific graphics stuff
        if (gameState.mode == MODE_LOADING) {
            drawLoadingMode();
        }
        else if (gameState.mode == MODE_MENU) {
            drawBox(mainCtx, 0, 40, 60, 240, 80);
            mainCtx.drawImage(resources.data.title, 47, 70);
            mainFont.drawText(mainCtx, "Click to start", 111, 120);
        }
        else if (gameState.mode == MODE_GAMEOVER) {
            drawBox(mainCtx, 0, 60, 60, 200, 80);
            mainFont.drawCenteredText(mainCtx, "The End", 160, 73);
            mainFont.drawCenteredText(mainCtx, "A Game by Michael Pauley", 160, 90);
            mainFont.drawCenteredText(mainCtx, "Made for Ludum Dare 45", 160, 107);
            mainFont.drawCenteredText(mainCtx, "Thanks for playing!", 160, 124);
        }
        else if (gameState.mode == MODE_FARM) {
            if (!cg) farmUpdate(deltat);
            farmDraw(mainCtx);
        }
        else if (gameState.mode == MODE_MINIGAME) {
            if (!cg) minigameUpdate(deltat);
            minigameDraw(mainCtx);
        }

        convoDraw(mainCtx);

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
        if (convoGoing()) {
            convoHandleClick();
        }
        else if (gameState.mode === MODE_MENU) {
            //resources.initAudio();
            newFarm();
            startFarm();
        }
        else if (gameState.mode === MODE_FARM) {
            farmHandleClick();
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
        if (canvasui.mouseX === null) {
            newStyle = "";
        }
        else {
            newStyle = "none";
        }
        outGameCanvas.style.cursor = newStyle;
    }

    function handleKeyDown(e) {
        if (gameState.mode == MODE_MINIGAME && !convoGoing()) {
            minigameHandleKeyDown(e.keyCode);
        }
    }

    function handleKeyUp(e) {
        if (gameState.mode == MODE_MINIGAME && !convoGoing()) {
            minigameHandleKeyUp(e.keyCode);
        }
    }

    function handleMouseDown(e) {
        if (gameState.mode == MODE_FARM && !convoGoing()) {
            farmHandleMouseDown(e);
        }
    }

    function handleMouseUp(e) {
        if (gameState.mode == MODE_FARM && !convoGoing()) {
            farmHandleMouseUp(e);
        }
    }

    window.quickSound = function (soundName, loop) {
        if (soundName === null) return null;
        var result = resources.playSound(resources.data[soundName], loop);
        return result;
    }

    window.onload = handleWindowLoad;

    ///////
    // FARM
    ///////

    function startFarm() {
        setMode(MODE_FARM);
        farmInit(resources);
    }

    window.doGameOver = function () {
        setMode(MODE_GAMEOVER);
    }


    ///////////
    // MINIGAME
    ///////////

    window.startMinigame = function (shakeLevel, particleLevel, detailLevel, soundLevel, difficultyLevel) {
        setMode(MODE_MINIGAME);
        minigameInit(resources, shakeLevel, particleLevel, detailLevel, soundLevel, difficultyLevel);
    }

    window.endMinigame = function (won) {
        setMode(MODE_FARM);
        farmInit(resources);
        farmContinue(won);
    }
})();



