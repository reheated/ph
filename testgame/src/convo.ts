class ConvoItem {
    public speaker: string | null;
    public wrappedText: string[] | null;
    public callback: (() => void) | null;
    public seen: boolean;

    constructor(speaker: string | null, msg: string | null, callback: (() => void) | null) {
        this.speaker = speaker;
        this.wrappedText = (msg === null) ? msg : window.mainFont.wordWrap(msg, 272);
        this.callback = callback;
        this.seen = false;
    }
}

class ConvoScene extends PH.Scene {
    TIME_BEFORE_DISPLAY = 0.25; // time before displaying the convo.
    MINCLICKDELAY = 0.1;

    resources: PH.Resources;
    ctx: CanvasRenderingContext2D;

    convoQ: ConvoItem[] = [];
    convoStartedTime: number | null = null;
    lastClickTime: number | null = null;

    nameDict: { [key: string]: string } = {
        "s": "Souviette",
        "r": "Rip"
    }

    constructor(ctx: CanvasRenderingContext2D, resources: PH.Resources) {
        super();
        this.resources = resources;
        this.ctx = ctx;
    }

    convoEnqueue(speaker: string | null, msg: string | null, callback: (() => void) | void) {
        // a convo object is a tuple consisting of: name of speaker,
        // message, a callback function to be called when the message
        // is first shown, and a bool representing whether it's been
        // shown yet.
        let c: (() => void) | null;
        if (typeof (callback) === "undefined") c = null;
        else c = callback;
        this.convoQ.push(new ConvoItem(speaker, msg, c));

        if (this.convoQ.length === 1) {
            this.convoStartedTime = window.curTime();
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
                window.curTime() > this.convoStartedTime + this.TIME_BEFORE_DISPLAY) {
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
                    window.spriteBoxConvo.draw(this.ctx, l, t, w, h);

                    if (c.speaker === null) {
                        // no speaker - just draw text
                        window.mainFont.drawMultiLineText(this.ctx, c.wrappedText, l + 4, t + 4);
                    }
                    else {
                        // character portrait
                        this.ctx.drawImage(this.resources.data[c.speaker], l + 4, t + 4);

                        // character name
                        window.mainFont.drawText(this.ctx, this.nameDict[c.speaker], l + 28, t + 4);

                        // message
                        window.mainFont.drawMultiLineText(this.ctx, c.wrappedText, l + 28, t + 20);
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
        var t = window.curTime();
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
