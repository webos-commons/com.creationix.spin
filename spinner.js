
// Set up SDL window for rendering
SDL = require('sdl');
SDL.init(SDL.INIT.VIDEO);
SDL.GL.setAttribute(SDL.GL.DOUBLEBUFFER, 1);
screen = SDL.setVideoMode(0, 0, 0, SDL.SURFACE.FULLSCREEN | SDL.SURFACE.OPENGL);
SDL.events.on("QUIT", process.exit)
SDL.events.on("KEYDOWN", function (evt) { if (evt.sym === 27) process.exit() });
process.on('exit', function () { SDL.quit(); });


gl = require('webgl');
// Load global glMatrix stuff
require('./glMatrix');

//// Optional debugging stuff for when things go wrong
//Object.keys(gl).forEach(function (name) {
//  if (name === 'getError' || typeof gl[name] !== 'function') return;
//  var original = gl[name];
//  gl[name] = function () {
//    console.log("gl." + name + "(", Array.prototype.slice.apply(arguments), ")");
//    var ret = original.apply(this, arguments);
//    var err = gl.getError();
//    if (!err) return ret;
//    throw new Error("GL Error " + err + " after gl." + name);
//  }
//});


function getShader(gl, id) {
  var str = require('fs').readFileSync(__dirname + "/" + id + ".glsl", 'utf8');

  var shader;
  if (id.match(/-fs/)) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (id.match(/-vs/)) {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}


var shaderProgram;

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);

  vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(vertexColorAttribute);

  pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if (mvMatrixStack.length == 0) {
    throw "Invalid popMatrix!";
  }
  mvMatrix = mvMatrixStack.pop();
}


function setMatrixUniforms() {
  gl.uniformMatrix4fv(pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(mvMatrixUniform, false, mvMatrix);
}


function degToRad(degrees) {
  return degrees * Math.PI / 180;
}


var pyramidVertexPositionBuffer;
var pyramidVertexColorBuffer;
var cubeVertexPositionBuffer;
var cubeVertexColorBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
  pyramidVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexPositionBuffer);
  var vertices = [
    // Front face
     0.0,  1.0,  0.0,
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,

    // Right face
     0.0,  1.0,  0.0,
     1.0, -1.0,  1.0,
     1.0, -1.0, -1.0,

    // Back face
     0.0,  1.0,  0.0,
     1.0, -1.0, -1.0,
    -1.0, -1.0, -1.0,

    // Left face
     0.0,  1.0,  0.0,
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  pyramidVertexPositionBuffer_itemSize = 3;
  pyramidVertexPositionBuffer_numItems = 12;

  pyramidVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexColorBuffer);
  var colors = [
    // Front face
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,

    // Right face
    1.0, 0.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 0.0, 1.0,

    // Back face
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,

    // Left face
    1.0, 0.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
    0.0, 1.0, 0.0, 1.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  pyramidVertexColorBuffer_itemSize = 4;
  pyramidVertexColorBuffer_numItems = 12;


  cubeVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
  vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  cubeVertexPositionBuffer_itemSize = 3;
  cubeVertexPositionBuffer_numItems = 24;

  cubeVertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
  colors = [
    [1.0, 0.0, 0.0, 1.0], // Front face
    [1.0, 1.0, 0.0, 1.0], // Back face
    [0.0, 1.0, 0.0, 1.0], // Top face
    [1.0, 0.5, 0.5, 1.0], // Bottom face
    [1.0, 0.0, 1.0, 1.0], // Right face
    [0.0, 0.0, 1.0, 1.0]  // Left face
  ];
  var unpackedColors = [];
  for (var i in colors) {
    var color = colors[i];
    for (var j=0; j < 4; j++) {
//      color = [Math.random(), Math.random(), Math.random(), Math.random()];
      unpackedColors = unpackedColors.concat(color);
    }
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
  cubeVertexColorBuffer_itemSize = 4;
  cubeVertexColorBuffer_numItems = 24;

  cubeVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
  var cubeVertexIndices = [
    0, 1, 2,    0, 2, 3,  // Front face
    4, 5, 6,    4, 6, 7,  // Back face
    8, 9, 10,   8, 10, 11,  // Top face
    12, 13, 14,   12, 14, 15, // Bottom face
    16, 17, 18,   16, 18, 19, // Right face
    20, 21, 22,   20, 22, 23  // Left face
  ];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
  cubeVertexIndexBuffer_itemSize = 1;
  cubeVertexIndexBuffer_numItems = 36;
}


var rPyramid = 0;
var rCube = 0;

function drawScene() {
  gl.viewport(0, 0, screen.w, screen.h);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(45, screen.w / screen.h, 0.1, 100.0, pMatrix);

  mat4.identity(mvMatrix);

  mat4.translate(mvMatrix, [-1.5, 0.0, -8.0]);

  mvPushMatrix();
  mat4.rotate(mvMatrix, degToRad(rPyramid), [0, 1, 0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexPositionBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, pyramidVertexPositionBuffer_itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, pyramidVertexColorBuffer);
  gl.vertexAttribPointer(vertexColorAttribute, pyramidVertexColorBuffer_itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, pyramidVertexPositionBuffer_numItems);

  mvPopMatrix();


  mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);

  mvPushMatrix();
  mat4.rotate(mvMatrix, degToRad(rCube), [1, 1, 1]);

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, cubeVertexPositionBuffer_itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
  gl.vertexAttribPointer(vertexColorAttribute, cubeVertexColorBuffer_itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer_numItems, gl.UNSIGNED_SHORT, 0);

  mvPopMatrix();

}


var lastTime = 0;

function animate() {
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
    var elapsed = timeNow - lastTime;

    rPyramid += (90 * elapsed) / 1000.0;
    rCube -= (75 * elapsed) / 1000.0;
  }
  lastTime = timeNow;
}


initShaders()
initBuffers();

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clearDepth(1);
gl.enable(gl.DEPTH_TEST);


SDL.events.on('tick', function () {
  drawScene();
  SDL.GL.swapBuffers();
  animate();
});
