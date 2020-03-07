namespace PH {

    export function createCanvas(w: number, h: number): HTMLCanvasElement {
        let c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    export function getCanvasScalingParameters(srcCanvas: HTMLCanvasElement,
        targetCanvas: HTMLCanvasElement): [number, number, number] {
        // Figure out how much to scale up by.
        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let targetW = targetCanvas.width;
        let targetH = targetCanvas.height;
        let drawScale = Math.min(targetW / w, targetH / h);
        drawScale = Math.floor(drawScale);
        if (drawScale < 1) drawScale = 1;

        // Figure out the top left point to draw to.
        let tlx = Math.floor((targetW - drawScale * w) / 2);
        let tly = Math.floor((targetH - drawScale * h) / 2);

        return [drawScale, tlx, tly];
    }

    export function drawScaledCanvas(srcCanvas: HTMLCanvasElement,
        targetCtx: CanvasRenderingContext2D) {
        // This function draws one canvas onto another, scaling up the size by
        // the maximum possible integer multiple, and centring the picture.
        // For pixel graphics.

        let w = srcCanvas.width;
        let h = srcCanvas.height;
        let [drawScale, tlx, tly] = getCanvasScalingParameters(srcCanvas, targetCtx.canvas);
        targetCtx.drawImage(srcCanvas, 0, 0, w, h,
            tlx, tly, w * drawScale, h * drawScale);
    }
}