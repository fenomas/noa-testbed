'use strict';
/* globals BABYLON */


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



var dirtID, grassID, stoneID, block1ID, cloudID, leafID, flowerID, woodID

function registerBlocks(game) {
  var reg = game.registry

  // materials used by block faces
  reg.registerMaterial( 'dirt',       [0.45, 0.36, 0.22],  'dirt.png' )
  reg.registerMaterial( 'grass',      [0.22, 0.38, 0.01],  'grass.png' )
  reg.registerMaterial( 'grass_side', [0.30, 0.34, 0.09],  'grass_dirt.png' )
  reg.registerMaterial( 'stone',      [0.50, 0.50, 0.50],  'cobblestone.png' )
  reg.registerMaterial( 'leaf',       [0.31, 0.45, 0.03],  'leaf.png', true )
  reg.registerMaterial( 'wood_face',  [0.60, 0.50, 0.10],  'wood_face.png' )
  reg.registerMaterial( 'wood_side',  [0.55, 0.45, 0.05],  'wood_side.png' )
  for (var i=1; i<30; i++) {
    var color = [ Math.random(), Math.random(), Math.random() ]
    reg.registerMaterial( 'color'+i, color, null)
  }
  reg.registerMaterial( 'white', [1,1,1], null )


  // block types and the faces they use
  dirtID =  reg.registerBlock( 'dirt', 'dirt' )
  grassID = reg.registerBlock( 'grass', ['grass', 'dirt', 'grass_side'] )
  stoneID = reg.registerBlock( 'stone', 'stone' )
  leafID =  reg.registerBlock( 'leaf',  'leaf', null, true, false )
  cloudID = reg.registerBlock( 'cloud', 'white' )
  woodID  = reg.registerBlock( 'wood',  ['wood_face', 'wood_face', 'wood_side'] )
  for (i=1; i<30; i++) {
    reg.registerBlock( 'block'+i, 'color'+i )
  }
  block1ID = reg.getBlockID('block1')


  // object blocks - i.e. non-terrain
  flowerID = reg.registerObjectBlock( 'flower', 'flowerMesh', null, false, false )

  // register a custom mesh to be used for occurrences of the block
  game.registry.registerMaterial('flowersprite', null, 'flower.png')
  var mesh = game.rendering.makeEntitySpriteMesh('flowersprite', 16, 16, 0)
  var mat = BABYLON.Matrix.Translation(0, 0.5, 0)
  mesh.bakeTransformIntoVertices(mat)
  mesh.billboardMode = 2; //BABYLON.Mesh.BILLBOARDMODE_ALL
  reg.registerMesh('flowerMesh', mesh, null)
}




/*
 *   Worldgen - simple terrain/cloud generator
*/


var terrainXZ = 80, 
    terrainY = 10

var cloudXZ = 200, 
    cloudY = 20,
    cloudLevel = 10, 
    cloudCutoff = .93  

var floor = Math.floor


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
      height -= 3
      for (var j=0; j<dy; ++j) {
        var id = decideBlockID( x+i, y+j, z+k, height )
        if (id!==0) chunk.set( i,j,k, id );
      }
      // possibly add a tree at this x/z coord
      tree(chunk, x, y, z, height, i, k)
    }
  }
}



function decideBlockID( x, y, z, groundLevel ) {
  // y at or below ground level
  if (y<groundLevel) return stoneID
  if (y==groundLevel) {
    if (y <  -4) return stoneID
    if (y == -4) return dirtID
    if (y == -3) return grassID
    return 2+y+block1ID
  }

  // flowers
  if (y==groundLevel+1 && y>-3 && y<3) {
    var h = hash(x,z)
    if (floor(h*70)===0) return flowerID;
  }

  // clouds
  if (y < cloudLevel) return 0
  var cloud = simplex.noise3D(x/cloudXZ, y/cloudY, z/cloudXZ)
  if (y<cloudLevel+10) cloud *= (y-cloudLevel)/10
  if (cloud > cloudCutoff) return cloudID

  // otherwise air
  return 0
}


// possibly overlay a columnar tree at a given i,k
function tree(chunk, xoff, yoff, zoff, height, i, k) {
  // leave if chunk is above/below tree height
  var js = chunk.shape[1]
  var treelo = height
  var treemax = treelo + 20
  if (yoff>treemax || yoff+js<treelo) return

  // don't build at chunk border for now
  var border = 5
  if (i<border || k<border) return
  var is = chunk.shape[0]
  var ks = chunk.shape[2]
  if (i>is-border || k>ks-border) return

  // sparse trees
  var x = xoff + i
  var z = zoff + k
  var thash = hash(x, z)
  if (floor(500*thash)!==0) return

  // build the treetrunk
  var treehi = treelo + 6 + floor(6*hash(x,z,1))
  for (var y=treelo; y<treehi; ++y) {
    var j = y-yoff
    if (j<0 || j>=js) continue
    chunk.set( i,j,k, woodID );
  }

  // spherical-ish foliage
  for (var ci=-3; ci<=3; ++ci) { 
    for (var cj=-3; cj<=3; ++cj) { 
      for (var ck=-3; ck<=3; ++ck) {
        var tj = treehi + cj - yoff
        if (ci===0 && ck===0 && cj<0) continue
        if (tj<0 || tj>=js) continue
        var rad = ci*ci + cj*cj + ck*ck
        if (rad>15) continue
        if (rad>5) {
          if (rad*hash(x+z+tj,ci,ck,cj) < 6) continue;
        }
        chunk.set( i+ci, tj, k+ck, leafID );
      }
    }
  }
}



