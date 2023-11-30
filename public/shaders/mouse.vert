#version 300 es

precision highp float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;

out vec2 vUv;

void main() {
    vec2 pos = position.xy * scale * 2.0f * px + center;
    vUv = uv;
    gl_Position = vec4(pos, 0.0f, 1.0f);
}
