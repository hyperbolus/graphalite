import FSH_SRC from './shaders/default.frag?raw'
import VSH_SRC from './shaders/default.vert?raw'
import {
    createProgramInfo, drawBufferInfo, m4,
    ProgramInfo,
    resizeCanvasToDisplaySize, setUniforms
} from 'twgl.js'
import {Camera} from './Camera'
import {Texture} from "./Texture";
import {Level} from "./Level";
import ATLAS_1 from "./resources/GJ_GameSheet-uhd.png";
import ATLAS_2 from "./resources/GJ_GameSheet02-uhd.png";
import ATLAS_3 from "./resources/FireSheet_01-uhd.png";
import {mat4} from "gl-matrix";
import Mat4 = m4.Mat4;

export class Renderer {
    gl: WebGL2RenderingContext;
    pInfo: ProgramInfo;

    canvas: HTMLCanvasElement;

    camera: Camera = new Camera(0, 0, 1);

    backgrounds: { [key: number]: Texture } = {};

    data: any = {};

    width: number = 0;

    height: number = 0;

    texture: Texture | undefined | null;

    time = 0;

    debug = false;

    level?: Level;

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
    }

    loadLevel(data: string) {
        this.level = new Level(data)
    }

    async initialize() {
        let gl = this.gl;
        let program = this.pInfo.program;

        await Level.loadAtlas(gl, ATLAS_1);
        await Level.loadAtlas(gl, ATLAS_2);
        await Level.loadAtlas(gl, ATLAS_3);
        console.log('Block textures & data loaded');
    }

    draw() {
        let gl = this.gl;
        let program = this.pInfo.program;

        resizeCanvasToDisplaySize(this.canvas);

        this.data['a_position'] = gl.getAttribLocation(program, "a_position");
        this.data['a_texcoord'] = gl.getAttribLocation(program, "a_texcoord");

        this.data['u_matrix'] = gl.getUniformLocation(program, "u_matrix");

        let colorLocation = gl.getUniformLocation(program, "u_color");

        let positionBuffer = gl.createBuffer();

        this.data['vao'] = gl.createVertexArray();

        gl.bindVertexArray(this.data['vao']);
        gl.enableVertexAttribArray(this.data['a_position']);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0, 0,
            0, 1, 0,
            1, 1, 0,
            0, 0, 0,
            1, 0, 0,
            1, 1, 0,
        ]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(this.data['a_position'], 3, gl.FLOAT, false, 0, 0);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.8, 0.95, 0.92, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        let projectionMatrix = m4.perspective(1, gl.canvas.width / gl.canvas.height, 1, 500000);
        //projectionMatrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

        var cameraMatrix = m4.rotateY(projectionMatrix, this.camera.angle);
        cameraMatrix = m4.translate(cameraMatrix, [this.camera.x, this.camera.y, 1500]);

        var viewMatrix = m4.inverse(cameraMatrix);

        var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        this.drawObject(viewProjectionMatrix, 1, 1, 1)

        for (let i = 0; i < 50; i++) {
            let obj = this.level?.objects[i];
            if (this.camera.x === 0) {
                this.camera.x = parseInt(obj[2])
                this.camera.y = parseInt(obj[3])
            }
            this.drawObject(viewProjectionMatrix, parseInt(obj[1]), parseInt(obj[2])/50, (parseInt(obj[3]))/50)
            //this.drawObject(parseInt(obj[1]), parseInt(obj[2]), parseInt(obj[3]), parseInt(obj[6] ?? 0), parseInt(obj[22] ?? 1))
        }

        this.time++;

        //requestAnimationFrame(this.draw.bind(this));
    }

    drawObject(matrix: Mat4, id: number, x: number, y: number, rot: number = 0, scale: number = 1) {
        let gl = this.gl;
        const s = Level.sprites[Level.blocks[id] + '.png']
        if (!s) {
            console.log([id, Level.blocks[id]])
            return;
        }

        let texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        Level.atlases[s.atlas].set(gl);
        let aw = Level.atlases[s.atlas].width;
        let ah = Level.atlases[s.atlas].height;
        let sx = s['textureRect'][0][0];
        let sy = s['textureRect'][0][1];
        let lx = s['textureRect'][1][0];
        let ly = s['textureRect'][1][1];
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([
                sx / aw, sy / ah,
                sx / aw, (sy + ly) / ah,
                (sx + lx) / aw, (sy + ly) / ah,
                sx / aw, sy / ah,
                (sx + lx) / aw, sy / ah,
                (sx + lx) / aw, (sy + ly) / ah
            ]),
            gl.STATIC_DRAW)
        gl.enableVertexAttribArray(this.data['a_texcoord']);
        gl.vertexAttribPointer(this.data['a_texcoord'], 2, gl.FLOAT, true, 0, 0);

        gl.bindVertexArray(this.data['vao']);

        //matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrix = m4.scale(matrix, [s['textureRect'][1][0], s['textureRect'][1][1], 1]);

        // Move. 1.0 Equals a standard 1x1 block unit, not small steps
        matrix = m4.translate(matrix, [x, y, 0]);
        // Scale
        if (scale !== 1) {
            matrix = m4.scale(matrix, [scale, scale, 1]);
        }
        // Rotate
        if (rot !== 0) {
            matrix = m4.translate(matrix, [0.5, 0.5, 0]);
            matrix = m4.rotateZ(matrix, rot * Math.PI / 180);
            matrix = m4.translate(matrix, [-0.5, -0.5, 0]);
        }

        gl.uniformMatrix4fv(this.data['u_matrix'], false, matrix);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}