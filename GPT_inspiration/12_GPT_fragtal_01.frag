#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// 3×3 rotation around arbitrary axis
mat3 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle), c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
        oc * axis.x * axis.x + c,
        oc * axis.x * axis.y - axis.z * s,
        oc * axis.z * axis.x + axis.y * s,
        
        oc * axis.x * axis.y + axis.z * s,
        oc * axis.y * axis.y + c,
        oc * axis.y * axis.z - axis.x * s,
        
        oc * axis.z * axis.x - axis.y * s,
        oc * axis.y * axis.z + axis.x * s,
        oc * axis.z * axis.z + c
    );
}

// Distance estimator for a Mandelbulb fractal
float mandelbulbDE(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    const int ITER = 10;
    const float POWER = 8.0;
    for(int i = 0; i < ITER; i++) {
        r = length(z);
        if (r > 4.0) break;
        
        // convert to polar coords
        float theta = acos(z.z / r);
        float phi   = atan(z.y, z.x);
        dr =  pow(r, POWER - 1.0) * POWER * dr + 1.0;
        
        // scale and rotate the point
        float zr = pow(r, POWER);
        theta *= POWER;
        phi   *= POWER;
        
        z = zr * vec3(
            sin(theta) * cos(phi),
            sin(phi)   * sin(theta),
            cos(theta)
        ) + p;
    }
    return 0.5 * log(r) * r / dr;
}

// Estimate normal via gradient
vec3 estimateNormal(vec3 p) {
    float eps = 0.001;
    return normalize(vec3(
        mandelbulbDE(p + vec3(eps, 0.0, 0.0)) - mandelbulbDE(p - vec3(eps, 0.0, 0.0)),
        mandelbulbDE(p + vec3(0.0, eps, 0.0)) - mandelbulbDE(p - vec3(0.0, eps, 0.0)),
        mandelbulbDE(p + vec3(0.0, 0.0, eps)) - mandelbulbDE(p - vec3(0.0, 0.0, eps))
    ));
}

// Ray-marching loop
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i = 0; i < 100; i++) {
        vec3 pos = ro + rd * t;
        float dist = mandelbulbDE(pos);
        if (dist < 0.001 || t > 50.0) break;
        t += dist * 0.5;
    }
    return t;
}

void main() {
    // normalized screen coords
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // camera setup
    vec3 camPos = vec3(0.0, 0.0, 4.0);
    vec3 lookAt = vec3(0.0);
    vec3 forward = normalize(lookAt - camPos);
    vec3 right   = normalize(cross(vec3(0.0,1.0,0.0), forward));
    vec3 up      = cross(forward, right);
    
    // pixel ray
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
    
    // apply a slow auto-rotation plus mouse influence
    float mx = (u_mouse.x / u_resolution.x - 0.5) * 2.0;
    float my = (u_mouse.y / u_resolution.y - 0.5) * 2.0;
    vec3 axis = normalize(vec3(my, 1.0, mx));
    float angle = u_time * 0.3 + length(u_mouse - 0.5 * u_resolution) * 0.005;
    mat3 rot = rotationMatrix(axis, angle);
    rd = rot * rd;
    camPos = rot * camPos;
    
    // march and shade
    float t = rayMarch(camPos, rd);
    vec3 pos = camPos + rd * t;
    vec3 normal = estimateNormal(pos);
    
    // lighting: cool blue directional light + white rim
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.3));
    float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
    float rim = pow(1.0 - max(dot(rd, normal), 0.0), 3.0);
    
    // palette: dark gray base, steel blue midtones, white highlights
    vec3 baseGray = vec3(0.12);
    vec3 midBlue  = vec3(0.2, 0.4, 0.6);
    vec3 col = baseGray;
    col = mix(col, midBlue, diff * 0.7);
    col += rim * 0.5 * vec3(1.0);
    
    // vignette
    float v = smoothstep(1.4, 0.7, length(uv));
    col *= v;
    
    gl_FragColor = vec4(col, 1.0);
}
