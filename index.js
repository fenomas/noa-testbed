
var noa = require('noa')
//var texturePath = require('painterly-textures');

// pass in a more interesting generator function
var worldGenerator = require('./worldgen');


var opts = {
  pointerLock: true,
  inverseY: true,
  chunkSize: 32,
  texturePath: 'painterly/',
  generator: worldGenerator,
  chunkAddDistance: 3,
  chunkRemoveDistance: 4,
  // movement
  maxSpeed: 10,
  moveForce: 30,
  standingFriction: 35,
  airMoveMult: 0.5,
  jumpImpulse: 10,
  jumpForce: 12,
  jumpTime: 400, // ms
  airJumps: 1,
  rotationScale: 0.0025
}

var game = noa( opts )


