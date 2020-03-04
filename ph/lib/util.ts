namespace PH {

    export function createCanvas(w: number, h: number): HTMLCanvasElement
    {
        let c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }
}