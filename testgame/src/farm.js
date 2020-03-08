(function() {
    "use strict";

    var GRID_H = 4;
    var GRID_W = 4;
    var FARM_TOP = 18;
    var FARM_LEFT = 33;
    var DEBT = 8000;
    var MAXLEVEL = 5;
    var DEFAULT_ENERGY = 3;
    var END_DAY = 28;
    
    var UPGRADECOST_PARTICLES = 100;
    var UPGRADECOST_SHAKE = 100;
    var UPGRADECOST_DETAILS = 100;
    var UPGRADECOST_SOUND = 100;
    var UPGRADECOST_JUICINESS = 500;
    var UPGRADECOST_SEEDS = 250;
    var UPGRADECOST_TRACTOR = 200;
    var UPGRADECOST_SCARECROW = 100;

    var SEED = "SEED";
    var PLANTEDSEED = "PLANTEDSEED";
    var SAPLING = "SAPLING";
    var TREE = "TREE";
    var JUICE = "JUICE";
    var DRAGGABLE = [SEED, JUICE];

    var CASHRECT = [160, 4, 92, 16];

    var resources = null;

    var cash = null;
    var energy = null;
    var buttons = null;
    var mouseOverButton = null;
    var mouseDownOverButton = null;
    var mouseOverPlot = null;
    var mouseDownOverPlot = null;
    var mouseDragPlot = null;
    var plotContents = null;
    var plotImageDict = null;
    var harvestingCell = null;

    // current stats
    var levelParticles = 0;
    var levelShake = 0;
    var levelDetails = 0;
    var levelSound = 0;
    var levelJuiciness = 0;
    var levelSeeds = 0;
    var levelTractor = 0;
    var levelScarecrow = 0;

    var today = null;
    var timesMinigameWon = null;

    var farmMusic = null;

    window.newFarm = function()
    {
        cash = 2000;
        energy = DEFAULT_ENERGY;
        
        levelParticles = 0;
        levelShake = 0;
        levelDetails = 0;
        levelSound = 0;
        levelJuiciness = 0;
        levelSeeds = 0;
        levelTractor = 0;
        levelScarecrow = 0;

        today = 1;
        timesMinigameWon = 0;

        // Set up the plot contents. Each plot contents is a list of tuples of the form
        // [string describing it, count, sale value]
        plotContents = [];
        for(var i = 0; i < GRID_H; i++)
        {
            plotContents[i] = [];
            for(var j = 0; j < GRID_W; j++)
            {
                plotContents[i][j] = [];
            }
        }
        plotContents[1][1].push([SAPLING, 1, 0]);

        convoIntro();
    }

    window.farmInit = function(resourcesObject)
    {
        resources = resourcesObject;

        // register all the buttons
        buttons = [];

        // Buttons for upgrades
        registerButton(164, 40, 72, 16, clickParticles, hoverParticles); // particles
        registerButton(240, 40, 72, 16, clickShake, hoverShake); // shake

        registerButton(164, 60, 72, 16, clickDetails, hoverDetails); // details
        registerButton(240, 60, 72, 16, clickSound, hoverSound); // sound

        registerButton(164, 80, 72, 16, clickJuiciness, hoverJuiciness); // juiciness
        registerButton(240, 80, 72, 16, clickSeeds, hoverSeeds); // seeds

        registerButton(164, 100, 72, 16, clickTractor, hoverTractor); // tractor
        registerButton(240, 100, 72, 16, clickScarecrow, hoverScarecrow); // scarecrow

        // Buttons for actions
        registerButton(100, 146, 52, 16, clickPayDebt, hoverPayDebt); // pay debt
        registerButton(100, 168, 52, 16, clickSleep, hoverSleep); // next day
            
        // set up image references
        plotImageDict = {
            SEED: resources.data.seed,
            PLANTEDSEED: resources.data.plantedseed,
            SAPLING: resources.data.sapling,
            TREE: resources.data.tree,
            JUICE: resources.data.juice
        }
        startMusic();
    }

    function startMusic()
    {
        farmMusic = quickSound('ld45_farm', true);
    }

    function stopMusic()
    {
        resources.stopSound(farmMusic);
        farmMusic = null;
    }

    function registerButton(l, t, w, h, callbackClick, callbackHover)
    {
        // left, top, width, height, callback function for click,
        // callback function for hover, and whether the function is depressed.
        var b = [l, t, w, h, callbackClick, callbackHover];
        buttons.push(b);
    }

    function drawButtons(ctx)
    {
        for(var k = 0; k < buttons.length; k++)
        {
            var b = buttons[k];
            var id = (k === mouseDownOverButton)? 2: 1; // select id of the box graphic
            boxDrawer.drawBox(ctx, id, b[0], b[1], b[2], b[3]);
        }
    }

    function updateMouseOverButton()
    {
        if(canvasui.mouseX === null)
        {
            mouseOverButton = null;
            mouseDownOverButton = null;
            return;
        }
        var x = canvasui.mouseX;
        var y = canvasui.mouseY;
        for(var k = 0; k < buttons.length; k++)
        {
            var b = buttons[k];
            if(x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3])
            {
                mouseOverButton = k;
                if(k !== mouseDownOverButton)
                {
                    mouseDownOverButton = null;
                }
                if(b[5] !== null)
                {
                    b[5]();
                }
                return;
            }
        }
        mouseOverButton = null;
        mouseDownOverButton = null;
        return;
    }

    function updateMouseOverPlot()
    {
        if(canvasui.mouseX === null)
        {
            mouseOverPlot = null;
            mouseDownOverPlot = null;
            return;
        }
        var x = canvasui.mouseX;
        var y = canvasui.mouseY;
        for(var i = 0; i < GRID_H; i++)
        {
            for(var j = 0; j < GRID_W; j++)
            {
                var l = j * 22 + FARM_LEFT;
                var t = i * 22 + FARM_TOP;
                if(x >= l && x < l + 18 && y >= t && y < t + 18)
                {
                    mouseOverPlot = [i, j];
                    handleHoverPlot(mouseOverPlot);
                    if(mouseDownOverPlot !== null && (i !== mouseDownOverPlot[0] || j !== mouseDownOverPlot[1]))
                    {
                        mouseDownOverPlot = null;
                    }
                    return;
                }
            }
        }
        mouseOverPlot = null;
        mouseDownOverPlot = null;
        return;
    }

    function drawPlots(ctx)
    {
        // draw the underlying plot rectangles
        for(var i = 0; i < GRID_H; i++)
        {
            for(var j = 0; j < GRID_W; j++)
            {
                var x = j * 22 + FARM_LEFT;
                var y = i * 22 + FARM_TOP;
                boxDrawer.drawBox(ctx, 3, x, y, 20, 20);
            }
        }

        // draw the first contents on every cell
        for(var i = 0; i < GRID_H; i++)
        {
            for(var j = 0; j < GRID_W; j++)
            {
                var pcList = plotContents[i][j];
                if(pcList.length == 0) continue;
                var pc = pcList[0];
                var x = j * 22 + FARM_LEFT + 2;
                var y = i * 22 + FARM_TOP + 2;
                ctx.drawImage(plotImageDict[pc[0]], x, y);
                // if the count is more than 1, draw it
                if(pc[1] > 1)
                {
                    mainFont.drawText(ctx, pc[1].toString(), x + 10, y);
                }
            }
        }
    }

    var INFO_TEXT_WIDTH = 148;
    var infoTextLines = [];
    function setInfoText(text)
    {
        var splitLines = text.split("\n");
        infoTextLines = [];
        for(var k = 0; k < splitLines.length; k++)
        {
            // word-wrap each line
            var wrapped = mainFont.wordWrap(splitLines[k], INFO_TEXT_WIDTH);
            for(var l = 0; l < wrapped.length; l++)
            {
                infoTextLines.push(wrapped[l]);
            }
            if(wrapped.length == 0)
            {
                infoTextLines.push("");
            }
        }
    }

    function drawInfoText(ctx)
    {
        mainFont.drawMultiLineText(ctx, infoTextLines, 164, 128);
    }

    function drawCalendar(ctx)
    {
        var l = 10;
        var t = 136;
        
        ctx.drawImage(resources.data.calendar, l, t);

        var week = Math.floor((today - 1) / 7);
        var dow = (today - 1) % 7;
        ctx.drawImage(resources.data.calendarhighlight, l + 12 * dow, t + 12 * week);
    }

    function draw(ctx)
    {
        // Draw the farm plots
        boxDrawer.drawBox(ctx, 0, 4, 4, 152, 104);
        mainFont.drawText(ctx, "Farm plots", 8, 8);

        drawPlots(ctx);

        // Draw the calendar
        boxDrawer.drawBox(ctx, 0, 4, 112, 152, 84);
        mainFont.drawText(ctx, "Calendar", 8, 116);
        drawCalendar(ctx);

        // Draw the cash display
        boxDrawer.drawBox(ctx, 1, CASHRECT[0], CASHRECT[1], CASHRECT[2], CASHRECT[3]);
        ctx.drawImage(resources.data.cash, 160, 4);
        var s = cash.toString();
        var sx = 248 - 7 * s.length;
        mainFont.drawText(ctx, s, sx, 8);

        // Draw the energy display
        boxDrawer.drawBox(ctx, 0, 256, 4, 60, 16);
        ctx.drawImage(resources.data.energy, 256, 4);
        var s = energy.toString();
        var sx = 312 - 7 * s.length;
        mainFont.drawText(ctx, s, sx, 8);

        // Draw the upgrades box
        boxDrawer.drawBox(ctx, 0, 160, 24, 156, 96);
        mainFont.drawText(ctx, "Upgrades", 164, 28);

        // Draw the info box
        boxDrawer.drawBox(ctx, 0, 160, 124, 156, 72);
        drawInfoText(ctx);

        // Draw all buttons
        drawButtons(ctx);

        // Draw text on buttons
        mainFont.drawText(ctx, "Particles", 168, 44);
        mainFont.drawText(ctx, "Shake", 244, 44);
        mainFont.drawText(ctx, "Details", 168, 64);
        mainFont.drawText(ctx, "Sound", 244, 64);
        mainFont.drawText(ctx, "Juiciness", 168, 84);
        mainFont.drawText(ctx, "Seeds", 244, 84);
        mainFont.drawText(ctx, "Tractor", 168, 104);
        mainFont.drawText(ctx, "Scarecrow", 244, 104);

        mainFont.drawText(ctx, "Debt:", 104, 118);
        mainFont.drawText(ctx, "$" + DEBT.toString(), 104, 134);
        mainFont.drawText(ctx, "Pay", 104, 150);
        mainFont.drawText(ctx, "Sleep", 104, 172);

        // draw anything that's being dragged
        if(mouseDragPlot !== null && canvasui.mouseX !== null)
        {
            var pcList = plotContents[mouseDragPlot[0]][mouseDragPlot[1]];
            if(pcList.length !== 0)
            {
                var pc = pcList[0];
                ctx.drawImage(plotImageDict[pc[0]], canvasui.mouseX - 11, canvasui.mouseY - 11);
            }
        }

    }

    window.farmUpdate = function(deltat)
    {
        infoTextLines = [];
        updateMouseOverButton();
        updateMouseOverPlot();
    }

    window.farmDraw = function(ctx)
    {
        draw(ctx);
    }

    window.farmHandleMouseDown = function()
    {
        mouseDownOverButton = mouseOverButton; // if we're not over a button, this is null anyway.
        mouseDownOverPlot = mouseOverPlot; // ditto.

        if(mouseOverPlot !== null)
        {
            var pcList = plotContents[mouseOverPlot[0]][mouseOverPlot[1]];
            if(pcList.length !== 0)
            {
                var pc = pcList[0];
                if(DRAGGABLE.indexOf(pc[0]) >= 0)
                {
                    mouseDragPlot = mouseOverPlot;
                }
                else
                {
                    mouseDragPlot = null;
                }
            }
        }
    }

    function getSeedTreeCount()
    {
        var count = 0;
        for(var i = 0; i < GRID_H; i++)
        {
            for(var j = 0; j < GRID_W; j++)
            {
                var pcList = plotContents[i][j];
                for(var k = 0; k < pcList.length; k++)
                {
                    var pc = pcList[k];
                    if(pc[0] == SEED || pc[0] == PLANTEDSEED || pc[0] == SAPLING || pc[0] == TREE)
                    {
                        count += pc[1];
                    }
                }
            }
        }
        return count;
    }

    function trySell(plotCell)
    {
        // try to sell the contents of the plot
        var pcList = plotContents[plotCell[0]][plotCell[1]];
        if(pcList.length === 0)
        {
            return;
        }
        var pc = pcList[0];
        
        // if this is a seed, check that we aren't selling our last seed/sapling/tree.
        // return early and let the player know
        if(pc[0] === SEED)
        {
            var stc = getSeedTreeCount();
            if(stc <= 1)
            {
                convoEnqueue("s", "I don't have any trees - I won't sell my last seed!");
                return;
            }
        }

        // make the sale
        cash += pc[2];
        pc[1] -= 1;
        if(pc[1] <= 0)
        {
            pcList.splice(0, 1);
        }
        quickSound('ld45_cash');
    }

    function tryPlant(srcPlot, destPlot)
    {
        // first check the conditions:
        // - must be planting a seed
        // - must plant it in an empty plot
        var srcPcList = plotContents[srcPlot[0]][srcPlot[1]];
        if(srcPcList.length === 0)
        {
            return;
        }
        var srcPc = srcPcList[0];
        
        if(srcPc[0] !== SEED) return; // can only plant seeds
        
        var destPcList = plotContents[destPlot[0]][destPlot[1]];
        if(destPcList.length > 0) return; // can only plant in an empty plot

        // all our conditions are met - let's do it
        // remove a seed from the source plot
        srcPc[1] -= 1;
        if(srcPc[1] <= 0)
        {
            srcPcList.splice(0, 1);
        }
        // put a planted seed in the destination
        destPcList.push([PLANTEDSEED, 1, 0]);

        quickSound('ld45_plant');
    }

    function handleDragPlot(srcPlot, mouseReleaseCoords)
    {
        var x = mouseReleaseCoords[0];
        var y = mouseReleaseCoords[1];

        if(x >= CASHRECT[0] && x < CASHRECT[0] + CASHRECT[2] && y >= CASHRECT[1] && y < CASHRECT[1] + CASHRECT[3])
        {
            // trying to sell a seed or juice
            trySell(srcPlot);
        }
        else if(mouseOverPlot !== null)
        {
            // trying to plant a seed?
            tryPlant(srcPlot, mouseOverPlot);
        }
    }

    window.farmHandleMouseUp = function()
    {
        if(mouseDownOverButton !== null)
        {
            var b = buttons[mouseDownOverButton];
            var callbackClick = b[4];
            if(callbackClick !== null)
            {
                callbackClick();
                mouseDragPlot = null;
            }
        }
        mouseDownOverButton = null;

        if(mouseDragPlot !== null)
        {
            handleDragPlot(mouseDragPlot, [canvasui.mouseX, canvasui.mouseY]);
        }
        mouseDragPlot = null;
    }

    ///////////////////////////////
    // HANDLING CLICKS ON THE PLOTS
    ///////////////////////////////

    window.farmHandleClick = function()
    {
        if(mouseOverPlot !== null)
        {
            // avoid triggering this when we moused down somewhere else and moused up here
            if(mouseDownOverPlot === null || mouseDownOverPlot[0] !== mouseOverPlot[0] || mouseDownOverPlot[1] !== mouseOverPlot[1])
            {
                return;
            }
            // check if this is a tree that we can harvest
            var pcList = plotContents[mouseOverPlot[0]][mouseOverPlot[1]];
            if(pcList.length === 0)
            {
                return;
            }
            var pc = pcList[0];
            if(pc[0] === TREE)
            {
                tryHarvest(mouseOverPlot)
            }
        }
    }

    function tryHarvest(plotCell)
    {
        // check that we have enough energy
        if(energy <= 0)
        {
            convoEnqueue("s", "I haven't got enough energy. I need to sleep.");
            return;
        }

        // compute the difficulty
        var difficulty = levelShake + levelParticles + levelDetails + levelSound;
        difficulty -= 2 * levelScarecrow;
        difficulty = Math.max(0, difficulty);

        // actually do the harvest
        energy -= 1;
        harvestingCell = plotCell;
        stopMusic();
        startMinigame(levelShake, levelParticles, levelDetails, levelSound, difficulty);
    }

    window.farmContinue = function(won)
    {
        // Continue farm mode, after a minigame. won is set to true if the player won.
        if(won)
        {
            // remove the tree, put in the seeds, and put in the juices.
            var numSeeds = 2 + levelSeeds;
            var seedValue = 5;
            var numJuices = 2 + levelJuiciness;
            var juiceValue = 10 * (2 + levelShake + levelParticles + levelDetails + levelSound);
            var pcList = [[JUICE, numJuices, juiceValue], [SEED, numSeeds, seedValue]];
            plotContents[harvestingCell[0]][harvestingCell[1]] = pcList;

            timesMinigameWon += 1;
            if(timesMinigameWon === 1)
            {
                convoFirstWonMinigame();
            }
            else if(timesMinigameWon === 2)
            {
                convoSecondWonMinigame();
            }
            else
            {
                convoWonMinigame();
            }
        }
        else
        {
            convoLostMinigame();
        }

        harvestingCell = null;
    }

    ////////////////////////
    // BUTTON PRESS HANDLERS
    ////////////////////////

    function quickCheckUpgrade(level, cost)
    {
        if(level >= MAXLEVEL)
        {
            convoEnqueue("s", "I can't upgrade this any further.");
            return false;
        }
        else if (cost > cash)
        {
            convoEnqueue("s", "I haven't got enough money for that upgrade.");
            return false;
        }
        else return true;
    }

    function clickParticles()
    {
        if(quickCheckUpgrade(levelParticles, UPGRADECOST_PARTICLES))
        {
            cash -= UPGRADECOST_PARTICLES;
            levelParticles += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickShake()
    {
        if(quickCheckUpgrade(levelShake, UPGRADECOST_SHAKE))
        {
            cash -= UPGRADECOST_SHAKE;
            levelShake += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickDetails()
    {
        if(quickCheckUpgrade(levelDetails, UPGRADECOST_DETAILS))
        {
            cash -= UPGRADECOST_DETAILS;
            levelDetails += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickSound()
    {
        if(quickCheckUpgrade(levelSound, UPGRADECOST_SOUND))
        {
            cash -= UPGRADECOST_SOUND;
            levelSound += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickJuiciness()
    {
        if(quickCheckUpgrade(levelJuiciness, UPGRADECOST_JUICINESS))
        {
            cash -= UPGRADECOST_JUICINESS;
            levelJuiciness += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickSeeds()
    {
        if(quickCheckUpgrade(levelSeeds, UPGRADECOST_SEEDS))
        {
            cash -= UPGRADECOST_SEEDS;
            levelSeeds += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickTractor()
    {
        if(quickCheckUpgrade(levelTractor, UPGRADECOST_TRACTOR))
        {
            cash -= UPGRADECOST_TRACTOR;
            levelTractor += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickScarecrow()
    {
        if(quickCheckUpgrade(levelScarecrow, UPGRADECOST_SCARECROW))
        {
            cash -= UPGRADECOST_SCARECROW;
            levelScarecrow += 1;
            quickSound('ld45_upgrade');
        }
    }

    function clickPayDebt()
    {
        if(cash < DEBT)
        {
            convoEnqueue("s", "I haven't got enough money to pay off my debt yet...");
        }
        else
        {
            convoPayDebtEarly();
        }
    }

    function clickSleep()
    {
        // sleep until the next day

        if(today === END_DAY)
        {
            convoEndDay();
            return;
        }

        // increase the day
        today += 1;

        // reset energy
        energy = DEFAULT_ENERGY + levelTractor;

        // grow all saplings into trees, and seeds into saplings
        for(var i = 0; i < GRID_H; i++)
        {
            for(var j = 0; j < GRID_W; j++)
            {
                var pcList = plotContents[i][j];
                if(pcList.length > 0)
                {
                    var pc = pcList[0];
                    if(pc[0] === SAPLING) pc[0] = TREE;
                    else if(pc[0] === PLANTEDSEED) pc[0] = SAPLING;
                }
            }
        }

        if(today === 2)
        {
            convoSecondDay();
        }
        else if(today > 2)
        {
            convoEnqueue(null, "A new day. Energy restored.");
        }
    }

    ////////////////////////
    // BUTTON HOVER HANDLERS
    ////////////////////////

    function quickHoverText(level, cost, msg)
    {
        var s = "Level " + level.toString() + "/" + MAXLEVEL.toString() + " Cost $" + cost.toString() + "\n\n" + msg;
        setInfoText(s);
    }

    function hoverParticles()
    {
        quickHoverText(levelParticles, UPGRADECOST_PARTICLES, "Adds particles to your juice, and increases value and difficulty.");
    }

    function hoverShake()
    {
        quickHoverText(levelShake, UPGRADECOST_SHAKE, "Adds screen shake to your juice, and increases value and difficulty.");
    }

    function hoverDetails()
    {
        quickHoverText(levelDetails, UPGRADECOST_DETAILS, "Adds graphical details to your juice, and increases value and difficulty.");
    }

    function hoverSound()
    {
        quickHoverText(levelSound, UPGRADECOST_SOUND, "Adds sound and music to your juice, and increases value and difficulty.");
    }

    function hoverJuiciness()
    {
        quickHoverText(levelJuiciness, UPGRADECOST_JUICINESS, "Increases juice yield from each tree.");
    }

    function hoverSeeds()
    {
        quickHoverText(levelSeeds, UPGRADECOST_SEEDS, "Increases seeds from each tree.");
    }

    function hoverTractor()
    {
        quickHoverText(levelTractor, UPGRADECOST_TRACTOR, "Increases energy reserve.");
    }

    function hoverScarecrow()
    {
        quickHoverText(levelScarecrow, UPGRADECOST_SCARECROW, "Reduces difficulty.");
    }

    function hoverPayDebt()
    {
        setInfoText("Pay your debt.");
    }

    function hoverSleep()
    {
        setInfoText("Sleep until the next day.");
    }

    function handleHoverPlot(plotCell)
    {
        var pcList = plotContents[plotCell[0]][plotCell[1]];
        if(pcList.length === 0)
        {
            return;
        }
        var pc = pcList[0];
        var name = pc[0];
        if(name === SEED)
        {
            var s = "A seed. Drag it to an empty plot to plant it, or to your funds to sell it.\n\n" + "Sell value: $" + pc[2].toString();
            setInfoText(s);
        }
        else if(name === PLANTEDSEED)
        {
            setInfoText("A planted seed. A juicefruit tree will grow here.");
        }
        else if(name === SAPLING)
        {
            setInfoText("A sapling of a juicefruit tree. It is not ready to harvest.");
        }
        else if(name === TREE)
        {
            setInfoText("A juicefruit tree. Click it to harvest.");
        }
        else if(name === JUICE)
        {
            var s = "Juice. Drag it to your funds to sell it.\n\n" + "Sell value: $" + pc[2].toString();
            setInfoText(s);
        }
    }

    ////////////////
    // CONVERSATIONS
    ////////////////

    function convoIntro()
    {
        convoEnqueue("s", "Well, here I am! I'm finally free of the rat race. I'm going to turn this place into the best farm anyone's seen.");
        convoEnqueue("s", "I mean, I know life won't be perfect. But it's going to be a hell of a lot more satisfying than the crap I used to put up with.");
        convoEnqueue("r", "Hello, hello! You're the new owner of this farm land, aren't you? Welcome! This land you've got is very special!");
        convoEnqueue("s", "Hello! That's me! I'm Souviette. What's so special about this place?");
        convoEnqueue("r", "The ground here is very strange - normal fruits and vegetables won't grow on it.");
        convoEnqueue("s", "Wait, so I got ripped off? What am I supposed to do with farm land that won't grow anything? It's useless.");
        convoEnqueue("r", "Not useless at all! It might not support normal plants, but this soil has just the right ingredients to grow a very special tree...");
        convoEnqueue("r", "... the juicefruit tree.");
        convoEnqueue("s", "I've never heard of it. Are you telling porkies?");
        convoEnqueue("r", "Nope! Juicefruit trees are very lucrative - they produce juice - a crucial ingredient in computer games.");
        convoEnqueue("s", "It all sounds suss to me. Anyway, you never introduced yourself!");
        convoEnqueue("r", "Oh, that's right! I'm Rip, the Home Loan Gnome.");
        convoEnqueue("s", "A Home Loan Gnome? What does that mean?");
        convoEnqueue("r", "That means it's my job to pull your fingernails off if you don't pay your mortgage. Speaking of which...");
        convoEnqueue("r", "Your first payment is due. $2000. I'll just be taking that.");
        convoEnqueue("s", "!", function()
        {
            cash -= 2000;
            quickSound('ld45_cash');
        })
        convoEnqueue("r", "I'll be back at the end of the month for the remaining $" + DEBT + ".");
        convoEnqueue("s", "What! You took all my money! How am I supposed to build my farm now? I have nothing!");
        convoEnqueue("r", "Ah! You may have nothing today, but see that sapling out on your farm?");
        convoEnqueue("r", "Soon that will be a juicefruit tree - and you'll be on your way to a fortune. Farewell.");
        convoEnqueue("s", "...");
        convoEnqueue("s", "It's just a sapling... how am I supposed to pay my debt in one month?");
        convoEnqueue("s", "...");
        convoEnqueue("s", "There's nothing to do today. I haven't got any money, and there's no farming to do. I may as well go to sleep.");
    }

    function convoSecondDay()
    {
        convoEnqueue("s", "Hey, there's a huge tree on my farm! It was just a tiny sapling yesterday, and now it's enormous... and there's fruit!");
        convoEnqueue("s", "It's a pretty strange looking fruit. I might be able to harvest it.");
    }

    function convoFirstWonMinigame()
    {
        convoEnqueue("s", "I did it!");
        convoEnqueue("s", "It seems that the tree was destroyed in the harvesting process. But there is juice in its place.");
        convoEnqueue("s", "I should sell the juice by dragging it onto my funds.");
        convoEnqueue("s", "After I do that, I'll be able to access the seeds, and plant them by dragging them into new plots.");
    }

    function convoSecondWonMinigame()
    {
        convoEnqueue("s", "It was a successful harvest. The tree has been destroyed and there is juice and seeds in its place.");
        convoEnqueue("s", "If I sell enough juice, I'll be able to upgrade my farm. I should investigate those upgrades.");
    }

    function convoWonMinigame()
    {
        convoEnqueue("s", "It was a successful harvest. The tree has been destroyed and there is juice and seeds in its place.");
    }

    function convoLostMinigame()
    {
        convoEnqueue("s", "The harvest failed. Fortunately, the tree is still standing, so I can try again until I run out of energy.");
    }

    function convoPayDebtEarly()
    {
        convoEnqueue("r", "Yes... you wanted to speak to me?");
        convoEnqueue("s", "I'm ready to pay off my debt. Here.");
        convoEnqueue("r", "Let's see here...");
        convoWinGame();
    }

    function convoEndDay()
    {
        convoEnqueue("r", "Hello again, Souviette!");
        convoEnqueue("s", "Ah! It's the last day of the month...");
        convoEnqueue("r", "That means your debt is due!");
        convoEnqueue("r", "Let's see if you have enough...");
        if(cash >= DEBT)
        {
            convoWinGame();
        }
        else
        {
            convoEnqueue("r", "It's not enough! That means you failed.");
            convoEnqueue("s", "Oh no... now I'll lose my fingernails... and the farm!");
            convoEnqueue(null, null, doGameOver);
        }
    }

    function convoWinGame()
    {
        convoEnqueue("r", "Yes - I think that's everything!", function()
        {
            cash -= DEBT;
            quickSound('ld45_cash');
        })
        convoEnqueue("r", "Looks like you're a talented juicefruit farmer! I think your farm will be extremely distinguished in the years to come.");
        convoEnqueue("s", "...");
        convoEnqueue("s", "Actually... I think I might not do this for much longer. I will probably sell the farm.");
        convoEnqueue("s", "It hasn't been the idyllic experience I was imagining.");
        convoEnqueue("r", "Oh no! That's a shame to hear. Of course, it's understandable. Running a juicefruit farm can be exhausting.");
        convoEnqueue("r", "Of course, it was much easier in the old days.");
        convoEnqueue("s", "You mean... before the apocalypse when we all got turned into disembodied heads?");
        convoEnqueue("r", "Yes. Back then if you wanted some fruit, you'd just walk over and pick it up. None of this bouncing around.");
        convoEnqueue("s", "I suppose it must have been. Well, it's been an enriching experience, anyway.");
        convoEnqueue("r", "Lovely to hear. Thanks for all the money!");

        convoEnqueue(null, null, doGameOver);
    }

})();
