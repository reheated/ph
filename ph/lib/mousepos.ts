namespace PH {
    /**
     * Definition of a mouse position, used in various places. It's either [x,
     * y] coordinates of the mouse, or null if it's out of the interactive
     * region.
     */
    export type MousePosition = [number, number] | null;

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
}
