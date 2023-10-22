import {dict2obj, keyed2obj, loadImage} from "./util";
import BLOCKS from './blocks.json'
import {Texture} from "./Texture";
export class Level {
    objects: any;

    static sprites: any = {};

    static blocks: any = BLOCKS;

    static atlases: any = {};

    constructor(string: string) {
        let objs = string.split(';');
        this.objects = objs.slice(1, objs.length - 1).map(o => keyed2obj(o, ','));
    }

    drawObject(gl: WebGL2RenderingContext, id: number, x: number, y: number, h: number, w: number, a: number = 0) {
        const s = Level.sprites[Level.blocks[id] + '.png']

        // Missing block texture
        if (!s) {
            console.log([id, Level.blocks[id]])
            return;
        }

        console.log([gl,x,y,h,w,a]);
    }

    static parsePlist(string: string, name: string) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(string, 'text/xml');

        const _sprites: HTMLCollection = dom.children[0].children[0].children[1].children;

        for (let i = 0; i < _sprites.length; i += 2) {
            Level.sprites[_sprites[i].textContent ?? 0] = dict2obj(_sprites[i + 1].children);
            Level.sprites[_sprites[i].textContent ?? 0].atlas = name;
        }
    }

    static async loadAtlas(gl: WebGL2RenderingContext, path: string) {
        Level.atlases[path] = new Texture(gl, path);
        let frags = path.split('.');
        frags.pop();
        let name = frags.join('.')
        this.parsePlist(await fetch(`${name}.plist`).then(res => res.text()), path);
    }
}