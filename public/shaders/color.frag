#version 300 es

precision highp float;
uniform sampler2D velocity;
uniform float time;
uniform float dt;
uniform vec2 resolution;
in vec2 vUv;

out vec4 fragColor;

// https://github.com/ashima/webgl-noise より
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0f / 289.0f)) * 289.0f;
}
vec2 mod289(vec2 x) {
    return x - floor(x * (1.0f / 289.0f)) * 289.0f;
}
vec3 permute(vec3 x) {
    return mod289(((x * 34.0f) + 1.0f) * x);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187f, 0.366025403784439f, -0.577350269189626f, 0.024390243902439f);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0f, 0.0f) : vec2(0.0f, 1.0f);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0f, i1.y, 1.0f)) + i.x + vec3(0.0f, i1.x, 1.0f));
    vec3 m = max(0.5f - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0f);
    m = m * m;
    m = m * m;
    vec3 x = 2.0f * fract(p * C.www) - 1.0f;
    vec3 h = abs(x) - 0.5f;
    vec3 ox = floor(x + 0.5f);
    vec3 a0 = x - ox;
    m *= 1.79284291400159f - 0.85373472095314f * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0f * dot(m, g);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1f, 311.7f))) * 43758.5453f);
}
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0f, 0.0f));
    float c = hash(i + vec2(0.0f, 1.0f));
    float d = hash(i + vec2(1.0f, 1.0f));
    vec2 u = f * f * (3.0f - 2.0f * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0f;
    float a = 0.5f;
    for(int i = 0; i < 5; i++) {
        v += a * valueNoise(p);
        p *= 2.0f;
        a *= 0.5f;
    }
    return v;
}

float rnd(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898f, 78.233f))) * 43758.5453f);
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0f, 2.0f / 3.0f, 1.0f / 3.0f, 3.0f);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0f - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0f, 1.0f), c.y);
}

float bias(float a, float b) {
    return pow(a, log(b) / log(0.5f));
}
float gain(float a, float g) {
    return (a < 0.5f) ? 0.5f * pow(2.0f * a, log(1.0f - g) / log(0.5f)) : 1.0f - 0.5f * pow(2.0f * (1.0f - a), log(1.0f - g) / log(0.5f));
}
void main() {
    // 乱数
    float random = snoise(vUv + time);
    // 中間を明るく（γ=0.6 前後が使いやすい）
    random = gain(bias(random, 0.7f), 0.3f);

    float noise = (fract(sin(dot(vUv + time, vec2(12.9898f, 78.233f))) * 43758.5453f) - 0.5f) * 2.0f;

    // 速度場から値を取得

    vec2 vel = texture(velocity, vUv).xy;

    // 速度の大きさを取得
    float speed = length(vel);

    // 速度の大きさを色に反映
    vec4 velocityColor = vec4(0.5f + 0.5f * vel.x, 0.25f + 0.25f * vel.y, speed * sin(time), 1.0f);

    // テキストのアルファ値を速度でマスク
    vec3 color = hsv2rgb(vec3(0.22f, 0.9f, speed));

    vec4 finalColor = velocityColor;

    // 色味の調整
    finalColor = vec4(hsv2rgb(vec3(finalColor.r + 0.1f, 0.5f + noise, 1.0f * noise * 0.75f)), finalColor.a);
    fragColor = vec4(finalColor.rgb, 1.0f);
}
