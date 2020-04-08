namespace PH {
    /**
     * Definition of a mouse position, used in various places. It's either [x,
     * y] coordinates of the mouse, or null if it's out of the interactive
     * region.
     */
    export type MousePosition = [number, number] | null;

    /**
     * An interface describing those classes that can provide mouse positions.
     */
    export interface MousePositionProvider {
        mousePos: MousePosition;
    }

    /**
     * Convert the clientX, clientY values provided by a MouseEvent into coordinates
     * relative to the top-left of an HTML element. (E.g., canvas coordinates.)
     * 
     * @param coords - Client [x, y] coordinates.
     * @param elt - The element that the coordinates should be relative to.
     * 
     * @returns [x, y] coordinates relative to the top-left of the element.
     */
    export function clientCoordsToElementCoords(coords: [number, number], elt: HTMLElement):
        [number, number] {
        let rect = elt.getBoundingClientRect();
        let x = coords[0] - rect.left;
        let y = coords[1] - rect.top;
        return [x, y];
    }

    /**
     * Keeps track of the mouse position, relative to the element.
     */
    export class SimpleMousePositionTracker {
        mousePos: MousePosition = null;

        /**
         * Construct a SimpleMousePositionTracker, which will start listening to
         * the mousemove event on an HTML element or the window. It will keep
         * track of the mouse coordinates, relative to the top-left of the
         * element.
         *
         * @param target - HTML element or the window to track mouse movement
         * on.
         * @param touchToo - If true, try to listen for touch move events and
         * also treat them as mouse movements.
         */
        constructor(target: HTMLElement | Window, touchToo: boolean) {
            target.addEventListener('mousemove', (e) => this.handleMouseMove(<MouseEvent>e));
            target.addEventListener('mouseout', (e) => this.handleMouseOut(<MouseEvent>e));
            if(touchToo) {
                target.addEventListener('touchmove', (e) => this.handleTouchAsMouseMove(<TouchEvent>e));
            }
        }

        /**
         * Handle mouse movement.
         * 
         * @param e Mouse event.
         */
        handleMouseMove(e: MouseEvent) {
            this.mousePos = clientCoordsToElementCoords([e.clientX, e.clientY], <HTMLElement>e.target);
        }

        /**
         * Handle the mouse moving out of the target.
         * 
         * @param e Mouse event.
         */
        handleMouseOut(e: MouseEvent) {
            this.mousePos = null;
        }

        /**
         * Handle touch movement.
         * 
         * @param e Touch event.
         */
        handleTouchAsMouseMove(e: TouchEvent) {
            this.mousePos = clientCoordsToElementCoords(
                [e.touches[0].clientX, e.touches[1].clientY], <HTMLElement>e.target);
        }
    }
}
