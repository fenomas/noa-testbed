'use strict';

var SimplexNoise = require('simplex-noise')
var simplex = new SimplexNoise()
var hash = require('ndhash')

module.exports = {
  generator: generateWorld,
  registerBlocks: registerBlocks
}



/*
 *   Block registration - register blocktypes used in world
*/



var dirtID, grassID, stoneID, block1ID, cloudID, leafID, flowerID

function registerBlocks(game) {
  var reg = game.registry

  // materials used by block faces
  reg.registerMaterial( 'dirt',       null, 'dirt.png' )
  reg.registerMaterial( 'grass',      null, 'grass.png' )
  reg.registerMaterial( 'grass_side', null, 'grass_dirt.png' )
  reg.registerMaterial( 'stone',      null, 'cobblestone.png' )
  reg.registerMaterial( 'leaf',       null, 'leaf.png', true )
  for (var i=1; i<30; i++) {
    var color = [ Math.random(), Math.random(), Math.random() ]
    reg.registerMaterial( 'color'+i, color, null)
  }
  reg.registerMaterial( 'white', [1,1,1] )


  // block types and the faces they use
  dirtID =  reg.registerBlock( 'dirt', 'dirt' )
  grassID = reg.registerBlock( 'grass', ['grass', 'dirt', 'grass_side'] )
  stoneID = reg.registerBlock( 'stone', 'stone' )
  leafID =  reg.registerBlock( 'leaf',  'leaf', null, true, false )
  cloudID = reg.registerBlock( 'cloud', 'white' )
  for (i=1; i<30; i++) {
    reg.registerBlock( 'block'+i, 'color'+i )
  }
  block1ID = reg.getBlockID('block1')


  // object blocks - i.e. non-terrain
  flowerID = reg.registerObjectBlock( 'flower', 'flowerMesh', null, false, false )
  
  // register a custom mesh to be used for occurrences of the block
  var m = BABYLON.Mesh.CreateSphere('flower', 5, 0.4, game.rendering.getScene())
  var mat = BABYLON.Matrix.Translation(0.5, 0.2 , 0.5)
  m.bakeTransformIntoVertices(mat)
  reg.registerMesh('flowerMesh', m, null)
}




/*
 *   Worldgen - simple terrain/cloud generator
*/


var terrainXZ = 80, 
    terrainY = 6

var cloudXZ = 200, 
    cloudY = 20,
    cloudLevel = 10, 
    cloudCutoff = .93  


function generateWorld( game, chunk, x, y, z ) {
  var dx = chunk.shape[0]
  var dy = chunk.shape[1]
  var dz = chunk.shape[2]
  // xyz is the origin of the chunk in world coords
  for (var i=0; i<dx; ++i) {
    for (var k=0; k<dz; ++k) {
      // simple heightmap across x/z
      var cx = (x+i)/terrainXZ
      var cz = (z+k)/terrainXZ
      var height = terrainY * simplex.noise2D(cx,cz) >> 0
      for (var j=0; j<dy; ++j) {
        var id = decideBlockID( x+i, y+j, z+k, height )
        chunk.set( i,j,k, id )
      }
    }
  }
}



function decideBlockID( x, y, z, groundLevel ) {
  if (y<groundLevel) return stoneID
  if (y==groundLevel) {
    if (y <  -4) return stoneID
    if (y == -4) return dirtID
    if (y == -3) return grassID
    if (y>4) return leafID
    return 2+y+block1ID
  }
  if (y==groundLevel+1 && y>-3 && y<3) {
    var h = hash(x,z)
    if (Math.floor(h*200)==0) return flowerID;
  }
  if (y < cloudLevel) return 0
  // ad-hoc clouds
  var cloud = simplex.noise3D(x/cloudXZ, y/cloudY, z/cloudXZ)
  if (y<cloudLevel+10) cloud *= (y-cloudLevel)/10
  if (cloud > cloudCutoff) return cloudID
  return 0
}


