import * as CG from "./transforms.js";
import { Matrix, Vector } from "./matrix.js";

const LEFT = 32; // binary 100000
const RIGHT = 16; // binary 010000
const BOTTOM = 8; // binary 001000
const TOP = 4; // binary 000100
const FAR = 2; // binary 000010
const NEAR = 1; // binary 000001
const FLOAT_EPSILON = 0.000001;

class Renderer {
  // canvas:              object ({id: __, width: __, height: __})
  // scene:               object (...see description on Canvas)
  constructor(canvas, scene) {
    this.canvas = document.getElementById(canvas.id);
    this.canvas.width = canvas.width;
    this.canvas.height = canvas.height;
    this.ctx = this.canvas.getContext("2d");
    this.scene = this.processScene(scene);
    this.enable_animation = false; // <-- disabled for easier debugging; enable for animation
    this.start_time = null;
    this.prev_time = null;
  }

  //
  updateTransforms(time, delta_time) {
    // TODO: update any transformations needed for animation
  }

  //
  rotateLeft() {}

  //
  rotateRight() {}

  //
  moveLeft() {}

  //
  moveRight() {}

  //
  moveBackward() {}

  //
  moveForward() {}

  //
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let matrix = CG.mat4x4Perspective(this.scene.view.prp, this.scene.view.srp, this.scene.view.vup, this.scene.view.clip);
    let models = this.scene.models; 

    let lines = [];
    let index = 0; 
    
    for (let i=0; i<models.length; i++) {
        let vertices = models[i].vertices;
        let tempVertices = [];
        for (let j=0; j<vertices.length; j++) {                
            tempVertices[j] = Matrix.multiply([matrix, vertices[j]]); // check order 
        }
        let edges = models[i].edges;
        for (let i=0; i<edges.length; i++) {
             // console.log("group number", i);
            let currentGroup = edges[i];
            for (let j=0; j<currentGroup.length; j++) {
              let v0Index = currentGroup[j];
              let v1Index;
              if (j==currentGroup.length-1) { // edge from last element to first element
                v1Index = currentGroup[0]; 
              }
              else {
                v1Index = currentGroup[j+1];
              }
   
 
              lines[index] = this.clipLinePerspective({pt0: tempVertices[v0Index], pt1: tempVertices[v1Index]}, (-1*this.scene.view.clip[4])/this.scene.view.clip[5]);
              index++; 
              console.log(lines[index]);




/*
                // divide by w after we clip!!!!
                let x0 = tempVertices[v0Index].values[0] / tempVertices[v0Index].values[3];
                let y0 = tempVertices[v0Index].values[1] / tempVertices[v0Index].values[3];
                let x1 = tempVertices[v1Index].values[0] / tempVertices[v1Index].values[3];
                let y1 = tempVertices[v1Index].values[1] / tempVertices[v1Index].values[3];

                   for (let j=0; j<models[i].length; j++) {
                    console.log("hi", models[i][j]);
                    console.log(x0);
                    //this.drawLine(x0, y0, x1, y1);
                }
                */
            }
        }
    }

    // TODO: implement drawing here!
    // For each model
    //   * For each vertex
    //     * transform endpoints to canonical view volume
    //   * For each line segment in each edge
    //     * clip in 3D
    //     * project to 2D
    //     * translate/scale to viewport (i.e. window)
    //     * draw line
  }

  // Get outcode for a vertex
  // vertex:       Vector4 (transformed vertex in homogeneous coordinates)
  // z_min:        float (near clipping plane in canonical view volume)
  outcodePerspective(vertex, z_min) {
    let outcode = 0;
    if (vertex.x < vertex.z - FLOAT_EPSILON) {
      outcode += LEFT;
    } else if (vertex.x > -vertex.z + FLOAT_EPSILON) {
      outcode += RIGHT;
    }
    if (vertex.y < vertex.z - FLOAT_EPSILON) {
      outcode += BOTTOM;
    } else if (vertex.y > -vertex.z + FLOAT_EPSILON) {
      outcode += TOP;
    }
    if (vertex.z < -1.0 - FLOAT_EPSILON) {
      outcode += FAR;
    } else if (vertex.z > z_min + FLOAT_EPSILON) {
      outcode += NEAR;
    }
    return outcode;
  }

  // Clip line - should either return a new line (with two endpoints inside view volume)
  //             or null (if line is completely outside view volume)
  // line:         object {pt0: Vector4, pt1: Vector4}
  // z_min:        float (near clipping plane in canonical view volume)
  clipLinePerspective(line, z_min) {
    let result = null;
    let p0 = CG.Vector4(line.pt0.x, line.pt0.y, line.pt0.z, line.pt0.w);
    let p1 = CG.Vector4(line.pt1.x, line.pt1.y, line.pt1.z, line.pt1.w);
    let out0 = this.outcodePerspective(p0, z_min);
    let out1 = this.outcodePerspective(p1, z_min);
    while (out0 !== 0 || out1 !== 0) {
      
      if (out1 == out0) { // trivial reject 
        return null;
      }
      let out; // new intersection point 
      if (out0 == 0) {
        out = out1;
      }
      if (out1 == 0) {
        out = out0;
      }
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let dz = p1.z - p0.z;
      let t;

      if (out == LEFT) {
        t = (-p0.x + p0.z) / (dx - dz);
      }

      if (out == RIGHT) {
        t = (p0.x + p0.z) / (-dx - dz);
      }
      if (out == BOTTOM) {
        t = (-p0.y + p0.z) / (dy - dz);
      }
      if (out == TOP) {
        t = (p0.y + p0.z) / (-dy - dz);
      }
      if (out == FAR) {
        t = (-p0.z - 1) / dz;
      }
      if (out == NEAR) {
        t = (p0.z - z_min) / -dz;
      }
      let newX = p0.x + t * dx;
      let newY = p0.y + t * dy;
      let newZ = p0.z + t * dz;
      if (out0 !== 0) {
        p0 = CG.Vector4(newX, newY, newZ, p0.w);
        out0 = this.outcodePerspective(p0, z_min);
      } else {
        p1 = CG.Vector4(newX, newY, newZ, p1.w);
        out1 = this.outcodePerspective(p1, z_min);
      }
    }
    result = { pt0: p0, pt1: p1 };

    return result;
  }

  //
  animate(timestamp) {
    // Get time and delta time for animation
    if (this.start_time === null) {
      this.start_time = timestamp;
      this.prev_time = timestamp;
    }
    let time = timestamp - this.start_time;
    let delta_time = timestamp - this.prev_time;

    // Update transforms for animation
    this.updateTransforms(time, delta_time);

    // Draw slide
    this.draw();

    // Invoke call for next frame in animation
    if (this.enable_animation) {
      window.requestAnimationFrame((ts) => {
        this.animate(ts);
      });
    }

    // Update previous time to current one for next calculation of delta time
    this.prev_time = timestamp;
  }

  //
  updateScene(scene) {
    this.scene = this.processScene(scene);
    if (!this.enable_animation) {
      this.draw();
    }
  }

  //
  processScene(scene) {
    let processed = {
      view: {
        prp: CG.Vector3(
          scene.view.prp[0],
          scene.view.prp[1],
          scene.view.prp[2],
        ),
        srp: CG.Vector3(
          scene.view.srp[0],
          scene.view.srp[1],
          scene.view.srp[2],
        ),
        vup: CG.Vector3(
          scene.view.vup[0],
          scene.view.vup[1],
          scene.view.vup[2],
        ),
        clip: [...scene.view.clip],
      },
      models: [],
    };

    for (let i = 0; i < scene.models.length; i++) {
      let model = { type: scene.models[i].type };
      if (model.type === "generic") {
        model.vertices = [];
        model.edges = JSON.parse(JSON.stringify(scene.models[i].edges));
        for (let j = 0; j < scene.models[i].vertices.length; j++) {
          model.vertices.push(
            CG.Vector4(
              scene.models[i].vertices[j][0],
              scene.models[i].vertices[j][1],
              scene.models[i].vertices[j][2],
              1,
            ),
          );
          if (scene.models[i].hasOwnProperty("animation")) {
            model.animation = JSON.parse(
              JSON.stringify(scene.models[i].animation),
            );
          }
        }
      } else {
        model.center = CG.Vector4(
          scene.models[i].center[0],
          scene.models[i].center[1],
          scene.models[i].center[2],
          1,
        );
        for (let key in scene.models[i]) {
          if (
            scene.models[i].hasOwnProperty(key) &&
            key !== "type" &&
            key != "center"
          ) {
            model[key] = JSON.parse(JSON.stringify(scene.models[i][key]));
          }
        }
      }

      model.matrix = new Matrix(4, 4);
      processed.models.push(model);
    }

    return processed;
  }

  // x0:           float (x coordinate of p0)
  // y0:           float (y coordinate of p0)
  // x1:           float (x coordinate of p1)
  // y1:           float (y coordinate of p1)
  drawLine(x0, y0, x1, y1) {
    this.ctx.strokeStyle = "#000000";
    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.stroke();

    this.ctx.fillStyle = "#FF0000";
    this.ctx.fillRect(x0 - 2, y0 - 2, 4, 4);
    this.ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
  }
}

export { Renderer };

