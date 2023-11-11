import {Sprite} from "./Sprite";
import OBJECTS from "./objects.json"
import {proccessImage} from "./util";

export class GameObject {
    id: number;
    x: number;
    y: number;
    z: number;
    flipX: boolean;
    flipY: boolean;
    rotation: number;
    sprites: Sprite[] = [];

    mainColor: number = 0;
    secondaryColor: number = 0;

    constructor(o: any) {
        this.id = o[1]|0;
        this.x = o[2]|0;
        this.y = -o[3]|0; // because of webgl space
        this.flipX = o[4];
        this.flipY = o[5];
        this.rotation = o[6]|0;

        this.mainColor = o[21]|0;
        this.secondaryColor = o[22]|0;

        let image = (OBJECTS as any)[o[1]];
        this.z = ((image.default_z_layer ?? 0) * 1000) + ((image.default_z_order ?? 0) + 100);

        this.sprites.push(...proccessImage(this, image));

    }
}