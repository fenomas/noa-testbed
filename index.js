
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
  standingFriction: 50,
  airMoveMult: 0.5,
  jumpImpulse: 10,
  jumpForce: 12,
  jumpTime: 400, // ms
  airJumps: 1,
  rotationScale: 0.0025
}

var game = noa( opts )


// define block types and textures. TODO: fit these into options object?

var reg = game.registry
// materials
reg.defineMaterial( 1, [1,1,1], "dirt.png" )
reg.defineMaterial( 2, [1,1,1], "grass.png" )
reg.defineMaterial( 3, [1,1,1], "grass_dirt.png" )
reg.defineMaterial( 4, [1,1,1], "cobblestone.png" )
for (i=5; i<30; i++) {
  reg.defineMaterial( i, [ Math.random(), Math.random(), Math.random() ], null )
}
// block types
reg.defineBlock( 1, 1 )             // dirt
reg.defineBlock( 2, [3,3,2,1,3,3] ) // grass
reg.defineBlock( 3, 4 )             // stone
for (var i=4; i<30; i++) {          // random colors
  reg.defineBlock( i, i+1 )
}





