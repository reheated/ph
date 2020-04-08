namespace PH {

    /**
     * Provides functionality for drawing text on a canvas.
     */
    export abstract class CanvasFont {

        /**
         * Get the y-increment of a new line.
         * 
         * @returns the line height.
         */
        abstract getLineHeight(): number;

        /**
         * Draw a single line of text.
         * 
         * @param ctx - 2D context to draw to.
         * @param text - Text to draw.
         * @param x - x-coordinate of the left end of the text.
         * @param y - y-coordinate of the top of the text.
         */
        abstract drawText(ctx: CanvasRenderingContext2D,
            text: string, x: number, y: number): void;

        /**
         * Get the width, in pixels, that a single line of text would take up
         * if it were drawn to the screen.
         * 
         * @param text - A line of text to measure.
         * 
         * @returns The width of the text, in pixels.
         */
        abstract getWidthOfText(text: string): number;

        /**
         * Takes a list of strings, and draws each item on a separate line.
         * 
         * @param ctx - 2D context to draw to.
         * @param lines - List of lines of text.
         * @param l - x-coordinate of the left end of the text.
         * @param t - y-coordinate of the top of the text.
         */
        drawMultiLineText(ctx: CanvasRenderingContext2D, lines: string[], l: number, t: number) {
            for (var k = 0; k < lines.length; k++) {
                var y = t + k * this.getLineHeight();
                this.drawText(ctx, lines[k], l, y);
            }
        }

        /**
         * Draw a centered line of text.
         * 
         * @param ctx - 2D context to draw to.
         * @param text - A single line of text.
         * @param midx - x-coordinate of the center of the text.
         * @param midy - y-coordinate of the center of the text.
         */
        drawCenteredText(ctx: CanvasRenderingContext2D, text: string, midx: number, midy: number) {
            let w = this.getWidthOfText(text);
            var leftx = Math.floor(midx - w / 2);
            var topy = Math.floor(midy - this.getLineHeight() / 2);
            this.drawText(ctx, text, leftx, topy);
        }

        /**
         * Word-wrap a string so that it will fit within a specified width, if
         * drawn with this font.
         * 
         * @param text - Text to word-wrap.
         * @param maxw - Maximum width, in pixels.
         * 
         * @returns An array of strings, suitable for use in drawMultiLineText.
         */
        wordWrap(text: string, maxw: number): string[] {
            // Word-wrap, to a fixed pixel width.
            let outList = [];
            let cLine = '';
            let rem = text;
            while (rem !== '') {
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
            if (cLine !== '') outList.push(cLine);
            return outList;
        }

    }

    /**
     * This object facilitates drawing text onto the canvas.
     */
    export class SimpleFont extends CanvasFont {
        private fontName: string;
        private fontSize: number;
        private fontString: string = "";

        /**
         * Fill style for drawing this text. When you draw the text to a 2D
         * context, the context's fillStyle will be set to this value.
         */
        fillStyle: FillStyle;

        /**
         * y-increment of a newline, measured as a multiple of the font size.
         * For example, if the font size is 16 and each line should actually be
         * 16 pixels below the previous, then this value should be 1.0.
         */
        lineHeightScale: number;
        private dummyCtx: CanvasRenderingContext2D;

        /**
         * Construct a simple font.
         *
         * @param fontName - Font name, for looking up in the browser's
         * available fonts. For example, "Calibri".
         * @param fontSize - Font size, in px.
         * @param lineHeightScale - y-increment of a newline, measured as a
         * multiple of the font size. For example, if the font size is 16 and
         * each line should actually be 16 pixels below the previous, then this
         * value should be 1.0.
         * @param fillStyle - Fill style for drawing this text. When you draw
         * the text to a 2D context, the context's fillStyle will be set to this
         * value.
         */
        constructor(fontName: string, fontSize: number,
            lineHeightScale: number,
            fillStyle: FillStyle) {
            super();
            this.fontName = fontName;
            this.fontSize = fontSize;
            this.updateFontString();
            this.lineHeightScale = lineHeightScale;
            this.fillStyle = fillStyle;

            // Create a dummy canvas context, just for its ability to measure text.
            let dummyCanvas = document.createElement("canvas");
            this.dummyCtx = dummyCanvas.getContext('2d')!;
            this.dummyCtx.font = this.fontString;
        }

        private updateFontString() {
            this.fontString = Math.floor(this.fontSize).toString() + "px " + this.fontName;
        }

        /**
         * Set the font size.
         * 
         * @param fontSize - Font size, in px.
         */
        setFontSize(fontSize: number) {
            this.fontSize = fontSize;
            this.updateFontString();
        }

        getLineHeight() {
            return this.lineHeightScale * this.fontSize;
        }

        drawText(ctx: CanvasRenderingContext2D,
            text: string, x: number, y: number) {
            ctx.font = this.fontString;
            ctx.fillStyle = this.fillStyle;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(text, x, y);
        }

        getWidthOfText(text: string) {
            let mes = this.dummyCtx.measureText(text);
            return mes.width;
        }
    }

    /**
     * Provides functionality for drawing a bitmap font to a canvas. Requires a
     * sprite sheet with all the letters, arranged in a grid.
     */
    export class PixelFont extends CanvasFont {
        /**
         * An image (e.g., an HTMLImageElement) with all the letters, arranged
         * in a grid.
         */
        img: CanvasImageSource;
        private cw: number;
        private ch: number;
        private undershoot: number;
        private startChar: number;
        private charWidths?: number[];

        /**
         * A y-offset to apply to the coordinates before drawing text. You might
         * need to set this (to a negative value), if the pixel font's sprite
         * sheet puts too much space at the top of letters.
         */
        yOffset: number = 0;

        /**
         * y-increment of a newline, measured in pixels.
         */
        lineHeight: number;

        /**
         * Construct the pixel font.
         *
         * @param img - An image (e.g., an HTMLImageElement) with all the
         * letters, arranged in a grid.
         * @param cw - Width of a cell in the grid.
         * @param ch - Height of a cell in the grid.
         * @param undershoot - Typically you would set this to zero. If the
         * letters have too much space in between them, you can set this to a
         * positive integer to squish them closer together.
         * @param lineHeight - y-increment of a newline, measured in pixels.
         * @param startChar - The character code for the first character in the
         * grid. This might be something like 32 (=0x20), since characters
         * before that are control characters and don't need a graphical
         * representation.
         * @param charWidths - An array of numbers, specifying the character
         * width for each character. If it is not supplied, assume that every
         * character has width cw.
         */
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

        getLineHeight() {
            return this.lineHeight;
        }

        drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
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

        getWidthOfText(text: string): number {
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