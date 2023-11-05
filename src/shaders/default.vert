#version 300 es

in vec4 a_position;
in vec4 a_color;
in vec3 a_texcoord;

uniform mat4 u_matrix;

out vec2 v_texcoord;
out vec4 v_color;
out float v_texi;

void main() {
    gl_Position = u_matrix * a_position;

    v_texcoord = vec2(a_texcoord);
    v_color = a_color;
    v_texi = a_texcoord.z;
}