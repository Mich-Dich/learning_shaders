#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// Rotate a 2D vector by angle (in radians)
mat2 rotate(float angle) {
    float s = sin(angle), c = cos(angle);
    return mat2(c, -s, s, c);
}

void main() {
    // Normalize pixel coordinates to [-1,1] with correct aspect
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Animate zoom and rotation over time
    float zoom = 1.0 + 0.5 * sin(u_time * 0.3);
    uv *= zoom;
    uv = rotate(u_time * 0.2) * uv;
    
    // Create polar coordinates
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    
    // Kaleidoscope: fold the angle into 6 mirrored slices
    float slices = 6.0;
    a = mod(a, 2.0 * 3.14159 / slices);
    a = abs(a - 3.14159 / slices);
    
    // Create a radial pattern with bands
    float bands = smoothstep(0.2, 0.25, sin(r * 10.0 - u_time * 2.0));
    
    // Color palette: hue shifting over time
    float hue = mod(a / (2.0 * 3.14159 / slices) + u_time * 0.1, 1.0);
    vec3 col = vec3(0.5 + 0.5 * cos(6.2831 * (hue + vec3(0.0, 0.33, 0.66))));
    
    // Combine pattern and color, fade at edges
    float mask = smoothstep(1.0, 0.95, r);
    vec3 finalColor = mix(col * bands, vec3(0.0), mask);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
