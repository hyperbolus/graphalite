#version 300 es

in vec4 a_position;
//in vec4 a_color;
in vec3 a_texcoord;
in float a_colorChannelID;

uniform mat4 u_matrix;

out vec2 v_texcoord;
//out vec4 v_color;
out float v_texi;
out float v_colorChannelID;

void main() {
    gl_Position = u_matrix * a_position;

    v_texcoord = vec2(a_texcoord);
    //v_color = a_color;
    v_texi = a_texcoord.z;
    v_colorChannelID = a_colorChannelID;
}