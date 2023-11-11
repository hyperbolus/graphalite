#version 300 es

precision highp float;

//in vec4 v_color;
in vec2 v_texcoord;
in float v_texi; // Which texture unit are we using
in float v_colorChannelID; // What channel ID are we using

uniform sampler2D u_texture[3]; // Available textures
uniform vec4 u_colorChannels[1012]; // All our colors

out vec4 outColor;

void main() {
    vec4 c = u_colorChannels[int(v_colorChannelID)];
    switch (int(v_texi)) {
        case 0:
            outColor = texture(u_texture[0], v_texcoord) * c;
            break;
        case 1:
            outColor = texture(u_texture[1], v_texcoord) * c;
            break;
        case 2:
            outColor = texture(u_texture[2], v_texcoord) * c;
            break;
        case 9:
            outColor = c;
            break;
        default:
            outColor = c;
            break;
    }
}