#version 300 es

precision highp float;

in vec4 v_color;
in vec2 v_texcoord;
in float v_texi;

uniform sampler2D u_texture[3];

out vec4 outColor;

void main() {
    switch (int(v_texi)) {
        case 0:
            outColor = texture(u_texture[0], v_texcoord) * v_color;
            break;
        case 1:
            outColor = texture(u_texture[1], v_texcoord) * v_color;
            break;
        case 2:
            outColor = texture(u_texture[2], v_texcoord) * v_color;
            break;
        default:
            outColor = vec4(1, 0, 1, 1);
            break;
    }
}