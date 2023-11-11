import {Level} from "./Level";
import OBJECTS from "./objects.json";
import {GameObject} from "./GameObject";
import {Sprite} from "./Sprite";

export type RGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};

export function clamp(n: number, min: number, max: number) {
    return Math.min(Math.max(n, min), max)
}

export function proccessImage(o: GameObject, image: any): Sprite[] {
    const sprite = new Sprite();
    const sprites: Sprite[] = [];

    // Get plist data
    const s = Level.sprites[image.texture];
    if (!s) throw new Error(`Missing object ${o.id}`)

    // ---------- Vertices ----------
    o.rotation -= 90 * s.textureRotated; // If sprite rotated on sprite sheet
    o.rotation += image.rot ?? 0;
    o.rotation *= DEG2PI; // Convert from radians

    // TODO: scan file name -uhd, -hd to get scaling size
    let w = s.spriteSize[0] / 4, h = s.spriteSize[1] / 4;
    let {x, y} = o;

    x += image.x ?? 0;
    y -= image.y ?? 0;

    x += image.anchor_x ?? 0;
    y += image.anchor_y ?? 0;

    let verts: number[][] = [
        [x,   y],
        [x,   y+h],
        [x+w, y+h],
        [x,   y],
        [x+w, y],
        [x+w, y+h],
    ];

    if (o.flipX && !(image.flip_x ?? 0)) {
        for (let i = 0; i < verts.length; i++) {
            verts[i][0] -= 15;
            verts[i][0] -= x;
        }

        for (let i = 0; i < verts.length; i++) {
            verts[i][0] *= -1;
        }

        for (let i = 0; i < verts.length; i++) {
            verts[i][0] += 15;
            verts[i][0] += x;
        }
    }

    if (o.flipY && !(image.flip_y ?? 0)) {
        for (let i = 0; i < verts.length; i++) {
            verts[i][1] -= 15;
            verts[i][1] -= y;
        }

        for (let i = 0; i < verts.length; i++) {
            verts[i][1] *= -1;
        }

        for (let i = 0; i < verts.length; i++) {
            verts[i][1] += 15;
            verts[i][1] += y;
        }
    }

    y += 15;
    x += 15;

    sprite.vertices.push(
        ...rotatePoint(verts[0][0], verts[0][1], x, y, o.rotation),
        ...rotatePoint(verts[1][0], verts[1][1], x, y, o.rotation),
        ...rotatePoint(verts[2][0], verts[2][1], x, y, o.rotation),
        ...rotatePoint(verts[3][0], verts[3][1], x, y, o.rotation),
        ...rotatePoint(verts[4][0], verts[4][1], x, y, o.rotation),
        ...rotatePoint(verts[5][0], verts[5][1], x, y, o.rotation),
    )

    let {width: aw, height: ah, tid} = Level.atlases[s.atlas]
    let [[sx, sy], [lx, ly]] = s.textureRect;

    // Convert to 0-1
    lx = (sx + lx) / aw;
    ly = (sy + ly) / ah;
    sx /= aw;
    sy /= ah;

    sprite.texcoords.push(
        sx, sy, tid,
        sx, ly, tid,
        lx, ly, tid,
        sx, sy, tid,
        lx, sy, tid,
        lx, ly, tid,
    );

    if (!o.mainColor) {
        o.mainColor = image.default_base_color_channel ?? 1008
    }
    // TODO: make this magents to check or something
    if (!o.secondaryColor) {
        o.secondaryColor = image.default_detail_color_channel ?? 1008
    }

    let c = 1008;
    switch (image.color_type) {
        case 'Base':
            c = o.mainColor;
            break;
        case 'Detail':
            c = o.secondaryColor;
            break;
        case 'Black':
            c = COL_BLACK;
            break;
    }

    sprite.colors.push(c, c, c, c, c, c);

    // FIXME
    if (image.hasOwnProperty('children')) {
        for (let i = 0; i < image.children.length; i++) {
            sprites.push(...proccessImage(o, image.children[i]))
        }
    }

    sprites.push(sprite);

    return sprites;
}

export const COL_BG = 1000;
export const COL_G1 = 1001;
export const COL_LINE = 1002;
export const COL_3DL = 1003;
export const COL_OBJ = 1004;
export const COL_P1 = 1005;
export const COL_P2 = 1006;
export const COL_LBG = 1007;
export const COL_G2 = 1009;
export const COL_BLACK = 1010;

export const DEG2PI = Math.PI / 180;


export function bufferVertexAttribute(gl: WebGL2RenderingContext, data: number[], location: GLint, size: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, true, 0, 0);
}

export function rotatePoint(x1: number, y1: number, x2: number, y2: number, a: number) {
    if (!a) return [x1, y1];
    return [
        ((x1 - x2) * Math.cos(a)) - ((y1 - y2) * Math.sin(a)) + x2,
        ((y1 - y2) * Math.cos(a)) + ((x1 - x2) * Math.sin(a)) + y2,
    ];
}

/**
 * Returns plist XML dictionary js object with keys
 * @param {HTMLCollection} e
 * @returns {Object}
 */
export function dict2obj(e: any) {
    let obj: any = {};

    for (let i = 0; i < e.length; i += 2) {
        if (!e[i] === null) continue;
        if (e[i + 1].tagName === 'array') {
            obj[e[i].textContent] = [];
        } else if (e[i + 1].tagName === 'false') {
            obj[e[i].textContent] = false;
        } else if (e[i + 1].tagName === 'true') {
            obj[e[i].textContent] = true;
        } else {
            obj[e[i].textContent] = str2array(e[i + 1].textContent);
        }
    }

    return obj;
}

/**
 * Return plist "array" strings as js arrays
 */
export function str2array(str: String) {
    return JSON.parse(str.replaceAll('{', '[').replaceAll('}', ']'))
}

/**
 * Convert RobTop-style dictionary string to object
 */
export function keyed2obj(list: string, separator: string) {
    const l = list.split(separator);
    let obj: any = {};
    for (let i = 0; i < l.length; i += 2) {
        obj[l[i]] = l[i + 1]
    }
    return obj;
}

/**
 * Returns a promise to wait until Image is loaded
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((r, err) => {
        const img = new Image()
        img.src = url;
        img.onload = () => r(img)
        img.onerror = e => err(e)
    })
}
