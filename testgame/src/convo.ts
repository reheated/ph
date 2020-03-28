class ConvoItem {
    game: Game;
    public speaker: string | null;
    public wrappedText: string[] | null;
    public callback: (() => void) | null;
    public seen: boolean;

    constructor(game: Game, speaker: string | null, msg: string | null, callback: (() => void) | null) {
        this.game = game;
        this.speaker = speaker;
        this.wrappedText = (msg === null) ? msg : this.game.mainFont!.wordWrap(msg, 272);
        this.callback = callback;
        this.seen = false;
    }
}

class ConvoLayer extends PH.Layer {
    TIME_BEFORE_DISPLAY = 0.25; // time before displaying the convo.
    MINCLICKDELAY = 0.1;

    game: Game;
    convoQ: ConvoItem[] = [];
    convoStartedTime: number | null = null;
    lastClickTime: number | null = null;

    nameDict: { [key: string]: string } = {
        "s": "Souviette",
        "r": "Rip"
    }

    constructor(game: Game) {
        super();
        this.game = game;
    }

    convoEnqueue(speaker: string | null, msg: string | null, callback: (() => void) | void) {
        let c: (() => void) | null;
        if (typeof (callback) === "undefined") c = null;
        else c = callback;
        this.convoQ.push(new ConvoItem(this.game, speaker, msg, c));

        if (this.convoQ.length === 1) {
            this.convoStartedTime = PH.curTime();
        }

    }

    draw() {
        // Show any conversation boxes
        var l = 8;
        var t = 120;
        var w = 304;
        var h = 72;


        if (this.convoQ.length > 0) {
            if (this.convoStartedTime !== null &&
                PH.curTime() > this.convoStartedTime + this.TIME_BEFORE_DISPLAY) {
                var c = this.convoQ[0];
                if (!c.seen) {
                    // haven't seen this message before - call its callback
                    if (c.callback !== null) c.callback();
                    c.seen = true;
                }

                if (c.wrappedText == null) // no message
                {
                    this.dequeue();
                }
                else {
                    // draw the box
                    this.game.spriteBoxConvo!.draw(this.game.ctx, l, t, w, h);

                    if (c.speaker === null) {
                        // no speaker - just draw text
                        this.game.mainFont!.drawMultiLineText(this.game.ctx, c.wrappedText, l + 4, t + 4);
                    }
                    else {
                        // character portrait
                        this.game.ctx.drawImage(this.game.resources.data[c.speaker], l + 4, t + 4);

                        // character name
                        this.game.mainFont!.drawText(this.game.ctx, this.nameDict[c.speaker], l + 28, t + 4);

                        // message
                        this.game.mainFont!.drawMultiLineText(this.game.ctx, c.wrappedText, l + 28, t + 20);
                    }
                }
            }
        }
    }

    convoGoing() {
        return this.convoQ.length > 0;
    }

    dequeue() {
        this.convoQ.splice(0, 1);
        if (this.convoQ.length == 0) this.convoStartedTime = null;
    }

    handleClick(): boolean {
        var t = PH.curTime();
        let cg = this.convoGoing();
        if (this.convoStartedTime !== null &&
            t > this.convoStartedTime + this.TIME_BEFORE_DISPLAY &&
            (this.lastClickTime === null || t > this.lastClickTime + this.MINCLICKDELAY)) {
            this.dequeue();
            this.lastClickTime = t;
        }
        return !cg;
    }

    handleMouseDown(): boolean { return !this.convoGoing(); }
    handleMouseUp(): boolean { return !this.convoGoing(); }

    update(deltat: number) {
        return !this.convoGoing();
    }
}
