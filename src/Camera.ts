export class Camera {
    x: number = 0;
    y: number = 0;
    zoom: number = 0;

    constructor(x = 0, y = 0, zoom = 1) {
        this.x = x;
        this.y = y;
        this.zoom = zoom;
    }

}