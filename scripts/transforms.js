import { Matrix, Vector } from "./matrix.js";

// create a 4x4 matrix to the perspective projection / view matrix
function mat4x4Perspective(prp, srp, vup, clip) {
    // translate the prp to the origin
    let translateMatrix = new Matrix(4,4);
    mat4x4Translate(translateMatrix, -1*prp[0], -1*prp[1], -1*prp[2]); 

    // rotate VRC such that (u,v,n) align with (x,y,z)
    let rotateMatrix = new Matrix(4,4);
    let n = new Vector([prp[0]-srp[0], prp[1]-srp[1], prp[2]-srp[2]]);
    n.normalize(); 
    let u = new Vector(vup[0], vup[1], vup[2]); 
    u.cross(n); 
    u.normalize(); 
    let v = new Vector(n.x, n.y, n.z); 
    v.cross(u); 
    let theta_x = new Matrix(1, 0, 0);
    theta_x.dot(u); 
    let theta_y = new Matrix(0, 1, 0);
    theta_y.dot(v); 
    let theta_z = new Matrix(0, 0, 1);
    theta_z.dot(n); 
    mat4x4RotateX(rotateMatrix, theta_x);
    mat4x4RotateY(rotateMatrix, theta_y);
    mat4x4RotateZ(rotateMatrix, theta_z);

    // shear such that CW is on the z-axis
    let shearMatrix = new Matrix(4,4); 
    let DOP = new Vector(prp[0]-srp[0], prp[1]-srp[1], prp[2]-srp[2]);
    let shear_x = -1*(DOP.x)/DOP.z; 
    let shear_y = -1*(DOP.y)/DOP.z;
    mat4x4ShearXY(shearMatrix, shear_x, shear_y);

    // scale such that view volume bounds are ([z,-z], [z, -z], [-1, zmin])
    let scaleMatrix = new Matrix(4,4); 
    let scale_x = (2 * clip[4]) / ((clip[1] - clip[0]) * clip[5]); 
    let scale_y = (2 * clip[4]) / ((clip[3] - clip[2]) * clip[5]); 
    let scale_z = 1/clip[5]; 
    mat4x4Scale(scaleMatrix, scale_x, scale_y, scale_z);

    let transform = Matrix.multiply([scaleMatrix, shearMatrix, rotateMatrix, translateMatrix]);
    return transform; 
    // 1. translate PRP to origin
    // 2. rotate VRC such that (u,v,n) align with (x,y,z)
    // 3. shear such that CW is on the z-axis
    // 4. scale such that view volume bounds are ([z,-z], [z,-z], [-1,zmin])

    // ...
    // let transform = Matrix.multiply([...]);
    // return transform;
}

// create a 4x4 matrix to project a perspective image on the z=-1 plane
function mat4x4MPer() {
    let mper = new Matrix(4, 4);
    mper.values = [[1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, 0, -1, 0]];
    // mper.values = ...;
    return mper;
}

// create a 4x4 matrix to translate/scale projected vertices to the viewport (window)
function mat4x4Viewport(width, height) {
    let viewport = new Matrix(4, 4);
    // viewport.values = ...;
    viewport.values = [[width/2, 0, 0, width/2],
                        [0, height/2, 0, height/2],
                        [0, 0, 1, 0],
                        [0, 0, 0, 1]];
    return viewport;
}


///////////////////////////////////////////////////////////////////////////////////
// 4x4 Transform Matrices                                                         //
///////////////////////////////////////////////////////////////////////////////////

// set values of existing 4x4 matrix to the identity matrix
function mat4x4Identity(mat4x4) {
    mat4x4.values = [[1, 0, 0, 0],
                     [0, 1, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the translate matrix
function mat4x4Translate(mat4x4, tx, ty, tz) {
    // mat4x4values = ...;
    mat4x4.values = [[1, 0, 0, tx],
                    [0, 1, 0, ty],
                    [0, 0, 1, tz], 
                    [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the scale matrix
function mat4x4Scale(mat4x4, sx, sy, sz) {
    // mat4x4.values = ...;
    mat4x4.values = [[sx, 0, 0, 0],
                    [0, sy, 0, 0],
                    [0, 0, sz, 0],
                    [0, 0, 0, 1]];
}

// set values of existing 4x4 matrix to the rotate about x-axis matrix
function mat4x4RotateX(mat4x4, theta) {
    // mat4x4.values = ...;
}

// set values of existing 4x4 matrix to the rotate about y-axis matrix
function mat4x4RotateY(mat4x4, theta) {
    // mat4x4.values = ...;
}

// set values of existing 4x4 matrix to the rotate about z-axis matrix
function mat4x4RotateZ(mat4x4, theta) {
    // mat4x4.values = ...;
}

// set values of existing 4x4 matrix to the shear parallel to the xy-plane matrix
function mat4x4ShearXY(mat4x4, shx, shy) {
    mat4x4.values = [[1, 0, shx, 0],
                    [0, 1, shy, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 1]];
    // mat4x4.values = ...;
}

// create a new 3-component vector with values x,y,z
function Vector3(x, y, z) {
    let vec3 = new Vector(3);
    vec3.values = [x, y, z];
    return vec3;
}

// create a new 4-component vector with values x,y,z,w
function Vector4(x, y, z, w) {
    let vec4 = new Vector(4);
    vec4.values = [x, y, z, w];
    return vec4;
}

export {
    mat4x4Perspective,
    mat4x4MPer,
    mat4x4Viewport,
    mat4x4Identity,
    mat4x4Translate,
    mat4x4Scale,
    mat4x4RotateX,
    mat4x4RotateY,
    mat4x4RotateZ,
    mat4x4ShearXY,
    Vector3,
    Vector4
};