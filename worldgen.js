'use strict';

var SimplexNoise = require('simplex-noise')

module.exports = generate


var simplex = new SimplexNoise()
window.simples = simplex
var xzScale = 80,
    yScale = 6


function generate( chunk, x, y, z ) {
  var dx = chunk.shape[0]
  var dy = chunk.shape[1]
  var dz = chunk.shape[2]
  // default case - just return 1/2 for everything below y=5
  for (var i=0; i<dx; ++i) {
    for (var k=0; k<dz; ++k) {
      // simple heightmap
      var cx = (x+i)/xzScale
      var cz = (z+k)/xzScale
      var height = Math.round( yScale * simplex.noise2D(cx,cz) )
      // height = -yscale..yscale
      for (var j=0; j<dy; ++j) {
        var cy = y + j
        var blockID = (cy > height) ? 0 : 1   // default to air/dirt
        if (cy==height) {
          if (cy <= -4) blockID = 3      // cobblestone
          if (cy == -3) blockID = 1
          if (cy == -2) blockID = 4
          if (cy == -1) blockID = 5
          if (cy ==  0) blockID = 6
          if (cy ==  1) blockID = 7
          if (cy ==  2) blockID = 8
          if (cy ==  3) blockID = 9
          if (cy >=  4) blockID = 2      // grass
        }
        chunk.set( i,j,k, blockID )
      }
    }
  }
}
