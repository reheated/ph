/// <reference path="mousepos.ts">

namespace PH {

    /**
     * Extend this class for a convenient way to make an object that needs to do
     * one or more of the following:
     * - Update every frame
     * - Draw something every frame
     * - Handle inputs from the mouse or keyboard.
     *
     * Then you can add your object to a LayerManager, which will take care of
     * calling your update, draw or input handlers.
     *
     * A layer can be a big complex thing that handles input, performs game
     * logic and draws the entire scene. Or it can be a little thing that adds
     * some specific utility. (This library provides a few such classes, such as
     * PH.CanvasCursorLayer, which draws a custom cursor.)
     */
    export class Layer {
        /**
         * Called when the layer is added to a LayerManager.
         */
        handleLayerAdded(): void { };

        /**
         * Called when the layer is removed from a LayerManager.
         */
        handleLayerRemoved(): void { };

        /**
         * Draw function.
         */
        draw(): void { };

        /**
         * Update function.
         * 
         * @param deltat - Time step.
         *
         * @returns true if the layers below this one should also update; false
         * if the LayerManager should stop here.
         */
        update(deltat: number): boolean { return true; }

        /**
         * Handle a mouse click.
         *
         * @param button - Mouse button, as reported in MouseEvent.button.
         *
         * @returns true if the event should pass through to lower layers; false
         * if the LayerManager should stop here (i.e., the event is caught by
         * this layer). If false, the browser will also be told not to handle
         * the event.
         */
        handleClick(button: number): boolean { return true; }

        /**
         * Handle a mouse double click.
         * 
         * @param button - Mouse button, as reported in MouseEvent.button.
         *
         * @returns true if the event should pass through to lower layers; false
         * if the LayerManager should stop here (i.e., the event is caught by
         * this layer). If false, the browser will also be told not to handle
         * the event.
         */
        handleDoubleClick(): boolean { return true; }

        /**
         * Handle a mouse button being pressed down.
         * 
         * @param button - Mouse button, as reported in MouseEvent.button.
         *
         * @returns true if the event should pass through to lower layers; false
         * if the LayerManager should stop here (i.e., the event is caught by
         * this layer). If false, the browser will also be told not to handle
         * the event.
         */
        handleMouseDown(button: number): boolean { return true; }

        /**
         * Handle a mouse button being released.
         * 
         * @param button - Mouse button, as reported in MouseEvent.button.
         *
         * @returns true if the event should pass through to lower layers; false
         * if the LayerManager should stop here (i.e., the event is caught by
         * this layer). If false, the browser will also be told not to handle
         * the event.
         */
        handleMouseUp(button: number): boolean { return true; }

        /**
         * Handle the mouse being moved.
         */
        handleMouseMove(): void { }

        /**
         * Handle a key being pressed down.
         * 
         * @param e: The keyboard event.
         * 
         * @returns true if the event should pass through to lower layers; false
         * if the LayerManager should stop here (i.e., the event is caught by
         * this layer). If false, the browser will also be told not to handle
         * the event.
         */
        handleKeyDown(e: KeyboardEvent): boolean { return true; }

        /**
         * Handle a key being released.
         * 
         * @param e: The keyboard event.
         * 
         * @returns true if the event should pass through to lower layers; false
         * if the LayerManager should stop here (i.e., the event is caught by
         * this layer). If false, the browser will also be told not to handle
         * the event.
         */
        handleKeyUp(e: KeyboardEvent): boolean { return true; }
    }

    /**
     * This class keeps track of a list of running components ("layers") of your
     * game, and calls their draw, update or event handling functions.
     *
     * For example, you might create a layer of your game that runs the main
     * game logic, and another layer that displays messages on the screen on
     * certain occasions. When a message is displayed, mouse events on the main
     * game layer should be blocked until the message is closed. If the message
     * layer returns false from its event handlers, then the LayerManager will
     * know not to pass messages through to the main game layer.
     *
     * When you call the LayerManager's draw function, it calls its layers' draw
     * functions in the following order (assuming N layers): layers[0],
     * layers[1], ... layers[N - 1]. We think of layers[0] as the bottom layer
     * and layers[N - 1] as the top layer, since higher layers are drawn on top
     * of lower layers.
     *
     * When you call the LayerManager's update function, or if it gets a
     * mouse/keyboard event (after you call setupMouseListeners or
     * setupKeyboardListeners), it calls its layers' update/event handling
     * functions in the following order: layers[N - 1], layers[N - 2], ... down
     * to layers[0], unless one of the functions returns false, in which case it
     * stops there. The exception is handleMouseMove, which can't be stopped in
     * this way.
     *
     * There are actually three functions to set the layers: setBottomLayers,
     * setMainLayers and setTopLayers. When you call one of these functions, the
     * full list of layers will be constructed by concatenating the bottom, main
     * and top layers. This way, you can set layers that will always be at the
     * bottom or top, even as you change the main layers of the game. If you
     * don't care about that, you can just use setMainLayers.
     */
    export class LayerManager {
        mousePos: MousePosition = null;

        private layers: Layer[] = [];

        private bottomLayers: Layer[] = [];
        private mainLayers: Layer[] = [];
        private topLayers: Layer[] = [];

        constructor() { }

        private updateLayers() {
            // Internal function to update the layers when setBottomLayers,
            // setMainLayers or setTopLayers is called.
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

        /**
         * Set the bottom layers.
         * 
         * @param layers - Layers to use as the bottom layers.
         */
        setBottomLayers(...layers: Layer[]) {
            this.bottomLayers = layers;
            this.updateLayers();
        }

        /**
         * Set the main layers
         * 
         * @param layers - Layers to use as the main layers.
         */
        setMainLayers(...layers: Layer[]) {
            this.mainLayers = layers;
            this.updateLayers();
        }

        /**
         * Set the top layers
         * 
         * @param layers - Layers to use as the top layers.
         */
        setTopLayers(...layers: Layer[]) {
            this.topLayers = layers;
            this.updateLayers();
        }

        /**
         * Automatically set up mouse handlers. Call this function if you want
         * the LayerManager to listen to mouse-related events, and call your
         * layers' handlers for you.
         *
         * @param target - HTML element to listen to mouse events on. For
         * example, this might be the canvas that you draw your game to.
         * @param touchToo - The LayerManager will listen to touch-related
         * events, and pretend that they are mouse events for you. This might
         * give you an easy way to handle touch, but it is quite simplistic. In
         * particular, you can't handle multitouch this way.
         */
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

        /**
         * Automatically set up keyboard handlers. Call this function if you
         * want the LayerManager to listen to keyboard-related events, and call
         * your layers' handlers for you.
         *
         * @param target - HTML element or window to listen to keyboard events
         * on. It can be useful to use the window for this, since specific HTML
         * elements need to be in focus to receive these events.
         */
        setupKeyboardListeners(target: HTMLElement | Window) {
            target.addEventListener('keydown', (e) => this.handleKeyDown(<KeyboardEvent>e));
            target.addEventListener('keyup', (e) => this.handleKeyUp(<KeyboardEvent>e));
        }

        /**
         * Draw all the layers, from bottom (layer 0) to top (layer N - 1, where
         * N is the number of layers).
         */
        draw() {
            // Draw all the layers, from first to last
            let l = this.layers;
            for (let k = 0; k < l.length; k++) {
                l[k].draw();
            }
        }

        private stopBubble(e: Event): boolean {
            // Helper function to stop the event from bubbling through to other
            // items in the DOM or to the browser.
            e.preventDefault();
            e.stopPropagation();
            return false;
        }


        private callOnLayers(f: (layer: Layer) => boolean) {
            // Helper function to call a function in layers from the top down to
            // the bottom, stopping when one returns false.
            let l = this.layers;
            let passThrough = true;
            for (let k = l.length - 1; k >= 0; k--) {
                passThrough = f(l[k]);
                if (!passThrough) break;
            }
            return passThrough;
        }

        /**
         * Update all the layers, from last to first, stopping if we get
           a false return value.
         */
        update(deltat: number) {
            
            this.callOnLayers((layer) => layer.update(deltat));
        }

        /**
         * Handle a click event. Calls the handleClick function of all the
         * layers, from last to first, stopping if we get a false return value.
         */
        handleClick(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY], e.target);
            let l = this.layers;
            let passThrough = this.callOnLayers((layer) => layer.handleClick(e.button));
            if(!passThrough) return this.stopBubble(e);
        }

        /**
         * Handle a double click event. Calls the handleDoubleClick function of
         * all the layers, from last to first, stopping if we get a false return
         * value.
         */
        handleDoubleClick(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY], e.target);
            let passThrough = this.callOnLayers((layer) => layer.handleDoubleClick());
            if(!passThrough) return this.stopBubble(e);
        }

        /**
         * Handle a mouse down event. Calls the handleMouseDown function of all
         * the layers, from last to first, stopping if we get a false return
         * value.
         */
        handleMouseDown(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY], e.target);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseDown(e.button));
            if(!passThrough) return this.stopBubble(e);
        }

        /**
         * Handle a touch start event as if it were a mouse down event.
         */
        handleTouchAsMouseDown(e: TouchEvent) {
            let touch = e.changedTouches[0];
            this.processMouseMove([touch.clientX, touch.clientY], e.target);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseDown(0));
            if(!passThrough) return this.stopBubble(e);
        }

        /**
         * Handle a mouse up event. Calls the handleMouseUp function of all the
         * layers, from last to first, stopping if we get a false return value.
         */
        handleMouseUp(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY], e.target);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseUp(e.button));
            if(!passThrough) return this.stopBubble(e);
        }

        /**
         * Handle a touch end event as if it were a mouse up event.
         */
        handleTouchAsMouseUp(e: TouchEvent) {
            let touch = e.changedTouches[0];
            this.processMouseMove([touch.clientX, touch.clientY], e.target);
            let passThrough = this.callOnLayers((layer) => layer.handleMouseUp(0));
            if(!passThrough) return this.stopBubble(e);
        }

        private processMouseMove(clientCoords: [number, number], target: EventTarget | null) {
            // Helper function to record the mouse coordinates and call the
            // handleMouseMove functions of all the layers.
            let elt = <HTMLElement>target;
            this.mousePos = clientCoordsToElementCoords(clientCoords, elt);
            this.callOnLayers((layer) => {
                layer.handleMouseMove();
                return true;
            });
        }

        /**
         * Handle a mouse move event. Calls the handleMouseMove function for all
         * the layers, from last to first.
         */
        handleMouseMove(e: MouseEvent) {
            this.processMouseMove([e.clientX, e.clientY], e.target);
        }

        /**
         * Handle a touch move event as if it were a mouse move event. Calls the
         * and handleMouseMove function for all the layers, from last to first.
         */
        handleTouchAsMouseMove(e: TouchEvent) {
            let touch = e.changedTouches[0];
            this.processMouseMove([touch.clientX, touch.clientY], e.target);
        }

        /**
         * Handle a mouse out event. We treat it as a mouse move event, except
         * that instead of (x, y) coordinates, we set the mouse
         * position to null.
         */
        handleMouseOut(e: MouseEvent) {
            this.mousePos = null;
            this.callOnLayers((layer) => {
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