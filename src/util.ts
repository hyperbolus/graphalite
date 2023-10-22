import {mat3} from 'gl-matrix';
import {Renderer} from "./Renderer";
import {Texture} from "./Texture";

export type RGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};

export type RGB = {
    r: number;
    g: number;
    b: number;
};

/**
 * Creates and compiles the given shader and checks for errors. It then returns the shader.
 */
export function createShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader|undefined {
    let shader = gl.createShader(type);
    if (!shader) throw new Error('Error creating shader');

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (success) return shader;

    let msg = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Error creating shader: ${msg ?? "No Message"}`);
}

/**
 * Takes the 2 given shaders and combines them into a WebGLProgram and also checks for errors
 * @param {WebGLRenderingContext} gl gl context
 * @param {WebGLShader} vertexShader the vertex shader
 * @param {WebGLShader} fragmentShader the fragment shader
 * @returns WebGLProgram or undefined if unsuccessful
 */
export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram|undefined {
    let program = gl.createProgram();
    if (!program) throw new Error('Could not create program');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    let success = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (success) return program;

    let msg = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Error creating shader: ${msg ?? "No Message"}`);
}

/**
 * Takes in given values and puts them in a WebGLBuffer
 */
export function createBuffer(gl: WebGL2RenderingContext, values: number[]): WebGLBuffer {
    let buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);

    if (buffer === null) throw new Error('Could not create buffer');
    return buffer;
}

/**
 * Enabling the given WebGLBuffer so that gl.drawArrays is called with it.
 * It will give the values contained in the buffer to the GPU to render.
 * It also asks for how the buffer is layouted and what components to give.
 */
export function enableBuffer(gl: WebGL2RenderingContext, buffer: WebGLBuffer, attr: number, size: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attr);
}

/**
 * Enabling the given WebGLTexture so that gl.drawArrays is called with it.
 * It will take the texture and give it as a uniform for the shaders to use.
 */
export function enableTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, uLocation: WebGLUniformLocation) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uLocation, 0);
}

/**
 * It takes in the texture cutout out of the spreadsheet and sets the correct uniforms of the cutout.
 * The cutout is 0.6 pixels smaller to avoid texture leaking from the nearing textures in the sheet.
 */
export function setTexture(renderer: Renderer, texture: Texture, tex: {x: number, y: number, w:number, h:number}) {
    if (texture.loaded) return false;

    const TEXTURE_INSET = 0.6;
    let texM = mat3.create();

    mat3.translate(texM, texM, [(tex.x + TEXTURE_INSET) / texture.width, (tex.y + TEXTURE_INSET) / texture.height]);
    mat3.scale(texM, texM, [(tex.w - TEXTURE_INSET * 2) / texture.width, (tex.h - TEXTURE_INSET) / texture.height]);

    renderer.gl.uniformMatrix3fv(renderer.data['textM'], false, texM);
}

/**
 * Sets the texture so that it renders the whole thing.
 */
export function setFullTexture(renderer: Renderer) {
    renderer.gl.uniformMatrix3fv(renderer.data['textM'], false, mat3.create());
}

/**
 * This sets the model matrix. The model matrix is the transformation of an object.
 * The vertex shader takes the model matrix in as 3 component matrix uniform and multiplies it
 * with the vertices of the texture rectangle so it applies the transformations.
 */
export function setModelMatrix(renderer: Renderer, x: number, y: number, w: number, h: number = w, rot: number = 0) {
    let model = mat3.create();

    mat3.translate(model, model, [x, y]);

    if (rot) mat3.rotate(model, model, (-rot) * Math.PI / 180);

    h ? mat3.scale(model, model, [w, h]) : mat3.scale(model, model, [w, w])

    renderer.gl.uniformMatrix3fv(renderer.data['u_model'], false, model);
}

/**
 * Sets the view matrix. The view matrix is the transformation of the view (basically the camera).
 * For the rest, it basically does the same thing as the model matrix.
 * If the x, y, zoom values are not given. It will use the camera in the GDRenderer.
 */
export function setCamera(renderer: Renderer, x: number = renderer.camera.x, y: number = renderer.camera.y) {
    renderer.gl.uniform1f(renderer.data['u_cx'], x);
    renderer.gl.uniform1f(renderer.data['u_cy'], y);

    let matrix = mat3.create();

    mat3.scale(matrix, matrix, [renderer.camera.zoom, renderer.camera.zoom]);

    renderer.gl.uniformMatrix3fv(renderer.data['u_view'], false, matrix);
}

export function color255(r = 255, g = 255, b = 255, a = 255) {
    return {r, g, b, a};
}

/**
 * This sets the projection matrix so that the view looks 2d and normally scaled to the canvas.
 * Another example of a projection matrix is a perspective matrix that gives the 3d effect.
 */
export function setProjection(renderer: Renderer) {
    let matrix = mat3.create();
    mat3.scale(matrix, matrix, [2 / renderer.width, 2 / renderer.height]);

    renderer.gl.uniformMatrix3fv(renderer.data['u_proj'], false, matrix);
}

/**
 * Sets the tint of the object for the next gl.drawArrays call. This is what basically makes objects different colors.
 * The given tint is then multiplied with every pixel of the object.
 */
export function setTint(gl: WebGL2RenderingContext, program: WebGLProgram, tint: RGBA) {
    gl.uniform4fv(gl.getUniformLocation(program, "a_tint"), new Float32Array([tint.r, tint.g, tint.b, tint.a]));
}

export function getSpeedPortal(obj_id: number): number {
    switch (obj_id) {
        case 200:
            return 0;
        case 201:
            return 1;
        case 202:
            return 2;
        case 203:
            return 3;
        case 1334:
            return 4;
        default:
            throw new Error('Invalid speed portal')
    }
}

export function getColorTriggerChannel(obj: any): number | null {
    if (obj.type != 'trigger' || obj.info != 'color') return null;
    if (obj.color) return obj.color;

    switch (obj.id) {
        case 29:
            return 1000;
        case 30:
            return 1001;
        case 104:
            return 1002;
        case 105:
            return 1004;
        case 221:
            return 1;
        case 717:
            return 2;
        case 718:
            return 3;
        case 743:
            return 4;
        case 744:
            return 1003;
        default:
            return 1; // FIXME: Error here?
    }
}

const ups: any = {
    [0]: 258,
    [1]: 312,
    [2]: 388.8,
    [3]: 468,
    [4]: 578.1
}

const color_names: any = {
    1000: "BG",
    1001: "G1",
    1002: "LINE",
    1003: "3DL",
    1004: "OBJ"
}

/**
 * This function takes in a level and a x position and returns the time
 * it takes to get to that x position given you went through each speed portal
 */
export function xToSec(level: any, x: number): number {
    let base = (+level.info.speed || 0) + 1;
    let portal;

    for (let k of level.sps) {
        let sp = level.data[k];

        if (+sp.x >= +x) break;
        portal = sp;
    }

    if (!portal) return +x / ups[base];
    else {
        let spd = getSpeedPortal(portal);
        return portal.secx + (x - +portal.x) / ups[spd];
    }
}

/**
 * This function takes in a level and time in seconds and returns the x position
 * where the amount of time passed is the same as the input given you went through each speed portal
 */
export function secToX(level: any, sec: number): number {
    let lastX = 0;
    let lastSec = 0;
    let lastSpd = +(level.info.speed || 0) + 1;

    for (let key of level.sps) {
        let sp = level.data[key];

        if (sec < sp.secx)
            break;

        lastX = +sp.x;
        lastSec = +sp.secx;
        lastSpd = getSpeedPortal(sp);
    }

    return lastX + (sec - lastSec) * ups[lastSpd];
}

/**
 * forgot what this does TODO: figure wha this did
 */
export function xToSecBC(level: any, x: any): number {
    var resSP = null;
    var lspd = null;

    lspd = parseInt((level.info.speed === undefined) ? 1 : (level.info.speed + 1));

    for (var sp of level.listSPs) {
        if (parseFloat(sp.x) >= parseFloat(x))
            break;
        resSP = sp;
    }
    if (resSP != null) {
        var speed = null;
        speed = getSpeedPortal(resSP);
        return resSP.secx + (x - resSP.x) / parseFloat(ups[speed]);
    } else
        return parseFloat(x) / parseFloat(ups[lspd]);
}

export function pickColor(o: RGB) {
    return {r: o.r / 255, g: o.g / 255, b: o.b / 255};
}

export function pickColorFromTrigger(o: RGBA) {
    return {r: o.r / 255, g: o.g / 255, b: o.b / 255, a: o.a || 1};
}

export function calColorFrom(level: any, pX: number, pColor: RGBA, pDuration: number, nX: number, nColor: RGBA) {
    let pSec = xToSec(level, pX);
    //let dSec = pSec + pDuration;

    let nSec = xToSec(level, nX);
    let minmax = (n: number) => Math.min(Math.max(n, 0), 1);

    return blendColor(pColor, nColor, minmax((nSec - pSec) / pDuration));
}

/**
 * Takes in the level, an x position and a color id and calculates the color
 * at that x position given you went through each speed portal.
 */
export function xToCOL(level: any, xPos: number, colorChannel: number): RGBA {
    let trigger;
    let base = level.info.colors.filter((f: any) => f.channel == colorChannel);

    if (base.length > 0) base = pickColor(base[0]);
    else base = {r: 1, g: 1, b: 1, a: 1};

    if (level.cts[colorChannel])
        for (let k of level.cts[colorChannel]) {
            let trg = level.data[k];

            if (+trg.x >= xPos) break;
            trigger = trg;
        }

    if (trigger) return calColorFrom(level, +trigger.x, trigger.curCol, +trigger.duration, xPos, pickColorFromTrigger(trigger));
    else return base;
}

/**
 * I think this one calculates a background color value
 */
export function xToCOLBC(level: any, x: number, col: number): RGBA|RGB {
    var resCOL = null;
    if (level.listCOLs[col] != undefined) {
        for (var colo of level.listCOLs[col]) {
            if (colo.x >= x)
                break;
            resCOL = colo;
        }
    }
    if (resCOL != null) {
        var delta = xToSec(level, x) - xToSec(level, resCOL.x);
        if (delta < parseFloat(resCOL.duration)) {
            return blendColor(resCOL.curCol, resCOL, delta / resCOL.duration);
        } else
            return resCOL;
    } else {
        var baseColor = level.info.colors.filter((f: any) => {
            return f.channel == col;
        });
        if (baseColor.length > 0) {
            baseColor = baseColor[0];

            return {r: baseColor.r, b: baseColor.b, g: baseColor.g};
        } else
            return {r: 255, b: 255, g: 255}
    }
}

/**
 * This converts each color component so the values go from `0 - 255` to `0 - 1`
 * which is more useful for WebGL.
 */
export function normalize(col: RGB): RGB {
    return {r: col.r / 255, g: col.g / 255, b: col.b / 255};
}

/**
 * This interpolates the 2 color components depending on the `blend` value
 */
export function blendComp(c1: number, c2: number, blend: number): number {
    return c1 * (1 - blend) + c2 * blend;
}

/**
 * This interpolates the 2 color values depending on the `blend` value
 */
export function blendColor(col1: RGBA, col2: RGBA, blend: number): RGBA {
    let ret = {
        r: blendComp(col1.r, col2.r, blend),
        b: blendComp(col1.b, col2.b, blend),
        g: blendComp(col1.g, col2.g, blend),
        a: 1
    };
    if (col1.a) ret.a = blendComp(col1.a, col2.a, blend);

    return ret;
}

/**
 * This function loads all the color triggers from a specific color id so that each
 * color trigger has a `curCol` which is the color currently at that trigger before
 * it gets converted and also lists the indexes of the color triggers so you dont have to
 * go through each object to find the color trigger needed. This is purely for optimisation.
 */
export function loadColors(level: any, color: number): object {
    var listCOLs = [];

    for (const obj of level.data)
        if (obj.type == "trigger" && obj.info == "color" && (obj.color == "" + color || (color == 1 && !obj.color)))
            listCOLs.push(obj);

    listCOLs.sort((a, b) => a.x - b.x);

    var lastCOL = {x: -200000, r: 255, g: 255, b: 255, a: 1, duration: 0};
    var curCol = {r: 255, g: 255, b: 255, a: 1};
    var baseColor = level.info.colors.filter((f: any) => {
        return f.channel == color;
    });
    if (baseColor.length > 0) {
        baseColor = baseColor[0];

        lastCOL = {x: -200000, r: baseColor.r, g: baseColor.g, b: baseColor.b, a: 1, duration: 0};
        curCol = {r: baseColor.r, g: baseColor.g, b: baseColor.b, a: 1};
    }

    for (const obj of listCOLs) {
        var delta = xToSec(level, obj.x) - xToSec(level, lastCOL.x);
        if (delta < lastCOL.duration) {
            curCol = blendColor(curCol, lastCOL, delta / lastCOL.duration);
        } else {
            curCol = lastCOL;
        }
        obj.curCol = curCol;
        lastCOL = obj;
    }
    return listCOLs;
}

export function guidelineColor(color: number) {
    if (color >= 1.0) return {r: 0, g: 1, b: 0, a: 1};

    if (color == 0.8 || color == 0) return {r: 1, g: 0.5, b: 0, a: 1};
    else if (color == 0.9) return {r: 1, g: 1, b: 0, a: 1};

    return {r: 0, b: 0, g: 0, a: 0};
}

let zorder = {
    '-3': -4,
    '-1': -3,
    '1': -2,
    '3': -1,
    '5': 1,
    '7': 2,
    '9': 3
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

export function drawTexture() {

}