#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// 3D rotation matrices
mat3 rotX(float a) {
    float s = sin(a), c = cos(a);
    return mat3(1.0, 0.0, 0.0,
                0.0,   c,  -s,
                0.0,   s,   c);
}
mat3 rotY(float a) {
    float s = sin(a), c = cos(a);
    return mat3(  c, 0.0,   s,
                 0.0, 1.0, 0.0,
                 -s, 0.0,   c);
}

// Box‐sphere fold fractal iteration
vec3 fold(vec3 p) {
    float r2 = dot(p,p);
    if (r2 < 0.5)      p *= 2.0;
    else if (r2 < 1.0) p *= 1.0 / r2;
    // box fold
    p = clamp(p, -1.0, 1.0)*2.0 - p;
    return p;
}

// Distance estimator for fractal
float fractalDE(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    const float scale = 2.0;
    for (int i = 0; i < 7; i++) {
        dr = dr * abs(scale) + 1.0;
        z = fold(z);
        z = z * scale + pos;
    }
    return length(z) / dr;
}

// Ray‐march
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 90; i++) {
        float d = fractalDE(ro + rd * t);
        if (d < 0.001) break;
        t += d * 0.6;
        if (t > 50.0) break;
    }
    return t;
}

void main() {
    // Normalized screen coord
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    
    // Map mouse to spherical angles
    float mx = u_mouse.x / u_resolution.x / 100.;
    float my = u_mouse.y / u_resolution.y / 100.;
    float angY = (mx - 0.5) * 3.1415;  // ±π/2 horizontally
    float angX = (my - 0.5) * 1.5708;  // ±π/4 vertically
    
    // Camera setup
    vec3 camPos = vec3(0.0, 0.0, 6.0);
    mat3 viewRot = rotX(angX) * rotY(angY);
    vec3 ro = viewRot * camPos;
    vec3 rd = normalize(viewRot * vec3(uv, -1.5));
    
    // Perform ray‐march
    float t = rayMarch(ro, rd);
    vec3 p = ro + rd * t;
    
    // Estimate normal via gradient
    float eps = 0.0008;
    vec3 n = normalize(vec3(
        fractalDE(p + vec3(eps,0,0)) - fractalDE(p - vec3(eps,0,0)),
        fractalDE(p + vec3(0,eps,0)) - fractalDE(p - vec3(0,eps,0)),
        fractalDE(p + vec3(0,0,eps)) - fractalDE(p - vec3(0,0,eps))
    ));
    
    // Simple lighting
    vec3 light = normalize(vec3(0.7, 1.0, 0.5));
    float diff = max(dot(n, light), 0.0);
    
    // Color palette driven by time and mouse
    float hue = fract(u_time * 0.1 + mx);
    vec3 pal = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0,0.33,0.66) + hue));
    vec3 col = pal * diff;
    
    // Add glow at edges
    col += pal * pow(1.0 - exp(-0.02 * t*t), 2.0);
    
    gl_FragColor = vec4(col, 1.0);
}
