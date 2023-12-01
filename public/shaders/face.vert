#version 300 es

precision highp float;

layout(location = 0) in vec3 position;

uniform vec2 px;
uniform vec2 boundarySpace;

out vec2 vUv;

void main() {
    vec3 pos = position;
    vec2 scale = 1.0f - boundarySpace * 2.0f;
    pos.xy = pos.xy * scale;
    vUv = vec2(0.5f) + (pos.xy) * 0.5f;
    gl_Position = vec4(pos, 1.0f);
}
