# version 300 es

precision highp float;

uniform sampler2D pressure;
uniform sampler2D velocity;
uniform vec2 px;
uniform float dt;

in vec2 uv;
out vec4 fragColor;

void main() {
    float step = 1.0;

    float p0 = texture(pressure, uv + vec2(px.x * step, 0)).r;
    float p1 = texture(pressure, uv - vec2(px.x * step, 0)).r;
    float p2 = texture(pressure, uv + vec2(0, px.y * step)).r;
    float p3 = texture(pressure, uv - vec2(0, px.y * step)).r;

    vec2 v = texture(velocity, uv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
    v = v - gradP * dt;
    fragColor = vec4(v, 0.0, 1.0);
}
