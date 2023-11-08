export type RGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};

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
