namespace PH {
    export class Scene {
        draw(): void { };
        update(deltat: number): boolean { return true; }

        handleClick(): boolean { return true; }
        handleDoubleClick(): boolean { return true; }
        handleMouseDown(): boolean { return true; }
        handleMouseUp(): boolean { return true; }
        handleMouseMove(): boolean { return true; }

        handleKeyDown(e: KeyboardEvent): boolean { return true; }
        handleKeyUp(e: KeyboardEvent): boolean { return true; }
    }

    export type CoordinateHandler = (x: number, y: number) => void;

    export class SceneList {
        public scenes: Scene[] = [];
        coordinateHandler: CoordinateHandler | null = null;

        constructor() { }

        public setupMouseListeners(target: HTMLElement | Window, coordinateHandler: CoordinateHandler) {
            this.coordinateHandler = coordinateHandler;
            target.addEventListener('click', (e) => this.handleClick(<MouseEvent>e));
            target.addEventListener('dblclick', (e) => this.handleDoubleClick(<MouseEvent>e));
            target.addEventListener('contextmenu', (e) => this.handleClick(<MouseEvent>e));
            target.addEventListener('mousedown', (e) => this.handleMouseDown(<MouseEvent>e));
            target.addEventListener('mouseup', (e) => this.handleMouseUp(<MouseEvent>e));
            target.addEventListener('mousemove', (e) => this.handleMouseMove(<MouseEvent>e));
        }

        public setupKeyboardListeners(target: HTMLElement | Window) {
            target.addEventListener('keydown', (e) => this.handleKeyDown(<KeyboardEvent>e));
            target.addEventListener('keyup', (e) => this.handleKeyUp(<KeyboardEvent>e));
        }

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
                let passThrough = this.scenes[k].update(deltat);
                if (!passThrough) break;
            }
        }

        stopBubble(e: Event): boolean {
            // don't let event bubble up
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        handleClick(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let passThrough = this.scenes[k].handleClick();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }
        
        handleDoubleClick(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let passThrough = this.scenes[k].handleDoubleClick();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }
        
        handleMouseDown(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let passThrough = this.scenes[k].handleMouseDown();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }
        
        handleMouseUp(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let passThrough = this.scenes[k].handleMouseUp();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }
        
        handleMouseMove(e: MouseEvent) {
            if(this.coordinateHandler) this.coordinateHandler(e.clientX, e.clientY);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let passThrough = this.scenes[k].handleMouseMove();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }
        
        handleKeyDown(e: KeyboardEvent) {
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let passThrough = this.scenes[k].handleKeyDown(e);
                if (!passThrough) return;
            }
            return this.stopBubble(e);
        }

        handleKeyUp(e: KeyboardEvent) {
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let passThrough = this.scenes[k].handleKeyUp(e);
                if (!passThrough) return;
            }
            return this.stopBubble(e);
        }

    }
}