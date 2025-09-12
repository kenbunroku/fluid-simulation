#version 300 es

precision highp float;
uniform sampler2D velocity;
uniform float time;
uniform float dt;
uniform vec2 resolution;
in vec2 vUv;

out vec4 fragColor;

vec3 viridis(float t) {
    const vec3 c0 = vec3(0.2777273272234177f, 0.005407344544966578f, 0.3340998053353061f);
    const vec3 c1 = vec3(0.1050930431085774f, 1.404613529898575f, 1.384590162594685f);
    const vec3 c2 = vec3(-0.3308618287255563f, 0.214847559468213f, 0.09509516302823659f);
    const vec3 c3 = vec3(-4.634230498983486f, -5.799100973351585f, -19.33244095627987f);
    const vec3 c4 = vec3(6.228269936347081f, 14.17993336680509f, 56.69055260068105f);
    const vec3 c5 = vec3(4.776384997670288f, -13.74514537774601f, -65.35303263337234f);
    const vec3 c6 = vec3(-5.435455855934631f, 4.645852612178535f, 26.3124352495832f);

    return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}

vec3 inferno(float t) {
    const vec3 c0 = vec3(0.0002189403691192265f, 0.001651004631001012f, -0.01948089843709184f);
    const vec3 c1 = vec3(0.1065134194856116f, 0.5639564367884091f, 3.932712388889277f);
    const vec3 c2 = vec3(11.60249308247187f, -3.972853965665698f, -15.9423941062914f);
    const vec3 c3 = vec3(-41.70399613139459f, 17.43639888205313f, 44.35414519872813f);
    const vec3 c4 = vec3(77.162935699427f, -33.40235894210092f, -81.80730925738993f);
    const vec3 c5 = vec3(-71.31942824499214f, 32.62606426397723f, 73.20951985803202f);
    const vec3 c6 = vec3(25.13112622477341f, -12.24266895238567f, -23.07032500287172f);

    return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}

vec3 magma(float t) {
    const vec3 c0 = vec3(-0.002136485053939582f, -0.000749655052795221f, -0.005386127855323933f);
    const vec3 c1 = vec3(0.2516605407371642f, 0.6775232436837668f, 2.494026599312351f);
    const vec3 c2 = vec3(8.353717279216625f, -3.577719514958484f, 0.3144679030132573f);
    const vec3 c3 = vec3(-27.66873308576866f, 14.26473078096533f, -13.64921318813922f);
    const vec3 c4 = vec3(52.17613981234068f, -27.94360607168351f, 12.94416944238394f);
    const vec3 c5 = vec3(-50.76852536473588f, 29.04658282127291f, 4.23415299384598f);
    const vec3 c6 = vec3(18.65570506591883f, -11.48977351997711f, -5.601961508734096f);

    return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}

vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
    return a + b * cos(6.28318f * (c * t + d));
}

vec3 paletteIQ(float t, int paletteId) {
    t = clamp(t, 0.0f, 1.0f);

    if(paletteId == 0) { // Sunset（オレンジ寄り）
        return pal(t, vec3(0.5f, 0.5f, 0.5f), vec3(0.5f, 0.5f, 0.5f), vec3(1.0f, 1.0f, 0.5f), vec3(0.80f, 0.90f, 0.30f));
    }
    if(paletteId == 1) { // Terrain（渋い土色）
        return pal(t, vec3(0.5f, 0.5f, 0.5f), vec3(0.5f, 0.5f, 0.5f), vec3(1.0f, 0.7f, 0.4f), vec3(0.00f, 0.15f, 0.20f));
    }
    if(paletteId == 2) { // Viridis-ish（深い青→緑→黄に寄せた近似）
        return pal(1.0f - t, vec3(0.28f, 0.18f, 0.08f), vec3(0.23f, 0.50f, 0.30f), vec3(1.0f, 1.0f, 1.0f), vec3(0.00f, 0.15f, 0.20f));
    }
    if(paletteId == 3) { // Plasma-ish（紫→赤→黄の近似）
        return pal(1.0f - t, vec3(0.05f, 0.03f, 0.46f), vec3(0.50f, 0.50f, 0.10f), vec3(1.0f, 1.0f, 1.0f), vec3(0.00f, 0.35f, 0.80f));
    }

    return vec3(t); // fallback: グレー
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

float inverseLerp(float v, float minValue, float maxValue) {
    return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
    float t = inverseLerp(v, inMin, inMax);
    return mix(outMin, outMax, t);
}

// スムーズなトランジション関数
float smoothstep3(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / (edge1 - edge0), 0.0f, 1.0f);
    return t * t * (3.0f - 2.0f * t);
}

// 疑似ランダム関数
float random(float x) {
    return fract(sin(x * 12.9898f) * 43758.5453f);
}

// ランダムなパレット順序を生成
int getRandomPaletteIndex(int step, int totalPalettes) {
    // より複雑な種を使って予測しにくいランダム性を確保
    float seed = float(step) * 73.856093f + 41.2371f;
    float r = random(seed);
    return int(floor(r * float(totalPalettes)));
}

// 指定されたパレットインデックスの色を取得
vec3 getPaletteColorByIndex(float t, int paletteIndex) {
    if(paletteIndex == 0)
        return viridis(t);
    else if(paletteIndex == 1)
        return inferno(t);
    else if(paletteIndex == 2)
        return magma(t);
    else if(paletteIndex == 3)
        return paletteIQ(1.0f - t, 0); // Sunset
    else if(paletteIndex == 4)
        return paletteIQ(1.0f - t, 1); // Terrain
    else if(paletteIndex == 5)
        return paletteIQ(1.0f - t, 2); // Viridis-ish

    return vec3(t); // fallback
}

// パレット選択とトランジション機能（ランダム順序）
vec3 getPaletteColor(float t, float time) {
    // 総パレット数（viridis, inferno, magma + paletteIQ の4種類）
    const int PALETTE_COUNT = 7;

    // 各パレットの表示時間: 10秒
    // トランジション時間: 5秒
    // 合計サイクル時間: 15秒
    const float DISPLAY_TIME = 25.0f;
    const float TRANSITION_TIME = 5.0f;
    const float CYCLE_TIME = DISPLAY_TIME + TRANSITION_TIME;

    // 現在の時間を正規化
    float normalizedTime = mod(time, CYCLE_TIME);

    // 現在のステップ（何回目のパレット表示か）
    int currentStep = int(floor(time / CYCLE_TIME));
    int nextStep = currentStep + 1;

    // ランダムなパレットインデックスを取得
    int currentPalette = getRandomPaletteIndex(currentStep, PALETTE_COUNT);
    int nextPalette = getRandomPaletteIndex(nextStep, PALETTE_COUNT);

    // 同じパレットが連続しないように調整
    if(nextPalette == currentPalette) {
        nextPalette = (nextPalette + 1) % PALETTE_COUNT;
    }

    // サイクル内での時間
    float cycleTime = normalizedTime;

    // トランジション係数を計算
    float transitionFactor = 0.0f;
    if(cycleTime > DISPLAY_TIME) {
        // トランジション期間中
        float transitionProgress = (cycleTime - DISPLAY_TIME) / TRANSITION_TIME;
        transitionFactor = smoothstep3(0.0f, 1.0f, transitionProgress);
    }

    // パレット色を取得
    vec3 currentColor = getPaletteColorByIndex(t, currentPalette);
    vec3 nextColor = getPaletteColorByIndex(t, nextPalette);

    // トランジション
    return mix(currentColor, nextColor, transitionFactor);
}

void main() {
    float noise = (fract(sin(dot(vUv + time, vec2(12.9898f, 78.233f))) * 43758.5453f) - 0.5f) * 2.0f;

    vec2 vel = texture(velocity, vUv).xy;
    float speed = length(vel);

    float normSpeed = remap(speed, 0.f, 1.2f, 0.f, 1.f);

    // パレットトランジション機能を使用（ランダム順序）
    vec3 col = getPaletteColor(normSpeed, time);

    vec4 finalColor = vec4(col, 1.f);
    finalColor.rgb += noise * 0.3f;
    finalColor.rgb = clamp(finalColor.rgb, 0.0f, 1.0f);
    fragColor = vec4(finalColor.rgb / 2.f, 1.0f);
}
