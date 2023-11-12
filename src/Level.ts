import {
    COL_BLACK,
    dict2obj,
    keyed2obj,
    RGBA
} from "./util";
import {Texture} from "./Texture";
import {Annotation} from "./Annotation";
import {Renderer} from "./Renderer";
import {GameObject} from "./GameObject";

export class Level {
    sections: GameObject[][] = [];
    annotations: Annotation[] = [];
    colors: RGBA[] = Array(1012);
    static sprites: any = {};
    static atlases: { [key: string]: Texture } = {};

    constructor(string: string) {
        let objs = string.split(';');

        objs.pop(); // Remove trailing ;
        objs = objs.map(o => keyed2obj(o, ','));

        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i] = {r: 1, g: 1, b: 1, a: 1}
        }

        let start: any = objs.shift();
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

        for (let i = 0, n = objs.length; i < n; i++) {
            // TODO: check for negative section ids
            const id = (parseInt(objs[i][2]) - parseInt(objs[i][2]) % 100) / 100;
            if (!this.sections[id]) this.sections[id] = [];
            this.sections[(parseInt(objs[i][2]) - parseInt(objs[i][2]) % 100) / 100].push(new GameObject(objs[i]))
        }

        this.colors[COL_BLACK] = {r: 0, g: 0, b: 0, a: 1};
        this.colors[1011] = {r: 0, g: 0, b: 0, a: 1};
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

    static async loadAtlas(renderer: Renderer, path: string, plist: string, tid?: number) {
        Level.atlases[path] = new Texture(renderer, path);
        Level.atlases[path].tid = tid ?? 0;
        this.parsePlist(await fetch(plist).then(res => res.text()), path);
    }
}