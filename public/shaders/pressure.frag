#version 300 es

precision highp float;

uniform sampler2D pressure;
uniform sampler2D velocity;
uniform vec2 px;
uniform float dt;

in vec2 vUv;
out vec4 fragColor;

void main() {
    float step = 1.0f;

    float p0 = texture(pressure, vUv + vec2(px.x * step, 0)).r;
    float p1 = texture(pressure, vUv - vec2(px.x * step, 0)).r;
    float p2 = texture(pressure, vUv + vec2(0, px.y * step)).r;
    float p3 = texture(pressure, vUv - vec2(0, px.y * step)).r;

    vec2 v = texture(velocity, vUv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5f;
    v = v - gradP * dt;
    fragColor = vec4(v, 0.0f, 1.0f);
}
