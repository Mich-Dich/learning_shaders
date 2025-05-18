#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

mat2 rotate(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

void main() {
    // Normalize coordinates (range -1 to +1)
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / u_resolution.y;

    // Mouse influence: map mouse to range [-1,1]
    vec2 m = (u_mouse.xy / u_resolution * 2.0 - 1.0);

    // Time varying parameters
    float t = u_time * 0.5;
    float swirl = length(m) * 2.0;
    
    // Apply swirling based on mouse
    float angle = atan(uv.y, uv.x) + swirl;
    float radius = length(uv);
    uv = vec2(cos(angle), sin(angle)) * radius;

    // Layer multiple plasma waves
    float p1 = sin(uv.x * 3.0 + t + m.x * 5.0);
    float p2 = sin(uv.y * 3.0 - t + m.y * 5.0);
    float p3 = sin((uv.x+uv.y) * 5.0 + t * 1.5);
    float mixv = (p1 + p2 + p3) / 3.0;

    // Feedback flicker
    mixv += sin(radius * 10.0 - t * 2.0) * 0.2;

    // Color palette influenced by mouse movement
    vec3 col;
    col.r = mix(0.5 + 0.5*sin(3.0*mixv + t), 1.0, abs(m.x));
    col.g = mix(0.5 + 0.5*sin(3.0*mixv + t + 2.0), 1.0, abs(m.y));
    col.b = 0.5 + 0.5*sin(3.0*mixv + t + 4.0);

    // Vignette
    float vig = smoothstep(1.2, 0.7, radius);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
