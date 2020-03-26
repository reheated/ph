/// <reference path="util.ts"/>

namespace PH {
    export interface FrameManagerSettings {
        frameCallback?: (deltat: number) => void;
        frameRateReporting?: boolean;
        frameRateInterval?: number;
        pixelArtMode?: [CanvasRenderingContext2D, CanvasRenderingContext2D];
    }

    export class FrameManager {
        // Class to automate calling requestAnimationFrame, frame rate calculations,
        // and scaling graphics for pixellated games.
        running: boolean = false;
        resetTime: number | null = null;
        frameCount: number = 0;
        lastFrameTime: number | null = null;
        settings: FrameManagerSettings;

        public frameRate: number | null = null;

        constructor(settings: FrameManagerSettings) {
            this.settings = settings;
        }

        public start() {
            if (!this.running) {
                this.running = true;
                requestAnimationFrame(() => this.frame());
            }
            this.lastFrameTime = curTime();
        }

        public stop() {
            this.running = false;
        }

        public frame() {
            let frameRateInterval = this.settings.frameRateInterval || 5.0;
            let frameRateReporting = this.settings.frameRateReporting || false;
            if (!this.running) return;
            var t = curTime();
            let deltat = t - this.lastFrameTime!;
            if (this.resetTime === null) {
                this.resetTime = t;
            }
            else if (t > this.resetTime + frameRateInterval) {
                this.frameRate = this.frameCount / (t - this.resetTime);
                this.frameCount = 0;
                this.resetTime += frameRateInterval;
                if (frameRateReporting) {
                    console.log("Framerate: " + this.frameRate.toFixed(1));
                }
            }
            this.frameCount++;
            this.lastFrameTime = t;

            if(this.settings.pixelArtMode !== undefined) {
                let [src, dest] = this.settings.pixelArtMode;
                dest.imageSmoothingEnabled = false;
            }

            if(this.settings.frameCallback !== undefined) {
                this.settings.frameCallback(deltat);
            }

            if(this.settings.pixelArtMode !== undefined) {
                let [src, dest] = this.settings.pixelArtMode;
                PH.drawScaledCanvas(src.canvas, dest);
            }

            requestAnimationFrame(() => this.frame());
        }

    }
}
