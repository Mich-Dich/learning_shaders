#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// 3D rotation matrix around Y axis
mat3 rotY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0.0, -s,
                0.0, 1.0, 0.0,
                s, 0.0,  c);
}

// Boxfold + spherefold for Mandelbulb-ish fractal
vec3 fractalFold(inout vec3 p) {
    // sphere fold
    float r2 = dot(p,p);
    if (r2 < 0.5) {
        p *= 4.0;
    } else if (r2 < 1.0) {
        p *= 1.0 / r2;
    }
    // box fold (reflect on planes)
    p = clamp(p, -1.0, 1.0) * 2.0 - p;
    return p;
}

// Distance estimator for a simple fractal
float map(vec3 pos) {
    vec3 z = pos;
    float scale = 2.0;
    float dr = 1.0;
    for (int i = 0; i < 8; i++) {
        dr = dr * abs(scale) + 1.0;
        fractalFold(z);
        z = z * scale + pos;
    }
    return length(z) / abs(dr);
}

// Raymarching a fractal surface
float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.001) break;
        t += d * 0.5;
        if (t > 50.0) break;
    }
    return t;
}

void main() {
    // uv coords
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // camera setup
    vec3 ro = vec3(0.0, 0.0, 5.0);
    // aim camera at origin, tilt by time
    vec3 rd = normalize(vec3(uv, -1.5));
    rd = rotY(u_time * 0.1) * rd;

    // raymarch scene
    float t = raymarch(ro, rd);
    vec3 p = ro + rd * t;
    
    // normal compute
    float eps = 0.001;
    vec3 n = normalize(vec3(
        map(p + vec3(eps,0,0)) - map(p - vec3(eps,0,0)),
        map(p + vec3(0,eps,0)) - map(p - vec3(0,eps,0)),
        map(p + vec3(0,0,eps)) - map(p - vec3(0,0,eps))
    ));

    // lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float diff = clamp(dot(n, lightDir), 0.0, 1.0);

    // mouse drives color hue & displacement
    float mx = u_mouse.x / u_resolution.x;
    float my = u_mouse.y / u_resolution.y;
    float hue = fract(my + u_time * 0.05);
    vec3 baseCol = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0,0.33,0.66) + hue));
    vec3 col = baseCol * diff;

    // edge glow
    col += 0.2 * pow(1.0 - exp(-0.02 * t*t), 3.0) * baseCol;

    // final mix with a subtle swirl based on mouse X
    float swirl = sin(length(uv) * 10.0 - u_time * 2.0 + mx * 10.0);
    col = mix(col, baseCol, swirl * 0.3);

    gl_FragColor = vec4(col, 1.0);
}
