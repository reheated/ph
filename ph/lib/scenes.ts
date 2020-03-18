namespace PH {
    export class Scene {
        draw(): void { };
        update(deltat: number): boolean { return true; }

        handleClick(): boolean { return true; }
        handleMouseDown(): boolean { return true; }
        handleMouseUp(): boolean { return true; }
        handleMouseMove(): boolean { return true; }

        handleKeyDown(keyCode: number): boolean { return true; }
        handleKeyUp(keyCode: number): boolean { return true; }
    }

    export class SceneList {
        public scenes: Scene[] = [];

        constructor() { }

        public draw() {
            // Draw all the scenes, from first to last
            for (let k = 0; k < this.scenes.length; k++) {
                this.scenes[k].draw();
            }
        }

        public update(deltat: number) {
            // Update all the scenes, from last to first, stopping if we get
            // a false return value.
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let res = this.scenes[k].update(deltat);
                if (!res) return;
            }
        }
    }
}