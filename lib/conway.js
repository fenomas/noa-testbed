'use strict';




var ndhash = require('ndarray-hash')

module.exports = function(game) {
  return new Conway(game)
}



/*
 *
 *    goofing around - fire Conway "game of life" particles
 *
*/


function Conway(game) {
  // game of life state object
  var life = new Life(4,5,5,5)

  // register block type id
  game.registry.registerMaterial( 'conwayMat',  [1, 0.65, 0], null )
  var blockID = game.registry.registerBlock( 'conway', 'conwayMat' )

  // fire function
  this.fire = fire.bind(null, game, life, blockID)

  // start/stop
  this.startStop = function() {
    paused = !paused
  }
  
  // set up timer
  game.on('tick', tick.bind(null, game, life, blockID))
}

var paused = true


/*
 *
 *  fire function - pick a block and turn it on for Life purposes
 *
*/

function fire(game, life, blockID) {
  var res = game.pick( game.getPlayerEyePosition(), game.getCameraVector(), 100)
  if (res) {
    var pos = res.position
    var norm = res.normal
    var loc = [Math.floor(pos[0]+norm[0]),
               Math.floor(pos[1]+norm[1]),
               Math.floor(pos[2]+norm[2]) ]
    game.setBlock( blockID, loc )
    life.set( loc[0], loc[1], loc[2], 1 )
  }
}





/*
 *
 *  tick function - once per second, iterate Life and update world blocks
 *
*/

var last = performance.now()

function tick(game, life, blockID) {
  if (paused) return

  var now = performance.now()
  if (now-last < 300) return
  last = now;

  // automaton state iteration
  life.prepareNextState()
  // make voxel world changes
  life.toLive.map(function(loc){
    game.setBlock( blockID, loc )
  })
  life.toDie.map(function(loc){
    game.setBlock( 0, loc )
  })
  // finish
  life.transitionToNextState()
}


/*
 *
 *  super minimal ad-hoc implementation of 3D Game of Life
 * 
 *  takes args in traditional "Life wxyz" order, where:
 *    dead blocks are born if they have w..x neighbors (inclusive)
 *    living blocks stay alive with y..z neighbors (inclusive)
 *
*/

function Life(w, x, y, z) {
  this.w = w
  this.x = x
  this.y = y
  this.z = z
  this.size = 10000 // ad-hoc size of internal state ndarray
  this.off = this.size/2
  this.state = ndhash( [this.size, this.size, this.size] )
  this.liveList = {}
  this.toLive = []
  this.toDie = []
}

Life.prototype.set = function(x, y, z, val) {
  var off = this.off
  this.state.set( off+x, off+y, off+z, val )
  var id = x+'|'+y+'|'+z
  if (val) this.liveList[id] = 1
  else delete this.liveList[id]
}

Life.prototype.get = function(x, y, z) {
  var off = this.off
  return this.state.get( off+x, off+y, off+z )
}

Life.prototype.prepareNextState = function() {
  // builds toLive / toDie arrays
  this.toLive = []
  this.toDie = []
  var checked = ndhash( [this.size, this.size, this.size] )
  var off = this.off

  var list = Object.keys(this.liveList)
  for (var s=0; s<list.length; ++s) {
    var loc = list[s].split('|').map(Math.floor)
    for (var i=-1; i<2; ++i) {
      for (var j=-1; j<2; ++j) {
        for (var k=-1; k<2; ++k) {
          var li = loc[0]+i
          var lj = loc[1]+j
          var lk = loc[2]+k
          if (checked.get(off+li, off+lj, off+lk)) continue
          checked.set(off+li, off+lj, off+lk, 1)
          
          var here = this.get( li, lj, lk )
          var n = countNeighbors(this, li, lj, lk)
          if (here) {
            if (n < this.w || n > this.x) this.toDie.push( [li, lj, lk] );
          } else {
            if (n >= this.y && n <= this.z) this.toLive.push( [li, lj, lk] );
          }
        }
      }
    }
  }
}

function countNeighbors(life, li, lj, lk) {
  var ct = 0
  for (var i=-1; i<2; ++i) {
    for (var j=-1; j<2; ++j) {
      for (var k=-1; k<2; ++k) {
        if ((i|j|k)===0) continue
        if (life.get( li+i, lj+j, lk+k )) ct++;
      }
    }
  }
  return ct
}

Life.prototype.transitionToNextState = function() {
  // makes the changes in toLive/toDie
  var self = this
  
  this.toDie.map(function(loc) {
    self.set( loc[0], loc[1], loc[2], 0 )
  })
  
  this.toLive.map(function(loc) {
    self.set( loc[0], loc[1], loc[2], 1 )
  })
}



