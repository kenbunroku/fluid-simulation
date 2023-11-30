#version 300 es

precision highp float;

uniform sampler2D velocity;
uniform float dt;
uniform vec2 px;

in vec2 vUv;
out vec4 fragColor;

void main() {
    float x0 = texture(velocity, vUv - vec2(px.x, 0)).x;
    float x1 = texture(velocity, vUv + vec2(px.x, 0)).x;
    float y0 = texture(velocity, vUv - vec2(0, px.y)).y;
    float y1 = texture(velocity, vUv + vec2(0, px.y)).y;
    float divergence = (x1 - x0 + y1 - y0) / 2.0f;

    fragColor = vec4(divergence / dt);
}
