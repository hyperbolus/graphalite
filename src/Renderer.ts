import FSH_SRC from './shaders/default.frag?raw'
import VSH_SRC from './shaders/default.vert?raw'
import {createProgramInfo, m4, ProgramInfo, resizeCanvasToDisplaySize} from 'twgl.js'
import {Camera} from './Camera'
import {Texture} from "./Texture";
import {Level} from "./Level";
import OBJECTS from "./objects.json"
import {Pane} from 'tweakpane';
import {ReadonlyMat4, vec2} from "gl-matrix";
import {bufferVertexAttribute, COL_BG, DEG2PI, rotatePoint} from "./util";
import {Annotation} from "./Annotation";
import {RendererOptions} from "./RendererOptions";

export class Renderer {
    gl: WebGL2RenderingContext;
    pInfo: ProgramInfo;

    canvas: HTMLCanvasElement;

    camera: Camera = new Camera(0, 0, 1);

    data: any = {};

    width: number = 0;

    height: number = 0;

    debug: boolean = false;
    flags: any = {
        offsetX: false,
        offsetY: false,
        anchorMethod: false,
        objsDrawn: 0,
        cullDistanceFactor: 2
    };

    level?: Level;

    time: number = 0;

    pane?: Pane;

    bgs: Texture[] = [];

    fps: number = 0;

    options: RendererOptions;

    constructor(options: RendererOptions) {
        this.options = options;
        if (!options.canvas) throw new Error('Canvas not given')
        if (!(options.canvas instanceof HTMLCanvasElement)) throw new Error('Must be type of canvas')
        this.canvas = options.canvas;
        let gl = this.canvas.getContext('webgl2', {
            premultipliedAlpha: false // TODO: Need this?
        });
        if (!gl) throw new Error('Failed to create WebGL2 context');
        this.gl = gl;
        this.pInfo = createProgramInfo(gl, [VSH_SRC, FSH_SRC])

        if (options.overlay instanceof HTMLElement) {
            Annotation.overlay = options.overlay;
        } else {
            console.info('[Graphalite]\nNo overlay element was passed. Annotations will not be drawn')
        }
    }

    destroy() {
        // TODO: make work :)
        let gl = this.gl;
        let tus = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        for (let i = 0; i < tus; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        for (let i = 0; i < this.bgs.length; i++) {
            this.bgs[i].destroy();
        }
        this.canvas.height = 1;
        this.canvas.width = 1;
    }

    loadLevel(data: string) {
        this.level = new Level(data);
    }

    async initialize() {
        if (this.options.container) {
            let speed = 30

            this.options.container.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'w':
                        this.camera.y += speed;
                        break;
                    case 'a':
                        this.camera.x -= speed;
                        break;
                    case 's':
                        this.camera.y -= speed;
                        break;
                    case 'd':
                        this.camera.x += speed;
                        break;
                    case 'q':
                        this.camera.zoom += 1;
                        break;
                    case 'e':
                        this.camera.zoom -= 1;
                        break;
                }

                this.camera.dirty = true;
            });

            this.options.container.addEventListener('mousemove', (e) => {
                if (e.buttons === 1) {
                    this.camera.x -= e.movementX;
                    this.camera.y += e.movementY;
                    this.camera.dirty = true;
                }
            });

            this.options.container.addEventListener('wheel', (e) => {
                e.preventDefault();

                if (e.ctrlKey) {
                    this.camera.zoom -= e.deltaY / 100;
                } else {
                    this.camera.y -= e.deltaY;
                    this.camera.x += e.deltaX;
                }

                this.camera.dirty = true;
            }, {passive: false});
        }

        window.addEventListener('resize', () => {
            this.camera.dirty = true
            resizeCanvasToDisplaySize(this.canvas);
        });

        if (this.debug) {
            this.pane = new Pane()

            // FIXME: on('change') doesn't work causes infinite loop
            this.pane.element.addEventListener('keyup', () => this.camera.dirty = true)
            this.pane.element.addEventListener('mousedown', () => this.camera.dirty = true)

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
        }

        console.log('Block textures & data loaded');
    }

    draw() {
        const START_TIME = Date.now();
        // Get HTML/CSS size and update the canvas resolution accordingly
        resizeCanvasToDisplaySize(this.canvas);

        // Do we need to re-render?
        if (this.camera.dirty) {
            // Just for cleanliness
            let gl = this.gl;
            let program = this.pInfo.program;

            // Lets us communicate with our shaders
            this.data['a_position'] = gl.getAttribLocation(program, "a_position");
            this.data['a_texcoord'] = gl.getAttribLocation(program, "a_texcoord");
            this.data['a_color'] = gl.getAttribLocation(program, "a_color");
            this.data['a_texi'] = gl.getAttribLocation(program, "a_texi");
            this.data['u_matrix'] = gl.getUniformLocation(program, "u_matrix");
            this.data['u_texture'] = gl.getUniformLocation(program, "u_texture");

            // Actually render the full resolution of the canvas
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // Throw out all our previous hard work
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.useProgram(program);

            // TODO: Make scale origin mouse position? may need to move cam xy to compensate
            let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -9999, 9999);
            m4.translate(matrix, [gl.canvas.width / 2, gl.canvas.height / 2, 0], matrix);
            // FIXME: Maybe scale by canvas width minus zoom?
            m4.scale(matrix, [this.camera.zoom, this.camera.zoom, 1], matrix);
            m4.translate(matrix, [-this.camera.x, this.camera.y, 1], matrix);

            // Background gets drawn first, then grid
            this.drawBG();
            // Pass a matrix so the grid can be positioned in world space
            this.drawGrid(matrix);

            // Nothing else to draw
            if (!this.level?.objects) return;

            const objData = this.generateObjData(this.level.objects)
            this.flags.objsDrawn = objData.vertices.length / 6;
            bufferVertexAttribute(gl, objData.vertices, this.data['a_position'], 3);
            bufferVertexAttribute(gl, objData.texcoords, this.data['a_texcoord'], 3);
            bufferVertexAttribute(gl, objData.colors, this.data['a_color'], 4);

            // Levels primarily use 3 sprite sheets. Let's activate them.
            Level.atlases[Object.keys(Level.atlases)[0]].set(gl.TEXTURE0);
            Level.atlases[Object.keys(Level.atlases)[1]].set(gl.TEXTURE1);
            Level.atlases[Object.keys(Level.atlases)[2]].set(gl.TEXTURE2);
            // Tell the shader what texture units to look in
            gl.uniform1iv(this.data['u_texture'], [0, 1, 2]);

            // Position annotations to world space
            if (Annotation.overlay instanceof HTMLElement) {
                this.level.annotations.forEach((a) => {
                    const v = vec2.transformMat4(vec2.create(), vec2.fromValues(a.x, a.y), matrix as ReadonlyMat4);
                    a.move(
                        Math.round((1.0 + v[0]) * this.canvas.width / 2.0),
                        Math.round((1.0 - v[1]) * this.canvas.height / 2.0)
                    );
                })
            }

            // just for fun, switch to perspective
            // m4.rotateY(matrix, this.camera.angle, matrix)
            gl.uniformMatrix4fv(this.data['u_matrix'], false, matrix);

            // Transparency. We don't depth test, obviously. Most textures have some transparency.
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

            // Send it to da GPU :)
            gl.drawArrays(gl.TRIANGLES, 0, objData.vertices.length / 3);
        }

        // Housekeeping
        this.camera.dirty = false;
        if (this.options.debug) {
            if (this.pane) this.pane.refresh();
            this.fps = 1000 / (Date.now() - START_TIME);
            this.time++;
        }
        requestAnimationFrame(this.draw.bind(this));
    }

    generateObjData(objs: any[]): any {
        const data: any = {colors: [], texcoords: [], vertices: []};
        // TODO: pre-sorted sections
        for (let i = 0, n = objs.length; i < n; ++i) this.generateImageData(objs[i], data);
        return data;
    }

    generateImageData(o: any, data: any, image: any = (OBJECTS as any)[o[1]]) {
        if (o[1] === '914') return; // TODO: draw text

        const cm = this.camera, cv = this.canvas;
        const cdf = this.flags.cullDistanceFactor * this.camera.zoom;
        const fx = cv.width / cdf, fy = cv.height / cdf; // TODO: tune this numbers / setting + edge cuttoff too early
        if (o[2] < cm.x - fx || o[2] > cm.x + fx || o[3] < cm.y - fy || o[3] > cm.y + fy) return; // cull objs

        const s = Level.sprites[image.texture];
        if (!s) throw new Error(`Missing object ${o[1]}`)

        // ---------- Vertices ----------
        let x = o[2], y = -o[3], a = o[6];
        // TODO: precalc this
        a -= 90 * s['textureRotated']; // If sprite rotated on sprite sheet
        a += (OBJECTS as any)['rot'] ?? 0;
        a *= DEG2PI; // Convert from radians

        // TODO: scan file name -uhd, -hd to get scaling size
        let w = s['spriteSize'][0] / 4, h = s['spriteSize'][1] / 4;

        // x += s['spriteOffset'][0] / 4;
        // y += s['spriteOffset'][1] / 4;

        x += (OBJECTS as any)['x'] ?? 0;
        y -= (OBJECTS as any)['y'] ?? 0;

        x += (OBJECTS as any)['anchor_x'] ?? 0;
        y += (OBJECTS as any)['anchor_y'] ?? 0;

        let verts: number[][] = [
            [x, y],
            [x, y+h],
            [x+w, y+h],
            [x, y],
            [x+w, y],
            [x+w, y+h],
        ];

        if (o[4] && !((OBJECTS as any)['flip_x'] ?? 0)) {
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

        if (o[5] && !((OBJECTS as any)['flip_y'] ?? 0)) {
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

        let z = ((image['default_z_layer'] ?? 0) * 1000) + ((image['default_z_order'] ?? 0) + 100);

        data.vertices.push(
            ...rotatePoint(verts[0][0], verts[0][1], x, y, a), z,
            ...rotatePoint(verts[1][0], verts[1][1], x, y, a), z,
            ...rotatePoint(verts[2][0], verts[2][1], x, y, a), z,
            ...rotatePoint(verts[3][0], verts[3][1], x, y, a), z,
            ...rotatePoint(verts[4][0], verts[4][1], x, y, a), z,
            ...rotatePoint(verts[5][0], verts[5][1], x, y, a), z,
        )

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
        )

        // TODO: Use types or something do this isn't ugly
        let c: any = this.level?.colors[o[22] ?? image['default_base_color_channel'] ?? 1008] ?? {r: 1, g: 1, b: 1, a: 1};
        c = [c.r, c.g, c.b, c.a];
        data.colors.push(...c, ...c, ...c, ...c, ...c, ...c);

        if (image.hasOwnProperty('children')) {
            for (let i = 0; i < image.children.length; i++) this.generateImageData(o, data, image.children[i]);
        }
    }

    drawGrid(matrix: m4.Mat4) {
        if (!this.bgs[1]?.loaded) return;
        // For cleanliness
        let gl = this.gl, cm = this.camera, cv = this.canvas;
        const data: any = {vertices: [], texcoods: [], colors: []};

        // TODO: precalculate array size
        // Vertical Lines
        for (let i = cm.x - cm.x % 30 - (cv.width - cv.width % 30); i < cm.x + cv.width; i += 30) {
            data.vertices.push(i - 15, -cm.y + cv.height, i - 15, -cm.y - cv.height);
            data.texcoods.push(0, 0, 0, 0, 1, 0)
            data.colors.push(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0,)
        }

        // Horizontal Lines
        for (let i = cm.y - cm.y % 30 - (cv.height - cv.height % 30); i < cm.y + (cv.height - cv.height % 30); i += 30) {
            data.vertices.push(cm.x - cv.width, -i - 15, cv.width + cm.x, -i - 15);
            data.texcoods.push(0, 0, 0, 0, 1, 0);
            data.colors.push(0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
        }

        // Ground Line
        data.vertices.push(cm.x - cv.width, +15, cm.x + cv.width, +15);
        data.texcoods.push(0, 0, 0, 0, 1, 0);
        data.colors.push(1, 1, 1, 1.0, 1, 1, 1, 1.0);

        // TODO: it's reading a texture, make it be pure white or something
        gl.useProgram(this.pInfo.program);
        bufferVertexAttribute(gl, data.vertices, this.data['a_position'], 2);
        bufferVertexAttribute(gl, data.texcoods, this.data['a_texcoord'], 3);
        bufferVertexAttribute(gl, data.colors, this.data['a_color'], 4);

        this.bgs[1].set() // Activate texture
        gl.uniform1iv(this.data['u_texture'], [0, 0, 0]); // Expects three values (I think)
        gl.uniformMatrix4fv(this.data['u_matrix'], false, matrix); // Use our world space matrix

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
        // FIXME: initial draw white. maybe loading screen?
        let _ = this.level?.colors[COL_BG] ?? {r: 1, g: 1, b: 1, a: 1};
        let c = [_.r, _.g, _.b, _.a];
        bufferVertexAttribute(gl, [...c, ...c, ...c, ...c, ...c, ...c], this.data['a_color'], 4);

        // We don't need to go hard, just use a new matrix and keep it in place. TODO: parallax?
        let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        const max = Math.max(gl.canvas.width, gl.canvas.height);
        //m4.translate(matrix, [0, 0, 0], matrix); //TODO: fix, make anchor bottom or center
        m4.scale(matrix, [max, max, 1], matrix);
        gl.uniformMatrix4fv(this.data['u_matrix'], false, matrix);
        gl.uniform1iv(this.data['u_texture'], [0, 0, 0]);
        this.bgs[1].set()

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}