
var noa = require('noa')
//var texturePath = require('painterly-textures');

// pass in a more interesting generator function
var worldGenerator = require('./worldgen');


var opts = {
  pointerLock: true,
  inverseY: true,
  chunkSize: 32,
  texturePath: '/painterly/',
  generator: worldGenerator
}

var game = noa( opts )


