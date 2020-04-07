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

    export function clientCoordsToElementCoords(coords: [number, number], elt: HTMLElement):
        [number, number] {
        let rect = elt.getBoundingClientRect();
        let x = coords[0] - rect.left;
        let y = coords[1] - rect.top;
        return [x, y];
    }
}
