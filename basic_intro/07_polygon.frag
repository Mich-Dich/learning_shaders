

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const float PI      = 3.14159265359;
const float TWO_PI  = 6.28318530718;

float time_0_1(float scale) { return scale * ((.5 * cos(u_time)) + .5); }

vec3 palette(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.75, 0.25, 0.50);
    return a + b * cos( TWO_PI * (c * t + d) );
}

float poligon(float N, float theta, float r, float smoothness) {
    
    float fact = TWO_PI / N;
    float result = cos(theta - floor(.5 + theta / fact) * fact) * r;
    return smoothstep(0.4, 0.4 + smoothness, result + 0.2);
}

void main() {

    vec2 uv = gl_FragCoord.xy/u_resolution.xy - .5;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 m = (u_mouse / u_resolution) - .5;
    m.x *= u_resolution.x / u_resolution.y;
    float mouse_dist = length(m);
    vec2 mouse_dir = normalize(m + 0.0001);

    float cycle_count   = floor(u_time / TWO_PI);
    float num_of_petals = 20.;

    const float MAX_BEND = .5;
    float bend = pow(mouse_dist, 1.5) * MAX_BEND;
    float poli_count = mod(floor(u_time), 8.) + 3.;

    uv += mouse_dir * bend * (1. * length(uv));
    float r = length(uv);
    float theta = atan(uv.y, uv.x) + u_time;
    theta = mod(theta + TWO_PI, TWO_PI);
    float shadow_result = poligon(poli_count, theta, r, .015);                           // shadow

    uv = gl_FragCoord.xy/u_resolution.xy - .5;
    uv.x *= u_resolution.x / u_resolution.y;
    r = length(uv);
    theta = atan(uv.y, uv.x) + u_time;
    theta = mod(theta + TWO_PI, TWO_PI);
    float result = poligon(poli_count, theta, r, .005);                           // main shape

    vec3 display_color = vec3(0.1, .3, .1);
    vec3 color = mix(vec3(0.), vec3(0.13), shadow_result);
    color = mix(display_color, color, result);
    gl_FragColor = vec4(color, 1.0);
}
