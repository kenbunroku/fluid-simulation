#version 300 es

precision highp float;

uniform vec2 force;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec2 circle = (vUv - 0.5f) * 2.0f;
    float d = 1.0f - min(length(circle), 1.0f);
    d *= d;
    fragColor = vec4(force * d, 0.0f, 1.0f);
}
