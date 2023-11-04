import FSH_SRC from './shaders/default.frag?raw'
import VSH_SRC from './shaders/default.vert?raw'
import {createProgramInfo, m4, ProgramInfo, resizeCanvasToDisplaySize} from 'twgl.js'
import {Camera} from './Camera'
import {Texture} from "./Texture";
import {Level} from "./Level";
import ATLAS_1 from "./resources/GJ_GameSheet-uhd.png";
import ATLAS_2 from "./resources/GJ_GameSheet02-uhd.png";
import ATLAS_3 from "./resources/FireSheet_01-uhd.png";
import OBJECTS from "./objects.json"
import BG_1 from "./resources/game_bg_01_001-uhd.png";
import {Pane} from 'tweakpane';
import {mat4, quat2, ReadonlyMat4, ReadonlyVec2, vec2} from "gl-matrix";
import {bufferVertexAttribute, COL_BG, COL_BLACK, DEG2PI, rotatePoint} from "./util";
import transformPoint = m4.transformPoint;

export class Renderer {
    gl: WebGL2RenderingContext;
    pInfo: ProgramInfo;

    canvas: HTMLCanvasElement;

    camera: Camera = new Camera(0, 0, 1);

    backgrounds: { [key: number]: Texture } = {};

    data: any = {};

    width: number = 0;

    height: number = 0;

    static debug: boolean = true;
    flags: any = {
        offsetX: false,
        offsetY: false,
        anchorMethod: false,
        objsDrawn: 0,
        cullDistanceFactor: 2
    };

    level?: Level;

    time: number = 0;

    pane: Pane = new Pane();

    bgs: Texture[] = [];

    fps: number = 0;

    constructor(canvas: HTMLElement | null) {
        if (!canvas) throw new Error('Canvas not given')
        if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Must be type of canvas')
        this.canvas = canvas;
        let gl = canvas.getContext('webgl2', {
            premultipliedAlpha: false
        });
        if (!gl) throw new Error('Failed to create WebGL2 context');
        this.gl = gl;
        this.pInfo = createProgramInfo(gl, [VSH_SRC, FSH_SRC])

        window.addEventListener('resize', () => {
            this.camera.dirty = true
            resizeCanvasToDisplaySize(this.canvas);
        });
    }

    loadLevel(data: string) {
        this.level = new Level(data);
    }

    async initialize() {
        let gl = this.gl;

        // FIXME: on('change') doesn't work causes infinite loop
        this.pane.element.addEventListener('keyup', () => this.camera.dirty = true)
        this.pane.element.addEventListener('mousedown', () => this.camera.dirty = true)

        await Level.loadAtlas(gl, ATLAS_1, 0);
        await Level.loadAtlas(gl, ATLAS_2, 1);
        await Level.loadAtlas(gl, ATLAS_3, 2);

        this.bgs[1] = new Texture(gl, BG_1);

        this.pane.addBinding(this.camera, 'x');
        this.pane.addBinding(this.camera, 'y');
        this.pane.addBinding(Camera, 'mx');
        this.pane.addBinding(Camera, 'my');
        this.pane.addBinding(this.camera, 'zoom');

        this.pane.addBinding(this, 'fps', {
            readonly: true
        });

        const paneFlags = this.pane.addFolder({
            title: 'Flags',
            expanded: true,
        });

        paneFlags.addBinding(this.flags, 'offsetX');
        paneFlags.addBinding(this.flags, 'offsetY');
        paneFlags.addBinding(this.flags, 'anchorMethod');
        paneFlags.addBinding(this.flags, 'cullDistanceFactor');
        paneFlags.addBinding(this.flags, 'objsDrawn', {
            readonly: true
        });

        console.log('Block textures & data loaded');
    }

    draw() {
        const START_TIME = Date.now();
        resizeCanvasToDisplaySize(this.canvas);

        if (this.camera.dirty) {
            let gl = this.gl;
            let program = this.pInfo.program;

            this.data['a_position'] = gl.getAttribLocation(program, "a_position");
            this.data['a_texcoord'] = gl.getAttribLocation(program, "a_texcoord");
            this.data['a_color'] = gl.getAttribLocation(program, "a_color");
            this.data['a_texi'] = gl.getAttribLocation(program, "a_texi");

            this.data['u_matrix'] = gl.getUniformLocation(program, "u_matrix");
            this.data['u_texture'] = gl.getUniformLocation(program, "u_texture");

            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.useProgram(program);

            // TODO: Make scale origin mouse position? may need to move cam xy to compensate
            let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
            m4.translate(matrix, [gl.canvas.width / 2, gl.canvas.height / 2, 0], matrix);
            // FIXME: Maybe scale by canvas width minus zoom?
            m4.scale(matrix, [this.camera.zoom, this.camera.zoom, 1], matrix);
            m4.translate(matrix, [-this.camera.x, this.camera.y, 1], matrix);

            this.drawLines(matrix);
            this.drawBG();

            if (!this.level?.objects) return;

            const objData = this.generateObjData(this.level.objects)
            this.flags.objsDrawn = objData.vertices.length / 6;
            bufferVertexAttribute(gl, objData.vertices, this.data['a_position'], 2);
            bufferVertexAttribute(gl, objData.texcoords, this.data['a_texcoord'], 3);
            bufferVertexAttribute(gl, objData.colors, this.data['a_color'], 4);

            Level.atlases[Object.keys(Level.atlases)[0]].set(this.gl, gl.TEXTURE0);
            Level.atlases[Object.keys(Level.atlases)[1]].set(this.gl, gl.TEXTURE1);
            Level.atlases[Object.keys(Level.atlases)[2]].set(this.gl, gl.TEXTURE2);
            gl.uniform1iv(this.data['u_texture'], [0, 1, 2]);

            this.level.annotations.forEach((a) => {
                const v = vec2.transformMat4(vec2.create(), vec2.fromValues(a.x, a.y), matrix as ReadonlyMat4);
                a.move(
                    Math.round((1.0 + v[0]) * this.canvas.width / 2.0),
                    Math.round((1.0 - v[1]) * this.canvas.height / 2.0)
                );
            })

            // just for fun, switch to perspective
            // m4.rotateY(matrix, this.camera.angle, matrix)
            gl.uniformMatrix4fv(this.data['u_matrix'], false, matrix);

            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

            gl.drawArrays(gl.TRIANGLES, 0, objData.vertices.length / 2);
        }

        this.camera.dirty = false;
        this.fps = 1000 / (Date.now() - START_TIME);
        this.time++;
        this.pane.refresh();
        requestAnimationFrame(this.draw.bind(this));
    }

    generateObjData(objs: any[]): any {
        const data: any = {colors: [], texcoords: [], vertices: []};

        objs.forEach((o) => {
            const cm = this.camera, cv = this.canvas;
            const cdf = this.flags.cullDistanceFactor * this.camera.zoom;
            const fx = cv.width / cdf, fy = cv.height / cdf; // TODO: tune this numbers / setting
            if (o[2] < cm.x - fx || o[2] > cm.x + fx || o[3] < cm.y - fy || o[3] > cm.y + fy) return; // cull objs

            const s = Level.sprites[Level.blocks[o[1]] + '.png'];
            if (!s) throw new Error(`Missing object ${o[1]}`)

            // ---------- Vertices ----------
            let x = o[2], y = -o[3], a = o[6];
            a -= 90 * s['textureRotated'] * DEG2PI; // If sprite rotated on sprite sheet
            a *= DEG2PI; // Convert from radians

            // TODO: scan file name -uhd, -hd to get scaling size
            let w = s['spriteSize'][0] / 4, h = s['spriteSize'][1] / 4;

            let vx = s['textureRect'][1][0] / w;
            let vy = s['textureRect'][1][1] / h;

            if (this.flags.offsetX) x += s['spriteOffset'][0] / 4;
            if (this.flags.offsetY) y += s['spriteOffset'][1] / 4;

            // x -= 15;
            // y -= 15;

            let verts: number[][] = [
                [-0.5, -0.5],
                [-0.5, +0.5],
                [+0.5, +0.5],
                [-0.5, -0.5],
                [+0.5, -0.5],
                [+0.5, +0.5],
            ];

            // let verts: number[][] = [
            //     [0, 0],
            //     [0, 1],
            //     [1, 1],
            //     [0, 0],
            //     [1, 0],
            //     [1, 1],
            // ];

            let m = m4.identity();
            if (o[4]) m4.scale(m, [-1 , 0, 1], m); // Flip X
            if (o[5]) m4.scale(m, [0 , -1, 1], m); // Flip Y
            //m4.scale(m, [30, 30, 1], m);
            if (a) {
                //m4.translate(m, [-0.5, -0.5, 0], m);
                //m4.rotateZ(m, a + Math.sin(this.time / 50), m)
                //m4.translate(m, [0.5, 0.5, 0], m);
            }
            m4.translate(m, [x, y, 0], m);
            m4.scale(m, [w, h, 1], m);

            //console.log(verts);
            verts.map((v: number[]) => m4.transformPoint(m, [...rotatePoint(v[0], v[1], 0, 0, a  + Math.sin(this.time / 50)), 1], v) as number[]);
            //console.log(verts);

            //verts.map((v: number[]) => m4.transformPoint(m4.rotateZ(m4.identity(), v[0], v[1]), [v[0], v[1], 1], v) as number[]);

            // if (this.flags.anchorMethod) {
            //     y += 15;
            //     x += 15;
            // } else {
            //     y += h / 2;
            //     x += w / 2;
            // }

            data.vertices.push(
                verts[0][0], verts[0][1],
                verts[1][0], verts[1][1],
                verts[2][0], verts[2][1],
                verts[3][0], verts[3][1],
                verts[4][0], verts[4][1],
                verts[5][0], verts[5][1],
            );

            // data.vertices.push(
            //     ...rotatePoint(verts[0][0], verts[0][1], x, y, a),
            //     ...rotatePoint(verts[1][0], verts[1][1], x, y, a),
            //     ...rotatePoint(verts[2][0], verts[2][1], x, y, a),
            //     ...rotatePoint(verts[3][0], verts[3][1], x, y, a),
            //     ...rotatePoint(verts[4][0], verts[4][1], x, y, a),
            //     ...rotatePoint(verts[5][0], verts[5][1], x, y, a),
            // );

            // ---------- Texture coordinates ----------
            let aw = Level.atlases[s.atlas].width;
            let ah = Level.atlases[s.atlas].height;
            let sx = s['textureRect'][0][0];
            let sy = s['textureRect'][0][1];
            let lx = s['textureRect'][1][0];
            let ly = s['textureRect'][1][1];

            // Just kinda cleaner. Also reduce normalization (division) operations
            lx = (sx + lx) / aw;
            ly = (sy + ly) / ah;
            sx /= aw;
            sy /= ah;

            // Include texture unit for vertex
            const t = Level.atlases[s.atlas].tid ?? 0;

            data.texcoords.push(
                sx, sy, t,
                sx, ly, t,
                lx, ly, t,
                sx, sy, t,
                lx, sy, t,
                lx, ly, t,
            );

            let _ = this.level?.colors[o[22] ?? (OBJECTS as any)[o[1] ?? 1]['default_base_color_channel']] ?? {r: 1, g: 1, b: 1, a: 1};
            let c = [_.r, _.g, _.b, _.a];
            data.colors.push(...c, ...c, ...c, ...c, ...c, ...c)
        })

        return data;
    }

    drawLines(matrix: m4.Mat4) {
        let gl = this.gl, cm = this.camera, cv = this.canvas;
        if (!this.bgs[1]?.loaded) return;

        const data: any = {vertices: [], texcoods: [], colors: []};

        // Vertical Lines
        for (let i = cm.x - cm.x % 30 - (cv.width - cv.width % 30); i < cm.x + cv.width; i += 30) {
            data.vertices.push(i, -cm.y + cv.height, i, -cm.y - cv.height);
            data.texcoods.push(0, 0, 0, 0, 1, 0)
            data.colors.push(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0,)
        }

        // Horizontal Lines
        for (let i = cm.y - cm.y % 30 - cv.height; i < cm.y + cv.height; i += 30) {
            data.vertices.push(cm.x - cv.width, -i, cv.width + cm.x, -i);
            data.texcoods.push(0, 0, 0, 0, 1, 0);
            data.colors.push(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
        }

        // Ground Line
        data.vertices.push(-10000, 0, 10000, 0);
        data.texcoods.push(0, 0, 0, 0, 1, 0);
        data.colors.push(1, 1, 1, 1.0, 1, 1, 1, 1.0);

        gl.useProgram(this.pInfo.program);
        bufferVertexAttribute(gl, data.vertices, this.data['a_position'], 2);
        bufferVertexAttribute(gl, data.texcoods, this.data['a_texcoord'], 3);
        bufferVertexAttribute(gl, data.colors, this.data['a_color'], 4);

        this.bgs[1].set(gl)
        gl.uniform1iv(this.data['u_texture'], [0, 0, 0]);
        gl.uniformMatrix4fv(this.data['u_matrix'], false, matrix);

        gl.drawArrays(gl.LINES, 0, data.vertices.length / 2);
    }

    drawBG() {
        let gl = this.gl;
        if (!this.bgs[1]?.loaded) return;

        gl.useProgram(this.pInfo.program);
        bufferVertexAttribute(gl, [
            0, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            1, 1,
        ], this.data['a_position'], 2);
        bufferVertexAttribute(gl, [
            0, 0, 0,
            0, 1, 0,
            1, 1, 0,
            0, 0, 0,
            1, 0, 0,
            1, 1, 0,
        ], this.data['a_texcoord'], 3);

        let _ = this.level?.colors[COL_BG] ?? {r: 1, g: 1, b: 1, a: 1};
        let c = [_.r, _.g, _.b, _.a];
        bufferVertexAttribute(gl, [
            ...c,
            ...c,
            ...c,
            ...c,
            ...c,
            ...c,
        ], this.data['a_color'], 4);

        let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        const max = Math.max(gl.canvas.width, gl.canvas.height);
        m4.scale(matrix, [max, max, 1], matrix);
        gl.uniformMatrix4fv(this.data['u_matrix'], false, matrix);
        gl.uniform1iv(this.data['u_texture'], [0, 0, 0]);
        this.bgs[1].set(gl)

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}