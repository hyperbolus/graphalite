import FSH_SRC from './shaders/default.frag?raw'
import VSH_SRC from './shaders/default.vert?raw'
import {
    createProgramInfo, m4,
    ProgramInfo,
    resizeCanvasToDisplaySize
} from 'twgl.js'
import {Camera} from './Camera'
import {Texture} from "./Texture";
import f from './resources/GJ_GameSheet-uhd.png'
import {Level} from "./Level";
import ATLAS_1 from "./resources/GJ_GameSheet-uhd.png";
import ATLAS_2 from "./resources/GJ_GameSheet02-uhd.png";
import ATLAS_3 from "./resources/FireSheet_01-uhd.png";

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

        let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        this.data['textureAttributeLocation'] = gl.getAttribLocation(program, "a_texcoord");

        this.data['matrixLocation'] = gl.getUniformLocation(program, "u_matrix");

        let colorLocation = gl.getUniformLocation(program, "u_color");

        let positionBuffer = gl.createBuffer();

        this.data['vao'] = gl.createVertexArray();

        gl.bindVertexArray(this.data['vao']);

        gl.enableVertexAttribArray(positionAttributeLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0, 0,
            0, 1, 0,
            1, 1, 0,
            0, 0, 0,
            1, 0, 0,
            1, 1, 0,
        ]), gl.STATIC_DRAW);

        gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        resizeCanvasToDisplaySize(this.canvas);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.8, 0.95, 0.92, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindVertexArray(this.data['vao']);

        if (this.level) {
            for (let i = 0; i < this.level.objects.length; i++) {
                this.drawObject(
                    this.level.objects[i][1],
                    parseInt(this.level.objects[i][2]),
                    parseInt(this.level.objects[i][3]),
                    this.level.objects[i][6]
                );
            }
        }

        this.time++;

        requestAnimationFrame(this.draw.bind(this));
    }

    drawObject(id: number, x: number, y: number, rot: number) {
        const s = Level.sprites[Level.blocks[id] + '.png']
        let gl = this.gl;

        // Missing block texture
        if (!s) {
            console.log([id, Level.blocks[id]])
            return;
        }

        gl.useProgram(this.pInfo.program);

        let texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

        let tex = Level.atlases[s.atlas];
        let sx = s['textureRect'][0][0];
        let sy = s['textureRect'][0][1];
        let lx = s['textureRect'][1][0];
        let ly = s['textureRect'][1][1];

        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([
                sx / 4095, sy / 4095,
                sx / 4095, (sy + ly) / 4095,
                (sx + lx) / 4095, (sy + ly) / 4095,
                sx / 4095, (sy + ly) / 4095,
                (sx + lx) / 4095, (sy + ly) / 4095,
                (sx + lx) / 4095, sy / 4095,
            ]),
            gl.STATIC_DRAW)

        gl.enableVertexAttribArray(this.data['textureAttributeLocation']);

        gl.vertexAttribPointer(this.data['textureAttributeLocation'], 2, gl.FLOAT, true, 0, 0);

        let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrix = m4.translate(matrix, [100, 100, 0]);
        matrix = m4.scale(matrix, [100, 100, 1]);
        matrix = m4.translate(matrix, [0.5, 0.5, 0]);
        matrix = m4.rotateZ(matrix, rot * Math.PI / 180);
        matrix = m4.translate(matrix, [-0.5, -0.5, 0]);

        gl.bindTexture(gl.TEXTURE_2D, tex.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        // Set the matrix.
        gl.uniformMatrix4fv(this.data['matrixLocation'], false, matrix);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}