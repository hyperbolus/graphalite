export class Camera {
    x: number = 0;
    y: number = 0;

    dirty: boolean = true;

    static mx: number = 0;
    static my: number = 0;

    angle: number = 0;
    private _zoom: number = 100;

    set zoom(n: number) {
        this._zoom = Math.max(0.01, Math.min(5, n));
    }

    get zoom() {
        return this._zoom;
    }

    constructor(x = 0, y = 0, zoom = 100) {
        this.x = x;
        this.y = y;
        this.zoom = zoom;
    }

}