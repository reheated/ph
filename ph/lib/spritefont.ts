namespace PH {

    export function wordWrapByChars(text: string, maxw: number): string[] {
        // Word-wrap, with a fixed maximum number of characters per line.
        // Useful for fixed width fonts.
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
            if (cLine === '' || trialLine.length < maxw) {
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

    export class FixedWidthPixelFont {
        img: HTMLImageElement;
        w: number;
        h: number;
        undershoot: number;
        startChar: number;

        constructor(img: HTMLImageElement, w: number, h: number,
            undershoot: number, startChar: number) {
            this.img = img;
            this.w = w;
            this.h = h;
            this.undershoot = undershoot;
            this.startChar = startChar;
        }

        public drawText(ctx: CanvasRenderingContext2D, txt: string, tlx: number, tly: number) {
            var curX = tlx;
            var curY = tly;
            var modX = Math.floor(this.img.width / this.w);
            var newLineCode = "\n".charCodeAt(0) - this.startChar;
            for (var k = 0; k < txt.length; k++) {
                var cCode = txt.charCodeAt(k) - this.startChar;
                if (cCode === newLineCode) {
                    curX = tlx;
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
            
        public drawMultiLineText(ctx: CanvasRenderingContext2D, lines: string[], l: number, t: number)
        {
            for(var k = 0; k < lines.length; k++)
            {
                var y = t + k * 9;
                this.drawText(ctx, lines[k], l, y);
            }
        }

    }

}