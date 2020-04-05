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
        handleMouseMoveClientCoords(clientCoords: [number, number] | null): void { }
        handleMouseMove(): void { }

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

        setupMouseListeners(target: HTMLElement | Window, touchToo?: boolean) {
            target.addEventListener('click', (e) => this.handleClick(<MouseEvent>e));
            target.addEventListener('dblclick', (e) => this.handleDoubleClick(<MouseEvent>e));
            target.addEventListener('contextmenu', (e) => this.handleClick(<MouseEvent>e));
            target.addEventListener('mousedown', (e) => this.handleMouseDown(<MouseEvent>e));
            target.addEventListener('mouseup', (e) => this.handleMouseUp(<MouseEvent>e));
            target.addEventListener('mousemove', (e) => this.handleMouseMove(<MouseEvent>e));
            target.addEventListener('mouseout', (e) => this.handleMouseOut(<MouseEvent>e));

            if(touchToo) {
                target.addEventListener('touchstart', (e) => this.handleTouchAsMouseDown(<TouchEvent>e));
                target.addEventListener('touchend', (e) => this.handleTouchAsMouseUp(<TouchEvent>e));
                target.addEventListener('touchmove', (e) => this.handleTouchAsMouseMove(<TouchEvent>e));
            }
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

        private stopBubble(e: Event): boolean {
            // don't let event bubble up
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        private callOnLayers(f: (layer: Layer) => boolean) {
            let l = this.layers;
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = f(l[k]);
                if (!passThrough) break;
            }
            return passThrough;
        }

        update(deltat: number) {
            // Update all the layers, from last to first, stopping if we get
            // a false return value.
            this.callOnLayers((layer) => layer.update(deltat));
        }

        handleClick(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY]);
            let l = this.layers;
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = l[k].handleClick(e.button);
                if (!passThrough) break;
            }
            if(!passThrough) return this.stopBubble(e);
        }

        handleDoubleClick(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY]);
            let passThrough = this.callOnLayers((layer) => layer.handleDoubleClick());
            if(!passThrough) return this.stopBubble(e);
        }

        handleMouseDown(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY]);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseDown(e.button));
            if(!passThrough) return this.stopBubble(e);
        }

        handleTouchAsMouseDown(e: TouchEvent) {
            let touch = e.changedTouches[0];
            this.processMouseMove([touch.clientX, touch.clientY]);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseDown(0));
            if(!passThrough) return this.stopBubble(e);
        }

        handleMouseUp(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY]);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseUp(e.button));
            if(!passThrough) return this.stopBubble(e);
        }

        handleTouchAsMouseUp(e: TouchEvent) {
            let touch = e.changedTouches[0];
            this.processMouseMove([touch.clientX, touch.clientY]);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseUp(0));
            if(!passThrough) return this.stopBubble(e);
        }

        private processMouseMove(clientCoords: [number, number]) {
            this.callOnLayers((layer) => {
                layer.handleMouseMoveClientCoords(clientCoords);
                layer.handleMouseMove();
                return true;
            });
        }

        handleMouseMove(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY]);
        }

        handleTouchAsMouseMove(e: TouchEvent) {
            let touch = e.changedTouches[0];
            this.processMouseMove([touch.clientX, touch.clientY]);
        }

        handleMouseOut(e: MouseEvent) {
            this.callOnLayers((layer) => {
                layer.handleMouseMoveClientCoords(null);
                layer.handleMouseMove();
                return true;
            });
        }

        handleKeyDown(e: KeyboardEvent) {
            let passThrough = this.callOnLayers((layer) => layer.handleKeyDown(e));
            if(!passThrough) return this.stopBubble(e);
        }

        handleKeyUp(e: KeyboardEvent) {
            let passThrough = this.callOnLayers((layer) => layer.handleKeyUp(e));
            if(!passThrough) return this.stopBubble(e);
        }

    }
}