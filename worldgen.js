'use strict';

var SimplexNoise = require('simplex-noise')

module.exports = generate


var simplex = new SimplexNoise()
window.simples = simplex
var xzScale = 80,
    yScale = 6

// ids: stone, dirt, colors... , grass
var blockIDs = [ 3,1,4,5,6,7,8,9,2 ]

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
        if (cy==height) { // different id for surface blocks
          var ix = cy + 4
          if (ix<0) ix=0
          if (ix>=blockIDs.length) ix=blockIDs.length-1
          blockID = blockIDs[ix]
        }
        chunk.set( i,j,k, blockID )
      }
    }
  }
}
