// Skill descriptions are in the following form:
// key: name on the button
// value: [cost of upgrade, hover message].
let SKILL_DESCS: { [key: string]: [number, string] } = {
    "Particles": [100, "Add particles to your juice; increase value & difficulty."],
    "Shake": [100, "Add screen shake to your juice; increase value & difficulty."],
    "Details": [100, "Add graphical details to your juice; increase value & difficulty."],
    "Sound": [100, "Add sound & music to your juice; increase value & difficulty."],
    "Juiciness": [500, "Increase juice yield from each tree."],
    "Seeds": [250, "Increase seeds from each tree."],
    "Tractor": [200, "Increase energy reserve."],
    "Scarecrow": [100, "Reduce difficulty."]
};

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

class Skill {
    name: string;
    level: number = 0;
    cost: number;
    msg: string;

    constructor(name: string, cost: number, msg: string) {
        this.name = name;
        this.cost = cost;
        this.msg = msg;
    }
}

class FarmLayer extends PH.Layer {

    GRID_H: number = 4;
    GRID_W: number = 4;
    FARM_TOP: number = 18;
    FARM_LEFT: number = 33;
    DEBT: number = 8000;
    MAXLEVEL: number = 5;
    DEFAULT_ENERGY: number = 3;
    END_DAY: number = 28;

    SEED: string = "SEED";
    PLANTEDSEED: string = "PLANTEDSEED";
    SAPLING: string = "SAPLING";
    TREE: string = "TREE";
    JUICE: string = "JUICE";
    DRAGGABLE: string[] = [this.SEED, this.JUICE];

    cashRect = new PH.Rect(160, 4, 92, 16);

    game: Game;
    uiLayer: PH.CanvasUILayer;
    hoverCallbacks = new Map<any, (tag: any) => void>();

    mouseOverPlot: Cell | null = null;
    mouseDownOverPlot: Cell | null = null;
    mouseDragPlot: Cell | null = null;
    plotContents: PlotContents[][][];
    plotImageDict: { [key: string]: any } | null = null;
    harvestingCell: Cell | null = null;

    // current stats
    cash: number = 2000;
    energy: number;
    skills: { [key: string]: Skill };
    today: number = 1;
    timesMinigameWon: number = 0;

    farmMusic: AudioBufferSourceNode | null = null;

    INFO_TEXT_WIDTH: number = 148;
    infoTextLines: string[] = [];

    constructor(game: Game) {
        super();
        this.game = game;
        this.energy = this.DEFAULT_ENERGY;

        this.plotContents = [];
        for (var i = 0; i < this.GRID_H; i++) {
            this.plotContents[i] = [];
            for (var j = 0; j < this.GRID_W; j++) {
                this.plotContents[i][j] = [];
            }
        }
        this.plotContents[1][1].push(new PlotContents(this.SAPLING, 1, 0));

        this.uiLayer = new PH.CanvasUILayer(this.game.pixelationLayer);

        // Skills and upgrade buttons
        this.skills = {};
        let skillNames = Object.keys(SKILL_DESCS);
        for (let k = 0; k < skillNames.length; k++) {
            let skillName = skillNames[k];
            let bl = 164 + 76 * (k % 2);
            let bt = 40 + 20 * Math.floor(k / 2);
            let skill = new Skill(skillName, SKILL_DESCS[skillName][0], SKILL_DESCS[skillName][1]);
            this.skills[skillName] = skill;
            this.registerButton(bl, bt, 72, 16, (b, mb) => this.clickUpgrade(b.tag, mb), (b) => this.hoverUpgrade(b.tag), skillName, skill);
        }

        // Buttons for actions
        this.registerButton(100, 146, 52, 16, () => this.clickPayDebt(), () => this.hoverPayDebt(), "Pay Debt"); // pay debt
        this.registerButton(100, 168, 52, 16, () => this.clickSleep(), () => this.hoverSleep(), "Sleep"); // next day

        // set up image references
        this.plotImageDict = {
            SEED: this.game.data.seed,
            PLANTEDSEED: this.game.data.plantedseed,
            SAPLING: this.game.data.sapling,
            TREE: this.game.data.tree,
            JUICE: this.game.data.juice
        }

    }

    firstTime() {
        this.convoIntro();
    }

    handleLayerAdded() {
        this.game.jukeBox.setMusic(this.game.data['ld45_farm']);
    }

    handleKeyUp() {
        let sp = this.game.soundPlayer;
        sp.toggle();
        return false;
    }

    registerButton(l: number, t: number, w: number, h: number,
        clickCallback: (tag: any, mb: number) => void, hoverCallback: (tag: any) => void, text: string,
        tag?: any) {
        var b = new PH.CanvasButton(this.game.ctx, l, t, w, h,
            clickCallback, text, this.game.buttonDrawer!, [0, 2], tag);
        this.uiLayer!.addButton(b);
        this.hoverCallbacks.set(b, hoverCallback);
    }

    updateMouseOverPlot() {
        if (this.game.pixelationLayer.mousePos === null) {
            this.mouseOverPlot = null;
            this.mouseDownOverPlot = null;
            return;
        }
        let [x, y] = this.game.pixelationLayer.mousePos;
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
                this.game.spriteBoxPlot!.draw(this.game.ctx, x, y, 20, 20);
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
                this.game.ctx.drawImage(this.plotImageDict![pc.desc], x, y);
                // if the count is more than 1, draw it
                if (pc.count > 1) {
                    this.game.mainFont!.drawText(this.game.ctx, pc.count.toString(), x + 10, y);
                }
            }
        }
    }

    setInfoText(text: string) {
        var splitLines = text.split("\n");
        this.infoTextLines = [];
        for (var k = 0; k < splitLines.length; k++) {
            // word-wrap each line
            var wrapped = this.game.mainFont!.wordWrap(splitLines[k], this.INFO_TEXT_WIDTH);
            for (var l = 0; l < wrapped.length; l++) {
                this.infoTextLines.push(wrapped[l]);
            }
            if (wrapped.length == 0) {
                this.infoTextLines.push("");
            }
        }
    }

    drawInfoText() {
        this.game.mainFont!.drawMultiLineText(this.game.ctx, this.infoTextLines, 164, 128);
    }

    drawCalendar() {
        var l = 10;
        var t = 136;

        this.game.ctx.drawImage(this.game.data.calendar, l, t);

        var week = Math.floor((this.today - 1) / 7);
        var dow = (this.today - 1) % 7;
        this.game.ctx.drawImage(this.game.data.calendarhighlight, l + 12 * dow, t + 12 * week);
    }

    draw() {
        // Draw the farm plots
        this.game.spriteBoxNormal!.draw(this.game.ctx, 4, 4, 152, 104);
        this.game.mainFont!.drawText(this.game.ctx, "Farm plots", 8, 8);

        this.drawPlots();

        // Draw the calendar
        this.game.spriteBoxNormal!.draw(this.game.ctx, 4, 112, 152, 84);
        this.game.mainFont!.drawText(this.game.ctx, "Calendar", 8, 116);
        this.drawCalendar();

        // Draw the cash display
        this.game.spriteBoxButton!.draw(this.game.ctx, this.cashRect);
        this.game.ctx.drawImage(this.game.data.cash, 160, 4);
        var s = this.cash.toString();
        var sx = 248 - 7 * s.length;
        this.game.mainFont!.drawText(this.game.ctx, s, sx, 8);

        // Draw the energy display
        this.game.spriteBoxNormal!.draw(this.game.ctx, 256, 4, 60, 16);
        this.game.ctx.drawImage(this.game.data.energy, 256, 4);
        var s = this.energy.toString();
        var sx = 312 - 7 * s.length;
        this.game.mainFont!.drawText(this.game.ctx, s, sx, 8);

        // Draw the upgrades box
        this.game.spriteBoxNormal!.draw(this.game.ctx, 160, 24, 156, 96);
        this.game.mainFont!.drawText(this.game.ctx, "Upgrades", 164, 28);

        // Draw the info box
        this.game.spriteBoxNormal!.draw(this.game.ctx, 160, 124, 156, 72);
        this.drawInfoText();

        // Draw text
        this.game.mainFont!.drawText(this.game.ctx, "Debt:", 104, 118);
        this.game.mainFont!.drawText(this.game.ctx, "$" + this.DEBT.toString(), 104, 134);

        // draw anything that's being dragged
        if (this.mouseDragPlot !== null && this.game.pixelationLayer.mousePos !== null) {
            var pcList = this.plotContents[this.mouseDragPlot[0]][this.mouseDragPlot[1]];
            if (pcList.length !== 0) {
                var pc = pcList[0];
                this.game.ctx.drawImage(this.plotImageDict![pc.desc],
                    this.game.pixelationLayer.mousePos[0] - 11, this.game.pixelationLayer.mousePos[1] - 11);
            }
        }

    }

    update(deltat: number): boolean {
        this.infoTextLines = [];
        this.updateMouseOverPlot();

        let b = this.uiLayer!.mouseOverButton;
        if (b !== null) {
            let callback = this.hoverCallbacks.get(b);
            if (callback) callback(b);
        }
        return true;
    }

    handleMouseDown(): boolean {
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

    trySell(plotCell: Cell, trySellAll: boolean) {
        // try to sell the contents of the plot
        var pcList = this.plotContents[plotCell[0]][plotCell[1]];
        if (pcList.length === 0) {
            return;
        }
        var pc = pcList[0];
        let numToSell = trySellAll? pc.count : 1;

        // if this is a seed, check that we aren't selling our last seed/sapling/tree.
        // return early and let the player know
        if (pc.desc === this.SEED) {
            var stc = this.getSeedTreeCount();
            if (stc <= numToSell) {
                this.game.convoEnqueue("s", "I don't have any trees - I won't sell my last seed!");
                return;
            }
        }

        // make the sale
        this.cash += pc.value * numToSell;
        pc.count -= numToSell;
        if (pc.count <= 0) {
            pcList.splice(0, 1);
        }
        this.game.soundPlayer.playSound(this.game.data['ld45_cash'], false);
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

        this.game.soundPlayer.playSound(this.game.data['ld45_plant'], false);
    }

    handleDragPlot(srcPlot: Cell, mouseReleaseCoords: [number, number]) {
        let [x, y] = mouseReleaseCoords;

        // coords of the box where you can drop things to sell them
        if (this.cashRect.contains(mouseReleaseCoords)) {
            // trying to sell a seed or juice
            this.trySell(srcPlot, false);
        }
        else if (this.mouseOverPlot !== null) {
            // trying to plant a seed?
            this.tryPlant(srcPlot, this.mouseOverPlot);
        }
    }

    handleMouseUp(mb: number): boolean {
        let mp = this.game.pixelationLayer.mousePos;
        if (this.mouseDragPlot !== null && mp !== null) {
            this.handleDragPlot(this.mouseDragPlot, mp);
        }
        this.mouseDragPlot = null;
        return false;
    }

    ///////////////////////////////
    // HANDLING CLICKS ON THE PLOTS
    ///////////////////////////////

    handleClick(mb: number): boolean {
        if (this.mouseOverPlot !== null) {
            // avoid triggering this when we moused down somewhere else and moused up here
            if (this.mouseDownOverPlot === null ||
                this.mouseDownOverPlot[0] !== this.mouseOverPlot[0] ||
                this.mouseDownOverPlot[1] !== this.mouseOverPlot[1]) {
                return false;
            }
            if (mb === 0) { // left-click - check if this is a tree that we can harvest
                var pcList = this.plotContents[this.mouseOverPlot[0]][this.mouseOverPlot[1]];
                if (pcList.length === 0) {
                    return false;
                }
                var pc = pcList[0];
                if (pc.desc === this.TREE) {
                    this.tryHarvest(this.mouseOverPlot)
                }
            }
            else if(mb === 2) { // right-click - try to sell all juice/seeds
                this.trySell(this.mouseOverPlot, true);
            }
        }
        return false;
    }

    tryHarvest(plotCell: Cell) {
        // check that we have enough energy
        if (this.energy <= 0) {
            this.game.convoEnqueue("s", "I haven't got enough energy. I need to sleep.");
            return;
        }

        // compute the difficulty
        var difficulty = this.skills['Shake'].level + this.skills['Particles'].level +
            this.skills['Details'].level + this.skills['Sound'].level;
        difficulty -= 2 * this.skills['Scarecrow'].level;
        difficulty = Math.max(0, difficulty);

        // actually do the harvest
        this.energy -= 1;
        this.harvestingCell = plotCell;
        this.game.jukeBox.setMusic();
        this.game.startMinigame(this.skills['Shake'].level, this.skills['Particles'].level,
            this.skills['Details'].level, this.skills['Sound'].level, difficulty);
    }

    continueFromMinigame(won: boolean) {
        // Continue farm mode, after a minigame. won is set to true if the player won.
        if (won) {
            // remove the tree, put in the seeds, and put in the juices.
            var numSeeds = 2 + this.skills['Seeds'].level;
            var seedValue = 5;
            var numJuices = 2 + this.skills['Juiciness'].level;
            var juiceValue = 10 * (2 + this.skills['Shake'].level + this.skills['Particles'].level +
                this.skills['Details'].level + this.skills['Sound'].level);
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
            this.game.convoEnqueue("s", "I can't upgrade this any further.");
            return false;
        }
        else if (cost > this.cash) {
            this.game.convoEnqueue("s", "I haven't got enough money for that upgrade.");
            return false;
        }
        else {
            this.cash -= cost;
            this.game.soundPlayer.playSound(this.game.data['ld45_upgrade'], false);
            return true;
        }
    }

    clickUpgrade(tag: any, mb: number) {
        let skill = <Skill>tag;
        if (mb == 0) { // left-click: upgrade
            if (this.payUpgradeCost(skill.level, skill.cost))
                skill.level += 1;
        }
        else if (mb == 2) { // right-click: downgrade
            if (skill.level <= 0) {
                this.game.convoEnqueue("s", "I can't downgrade that any further.");
                return false;
            }
            else {
                this.cash += Math.floor(skill.cost / 2);
                skill.level -= 1;
                this.game.soundPlayer.playSound(this.game.data['ld45_upgrade'], false);
            }
        }
    }

    clickPayDebt() {
        if (this.cash < this.DEBT) {
            this.game.convoLayer!.convoEnqueue("s", "I haven't got enough money to pay off my debt yet...");
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
        this.energy = this.DEFAULT_ENERGY + this.skills['Tractor'].level;

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
            this.game.convoEnqueue(null, "A new day. Energy restored.");
        }
    }

    ////////////////////////
    // BUTTON HOVER HANDLERS
    ////////////////////////

    hoverUpgrade(tag: any) {
        let skill = <Skill>tag;
        var s = "Level " + skill.level.toString() + "/" + this.MAXLEVEL.toString() +
            " Cost $" + skill.cost.toString() + "\n\n" + skill.msg + " " +
            "Left-click: buy. Right-click: sell for 50%.";
        this.setInfoText(s);
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
            var s = "A seed. Drag it to an empty plot to plant it, or to your funds to sell it. Right-click to sell all.\n\n" + "Sell value: $" + pc.value.toString();
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
            var s = "Juice. Drag it to your funds to sell it. Right-click to sell all.\n\n" + "Sell value: $" + pc.value.toString();
            this.setInfoText(s);
        }
    }

    ////////////////
    // CONVERSATIONS
    ////////////////

    convoIntro() {
        this.game.convoEnqueue("s", "Well, here I am! I'm finally free of the rat race. I'm going to turn this place into the best farm anyone's seen.");
        this.game.convoEnqueue("s", "I mean, I know life won't be perfect. But it's going to be a hell of a lot more satisfying than the crap I used to put up with.");
        this.game.convoEnqueue("r", "Hello, hello! You're the new owner of this farm land, aren't you? Welcome! This land you've got is very special!");
        this.game.convoEnqueue("s", "Hello! That's me! I'm Souviette. What's so special about this place?");
        this.game.convoEnqueue("r", "The ground here is very strange - normal fruits and vegetables won't grow on it.");
        this.game.convoEnqueue("s", "Wait, so I got ripped off? What am I supposed to do with farm land that won't grow anything? It's useless.");
        this.game.convoEnqueue("r", "Not useless at all! It might not support normal plants, but this soil has just the right ingredients to grow a very special tree...");
        this.game.convoEnqueue("r", "... the juicefruit tree.");
        this.game.convoEnqueue("s", "I've never heard of it. Are you telling porkies?");
        this.game.convoEnqueue("r", "Nope! Juicefruit trees are very lucrative - they produce juice - a crucial ingredient in computer games.");
        this.game.convoEnqueue("s", "It all sounds suss to me. Anyway, you never introduced yourself!");
        this.game.convoEnqueue("r", "Oh, that's right! I'm Rip, the Home Loan Gnome.");
        this.game.convoEnqueue("s", "A Home Loan Gnome? What does that mean?");
        this.game.convoEnqueue("r", "That means it's my job to pull your fingernails off if you don't pay your mortgage. Speaking of which...");
        this.game.convoEnqueue("r", "Your first payment is due. $2000. I'll just be taking that.");
        this.game.convoEnqueue("s", "!", () => {
            this.cash -= 2000;
            this.game.soundPlayer.playSound(this.game.data['ld45_cash'], false);
        })
        this.game.convoEnqueue("r", "I'll be back at the end of the month for the remaining $" + this.DEBT + ".");
        this.game.convoEnqueue("s", "What! You took all my money! How am I supposed to build my farm now? I have nothing!");
        this.game.convoEnqueue("r", "Ah! You may have nothing today, but see that sapling out on your farm?");
        this.game.convoEnqueue("r", "Soon that will be a juicefruit tree - and you'll be on your way to a fortune. Farewell.");
        this.game.convoEnqueue("s", "...");
        this.game.convoEnqueue("s", "It's just a sapling... how am I supposed to pay my debt in one month?");
        this.game.convoEnqueue("s", "...");
        this.game.convoEnqueue("s", "There's nothing to do today. I haven't got any money, and there's no farming to do. I may as well go to sleep.");
    }

    convoSecondDay() {
        this.game.convoEnqueue("s", "Hey, there's a huge tree on my farm! It was just a tiny sapling yesterday, and now it's enormous... and there's fruit!");
        this.game.convoEnqueue("s", "It's a pretty strange looking fruit. I might be able to harvest it.");
    }

    convoFirstWonMinigame() {
        this.game.convoEnqueue("s", "I did it!");
        this.game.convoEnqueue("s", "It seems that the tree was destroyed in the harvesting process. But there is juice in its place.");
        this.game.convoEnqueue("s", "I should sell the juice by dragging it onto my funds.");
        this.game.convoEnqueue("s", "After I do that, I'll be able to access the seeds, and plant them by dragging them into new plots.");
    }

    convoSecondWonMinigame() {
        this.game.convoEnqueue("s", "It was a successful harvest. The tree has been destroyed and there is juice and seeds in its place.");
        this.game.convoEnqueue("s", "If I sell enough juice, I'll be able to upgrade my farm. I should investigate those upgrades.");
    }

    convoWonMinigame() {
        this.game.convoEnqueue("s", "It was a successful harvest. The tree has been destroyed and there is juice and seeds in its place.");
    }

    convoLostMinigame() {
        this.game.convoEnqueue("s", "The harvest failed. Fortunately, the tree is still standing, so I can try again until I run out of energy.");
    }

    convoPayDebtEarly() {
        this.game.convoEnqueue("r", "Yes... you wanted to speak to me?");
        this.game.convoEnqueue("s", "I'm ready to pay off my debt. Here.");
        this.game.convoEnqueue("r", "Let's see here...");
        this.convoWinGame();
    }

    convoEndDay() {
        this.game.convoEnqueue("r", "Hello again, Souviette!");
        this.game.convoEnqueue("s", "Ah! It's the last day of the month...");
        this.game.convoEnqueue("r", "That means your debt is due!");
        this.game.convoEnqueue("r", "Let's see if you have enough...");
        if (this.cash >= this.DEBT) {
            this.convoWinGame();
        }
        else {
            this.game.convoEnqueue("r", "It's not enough! That means you failed.");
            this.game.convoEnqueue("s", "Oh no... now I'll lose my fingernails... and the farm!");
            this.game.convoEnqueue(null, null, () => this.game.doGameOver);
        }
    }

    convoWinGame() {
        this.game.convoEnqueue("r", "Yes - I think that's everything!", () => {
            this.cash -= this.DEBT;
            this.game.soundPlayer.playSound(this.game.data['ld45_cash'], false);
        })
        this.game.convoEnqueue("r", "Looks like you're a talented juicefruit farmer! I think your farm will be extremely distinguished in the years to come.");
        this.game.convoEnqueue("s", "...");
        this.game.convoEnqueue("s", "Actually... I think I might not do this for much longer. I will probably sell the farm.");
        this.game.convoEnqueue("s", "It hasn't been the idyllic experience I was imagining.");
        this.game.convoEnqueue("r", "Oh no! That's a shame to hear. Of course, it's understandable. Running a juicefruit farm can be exhausting.");
        this.game.convoEnqueue("r", "Of course, it was much easier in the old days.");
        this.game.convoEnqueue("s", "You mean... before the apocalypse when we all got turned into disembodied heads?");
        this.game.convoEnqueue("r", "Yes. Back then if you wanted some fruit, you'd just walk over and pick it up. None of this bouncing around.");
        this.game.convoEnqueue("s", "I suppose it must have been. Well, it's been an enriching experience, anyway.");
        this.game.convoEnqueue("r", "Lovely to hear. Thanks for all the money!");

        this.game.convoEnqueue(null, null, () => this.game.doGameOver);
    }

}
