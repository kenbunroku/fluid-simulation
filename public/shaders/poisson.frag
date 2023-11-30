#version 300 es

precision highp float;

uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 px;

in vec2 vUv;
out vec4 fragColor;

void main() {
    // poisson equation
    float p0 = texture(pressure, vUv + vec2(px.x * 2.0f, 0)).r;
    float p1 = texture(pressure, vUv - vec2(px.x * 2.0f, 0)).r;
    float p2 = texture(pressure, vUv + vec2(0, px.y * 2.0f)).r;
    float p3 = texture(pressure, vUv - vec2(0, px.y * 2.0f)).r;
    float div = texture(divergence, vUv).r;

    float newP = (p0 + p1 + p2 + p3) / 4.0f - div;
    fragColor = vec4(newP);
}
