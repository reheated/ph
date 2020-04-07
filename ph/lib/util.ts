declare class FontFace {
    constructor(family: string, source: string);
    load(): Promise<FontFace>;
}

declare interface FontFaceSet extends Set<FontFace> { };

declare interface Document {
    fonts: FontFaceSet;
}

declare interface Window {
    gameId?: string;
}

namespace PH {
    /**
     * Type of data that can be used for a 2D context's fillStyle.
     */
    export type FillStyle = string | CanvasGradient | CanvasPattern;

    /**
     * A colour, in the form [red value, green value, blue value].
     */
    export type RGB = [number, number, number];
    
    /**
     * A colour, in the form [red value, green value, blue value, alpha value].
     */
    export type RGBA = [number, number, number, number];

    /**
     * Create an off-screen canvas.
     * 
     * @param w - Width.
     * @param h - Height.
     * 
     * @returns A canvas.
     */
    export function createCanvas(w: number, h: number): HTMLCanvasElement {
        let c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    /**
     * Download a font and add it to the document's font face set. Awaitable.
     * 
     * @param name - Name to give to the font.
     * @param url - URL of the font to download.
     */
    export async function quickFont(name: string, url: string) {
        let f = new FontFace(name, "url(" + url + ")");
        await f.load();
        document.fonts.add(f);
    }

    /**
     * Get the browser's current time, converted into seconds.
     * 
     * @returns Time, in seconds.
     */
    export function curTime() {
        return (new Date()).getTime() / 1000;
    }

    /**
     * Resize the image buffer of an on-screen canvas to match its size on the
     * screen.
     *
     * @param canvas - The canvas to resize.
     * @param accountForDevicePixelRatio - Scale up the pixels by the device
     * pixel ratio in the hopes of getting the pixels to line up exactly with
     * screen pixels.
     */
    export function resizeCanvasToSizeOnScreen(canvas: HTMLCanvasElement,
        accountForDevicePixelRatio?: boolean) {
        var w = canvas.clientWidth;
        var h = canvas.clientHeight;
        if(accountForDevicePixelRatio) {
            let scale = window.devicePixelRatio;
            w *= scale;
            h *= scale;
        }
        if (w !== canvas.width ||
            h !== canvas.height) {
            canvas.width = w;
            canvas.height = h;
        }
    }

    /**
     * Fill the canvas.
     * 
     * @ctx - 2D context to draw with.
     * @fillStyle - Style to fill with.
     */
    export function fillCanvas(ctx: CanvasRenderingContext2D, fillStyle: FillStyle) {
        let canvas = ctx.canvas;
        ctx.fillStyle = fillStyle;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Delay a number of seconds. Awaitable.
     * 
     * @param seconds - Number of seconds to delay.
     * 
     * @returns A Promise that resolves (to nothing) after the specified delay.
     */
    export function delay(seconds: number) {
        let prom = new Promise<void>((resolve, reject) => {
            setTimeout(() => resolve(), (seconds * 1000));
        })
        return prom;
    }

    /**
     * Take an image and create a new one that changes all the RGB values to the
     * specified color, but leaves the alpha channel alone. Useful for creating
     * a new pixel font with a different color from an existing one.
     *
     * @param img - Original image.
     * @param targetColor - RGB value to use.
     *
     * @returns - An HTMLCanvasElement (which it is a type of CanvasImageSource,
     * so it can be used as an image, for canvas drawing purposes..)
     */
    export function changeImageColor(img: CanvasImageSource, targetColor: RGB) {
        let w = <number>img.width;
        let h = <number>img.height;
        let result = createCanvas(w, h);
        let ctx = result.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        let imgData = ctx.getImageData(0, 0, w, h);
        for (let k = 0; k < w * h; k++) {
            let offset = k * 4;
            imgData.data[offset] = targetColor[0];
            imgData.data[offset + 1] = targetColor[1];
            imgData.data[offset + 2] = targetColor[2];
        }
        ctx.putImageData(imgData, 0, 0);
        return result;
    }

    function objectKey(name: string) {
        // Helper function for the local storage utility functions. Adds the
        // game ID as a prefix to the name, to get a key for localStorage
        // lookups. (Otherwise, different games on the same site could have
        // key conflicts).
        let gameId = window.gameId;
        if(gameId === undefined) {
            throw new Error("localStorage operations require window.gameId to be defined.");
        }
        let key = gameId + "_" + name;
        return key;
    }

    /**
     * Save data to local storage. This data can be looked up using
     * localStorageLoad. It persists across sessions, as long as the user does
     * not clear their history.
     *
     * @param name - Name to save the data under
     * @param data - Data to save. Only parts of the object that can be
     * serialized with JSON.stringify will be saved. In particular, methods will
     * not be saved.
     */
    export function localStorageSave(name: string, data: any) {
        let s = JSON.stringify(data);
        let key = objectKey(name);
        localStorage.setItem(key, s);
    }

    /**
     * Check if local storage has data saved under the specified name.
     * 
     * @param name - Name to check.
     * 
     * @returns true if there is data saved under the specified name.
     */
    export function localStorageIsSaved(name: string) {
        let key = objectKey(name);
        let s = localStorage.getItem(key);
        return (s !== null);
    }

    /**
     * Load data that's saved in local storage under the specified name.
     * 
     * @param name - Name to look up.
     * 
     * @returns The saved data.
     */
    export function localStorageLoad(name: string) {
        let key = objectKey(name);
        let s = localStorage.getItem(key);
        if(s === null) {
            throw new Error(`Key "${key}" not found in localStorage.`);
        }
        return JSON.parse(s);
    }


    /**
     * Remove an item from local storage.
     * 
     * @param name - name of the item to remove.
     */
    export function localStorageRemove(name: string) {
        let key = objectKey(name);
        localStorage.removeItem(key);
    }
}