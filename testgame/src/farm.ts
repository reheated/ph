declare interface Window {
    buttonDrawer: PH.CanvasButtonDrawer;
    canvasTransformer: PH.CanvasTransformer;
    spriteBoxNormal: PH.SpriteBox;
    spriteBoxButton: PH.SpriteBox;
    spriteBoxPlot: PH.SpriteBox;
    spriteBoxConvo: PH.SpriteBox;
    mainFont: PH.Font;
    convoEnqueue: (speaker: string | null, msg: string | null, callback: (() => void) | void) => void;
    startFarm: () => void;
    startMinigame: (shakeLevel: number, particleLevel: number, detailLevel: number, soundLevel: number, difficultyLevel: number) => void;
    endMinigame: (won: boolean) => void;
    doGameOver: () => void;
    curTime: () => number;
    convoScene: ConvoScene;
}

type Cell = [number, number];

class PlotContents {
    desc: string;
    count: number;
    value: number;

    constructor(desc: string, count: number, value: number) {
        this.desc = desc;
        this.count = count;
        this.value = value;
    }
}

class FarmScene extends PH.Scene {

    GRID_H: number = 4;
    GRID_W: number = 4;
    FARM_TOP: number = 18;
    FARM_LEFT: number = 33;
    DEBT: number = 8000;
    MAXLEVEL: number = 5;
    DEFAULT_ENERGY: number = 3;
    END_DAY: number = 28;

    UPGRADECOST_PARTICLES: number = 100;
    UPGRADECOST_SHAKE: number = 100;
    UPGRADECOST_DETAILS: number = 100;
    UPGRADECOST_SOUND: number = 100;
    UPGRADECOST_JUICINESS: number = 500;
    UPGRADECOST_SEEDS: number = 250;
    UPGRADECOST_TRACTOR: number = 200;
    UPGRADECOST_SCARECROW: number = 100;

    SEED: string = "SEED";
    PLANTEDSEED: string = "PLANTEDSEED";
    SAPLING: string = "SAPLING";
    TREE: string = "TREE";
    JUICE: string = "JUICE";
    DRAGGABLE: string[] = [this.SEED, this.JUICE];

    CASHRECT: [number, number, number, number] = [160, 4, 92, 16];

    ctx: CanvasRenderingContext2D;
    resources: PH.Resources;
    uiLayer: PH.CanvasUILayer | null = null;
    hoverCallbacks: { [key: string]: () => void } = {};

    cash: number = 2000;
    energy: number;
    mouseOverPlot: Cell | null = null;
    mouseDownOverPlot: Cell | null = null;
    mouseDragPlot: Cell | null = null;
    plotContents: PlotContents[][][];
    plotImageDict: { [key: string]: any } | null = null;
    harvestingCell: Cell | null = null;

    // current stats
    levelParticles: number = 0;
    levelShake: number = 0;
    levelDetails: number = 0;
    levelSound: number = 0;
    levelJuiciness: number = 0;
    levelSeeds: number = 0;
    levelTractor: number = 0;
    levelScarecrow: number = 0;

    today: number = 1;
    timesMinigameWon: number = 0;

    farmMusic: AudioBufferSourceNode | null = null;

    INFO_TEXT_WIDTH: number = 148;
    infoTextLines: string[] = [];

    constructor(ctx: CanvasRenderingContext2D, resources: PH.Resources) {
        super();
        this.energy = this.DEFAULT_ENERGY;

        this.plotContents = [];
        for (var i = 0; i < this.GRID_H; i++) {
            this.plotContents[i] = [];
            for (var j = 0; j < this.GRID_W; j++) {
                this.plotContents[i][j] = [];
            }
        }
        this.plotContents[1][1].push(new PlotContents(this.SAPLING, 1, 0));

        this.convoIntro();


        this.resources = resources;
        this.ctx = ctx;
    }

    public init() {
        this.uiLayer = new PH.CanvasUILayer(this.ctx.canvas);
        this.hoverCallbacks = {};

        // Buttons for upgrades
        this.registerButton(164, 40, 72, 16, () => this.clickParticles(), () => this.hoverParticles(), "Particles"); // particles
        this.registerButton(240, 40, 72, 16, () => this.clickShake(), () => this.hoverShake(), "Shake"); // shake

        this.registerButton(164, 60, 72, 16, () => this.clickDetails(), () => this.hoverDetails(), "Details"); // details
        this.registerButton(240, 60, 72, 16, () => this.clickSound(), () => this.hoverSound(), "Sound"); // sound

        this.registerButton(164, 80, 72, 16, () => this.clickJuiciness(), () => this.hoverJuiciness(), "Juiciness"); // juiciness
        this.registerButton(240, 80, 72, 16, () => this.clickSeeds(), () => this.hoverSeeds(), "Seeds"); // seeds

        this.registerButton(164, 100, 72, 16, () => this.clickTractor(), () => this.hoverTractor(), "Tractor"); // tractor
        this.registerButton(240, 100, 72, 16, () => this.clickScarecrow(), () => this.hoverScarecrow(), "Scarecrow"); // scarecrow

        // Buttons for actions
        this.registerButton(100, 146, 52, 16, () => this.clickPayDebt(), () => this.hoverPayDebt(), "Pay Debt"); // pay debt
        this.registerButton(100, 168, 52, 16, () => this.clickSleep(), () => this.hoverSleep(), "Sleep"); // next day

        // set up image references
        this.plotImageDict = {
            SEED: this.resources.data.seed,
            PLANTEDSEED: this.resources.data.plantedseed,
            SAPLING: this.resources.data.sapling,
            TREE: this.resources.data.tree,
            JUICE: this.resources.data.juice
        }
        this.startMusic();
    }

    startMusic() {
        this.farmMusic = this.resources.playSound(this.resources.data['ld45_farm'], true);
    }

    stopMusic() {
        if (this.farmMusic !== null) {
            this.resources.stopSound(this.farmMusic);
            this.farmMusic = null;
        }
    }

    registerButton(l: number, t: number, w: number, h: number,
        clickCallback: () => void, hoverCallback: () => void, text: string) {
        var b = new PH.CanvasButton(this.ctx, l, t, w, h,
            clickCallback, text, window.buttonDrawer);
        this.uiLayer!.addButton(b);
        this.hoverCallbacks[text] = hoverCallback;
    }

    updateMouseOverPlot() {
        if (window.canvasTransformer.mousePos === null) {
            this.mouseOverPlot = null;
            this.mouseDownOverPlot = null;
            return;
        }
        let [x, y] = window.canvasTransformer.mousePos;
        for (var i = 0; i < this.GRID_H; i++) {
            for (var j = 0; j < this.GRID_W; j++) {
                var l = j * 22 + this.FARM_LEFT;
                var t = i * 22 + this.FARM_TOP;
                if (x >= l && x < l + 18 && y >= t && y < t + 18) {
                    this.mouseOverPlot = [i, j];
                    this.handleHoverPlot(this.mouseOverPlot);
                    if (this.mouseDownOverPlot !== null &&
                        (i !== this.mouseDownOverPlot[0] || j !== this.mouseDownOverPlot[1])) {
                        this.mouseDownOverPlot = null;
                    }
                    return;
                }
            }
        }
        this.mouseOverPlot = null;
        this.mouseDownOverPlot = null;
        return;
    }

    drawPlots() {
        // draw the underlying plot rectangles
        for (var i = 0; i < this.GRID_H; i++) {
            for (var j = 0; j < this.GRID_W; j++) {
                var x = j * 22 + this.FARM_LEFT;
                var y = i * 22 + this.FARM_TOP;
                window.spriteBoxPlot.draw(this.ctx, x, y, 20, 20);
            }
        }

        // draw the first contents on every cell
        for (var i = 0; i < this.GRID_H; i++) {
            for (var j = 0; j < this.GRID_W; j++) {
                var pcList = this.plotContents[i][j];
                if (pcList.length == 0) continue;
                var pc = pcList[0];
                var x = j * 22 + this.FARM_LEFT + 2;
                var y = i * 22 + this.FARM_TOP + 2;
                this.ctx.drawImage(this.plotImageDict![pc.desc], x, y);
                // if the count is more than 1, draw it
                if (pc.count > 1) {
                    window.mainFont.drawText(this.ctx, pc.count.toString(), x + 10, y);
                }
            }
        }
    }

    setInfoText(text: string) {
        var splitLines = text.split("\n");
        this.infoTextLines = [];
        for (var k = 0; k < splitLines.length; k++) {
            // word-wrap each line
            var wrapped = window.mainFont.wordWrap(splitLines[k], this.INFO_TEXT_WIDTH);
            for (var l = 0; l < wrapped.length; l++) {
                this.infoTextLines.push(wrapped[l]);
            }
            if (wrapped.length == 0) {
                this.infoTextLines.push("");
            }
        }
    }

    drawInfoText() {
        window.mainFont.drawMultiLineText(this.ctx, this.infoTextLines, 164, 128);
    }

    drawCalendar() {
        var l = 10;
        var t = 136;

        this.ctx.drawImage(this.resources.data.calendar, l, t);

        var week = Math.floor((this.today - 1) / 7);
        var dow = (this.today - 1) % 7;
        this.ctx.drawImage(this.resources.data.calendarhighlight, l + 12 * dow, t + 12 * week);
    }

    public draw() {
        // Draw the farm plots
        window.spriteBoxNormal.draw(this.ctx, 4, 4, 152, 104);
        window.mainFont.drawText(this.ctx, "Farm plots", 8, 8);

        this.drawPlots();

        // Draw the calendar
        window.spriteBoxNormal.draw(this.ctx, 4, 112, 152, 84);
        window.mainFont.drawText(this.ctx, "Calendar", 8, 116);
        this.drawCalendar();

        // Draw the cash display
        window.spriteBoxButton.draw(this.ctx, ...this.CASHRECT);
        this.ctx.drawImage(this.resources.data.cash, 160, 4);
        var s = this.cash.toString();
        var sx = 248 - 7 * s.length;
        window.mainFont.drawText(this.ctx, s, sx, 8);

        // Draw the energy display
        window.spriteBoxNormal.draw(this.ctx, 256, 4, 60, 16);
        this.ctx.drawImage(this.resources.data.energy, 256, 4);
        var s = this.energy.toString();
        var sx = 312 - 7 * s.length;
        window.mainFont.drawText(this.ctx, s, sx, 8);

        // Draw the upgrades box
        window.spriteBoxNormal.draw(this.ctx, 160, 24, 156, 96);
        window.mainFont.drawText(this.ctx, "Upgrades", 164, 28);

        // Draw the info box
        window.spriteBoxNormal.draw(this.ctx, 160, 124, 156, 72);
        this.drawInfoText();

        // Draw all buttons
        this.uiLayer!.drawButtons();

        // Draw text
        window.mainFont.drawText(this.ctx, "Debt:", 104, 118);
        window.mainFont.drawText(this.ctx, "$" + this.DEBT.toString(), 104, 134);

        // draw anything that's being dragged
        if (this.mouseDragPlot !== null && window.canvasTransformer.mousePos !== null) {
            var pcList = this.plotContents[this.mouseDragPlot[0]][this.mouseDragPlot[1]];
            if (pcList.length !== 0) {
                var pc = pcList[0];
                this.ctx.drawImage(this.plotImageDict![pc.desc],
                    window.canvasTransformer.mousePos[0] - 11, window.canvasTransformer.mousePos[1] - 11);
            }
        }

    }

    public update(deltat: number): boolean {
        this.infoTextLines = [];
        this.updateMouseOverPlot();

        let b = this.uiLayer!.mouseOverButton;
        if (b !== null) {
            let callback = this.hoverCallbacks[b.text];
            if (callback !== null) callback();
        }
        return true;
    }

    public handleMouseDown(): boolean {
        this.uiLayer!.handleMouseDown();
        this.mouseDownOverPlot = this.mouseOverPlot; // ditto.

        if (this.mouseOverPlot !== null) {
            var pcList = this.plotContents[this.mouseOverPlot[0]][this.mouseOverPlot[1]];
            if (pcList.length !== 0) {
                var pc = pcList[0];
                if (this.DRAGGABLE.indexOf(pc.desc) >= 0) {
                    this.mouseDragPlot = this.mouseOverPlot;
                }
                else {
                    this.mouseDragPlot = null;
                }
            }
        }
        return false;
    }

    getSeedTreeCount() {
        var count = 0;
        for (var i = 0; i < this.GRID_H; i++) {
            for (var j = 0; j < this.GRID_W; j++) {
                var pcList = this.plotContents[i][j];
                for (var k = 0; k < pcList.length; k++) {
                    var pc = pcList[k];
                    if (pc.desc == this.SEED || pc.desc == this.PLANTEDSEED ||
                        pc.desc == this.SAPLING || pc.desc == this.TREE) {
                        count += pc.count;
                    }
                }
            }
        }
        return count;
    }

    trySell(plotCell: Cell) {
        // try to sell the contents of the plot
        var pcList = this.plotContents[plotCell[0]][plotCell[1]];
        if (pcList.length === 0) {
            return;
        }
        var pc = pcList[0];

        // if this is a seed, check that we aren't selling our last seed/sapling/tree.
        // return early and let the player know
        if (pc.desc === this.SEED) {
            var stc = this.getSeedTreeCount();
            if (stc <= 1) {
                window.convoScene.convoEnqueue("s", "I don't have any trees - I won't sell my last seed!");
                return;
            }
        }

        // make the sale
        this.cash += pc.value;
        pc.count -= 1;
        if (pc.count <= 0) {
            pcList.splice(0, 1);
        }
        this.resources.playSound(this.resources.data['ld45_cash'], false);
    }

    tryPlant(srcPlot: Cell, destPlot: Cell) {
        // first check the conditions:
        // - must be planting a seed
        // - must plant it in an empty plot
        var srcPcList = this.plotContents[srcPlot[0]][srcPlot[1]];
        if (srcPcList.length === 0) {
            return;
        }
        var srcPc = srcPcList[0];

        if (srcPc.desc !== this.SEED) return; // can only plant seeds

        var destPcList = this.plotContents[destPlot[0]][destPlot[1]];
        if (destPcList.length > 0) return; // can only plant in an empty plot

        // all our conditions are met - let's do it
        // remove a seed from the source plot
        srcPc.count -= 1;
        if (srcPc.count <= 0) {
            srcPcList.splice(0, 1);
        }
        // put a planted seed in the destination
        destPcList.push(new PlotContents(this.PLANTEDSEED, 1, 0));

        this.resources.playSound(this.resources.data['ld45_plant'], false);
    }

    handleDragPlot(srcPlot: Cell, mouseReleaseCoords: [number, number]) {
        let [x, y] = mouseReleaseCoords;

        // coords of the box where you can drop things to sell them
        let [l, t, w, h] = this.CASHRECT;
        if (x >= l && x < l + w && y >= t && y < t + h) {
            // trying to sell a seed or juice
            this.trySell(srcPlot);
        }
        else if (this.mouseOverPlot !== null) {
            // trying to plant a seed?
            this.tryPlant(srcPlot, this.mouseOverPlot);
        }
    }

    handleMouseUp(): boolean {
        this.uiLayer!.handleMouseUp();

        let mp = window.canvasTransformer.mousePos;
        if (this.mouseDragPlot !== null && mp !== null) {
            this.handleDragPlot(this.mouseDragPlot, mp);
        }
        this.mouseDragPlot = null;
        return false;
    }

    handleMouseMove() {
        this.uiLayer!.handleMouseMove(window.canvasTransformer.mousePos);
        return true;
    }

    ///////////////////////////////
    // HANDLING CLICKS ON THE PLOTS
    ///////////////////////////////

    public handleClick(): boolean {
        if (this.mouseOverPlot !== null) {
            // avoid triggering this when we moused down somewhere else and moused up here
            if (this.mouseDownOverPlot === null ||
                this.mouseDownOverPlot[0] !== this.mouseOverPlot[0] ||
                this.mouseDownOverPlot[1] !== this.mouseOverPlot[1]) {
                return false;
            }
            // check if this is a tree that we can harvest
            var pcList = this.plotContents[this.mouseOverPlot[0]][this.mouseOverPlot[1]];
            if (pcList.length === 0) {
                return false;
            }
            var pc = pcList[0];
            if (pc.desc === this.TREE) {
                this.tryHarvest(this.mouseOverPlot)
            }
        }
        return false;
    }

    tryHarvest(plotCell: Cell) {
        // check that we have enough energy
        if (this.energy <= 0) {
            window.convoScene.convoEnqueue("s", "I haven't got enough energy. I need to sleep.");
            return;
        }

        // compute the difficulty
        var difficulty = this.levelShake + this.levelParticles + this.levelDetails + this.levelSound;
        difficulty -= 2 * this.levelScarecrow;
        difficulty = Math.max(0, difficulty);

        // actually do the harvest
        this.energy -= 1;
        this.harvestingCell = plotCell;
        this.stopMusic();
        window.startMinigame(this.levelShake, this.levelParticles, this.levelDetails, this.levelSound, difficulty);
    }

    public continue(won: boolean) {
        // Continue farm mode, after a minigame. won is set to true if the player won.
        if (won) {
            // remove the tree, put in the seeds, and put in the juices.
            var numSeeds = 2 + this.levelSeeds;
            var seedValue = 5;
            var numJuices = 2 + this.levelJuiciness;
            var juiceValue = 10 * (2 + this.levelShake + this.levelParticles + this.levelDetails + this.levelSound);
            var pcList = [new PlotContents(this.JUICE, numJuices, juiceValue), new PlotContents(this.SEED, numSeeds, seedValue)];
            this.plotContents[this.harvestingCell![0]][this.harvestingCell![1]] = pcList;

            this.timesMinigameWon += 1;
            if (this.timesMinigameWon === 1) {
                this.convoFirstWonMinigame();
            }
            else if (this.timesMinigameWon === 2) {
                this.convoSecondWonMinigame();
            }
            else {
                this.convoWonMinigame();
            }
        }
        else {
            this.convoLostMinigame();
        }

        this.harvestingCell = null;
    }

    ////////////////////////
    // BUTTON PRESS HANDLERS
    ////////////////////////

    payUpgradeCost(level: number, cost: number) {
        if (level >= this.MAXLEVEL) {
            window.convoScene.convoEnqueue("s", "I can't upgrade this any further.");
            return false;
        }
        else if (cost > this.cash) {
            window.convoScene.convoEnqueue("s", "I haven't got enough money for that upgrade.");
            return false;
        }
        else {
            this.cash -= cost;
            this.resources.playSound(this.resources.data['ld45_upgrade'], false);
            return true;
        }
    }

    clickParticles() {
        if (this.payUpgradeCost(this.levelParticles, this.UPGRADECOST_PARTICLES))
            this.levelParticles += 1;
    }

    clickShake() {
        if (this.payUpgradeCost(this.levelShake, this.UPGRADECOST_SHAKE))
            this.levelShake += 1;
    }

    clickDetails() {
        if (this.payUpgradeCost(this.levelDetails, this.UPGRADECOST_DETAILS))
            this.levelDetails += 1;
    }

    clickSound() {
        if (this.payUpgradeCost(this.levelSound, this.UPGRADECOST_SOUND))
            this.levelSound += 1;
    }

    clickJuiciness() {
        if (this.payUpgradeCost(this.levelJuiciness, this.UPGRADECOST_JUICINESS))
            this.levelJuiciness += 1;
    }

    clickSeeds() {
        if (this.payUpgradeCost(this.levelSeeds, this.UPGRADECOST_SEEDS))
            this.levelSeeds += 1;
    }

    clickTractor() {
        if (this.payUpgradeCost(this.levelTractor, this.UPGRADECOST_TRACTOR))
            this.levelTractor += 1;
    }

    clickScarecrow() {
        if (this.payUpgradeCost(this.levelScarecrow, this.UPGRADECOST_SCARECROW))
            this.levelScarecrow += 1;
    }

    clickPayDebt() {
        if (this.cash < this.DEBT) {
            window.convoScene.convoEnqueue("s", "I haven't got enough money to pay off my debt yet...");
        }
        else {
            this.convoPayDebtEarly();
        }
    }

    clickSleep() {
        // sleep until the next day

        if (this.today === this.END_DAY) {
            this.convoEndDay();
            return;
        }

        // increase the day
        this.today += 1;

        // reset energy
        this.energy = this.DEFAULT_ENERGY + this.levelTractor;

        // grow all saplings into trees, and seeds into saplings
        for (var i = 0; i < this.GRID_H; i++) {
            for (var j = 0; j < this.GRID_W; j++) {
                var pcList = this.plotContents[i][j];
                if (pcList.length > 0) {
                    var pc = pcList[0];
                    if (pc.desc === this.SAPLING) pc.desc = this.TREE;
                    else if (pc.desc === this.PLANTEDSEED) pc.desc = this.SAPLING;
                }
            }
        }

        if (this.today === 2) {
            this.convoSecondDay();
        }
        else if (this.today > 2) {
            window.convoScene.convoEnqueue(null, "A new day. Energy restored.");
        }
    }

    ////////////////////////
    // BUTTON HOVER HANDLERS
    ////////////////////////

    quickHoverText(level: number, cost: number, msg: string) {
        var s = "Level " + level.toString() + "/" + this.MAXLEVEL.toString() + " Cost $" + cost.toString() + "\n\n" + msg;
        this.setInfoText(s);
    }

    hoverParticles() {
        this.quickHoverText(this.levelParticles, this.UPGRADECOST_PARTICLES, "Adds particles to your juice, and increases value and difficulty.");
    }

    hoverShake() {
        this.quickHoverText(this.levelShake, this.UPGRADECOST_SHAKE, "Adds screen shake to your juice, and increases value and difficulty.");
    }

    hoverDetails() {
        this.quickHoverText(this.levelDetails, this.UPGRADECOST_DETAILS, "Adds graphical details to your juice, and increases value and difficulty.");
    }

    hoverSound() {
        this.quickHoverText(this.levelSound, this.UPGRADECOST_SOUND, "Adds sound and music to your juice, and increases value and difficulty.");
    }

    hoverJuiciness() {
        this.quickHoverText(this.levelJuiciness, this.UPGRADECOST_JUICINESS, "Increases juice yield from each tree.");
    }

    hoverSeeds() {
        this.quickHoverText(this.levelSeeds, this.UPGRADECOST_SEEDS, "Increases seeds from each tree.");
    }

    hoverTractor() {
        this.quickHoverText(this.levelTractor, this.UPGRADECOST_TRACTOR, "Increases energy reserve.");
    }

    hoverScarecrow() {
        this.quickHoverText(this.levelScarecrow, this.UPGRADECOST_SCARECROW, "Reduces difficulty.");
    }

    hoverPayDebt() {
        this.setInfoText("Pay your debt.");
    }

    hoverSleep() {
        this.setInfoText("Sleep until the next day.");
    }

    handleHoverPlot(plotCell: Cell) {
        var pcList = this.plotContents[plotCell[0]][plotCell[1]];
        if (pcList.length === 0) {
            return;
        }
        var pc = pcList[0];
        var name = pc.desc;
        if (name === this.SEED) {
            var s = "A seed. Drag it to an empty plot to plant it, or to your funds to sell it.\n\n" + "Sell value: $" + pc.value.toString();
            this.setInfoText(s);
        }
        else if (name === this.PLANTEDSEED) {
            this.setInfoText("A planted seed. A juicefruit tree will grow here.");
        }
        else if (name === this.SAPLING) {
            this.setInfoText("A sapling of a juicefruit tree. It is not ready to harvest.");
        }
        else if (name === this.TREE) {
            this.setInfoText("A juicefruit tree. Click it to harvest.");
        }
        else if (name === this.JUICE) {
            var s = "Juice. Drag it to your funds to sell it.\n\n" + "Sell value: $" + pc.value.toString();
            this.setInfoText(s);
        }
    }

    ////////////////
    // CONVERSATIONS
    ////////////////

    convoIntro() {
        window.convoScene.convoEnqueue("s", "Well, here I am! I'm finally free of the rat race. I'm going to turn this place into the best farm anyone's seen.");
        window.convoScene.convoEnqueue("s", "I mean, I know life won't be perfect. But it's going to be a hell of a lot more satisfying than the crap I used to put up with.");
        window.convoScene.convoEnqueue("r", "Hello, hello! You're the new owner of this farm land, aren't you? Welcome! This land you've got is very special!");
        window.convoScene.convoEnqueue("s", "Hello! That's me! I'm Souviette. What's so special about this place?");
        window.convoScene.convoEnqueue("r", "The ground here is very strange - normal fruits and vegetables won't grow on it.");
        window.convoScene.convoEnqueue("s", "Wait, so I got ripped off? What am I supposed to do with farm land that won't grow anything? It's useless.");
        window.convoScene.convoEnqueue("r", "Not useless at all! It might not support normal plants, but this soil has just the right ingredients to grow a very special tree...");
        window.convoScene.convoEnqueue("r", "... the juicefruit tree.");
        window.convoScene.convoEnqueue("s", "I've never heard of it. Are you telling porkies?");
        window.convoScene.convoEnqueue("r", "Nope! Juicefruit trees are very lucrative - they produce juice - a crucial ingredient in computer games.");
        window.convoScene.convoEnqueue("s", "It all sounds suss to me. Anyway, you never introduced yourself!");
        window.convoScene.convoEnqueue("r", "Oh, that's right! I'm Rip, the Home Loan Gnome.");
        window.convoScene.convoEnqueue("s", "A Home Loan Gnome? What does that mean?");
        window.convoScene.convoEnqueue("r", "That means it's my job to pull your fingernails off if you don't pay your mortgage. Speaking of which...");
        window.convoScene.convoEnqueue("r", "Your first payment is due. $2000. I'll just be taking that.");
        window.convoScene.convoEnqueue("s", "!", () => {
            this.cash -= 2000;
            this.resources.playSound(this.resources.data['ld45_cash'], false);
        })
        window.convoScene.convoEnqueue("r", "I'll be back at the end of the month for the remaining $" + this.DEBT + ".");
        window.convoScene.convoEnqueue("s", "What! You took all my money! How am I supposed to build my farm now? I have nothing!");
        window.convoScene.convoEnqueue("r", "Ah! You may have nothing today, but see that sapling out on your farm?");
        window.convoScene.convoEnqueue("r", "Soon that will be a juicefruit tree - and you'll be on your way to a fortune. Farewell.");
        window.convoScene.convoEnqueue("s", "...");
        window.convoScene.convoEnqueue("s", "It's just a sapling... how am I supposed to pay my debt in one month?");
        window.convoScene.convoEnqueue("s", "...");
        window.convoScene.convoEnqueue("s", "There's nothing to do today. I haven't got any money, and there's no farming to do. I may as well go to sleep.");
    }

    convoSecondDay() {
        window.convoScene.convoEnqueue("s", "Hey, there's a huge tree on my farm! It was just a tiny sapling yesterday, and now it's enormous... and there's fruit!");
        window.convoScene.convoEnqueue("s", "It's a pretty strange looking fruit. I might be able to harvest it.");
    }

    convoFirstWonMinigame() {
        window.convoScene.convoEnqueue("s", "I did it!");
        window.convoScene.convoEnqueue("s", "It seems that the tree was destroyed in the harvesting process. But there is juice in its place.");
        window.convoScene.convoEnqueue("s", "I should sell the juice by dragging it onto my funds.");
        window.convoScene.convoEnqueue("s", "After I do that, I'll be able to access the seeds, and plant them by dragging them into new plots.");
    }

    convoSecondWonMinigame() {
        window.convoScene.convoEnqueue("s", "It was a successful harvest. The tree has been destroyed and there is juice and seeds in its place.");
        window.convoScene.convoEnqueue("s", "If I sell enough juice, I'll be able to upgrade my farm. I should investigate those upgrades.");
    }

    convoWonMinigame() {
        window.convoScene.convoEnqueue("s", "It was a successful harvest. The tree has been destroyed and there is juice and seeds in its place.");
    }

    convoLostMinigame() {
        window.convoScene.convoEnqueue("s", "The harvest failed. Fortunately, the tree is still standing, so I can try again until I run out of energy.");
    }

    convoPayDebtEarly() {
        window.convoScene.convoEnqueue("r", "Yes... you wanted to speak to me?");
        window.convoScene.convoEnqueue("s", "I'm ready to pay off my debt. Here.");
        window.convoScene.convoEnqueue("r", "Let's see here...");
        this.convoWinGame();
    }

    convoEndDay() {
        window.convoScene.convoEnqueue("r", "Hello again, Souviette!");
        window.convoScene.convoEnqueue("s", "Ah! It's the last day of the month...");
        window.convoScene.convoEnqueue("r", "That means your debt is due!");
        window.convoScene.convoEnqueue("r", "Let's see if you have enough...");
        if (this.cash >= this.DEBT) {
            this.convoWinGame();
        }
        else {
            window.convoScene.convoEnqueue("r", "It's not enough! That means you failed.");
            window.convoScene.convoEnqueue("s", "Oh no... now I'll lose my fingernails... and the farm!");
            window.convoScene.convoEnqueue(null, null, () => window.doGameOver);
        }
    }

    convoWinGame() {
        window.convoScene.convoEnqueue("r", "Yes - I think that's everything!", () => {
            this.cash -= this.DEBT;
            this.resources.playSound(this.resources.data['ld45_cash'], false);
        })
        window.convoScene.convoEnqueue("r", "Looks like you're a talented juicefruit farmer! I think your farm will be extremely distinguished in the years to come.");
        window.convoScene.convoEnqueue("s", "...");
        window.convoScene.convoEnqueue("s", "Actually... I think I might not do this for much longer. I will probably sell the farm.");
        window.convoScene.convoEnqueue("s", "It hasn't been the idyllic experience I was imagining.");
        window.convoScene.convoEnqueue("r", "Oh no! That's a shame to hear. Of course, it's understandable. Running a juicefruit farm can be exhausting.");
        window.convoScene.convoEnqueue("r", "Of course, it was much easier in the old days.");
        window.convoScene.convoEnqueue("s", "You mean... before the apocalypse when we all got turned into disembodied heads?");
        window.convoScene.convoEnqueue("r", "Yes. Back then if you wanted some fruit, you'd just walk over and pick it up. None of this bouncing around.");
        window.convoScene.convoEnqueue("s", "I suppose it must have been. Well, it's been an enriching experience, anyway.");
        window.convoScene.convoEnqueue("r", "Lovely to hear. Thanks for all the money!");

        window.convoScene.convoEnqueue(null, null, () => window.doGameOver);
    }

}
