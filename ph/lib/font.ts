namespace PH {

    export abstract class Font {

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

    export class PixelFont extends Font {
        img: CanvasImageSource;
        cw: number;
        ch: number;
        undershoot: number;
        startChar: number;
        charWidths?: number[];
        yOffset: number = 0;
        lineHeight: number;

        constructor(img: CanvasImageSource, cw: number, ch: number,
            undershoot: number, lineHeight: number, startChar: number,
            charWidths?: number[]) {
            super();
            this.img = img;
            this.cw = cw;
            this.ch = ch;
            this.undershoot = undershoot;
            this.lineHeight = lineHeight;
            this.startChar = startChar;
            this.charWidths = charWidths;
        }

        public getLineHeight() {
            return this.lineHeight;
        }

        public drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
            var curX = x;
            var curY = y + this.yOffset;
            var modX = Math.floor(<number>this.img.width / this.cw);
            for (var k = 0; k < text.length; k++) {
                var rawCCode = text.charCodeAt(k);
                var modCCode = rawCCode - this.startChar;
                var srcX = (modCCode % modX) * this.cw;
                var srcY = Math.floor(modCCode / modX) * this.ch;

                ctx.drawImage(this.img, srcX, srcY, this.cw, this.ch,
                    curX, curY, this.cw, this.ch);
                if(this.charWidths) {
                    curX += this.charWidths[rawCCode];
                }
                else {
                    curX += this.cw;
                }
                curX -= this.undershoot;
            }
        }

        public getWidthOfText(text: string): number {
            if(this.charWidths) {
                let total = 0;
                for(let k = 0; k < text.length; k++) {
                    var rawCCode = text.charCodeAt(k);
                    total += this.charWidths[rawCCode] - this.undershoot;
                }
                return total;
            }
            else {
                return text.length * (this.cw - this.undershoot);
            }
        }

    }

}