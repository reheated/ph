namespace PH {
    export class Layer {
        add(): void { };
        remove(): void { };
        draw(): void { };
        update(deltat: number): boolean { return true; }

        handleClick(): boolean { return true; }
        handleDoubleClick(): boolean { return true; }
        handleMouseDown(): boolean { return true; }
        handleMouseUp(): boolean { return true; }
        handleMouseMoveClientCoords(clientX: number, clientY: number): void { }
        handleMouseMove(): boolean { return true; }

        handleKeyDown(e: KeyboardEvent): boolean { return true; }
        handleKeyUp(e: KeyboardEvent): boolean { return true; }
    }

    export type CoordinateHandler = (x: number, y: number) => void;

    export class LayerManager {
        private layers: Layer[] = [];

        constructor() { }

        setLayers(...layers: Layer[]) {
            // Call the "remove" function on all layers that get removed.
            for(let s of this.layers) {
                if(layers.indexOf(s) < 0) {
                    s.remove();
                }
            }

            // Call the "add" function on all newly added layers
            for(let s of layers) {
                if(this.layers.indexOf(s) < 0) {
                    s.add();
                }
            }
            
            // Actually set the list of layers.
            this.layers = layers;
        }

        setupMouseListeners(target: HTMLElement | Window) {
            target.addEventListener('click', (e) => this.handleClick(<MouseEvent>e));
            target.addEventListener('dblclick', (e) => this.handleDoubleClick(<MouseEvent>e));
            target.addEventListener('contextmenu', (e) => this.handleClick(<MouseEvent>e));
            target.addEventListener('mousedown', (e) => this.handleMouseDown(<MouseEvent>e));
            target.addEventListener('mouseup', (e) => this.handleMouseUp(<MouseEvent>e));
            target.addEventListener('mousemove', (e) => this.handleMouseMove(<MouseEvent>e));
        }

        setupKeyboardListeners(target: HTMLElement | Window) {
            target.addEventListener('keydown', (e) => this.handleKeyDown(<KeyboardEvent>e));
            target.addEventListener('keyup', (e) => this.handleKeyUp(<KeyboardEvent>e));
        }

        draw() {
            // Draw all the layers, from first to last
            for (let k = 0; k < this.layers.length; k++) {
                this.layers[k].draw();
            }
        }

        update(deltat: number) {
            // Update all the layers, from last to first, stopping if we get
            // a false return value.
            for (let k = this.layers.length - 1; k >= 0; k--) {
                let passThrough = this.layers[k].update(deltat);
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
            for (let k = this.layers.length - 1; k >= 0; k--) {
                let passThrough = this.layers[k].handleClick();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleDoubleClick(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.layers.length - 1; k >= 0; k--) {
                let passThrough = this.layers[k].handleDoubleClick();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleMouseDown(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.layers.length - 1; k >= 0; k--) {
                let passThrough = this.layers[k].handleMouseDown();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleMouseUp(e: MouseEvent) {
            this.handleMouseMove(e);
            for (let k = this.layers.length - 1; k >= 0; k--) {
                let passThrough = this.layers[k].handleMouseUp();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleMouseMove(e: MouseEvent) {
            for (let k = this.layers.length - 1; k >= 0; k--) {
                this.layers[k].handleMouseMoveClientCoords(e.clientX, e.clientY);
                let passThrough = this.layers[k].handleMouseMove();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleKeyDown(e: KeyboardEvent) {
            for (let k = this.layers.length - 1; k >= 0; k--) {
                let passThrough = this.layers[k].handleKeyDown(e);
                if (!passThrough) return;
            }
            return this.stopBubble(e);
        }

        handleKeyUp(e: KeyboardEvent) {
            for (let k = this.layers.length - 1; k >= 0; k--) {
                let passThrough = this.layers[k].handleKeyUp(e);
                if (!passThrough) return;
            }
            return this.stopBubble(e);
        }

    }
}