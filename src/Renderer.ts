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

    draw() {
        let gl = this.gl;
        let program = this.pInfo.program;

        resizeCanvasToDisplaySize(this.canvas);

        let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        let textureAttributeLocation = gl.getAttribLocation(program, "a_texcoord");

        let matrixLocation = gl.getUniformLocation(program, "u_matrix");

        let colorLocation = gl.getUniformLocation(program, "u_color");

        let positionBuffer = gl.createBuffer();

        let vao = gl.createVertexArray();

        gl.bindVertexArray(vao);

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

        let texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([
                912 / 4095, 1313 / 4095,
                912 / 4095, (1313 + 118) / 4095,
                (912 + 118) / 4095, (1313 + 118) / 4095,
                912 / 4095, (1313 + 118) / 4095,
                (912 + 118) / 4095, (1313 + 118) / 4095,
                (912 + 118) / 4095, 1313 / 4095,
            ]),
            gl.STATIC_DRAW)

        gl.enableVertexAttribArray(textureAttributeLocation);

        gl.vertexAttribPointer(textureAttributeLocation, 2, gl.FLOAT, true, 0, 0);

        if (!this.texture) this.texture = new Texture(gl, f)

        // draw ----------------
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.8, 0.95, 0.92, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(program);

        gl.bindVertexArray(vao);

        let scaleFactor = 5;
        let size = 80 * scaleFactor;
        let x = gl.canvas.width / 2 - size / 2;
        let y = gl.canvas.height - size - 60;

        let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
        matrix = m4.translate(matrix, [(Math.sin(this.time * 0.02) + 1) * 250, (Math.cos(this.time * 0.02) + 1) * 250, 0]);
        matrix = m4.scale(matrix, [100, 100, 1]);
        matrix = m4.translate(matrix, [0.5, 0.5, 0]);
        matrix = m4.scale(matrix, [Math.sin(this.time * 0.03) + 2, Math.sin(this.time * 0.03) + 2, 1]);
        matrix = m4.rotateZ(matrix, 0.06 * this.time);
        matrix = m4.translate(matrix, [-0.5, -0.5, 0]);

        gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, matrix);

        for (let i = 0; i < 1; ++i) {
            // this.setRectangle(gl,
            //     0,
            //     0,
            //     1,
            //     1.0
            // );

            //gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        this.time++;

        requestAnimationFrame(this.draw.bind(this));
    }

    setRectangle(gl: WebGL2RenderingContext, x1: number, y1: number, width: number, height: number) {
        let x2 = x1 + width, y2 = y1 + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2,
        ]), gl.STATIC_DRAW);
    }
}