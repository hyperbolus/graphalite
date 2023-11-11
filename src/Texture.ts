import {Renderer} from "./Renderer";

export class Texture {
    texture: WebGLTexture | null;

    image: HTMLImageElement;

    height: number = 0;
    width: number = 0;

    loaded: boolean = false;

    isSet: boolean = false;

    tid: number = 0;
    renderer: Renderer

    constructor(renderer: Renderer, url: string) {
        this.renderer = renderer;
        let gl = renderer.gl;
        this.texture = gl.createTexture();
        if (this.texture === null) throw new Error('Error loading texture');

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, renderer.debug ? 255 : 0]));

        this.image = new Image();
        this.image.crossOrigin = "anonymous";
        this.image.onload = () => {
            this.width = this.image.width;
            this.height = this.image.height;
            this.loaded = true; // TODO: check for errors
            this.renderer.camera.dirty = true; // Re-render frame
        }
        this.image.src = url;
    }

    destroy() {
        this.renderer.gl.deleteTexture(this.texture);
    }
    set(texture: number = this.renderer.gl.TEXTURE0) {
        let gl = this.renderer.gl;
        gl.activeTexture(texture);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        if (!this.isSet) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
            //gl.generateMipmap(gl.TEXTURE_2D);
            this.isSet = true;
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
}