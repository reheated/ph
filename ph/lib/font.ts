namespace PH {

    abstract class Font {

        public abstract getLineHeight(): number;
        public abstract drawText(ctx: CanvasRenderingContext2D,
            text: string, x: number, y: number): void;
        public abstract getWidthOfText(text: string): number;

        public drawMultiLineText(ctx: CanvasRenderingContext2D, lines: string[], l: number, t: number) {
            for (var k = 0; k < lines.length; k++) {
                var y = t + k * this.getLineHeight();
                this.drawText(ctx, lines[k], l, y);
            }
        }

        public drawCenteredText(ctx: CanvasRenderingContext2D, text: string, midx: number, midy: number) {
            let w = this.getWidthOfText(text);
            var leftx = Math.floor(midx - w / 2);
            var topy = Math.floor(midy - this.getLineHeight() / 2);
            this.drawText(ctx, text, leftx, topy);
        }


        wordWrap(text: string, maxw: number): string[] {
            // Word-wrap, to a fixed pixel width.
            let outList = [];
            let cLine = '';
            let rem = text;
            while (rem != '') {
                // get the next word
                let nextSpace = rem.indexOf(' ');
                let nextWord;
                if (nextSpace < 0) {
                    nextWord = rem;
                    rem = '';
                }
                else {
                    nextWord = rem.slice(0, nextSpace);
                    rem = rem.slice(nextSpace + 1);
                }
                // test if the line is OK
                let trialLine = cLine;
                if (trialLine !== '') trialLine += ' ';
                trialLine += nextWord;
                let w = this.getWidthOfText(trialLine);
                if (cLine === '' || w < maxw) {
                    cLine = trialLine;
                }
                else {
                    outList.push(cLine);
                    cLine = nextWord;
                }
            }
            if (cLine != '') outList.push(cLine);
            return outList;
        }

    }

    export class NormalFont extends Font {
        fontString: string;
        fillStyle: string | CanvasGradient | CanvasPattern;
        letterHeight: number;
        lineHeight: number;
        dummyCtx: CanvasRenderingContext2D;

        constructor(fontName: string, fontSize: number,
            letterHeight: number, lineHeight: number,
            fillStyle: string | CanvasGradient | CanvasPattern) {
            super();
            this.fontString = Math.floor(fontSize).toString() + "px " + fontName;
            this.letterHeight = letterHeight;
            this.lineHeight = lineHeight;
            this.fillStyle = fillStyle;

            // Create a dummy canvas context, just for its ability to measure text.
            let dummyCanvas = document.createElement("canvas");
            this.dummyCtx = dummyCanvas.getContext('2d')!;
            this.dummyCtx.font = this.fontString;
        }

        public getLineHeight() {
            return this.lineHeight;
        }

        public drawText(ctx: CanvasRenderingContext2D,
            text: string, x: number, y: number) {
            ctx.font = this.fontString;
            ctx.fillStyle = this.fillStyle;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.fillText(text, x, y + this.letterHeight);
        }

        public getWidthOfText(text: string) {
            let mes = this.dummyCtx.measureText(text);
            return mes.width;
        }
    }

    export class FixedWidthPixelFont extends Font {
        img: HTMLImageElement;
        w: number;
        h: number;
        undershoot: number;
        startChar: number;

        constructor(img: HTMLImageElement, w: number, h: number,
            undershoot: number, startChar: number) {
            super();
            this.img = img;
            this.w = w;
            this.h = h;
            this.undershoot = undershoot;
            this.startChar = startChar;
        }

        public getLineHeight() {
            return this.h;
        }

        public drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
            var curX = x;
            var curY = y;
            var modX = Math.floor(this.img.width / this.w);
            var newLineCode = "\n".charCodeAt(0) - this.startChar;
            for (var k = 0; k < text.length; k++) {
                var cCode = text.charCodeAt(k) - this.startChar;
                if (cCode === newLineCode) {
                    curX = x;
                    curY += this.h;
                }
                else {
                    var srcX = (cCode % modX) * this.w;
                    var srcY = Math.floor(cCode / modX) * this.h;

                    ctx.drawImage(this.img, srcX, srcY, this.w, this.h,
                        curX, curY, this.w, this.h);
                    curX += this.w - this.undershoot;
                }
            }
        }

        public getWidthOfText(text: string) {
            return text.length * this.w;
        }

    }

}