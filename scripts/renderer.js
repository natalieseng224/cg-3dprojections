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
    this.enable_animation = true; // <-- disabled for easier debugging; enable for animation
    this.start_time = null;
    this.prev_time = null;
  }

  //
  updateTransforms(time, delta_time) {
    let seconds = time / 1000.0;

    for (let i = 0; i < this.scene.models.length; i++) {
      let model = this.scene.models[i];
      if (model.animation === undefined) {
        continue;
      }
      let revolutions = model.animation.rps * seconds;

      let radians = revolutions * 2 * Math.PI;

      let center = model.center;
      let toOrigin = new Matrix(4, 4);
      CG.mat4x4Translate(toOrigin, -center.x, -center.y, -center.z);
      let rotation = new Matrix(4, 4);

      if (model.animation.axis == "x") {
        CG.mat4x4RotateX(rotation, radians);
      }
      if (model.animation.axis == "y") {
        CG.mat4x4RotateY(rotation, radians);
      }
      if (model.animation.axis == "z") {
        CG.mat4x4RotateZ(rotation, radians);
      }
      let to_center = new Matrix(4, 4);
      CG.mat4x4Translate(to_center, center.x, center.y, center.z);
      // TODO: update any transformations needed for animation
      model.matrix = Matrix.multiply([to_center, rotation, toOrigin]);
    }
  }

  get_axes() {
    let prp = this.scene.view.prp;
    let srp = this.scene.view.srp;
    let vup = this.scene.view.vup;
    let n = CG.Vector3(prp.x - srp.x, prp.y - srp.y, prp.z - srp.z);
    n.normalize(); //aligned to z, so it's forward and back
    let u = vup.cross(n);
    u.normalize(); //perpendicular to n so it's left and right
    return { u: u, n: n };
  }
  move_camera(direction, distance) {
    let prp = this.scene.view.prp;
    let srp = this.scene.view.srp;
    prp.x += distance * direction.x;
    prp.y += distance * direction.y;
    prp.z += distance * direction.z;
    srp.x += distance * direction.x;
    srp.y += distance * direction.y;
    srp.z += distance * direction.z;
    this.draw();
  }
  turn_camera(angle) {
    let prp = this.scene.view.prp;
    let srp = this.scene.view.srp;
    let axes = this.get_axes();
    let u = axes.u;
    let n = axes.n;
    let dx = srp.x - prp.x;
    let dy = srp.y - prp.y;
    let dz = srp.z - prp.z;
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    srp.x = prp.x + (Math.cos(angle) * -n.x + Math.sin(angle) * u.x) * distance;
    srp.y = prp.y + (Math.cos(angle) * -n.y + Math.sin(angle) * u.y) * distance;
    srp.z = prp.z + (Math.cos(angle) * -n.z + Math.sin(angle) * u.z) * distance;
    this.draw();
  }
  //
  rotateLeft() {
    this.turn_camera(-Math.PI / 16);
  }

  //
  rotateRight() {
    this.turn_camera(Math.PI / 16);
  }

  //
  moveLeft() {
    let axes = this.get_axes();
    this.move_camera(axes.u, -1);
  }

  //
  moveRight() {
    let axes = this.get_axes();
    this.move_camera(axes.u, 1);
  }

  //
  moveBackward() {
    let axes = this.get_axes();
    this.move_camera(axes.n, 1);
  }

  //
  moveForward() {
    let axes = this.get_axes();
    this.move_camera(axes.n, -1);
  } //-1 cause n points to -z

  //
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let matrix = CG.mat4x4Perspective(
      this.scene.view.prp,
      this.scene.view.srp,
      this.scene.view.vup,
      this.scene.view.clip,
    );
    // matrix = Matrix.multiply([CG.mat4x4MPer(), matrix]);
    let models = this.scene.models;
    let lines = [];
    let index = 0;
    let prp = this.scene.view.prp;
    let srp = this.scene.view.srp;
    let vup = this.scene.view.vup;
    let n = CG.Vector3(prp.x - srp.x, prp.y - srp.y, prp.z - srp.z);
    n.normalize(); //aligned to z, so it's forward and back
    let u = vup.cross(n);
    u.normalize(); //perpendicular to n so it's left and right

    for (let i = 0; i < models.length; i++) {
      let vertices = models[i].vertices;
      let tempVertices = [];
      for (let j = 0; j < vertices.length; j++) {
        let n = Matrix.multiply([matrix, models[i].matrix, vertices[j]]);
        tempVertices.push(n);
      }
      let edges = models[i].edges;
      for (let i = 0; i < edges.length; i++) {
        let currentGroup = edges[i];
        for (let j = 0; j < currentGroup.length - 1; j++) {
          let v0Index = currentGroup[j];
          let v1Index = currentGroup[j + 1];
          lines[index] = this.clipLinePerspective(
            { pt0: tempVertices[v0Index], pt1: tempVertices[v1Index] },
            (-1 * this.scene.view.clip[4]) / this.scene.view.clip[5],
          );
          index++;
        }
      }
      for (let i = 0; i < index; i++) {
        if (lines[i] != null) {
          let p0 = Matrix.multiply([
            CG.mat4x4Viewport(this.canvas.width, this.canvas.height),
            CG.mat4x4MPer(),
            lines[i].pt0,
          ]);
          let p1 = Matrix.multiply([
            CG.mat4x4Viewport(this.canvas.width, this.canvas.height),
            CG.mat4x4MPer(),
            lines[i].pt1,
          ]);
          let p0x = p0.x / p0.w;
          let p0y = p0.y / p0.w;

          let p1x = p1.x / p1.w;
          let p1y = p1.y / p1.w;
          this.drawLine(p0x, p0y, p1x, p1y);
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
      // trivial accept
      if ((out0 & out1) != 0) {
        return null;
      }
      let out; // new intersection point
      if (out0 != 0) {
        // keep out1
        out = out0;
      } else {
        // keep out0
        out = out1;
      }
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      let dz = p1.z - p0.z;
      let t;

      if ((out & LEFT) != 0) {
        t = (-p0.x + p0.z) / (dx - dz);
      } else if ((out & RIGHT) != 0) {
        t = (p0.x + p0.z) / (-dx - dz);
      } else if ((out & BOTTOM) != 0) {
        t = (-p0.y + p0.z) / (dy - dz);
      } else if ((out & TOP) != 0) {
        t = (p0.y + p0.z) / (-dy - dz);
      } else if ((out & FAR) != 0) {
        t = (-p0.z - 1) / dz;
      } else {
        t = (p0.z - z_min) / -dz;
      }
      let newX = p0.x + t * dx;
      let newY = p0.y + t * dy;
      let newZ = p0.z + t * dz;
      if (out0 !== 0) {
        // point 0 was outside frame
        p0 = CG.Vector4(newX, newY, newZ, p0.w);
        out0 = this.outcodePerspective(p0, z_min);
      } else {
        // point 1 was outside frame
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
        // CUBE OR CONE OR CYLINDER OR SPHERE
        model.center = CG.Vector4(
          scene.models[i].center[0],
          scene.models[i].center[1],
          scene.models[i].center[2],
          1,
        );

        model.vertices = [];
        model.edges = [];

        for (let key in scene.models[i]) {
          if (
            scene.models[i].hasOwnProperty(key) &&
            key !== "type" &&
            key != "center"
          ) {
            model[key] = JSON.parse(JSON.stringify(scene.models[i][key]));
          }
        }

        if (model.type === "cube") {
          let center = model.center; // array of length 3
          let x = model.height;
          // top vertices
          let center_top = [];
          center_top[0] = center.x;
          center_top[1] = center.y + x / 2;
          center_top[2] = center.z;
          model.vertices.push(
            CG.Vector4(
              center_top[0] - x / 2,
              center_top[1],
              center_top[2] + x / 2,
              1,
            ),
          );
          model.vertices.push(
            CG.Vector4(
              center_top[0] + x / 2,
              center_top[1],
              center_top[2] + x / 2,
              1,
            ),
          );
          model.vertices.push(
            CG.Vector4(
              center_top[0] + x / 2,
              center_top[1],
              center_top[2] - x / 2,
              1,
            ),
          );
          model.vertices.push(
            CG.Vector4(
              center_top[0] - x / 2,
              center_top[1],
              center_top[2] - x / 2,
              1,
            ),
          );
          // bottom vertices
          let center_bottom = [];
          center_bottom[0] = center.x;
          center_bottom[1] = center.y - x / 2;
          center_bottom[2] = center.z;
          model.vertices.push(
            CG.Vector4(
              center_bottom[0] - x / 2,
              center_bottom[1],
              center_bottom[2] + x / 2,
              1,
            ),
          );
          model.vertices.push(
            CG.Vector4(
              center_bottom[0] + x / 2,
              center_bottom[1],
              center_bottom[2] + x / 2,
              1,
            ),
          );
          model.vertices.push(
            CG.Vector4(
              center_bottom[0] + x / 2,
              center_bottom[1],
              center_bottom[2] - x / 2,
              1,
            ),
          );
          model.vertices.push(
            CG.Vector4(
              center_bottom[0] - x / 2,
              center_bottom[1],
              center_bottom[2] - x / 2,
              1,
            ),
          );
          // edges
          model.edges.push([0, 1, 2, 3, 0]);
          model.edges.push([4, 5, 6, 7, 4]);
          model.edges.push([0, 4]);
          model.edges.push([1, 5]);
          model.edges.push([2, 6]);
          model.edges.push([3, 7]);
        } else if (model.type === "cone") {
          let c = model.center;
          let r = model.radius;
          let delta_degree = (2 * Math.PI) / model.sides;
          let current_degree = 0;
          let v_x = Math.trunc(c.x + r * Math.cos(current_degree));
          let v_z = Math.trunc(c.z + r * Math.sin(current_degree));
          while (current_degree < 2 * Math.PI) {
            model.vertices.push(CG.Vector4(v_x, c.y, v_z, 1));
            current_degree += delta_degree;
            v_x = Math.trunc(c.x + r * Math.cos(current_degree));
            v_z = Math.trunc(c.z + r * Math.sin(current_degree));
          }
          model.vertices.push(CG.Vector4(c.x, c.y + model.height, c.z, 1)); // top of cone
          console.log(model.vertices);

          let bottom = [];
          for (let i = 0; i < model.sides; i++) {
            model.edges.push([i, model.sides]);
            bottom.push(i);
          }
          bottom.push(0);
          model.edges.push(bottom);
        } else if (model.type === "cylinder") {
          let c = model.center;
          let r = model.radius;
          let h = model.height;
          let bottom_vertices = [];
          let top_vertices = [];
          let delta_degree = (2 * Math.PI) / model.sides;
          let current_degree = 0;
          let v_x = Math.trunc(c.x + r * Math.cos(current_degree));
          let v_z = Math.trunc(c.z + r * Math.sin(current_degree));
          while (current_degree < 2 * Math.PI) {
            bottom_vertices.push(CG.Vector4(v_x, c.y - h / 2, v_z, 1));
            top_vertices.push(CG.Vector4(v_x, c.y + h / 2, v_z, 1));
            current_degree += delta_degree;
            v_x = Math.trunc(c.x + r * Math.cos(current_degree));
            v_z = Math.trunc(c.z + r * Math.sin(current_degree));
          }
          let edges_bottom = [];
          let edges_top = [];
          for (let i = 0; i < model.sides; i++) {
            model.vertices.push(bottom_vertices[i]);
            edges_bottom.push(i);
          }
          edges_bottom.push(0);
          for (let i = 0; i < model.sides; i++) {
            model.vertices.push(top_vertices[i]);
            edges_top.push(model.sides + i);
          }
          edges_top.push(model.sides);

          for (let i = 0; i < model.sides; i++) {
            model.edges.push([i, i + model.sides]);
          }
          console.log(model.edges);
          model.edges.push(edges_bottom);
          model.edges.push(edges_top);
          console.log(model.vertices);
        } else if (model.type === "sphere") {
          let c = model.center;
          let r = model.radius;
          let slices = model.slices;
          let stacks = model.stacks;
          let step_down = Math.PI / (stacks + 1);
          let step_around = (2 * Math.PI) / slices;
          let top_vertex = CG.Vector4(c.x, c.y + r, c.z, 1);
          model.vertices.push(top_vertex);
          for (let i = 1; i <= stacks; i++) {
            let ringRadius = r * Math.sin(i * step_down);
            let ringY = c.y + r * Math.cos(i * step_down);
            for (let j = 0; j < slices; j++) {
              let angle = j * step_around;
              let x = c.x + ringRadius * Math.cos(angle);
              let z = c.z + ringRadius * Math.sin(angle);
              model.vertices.push(CG.Vector4(x, ringY, z, 1));
            }
          }
          let bottom_vertex = CG.Vector4(c.x, c.y - r, c.z, 1);
          model.vertices.push(bottom_vertex);

          for (let i = 0; i < stacks; i++) {
            let ring = [];
            for (let j = 0; j < slices; j++) {
              ring.push(1 + i * slices + j);
            }
            ring.push(1 + i * slices);
            model.edges.push(ring);
          }

          for (let j = 0; j < slices; j++) {
            let top_ring = [0];
            for (let i = 0; i < stacks; i++) {
              top_ring.push(1 + i * slices + j);
            }
            top_ring.push(model.vertices.length - 1);
            model.edges.push(top_ring);
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
