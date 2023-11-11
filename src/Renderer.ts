import FSH_SRC from './shaders/default.frag?raw'
import VSH_SRC from './shaders/default.vert?raw'
import {createProgramInfo, m4, ProgramInfo, resizeCanvasToDisplaySize} from 'twgl.js'
import {Camera} from './Camera'
import {Texture} from "./Texture";
import {Level} from "./Level";
import OBJECTS from "./objects.json"
import {Pane} from 'tweakpane';
import {ReadonlyMat4, vec2} from "gl-matrix";
import {bufferVertexAttribute, clamp, COL_BG, DEG2PI, rotatePoint} from "./util";
import {Annotation} from "./Annotation";
import {RendererOptions} from "./RendererOptions";
import {GameObject} from "./GameObject";

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

        if (this.options.devTools) {
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
            //this.data['a_color'] = gl.getAttribLocation(program, "a_color");
            this.data['a_texi'] = gl.getAttribLocation(program, "a_texi");
            this.data['a_colorChannelID'] = gl.getAttribLocation(program, "a_colorChannelID");
            this.data['u_matrix'] = gl.getUniformLocation(program, "u_matrix");
            this.data['u_texture'] = gl.getUniformLocation(program, "u_texture");
            this.data['u_colorChannels'] = gl.getUniformLocation(program, "u_colorChannels");

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
            if (!this.level?.sections) return;

            const objData = this.generateObjData(this.level.sections)
            this.flags.objsDrawn = objData.vertices.length;
            bufferVertexAttribute(gl, objData.vertices, this.data['a_position'], 2);
            bufferVertexAttribute(gl, objData.texcoords, this.data['a_texcoord'], 3);
            bufferVertexAttribute(gl, objData.colors, this.data['a_colorChannelID'], 1);

            // Levels primarily use 3 sprite sheets. Let's activate them.
            Level.atlases[Object.keys(Level.atlases)[0]].set(gl.TEXTURE0);
            Level.atlases[Object.keys(Level.atlases)[1]].set(gl.TEXTURE1);
            Level.atlases[Object.keys(Level.atlases)[2]].set(gl.TEXTURE2);
            // Tell the shader what texture units to look in
            gl.uniform1iv(this.data['u_texture'], [0, 1, 2]);

            const colors = [];
            for (let i = 0; i < this.level.colors.length; i++) {
                let c = this.level.colors[i];
                colors.push(c.r, c.g, c.b, c.a)
            }
            gl.uniform4fv(this.data['u_colorChannels'], colors);

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
            gl.drawArrays(gl.TRIANGLES, 0, objData.colors.length);
        }

        // Housekeeping
        this.camera.dirty = false;
        if (this.options.devTools) {
            if (this.pane) this.pane.refresh();
            this.fps = Date.now() - START_TIME;
            this.time++;
        }
        requestAnimationFrame(this.draw.bind(this));
    }

    generateObjData(sections: GameObject[][]): any {
        const data: {[key: string]: number[]} = {vertices: [], texcoords: [], colors: []};
        let cx = this.camera.x;
        let cw = this.canvas.width;
        let cz = this.camera.zoom;
        let start = Math.max(0, Math.trunc((cx - cw / cz / 2) / 100))
        let end = Math.min(sections.length, Math.trunc((cx + cw / cz / 2) / 100) + 1);
        for (let i = start; i < end; i++) {
            if (typeof sections[i] === 'undefined') continue;

            // Each object in section
            for (let j = 0, jN = sections[i].length; j < jN; j++) {
                if (sections[i][j].id === 914) continue; // TODO: draw text

                for (let k = 0; k < sections[i][j].sprites.length; k++) {
                    data.vertices.push(...sections[i][j].sprites[k].vertices);
                    data.texcoords.push(...sections[i][j].sprites[k].texcoords);
                    data.colors.push(...sections[i][j].sprites[k].colors);
                }
            }
        }

        return data;
    }

    drawGrid(matrix: m4.Mat4) {
        if (!this.bgs[1]?.loaded) return;
        // For cleanliness
        let gl = this.gl, cv = this.canvas;
        const {x, y, zoom: zm} = this.camera;
        const data: any = {vertices: [], texcoods: [], colors: []};

        // Lines drawn every nth units
        let sF = 30;

        if (zm >= 2) sF = 15;
        if (zm >= 4) sF = 2;
        if (zm === 5) sF = 1;

        let a = clamp(zm * (10 / 3) - 6 / 9, 0, 1);

        // TODO: lighter sub-grid
        // TODO: precalculate array size
        // Vertical Lines
        for (let i = x - x % sF - (cv.width / zm - cv.width / zm % sF); i < x + cv.width / zm; i += sF) {
            data.vertices.push(i - 15, -y + cv.height / zm, i - 15, -y - cv.height / zm);
            data.texcoods.push(0, 0, 9, 0, 0, 9);
            data.colors.push(1011, 1011);
        }

        // Horizontal Lines
        for (let i = y - y % sF - (cv.height / zm - cv.height / zm % sF); i < y + (cv.height / zm - cv.height / zm % sF); i += sF) {
            data.vertices.push(x - cv.width / zm, -i - 15, cv.width / zm + x, -i - 15);
            data.texcoods.push(0, 1, 9, 0, 1, 9);
            data.colors.push(1011, 1011);
        }

        // Ground Line
        data.vertices.push(x - cv.width / zm, 15, x + cv.width / zm, 15);
        data.texcoods.push(0, 1, 9, 0, 1, 9);
        data.colors.push(1008, 1008);

        if (this.level) this.level.colors[1011].a = a;

        gl.useProgram(this.pInfo.program);
        bufferVertexAttribute(gl, data.vertices, this.data['a_position'], 2);
        bufferVertexAttribute(gl, data.texcoods, this.data['a_texcoord'], 3);
        bufferVertexAttribute(gl, data.colors, this.data['a_colorChannelID'], 1);

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
        bufferVertexAttribute(gl, [
            COL_BG,
            COL_BG,
            COL_BG,
            COL_BG,
            COL_BG,
            COL_BG,
        ], this.data['a_colorChannelID'], 1);

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