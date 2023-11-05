import {
    COL_3DL,
    COL_BG,
    COL_BLACK, COL_G1,
    COL_G2,
    COL_LBG,
    COL_LINE,
    COL_OBJ,
    COL_P1,
    COL_P2,
    dict2obj,
    keyed2obj,
    RGBA
} from "./util";
import BLOCKS from './blocks.json'
import {Texture} from "./Texture";
import {Annotation} from "./Annotation";

export class Level {
    objects: any;

    annotations: Annotation[] = [];

    colors: RGBA[] = Array(1010).fill(structuredClone({r: 1, g: 1, b: 1, a: 1}));

    static sprites: any = {};

    static blocks: any = BLOCKS;

    static atlases: { [key: string]: Texture } = {};

    constructor(string: string) {
        let objs = string.split(';');

        objs.pop(); // Remove trailing ;
        this.objects = objs.map(o => keyed2obj(o, ','));

        let start = this.objects.shift();

        for (let key in start) {
            switch (key) {
                case 'kS38':
                    start[key] = start[key].split('|');
                    start[key].pop(); // Remove trailing |
                    for (let i = 0; i < start[key].length; i++) {
                        start[key][i] = keyed2obj(start[key][i], '_');
                        this.colors[start[key][i][6] ?? 0] = {
                            r: start[key][i][1] / 255,
                            g: start[key][i][2] / 255,
                            b: start[key][i][3] / 255,
                            a: start[key][i][7]|0,
                        }
                    }
                    break;
            }
        }

        this.objects.forEach((o: any) => {
            o[2] = o[2]|0; // X
            o[3] = o[3]|0; // Y

            o[4] ??= 0; // Flip X
            o[5] ??= 0; // Flip Y

            o[6] ??= 0; // Rotation

            o[24] ??= 0;
            o[25] ??= 0;
        });

        // this.colors[1] = {r: 1, g: 0, b: 0, a: 1};
        // this.colors[2] = {r: 0, g: 1, b: 0, a: 1};
        // this.colors[3] = {r: 0, g: 0, b: 1, a: 1};
        // this.colors[4] = {r: 1, g: 1, b: 1, a: 1};

        // this.colors[COL_BG] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_G1] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_LINE] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_3DL] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_OBJ] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_P1] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_P2] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_LBG] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_G2] = {r: 0, g: 0, b: 0, a: 1};
        // this.colors[COL_BLACK] = {r: 1, g: 0, b: 0, a: 1};
    }

    static parsePlist(string: string, name: string) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(string, 'text/xml');

        const _sprites: HTMLCollection = dom.children[0].children[0].children[1].children;

        for (let i = 0; i < _sprites.length; i += 2) {
            let file = _sprites[i].textContent ?? 0;
            Level.sprites[file] = dict2obj(_sprites[i + 1].children);
            Level.sprites[file].atlas = name;

            if (Level.sprites[file]['textureRotated']) {
                Level.sprites[file]['spriteSize'].reverse();
                Level.sprites[file]['spriteSourceSize'].reverse();
                Level.sprites[file]['textureRect'][1].reverse();
            }
        }
    }

    static async loadAtlas(gl: WebGL2RenderingContext, path: string, tid?: number) {
        Level.atlases[path] = new Texture(gl, path);
        Level.atlases[path].tid = tid;
        let frags = path.split('.');
        frags.pop();
        let name = frags.join('.')
        this.parsePlist(await fetch(`${name}.plist`).then(res => res.text()), path);
    }
}