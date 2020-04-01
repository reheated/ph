namespace PH {
    export class Layer {
        handleLayerAdded(): void { };
        handleLayerRemoved(): void { };
        draw(): void { };
        update(deltat: number): boolean { return true; }

        handleClick(button: number): boolean { return true; }
        handleDoubleClick(): boolean { return true; }
        handleMouseDown(button: number): boolean { return true; }
        handleMouseUp(button: number): boolean { return true; }
        handleMouseMoveClientCoords(clientX: number, clientY: number): void { }
        handleMouseMove(): boolean { return true; }

        handleKeyDown(e: KeyboardEvent): boolean { return true; }
        handleKeyUp(e: KeyboardEvent): boolean { return true; }
    }

    export type CoordinateHandler = (x: number, y: number) => void;

    export class LayerManager {
        private layers: Layer[] = [];

        private bottomLayers: Layer[] = [];
        private mainLayers: Layer[] = [];
        private topLayers: Layer[] = [];

        constructor() { }

        private updateLayers() {
            let updatedLayers = this.bottomLayers.concat(this.mainLayers).concat(this.topLayers);

            // Call the "remove" function on all layers that get removed.
            for(let s of this.layers) {
                if(updatedLayers.indexOf(s) < 0) {
                    s.handleLayerRemoved();
                }
            }

            // Call the "add" function on all newly added layers
            for(let s of updatedLayers) {
                if(this.layers.indexOf(s) < 0) {
                    s.handleLayerAdded();
                }
            }
            
            // Actually set the list of layers.
            this.layers = updatedLayers;
        }

        setBottomLayers(...layers: Layer[]) {
            this.bottomLayers = layers;
            this.updateLayers();
        }

        setMainLayers(...layers: Layer[]) {
            this.mainLayers = layers;
            this.updateLayers();
        }

        setTopLayers(...layers: Layer[]) {
            this.topLayers = layers;
            this.updateLayers();
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
            let l = this.layers;
            for (let k = 0; k < l.length; k++) {
                l[k].draw();
            }
        }

        update(deltat: number) {
            // Update all the layers, from last to first, stopping if we get
            // a false return value.
            let l = this.layers;
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].update(deltat);
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
            let l = this.layers;
            this.handleMouseMove(e);
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].handleClick(e.button);
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleDoubleClick(e: MouseEvent) {
            let l = this.layers;
            this.handleMouseMove(e);
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].handleDoubleClick();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleMouseDown(e: MouseEvent) {
            let l = this.layers;
            this.handleMouseMove(e);
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].handleMouseDown(e.button);
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleMouseUp(e: MouseEvent) {
            let l = this.layers;
            this.handleMouseMove(e);
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].handleMouseUp(e.button);
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleMouseMove(e: MouseEvent) {
            let l = this.layers;
            for (let k = l.length - 1; k >= 0; k--) {
                l[k].handleMouseMoveClientCoords(e.clientX, e.clientY);
                let passThrough = l[k].handleMouseMove();
                if (!passThrough) break;
            }
            return this.stopBubble(e);
        }

        handleKeyDown(e: KeyboardEvent) {
            let l = this.layers;
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].handleKeyDown(e);
                if (!passThrough) return;
            }
            return this.stopBubble(e);
        }

        handleKeyUp(e: KeyboardEvent) {
            let l = this.layers;
            for (let k = l.length - 1; k >= 0; k--) {
                let passThrough = l[k].handleKeyUp(e);
                if (!passThrough) return;
            }
            return this.stopBubble(e);
        }

    }
}