
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;

mat3 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
        oc*axis.x*axis.x + c,
        oc*axis.x*axis.y - axis.z*s,
        oc*axis.z*axis.x + axis.y*s,

        oc*axis.x*axis.y + axis.z*s,
        oc*axis.y*axis.y + c,
        oc*axis.y*axis.z - axis.x*s,

        oc*axis.z*axis.x - axis.y*s,
        oc*axis.y*axis.z + axis.x*s,
        oc*axis.z*axis.z + c
    );
}

mat3 transpose_mat3(mat3 m) {
    return mat3(
        m[0][0], m[1][0], m[2][0],
        m[0][1], m[1][1], m[2][1],
        m[0][2], m[1][2], m[2][2]
    );
}

// ------------------ SDFs ------------------

float sd_sphere(vec3 point, float radius)           { return length(point) - radius; }

float sd_plane(vec3 point, vec3 normal, float h)    { return dot(point, normalize(normal)) + h; }

float sd_torus(vec3 point, vec2 size)               { return length(vec2(length(point.xz) - size.x, point.y)) - size.y; }

float sd_box(vec3 point, vec3 half_extents) {

    vec3 d = abs(point) - half_extents;
    return length(max(d, 0.)) + min(max(d.x, max(d.y, d.z)), 0.);
}

float sd_cylinder(vec3 point, vec2 size) {

    vec2 d = abs(vec2(length(point.xz), point.y)) - size;
    return min(max(d.x, d.y), 0.) + length(max(d, 0.));
}

float sd_capsule(vec3 point, vec3 a, vec3 b, float r) {
    vec3 pa = point - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float sd_ellipsoid(vec3 point, vec3 size) {
    float k0 = length(point / size);
    float k1 = length(point / (size * size));
    return k0 * (k0 - 1.0) / k1;
}

float sd_box_rotated(vec3 point, vec3 b, mat3 R) {
    vec3 q = R * point;
    vec3 d = abs(q) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float sd_cylinder_rotated(vec3 point, vec2 size, vec3 rotEuler) {

    mat3 Rx = mat3(
        1,           0,            0,
        0, cos(rotEuler.x), -sin(rotEuler.x),
        0, sin(rotEuler.x),  cos(rotEuler.x)
    );
    mat3 Ry = mat3(
         cos(rotEuler.y), 0, sin(rotEuler.y),
                   0, 1,           0,
        -sin(rotEuler.y), 0, cos(rotEuler.y)
    );
    mat3 Rz = mat3(
        cos(rotEuler.z), -sin(rotEuler.z), 0,
        sin(rotEuler.z),  cos(rotEuler.z), 0,
                  0,           0, 1
    );
    mat3 R = Rz * Ry * Rx;
    mat3 Rinv = transpose_mat3(R);
    vec3 p_local = Rinv * point;
    return sd_cylinder(p_local, size);
} 

// ------------------ BOOL OPS ------------------

float op_union(float d0, float d1)          { return min(d0, d1); }

float op_intersect(float d0, float d1)      { return max(d0, d1); }

float op_subtract(float d0, float d1)       { return max(d0, -d1); }

float op_smooth_union(float d0, float d1, float k) {
    float h = clamp(0.5 + 0.5*(d1 - d0)/k, 0.0, 1.0);
    return mix(d1, d0, h) - k*h*(1.0 - h);
}

vec3 op_twist(vec3 point, float angle) {

    float c = cos(angle * point.y);
    float s = sin(angle * point.y);
    mat2 m = mat2(c, -s, s, c);
    return vec3(m * point.xz, point.y);
}

// ------------------ MAP ------------------

float map(vec3 point) {

    // vec3 p = op_twist(point, 1.1);
    // float d0 = sd_sphere(p - vec3(0.0, 1.0, 3.0), 1.0);
    // float d1 = sd_torus(p - vec3(0.0, 1.0, 3.0), vec2(1.5, 0.3));
    // float d2 = sd_box(p - vec3(0.0, -0.5, 3.0), vec3(2.5, 0.2, 2.5));
    // float d3 = sd_cylinder(p - vec3(0.0, 0.0, 3.0), vec2(0.2, 1.0));
    // float blend0 = op_smooth_union(d0, d1, 0.4);
    // float body = min(blend0, d2);
    // body = min(body, d3);

    // float plane = dot(point, vec3(0,1,0)) + 1.0;
    // return op_union(body, plane);

    float d_torso   = sd_sphere(point - vec3(0.0, 1.0, 2.0),  0.6);
    float d_head    = sd_sphere(point - vec3(0.0, 2.1, 2.0),  0.4);
    float d_sho_l   = sd_sphere(point - vec3(-0.7, 1.4, 2.0), 0.25);
    float d_sho_r   = sd_sphere(point - vec3( 0.7, 1.4, 2.0), 0.25);
    float d_arm_l   = sd_sphere(point - vec3(-0.98,1.04,2.000), 0.20);
    float d_arm_l_1 = sd_sphere(point - vec3(-1.4,0.58,2.000), 0.20);
    float d_arm_r   = sd_sphere(point - vec3( 0.98,1.04,2.0), 0.20);
    float d_arm_r_1 = sd_sphere(point - vec3( 1.4,0.58,2.0), 0.20);
    float d_hip_l   = sd_sphere(point - vec3(-0.3, 0.3, 2.0),  0.30);
    float d_hip_r   = sd_sphere(point - vec3( 0.3, 0.3, 2.0),  0.30);
    float d_leg_l   = sd_sphere(point - vec3(-0.3, -0.4, 2.0), 0.25);
    float d_leg_r   = sd_sphere(point - vec3( 0.3, -0.4, 2.0), 0.25);

    float k = 0.45;
    float humanoid = op_smooth_union(d_torso, d_head, k);
    humanoid = op_smooth_union(humanoid, d_sho_l, k);
    humanoid = op_smooth_union(humanoid, d_sho_r, k);
    humanoid = op_smooth_union(humanoid, op_smooth_union(d_arm_l, d_arm_l_1, .8), k);
    humanoid = op_smooth_union(humanoid, op_smooth_union(d_arm_r, d_arm_r_1, .8), k);
    humanoid = op_smooth_union(humanoid, d_hip_l, k);
    humanoid = op_smooth_union(humanoid, d_hip_r, k);
    humanoid = op_smooth_union(humanoid, d_leg_l, k);
    humanoid = op_smooth_union(humanoid, d_leg_r, k);

    float hole = sd_cylinder_rotated(point - vec3(0.0, 1.0 + sin(u_time) * .2, 1.6), vec2(0.2, 2.), vec3(11., sin(u_time * 2.) * .2, 0.));
    humanoid = op_subtract(humanoid, hole);

    float d_floor = sd_plane(point, vec3(0.0, 1.0, 0.0), 0.0);
    return op_union(humanoid, d_floor);
}

// ------------------ SPHERE TRACING ------------------

const int       MAX_STEPS = 100;
const float     EPSILON = 0.001;
const float     MAX_DIST = 100.0;

struct ray {
    vec3 origin;
    vec3 dir;
};

ray create_camera_ray(vec2 pixel_coord) {

    float fx = tan(radians(90.) / 2.) / u_resolution.x;
    vec2 d = (2. * pixel_coord - u_resolution) * fx;
    return ray(vec3(0.), normalize(vec3(d, 1.)));
}

vec3 gestimate_normal(vec3 point) {

    const vec2 e = vec2(1e-4, 0.);
    return normalize(vec3(
        map(point + e.xyy) - map(point - e.xyy),
        map(point + e.yxy) - map(point - e.yxy),
        map(point + e.yyx) - map(point - e.yyx)
    ));
}

// #define DEBUG_COST
#define ANIMATE_CAMERA

void main() {

    ray cam_ray = create_camera_ray(gl_FragCoord.xy);
#ifdef ANIMATE_CAMERA
    float factor = abs(sin(u_time * .25) * 23.);
    vec3 camera_pos = vec3(0., 1. + factor * .5, -1. - factor);
    vec3 light_pos = vec3(1., vec2(factor * .5));
#else
    vec3 camera_pos = vec3(0., 1., -1.);
    const vec3 light_pos = vec3(5., 5., -1.);
#endif

    float total_dist = 0.0;
    float dist = 0.;
    vec3 color = vec3(0.);
#ifdef DEBUG_COST
    int steps_used = 0;
#endif
    for (int x = 0; x < MAX_STEPS; x++) {

        vec3 point = camera_pos + total_dist * cam_ray.dir;
        dist = map(point);
#ifdef DEBUG_COST
        steps_used++;
#endif

        // if (dist < EPSILON) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        // else gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

        if (dist < EPSILON) {

            vec3 normal = gestimate_normal(point);
            vec3 L = normalize(light_pos - point);
            float diff = max(dot(normal, L), 0.);
            color = vec3(1.) * diff;
            break;
        }

        total_dist += dist;
        if (total_dist > MAX_DIST) break;
    }


#ifdef DEBUG_COST
    float cost = float(steps_used) / float(MAX_STEPS);
    gl_FragColor = vec4( mix(vec3(0., 1., 0.), vec3(1., 0., 0.), cost) ,1.0);
#else
    gl_FragColor = vec4(color, 1.0);
#endif
}
