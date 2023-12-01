#version 300 es

precision highp float;
uniform sampler2D velocity;

in vec2 vUv;

out vec4 fragColor;

void main() {
    vec2 vel = texture(velocity, vUv).xy;
    float len = length(vel);
    vel = vel * 0.5f + 0.5f;

    vec3 color = vec3(vel.x, vel.y, 1.0f);

    color = mix(vec3(1.0f), color, len);

    fragColor = vec4(color, 1.0f);
}
