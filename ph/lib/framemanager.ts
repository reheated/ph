/// <reference path="util.ts"/>

namespace PH {

    /**
     * Settings for constructing a FrameManager.
     */
    export interface FrameManagerSettings {
        /**
         * A function to call every frame. The FrameManager will pass your
         * function a parameter deltat which is the time elapsed since the last
         * frame.
         */
        frameCallback?: (deltat: number) => void;

        /**
         * Set to true to report frame rates, using console.log. If this is
         * false, the FrameManager will still calculate frame rates, and set the
         * frameRate property.
         */
        frameRateReporting?: boolean;

        /**
         * Number of seconds between calculating the frame rate.
         */
        frameRateInterval?: number;
    }

    /**
     * Class to automate a frame loop (using requestAnimationFrame), and make
     * frame rate calculations. Use the start and stop methods to turn the frame
     * loop on and off.
     */
    export class FrameManager {
        private running: boolean = false;
        private resetTime: number | null = null;
        private frameCount: number = 0;
        private lastFrameTime: number | null = null;
        private settings: FrameManagerSettings;

        /**
         * Most recently calculated frame rate (measured in frames per second),
         * or null if not enough time has elapsed to calculate the frame rate.
         */
        frameRate: number | null = null;

        /**
         * Construct a frame manager.
         * 
         * @param settings - Options for this frame manager.
         */
        constructor(settings: FrameManagerSettings) {
            this.settings = settings;
        }

        /**
         * Start the frame loop.
         */
        start() {
            if (!this.running) {
                this.running = true;
                requestAnimationFrame(() => this.frame());
            }
            this.lastFrameTime = curTime();
        }

        /**
         * Stop the frame loop.
         */
        stop() {
            this.running = false;
        }

        private frame() {
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

            if(this.settings.frameCallback !== undefined) {
                this.settings.frameCallback(deltat);
            }

            requestAnimationFrame(() => this.frame());
        }

    }
}
