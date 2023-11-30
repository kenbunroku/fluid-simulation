#version 300 es

precision highp float;

layout(location = 0) in vec3 position;

uniform vec2 px;

out vec2 uv;

void main() {
    vec3 pos = position;
    uv = 0.5f + pos.xy * 0.5f;
    vec2 n = sign(pos.xy);
    pos.xy = abs(pos.xy) - px * 1.0f;
    pos.xy *= n;
    gl_Position = vec4(pos, 1.0f);
}
