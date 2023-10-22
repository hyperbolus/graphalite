export class Texture {
    texture: WebGLTexture | null;

    image: HTMLImageElement;

    height: number = 0;
    width: number = 0;

    loaded: boolean = false;

    constructor(gl: WebGL2RenderingContext, url: string, set: boolean = false) {
        this.texture = gl.createTexture();
        if (this.texture === null) throw new Error('Error loading texture');

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, false ? 255 : 0]));

        this.image = new Image();
        this.image.onload = () => {
            this.width = this.image.width;
            this.height = this.image.height;

            if (set) this.set(gl);

            this.loaded = true; // TODO: check for errors
        }
        this.image.src = url;
    }

    set(gl: WebGL2RenderingContext) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
        //gl.generateMipmap(gl.TEXTURE_2D);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
}