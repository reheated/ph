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

        public setupMouseListeners(elt: HTMLElement, coordinateHandler: CoordinateHandler) {
            this.coordinateHandler = coordinateHandler;
            elt.addEventListener('click', (e) => this.handleClick(e));
            elt.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
            elt.addEventListener('contextmenu', (e) => this.handleClick(e));
            elt.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            elt.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            elt.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        }

        public setupKeyboardListeners(elt: HTMLElement) {
            elt.addEventListener('keydown', (e) => this.handleKeyDown(e));
            elt.addEventListener('keyup', (e) => this.handleKeyUp(e));
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
                let res = this.scenes[k].update(deltat);
                if (!res) break;
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
                let res = this.scenes[k].handleClick();
                if (!res) break;
            }
            return this.stopBubble(e);
        }
        
        handleDoubleClick(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let res = this.scenes[k].handleDoubleClick();
                if (!res) break;
            }
            return this.stopBubble(e);
        }
        
        handleMouseDown(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let res = this.scenes[k].handleMouseDown();
                if (!res) break;
            }
            return this.stopBubble(e);
        }
        
        handleMouseUp(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let res = this.scenes[k].handleMouseUp();
                if (!res) break;
            }
            return this.stopBubble(e);
        }
        
        handleMouseMove(e: MouseEvent) {
            if(this.coordinateHandler) this.coordinateHandler(e.clientX, e.clientY);
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let res = this.scenes[k].handleMouseMove();
                if (!res) break;
            }
            return this.stopBubble(e);
        }
        
        handleKeyDown(e: KeyboardEvent) {
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let res = this.scenes[k].handleKeyDown(e);
                if (!res) return;
            }
            return this.stopBubble(e);
        }

        handleKeyUp(e: KeyboardEvent) {
            for (let k = this.scenes.length - 1; k >= 0; k--) {
                let res = this.scenes[k].handleKeyUp(e);
                if (!res) return;
            }
            return this.stopBubble(e);
        }

    }
}