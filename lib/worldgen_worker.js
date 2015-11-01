'use strict';

var SimplexNoise = require('simplex-noise')
var simplex = new SimplexNoise()
var hash = require('ndhash')
var ndarray = require('ndarray')


// plumbing

var worldgen = new WorldGen()
onmessage = function(ev) { worldgen.onMessage(ev) }


// module that runs in a worker, and generates world data for each chunk


// module.exports = function (self) {
function WorldGen() {

  /*
   *    message handling
  */

  // self.addEventListener('message',function (ev){
  this.onMessage = function(ev) {
    var msg = ev && ev.data && ev.data.msg
    if (!msg) return

    if (msg=='init') {
      initBlockIDs(ev.data.ids)
    }

    if (msg=='generate') {
      var d = ev.data
      var array = new ndarray( d.data, d.shape )
      generateWorld(array, d.x, d.y, d.z)

      // when done, return the ndarray to main thread
      self.postMessage({
        msg: 'generated',
        data: array.data,
        shape: array.shape,
        id: d.id
      })
    }
  }


  /*
   *    block ID initialization
  */

  var initted = false
  var dirtID, grassID, stoneID, block1ID, cloudID, leafID, flowerID, woodID, waterID

  function initBlockIDs(obj) {
    dirtID =   obj.dirtID
    grassID =  obj.grassID
    stoneID =  obj.stoneID
    block1ID = obj.block1ID
    cloudID =  obj.cloudID
    leafID =   obj.leafID
    flowerID = obj.flowerID
    woodID =   obj.woodID
    waterID =  obj.waterID
    initted = true
  }



  /*
   *    Chunk generation
  */

  var terrainXZ = 80, 
      terrainY = 10
  
  var waterLevel = -6

  var cloudXZ = 200, 
      cloudY = 20,
      cloudLevel = 10, 
      cloudCutoff = .93  

  var floor = Math.floor


  function generateWorld( chunk, x, y, z ) {
    // defer execution if block data has not arrived yet
    if (!initted) {
      setTimeout(function() { generateWorld(chunk,x,y,z) }, 500)
      return
    }

    // populate chunk. xyz is the origin of the chunk in world coords
    var dx = chunk.shape[0]
    var dy = chunk.shape[1]
    var dz = chunk.shape[2]

    for (var i=0; i<dx; ++i) {
      for (var k=0; k<dz; ++k) {
        // simple heightmap across x/z
        var cx = (x+i)/terrainXZ
        var cz = (z+k)/terrainXZ
        var height = terrainY * simplex.noise2D(cx,cz) >> 0
        height -= 3
        for (var j=0; j<dy; ++j) {
          var id = decideBlockID( x+i, y+j, z+k, height )
          if (id !== 0) chunk.set( i,j,k, id )
        }
        // possibly add a tree at this x/z coord
        tree(chunk, x, y, z, height, i, k)
      }
    }

    return chunk
  }


  function decideBlockID(x, y, z, groundLevel) {
    // y at or below ground level
    if (y<groundLevel) return stoneID
    if (y==groundLevel) {
      if (y <  -4) return stoneID
      if (y == -4) return dirtID
      if (y == -3) return grassID
      return 2+y+block1ID
    }
    
    // pools of water at low level
    if (y < waterLevel) return waterID

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
    // no trees at/near water level
    if (height <= waterLevel) return
    
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


}




