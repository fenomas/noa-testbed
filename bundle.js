(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
/* global BABYLON */

/*
 * 
 *	Simple driver for mob movement
 * 
*/

module.exports = function (noa) {
	return {
		
		name: 'mob-ai',

		state: {
			lastJump: 0.1,
			stand_frame: '',
			jump_frame: '',
		},

		onAdd: function(eid, state) {
			// turn on mesh's billboard.Y
			var meshData = noa.entities.getData(eid, noa.entities.components.mesh)
			meshData.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y
		},

		onRemove: null,

		processor: function (dt, states) {
			var t = performance.now()
			for (var i = 0; i < states.length; i++) {
				var state = states[i]
				var id = state.__id
				
				var body = noa.ents.getPhysicsBody(id)
				var onground = body.resting[1] < 0
				var fr = (onground) ? state.stand_frame : state.jump_frame
				var mesh = noa.entities.getMeshData(id).mesh
				var atlas = noa.ents.getData(id, noa.ents.comps.sprite).atlas
				atlas.setMeshFrame(mesh, fr)
				
				// set 
				if (t > state.lastJump + 500) {
					if (onground && Math.random() < .01) {   // jump!
						var x = 4-8*Math.random()
						var z = 4-8*Math.random()
						var y = 7+5*Math.random()
						body.applyImpulse([x,y,z])
						state.lastJump = t
					}
				}

			}
		}


	}
}


},{}],2:[function(require,module,exports){
'use strict';
/* global BABYLON */



// simple holder for reference to a particle system

module.exports = function (noa) {
	return {
		
		name: 'particles',

		state: {
			parts: null
		},

		onAdd: null,

		onRemove: null,

		processor: null


	}
}


},{}],3:[function(require,module,exports){
'use strict';
/* global BABYLON */

module.exports = function (noa) {
	return {
		
		name: 'is-sprite',

		state: {
			atlas: null
		},

		onAdd: function(eid, state) {
			// turn on mesh's billboard.Y
			var meshData = noa.entities.getData(eid, noa.entities.components.mesh)
			meshData.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y
		},

		onRemove: null,

		processor: null


	}
}


},{}],4:[function(require,module,exports){
'use strict';
/* global BABYLON */

var vec3 = require('gl-vec3')
var noa = require('noa-engine')
var Atlas = require('babylon-atlas')

// local modules
var createUI = require('./lib/ui')
var createMob = require('./lib/mob')
var initWorldGen = require('./lib/worldgen')
var projectile = require('./lib/projectile')
var makeParticles = require('./lib/particles')
var createHover = require('./lib/hover')

var opts = {
  // inputs
  pointerLock: true,
  inverseY: true,
  // world data
  chunkSize: 32,
  chunkAddDistance: 2,
  chunkRemoveDistance: 3,
  // rendering
  texturePath: 'textures/',
  maxCameraZoom: 15,
  // player
  playerStart: [0.5,15,0.5],
  playerHeight: 1.4,
  playerWidth: 0.9  ,
  playerAutoStep: true,
}


// create engine
var game = noa( opts )
var addParticles = makeParticles(game)
var launchProjectile = projectile(game, addParticles)

// set up world generation
initWorldGen(game)


// add an ECS component to mark meshes as sprite-like
game.entities.components.sprite = require('./components/sprite')(game) 
game.entities.createComponent(game.entities.components.sprite)


/*
 *    simple mesh for player, using texture atlas
*/

var atlas = new Atlas('textures/atlas.png', 'textures/atlas.json', 
                      game.rendering.getScene(), BABYLON,
                      true, BABYLON.Texture.NEAREST_SAMPLINGMODE)
var pmesh = atlas.makeSpriteMesh( stand_frame )

var ph = opts.playerHeight,
    pw = opts.playerWidth

// visual width of sprite slightly wider than hitbox
var vw = pw * 1.25

var stand_frame = 'player_stand.png'
var jump_frame = 'player_jump.png'

pmesh.scaling = new BABYLON.Vector3(vw, ph, 1)

// set the player mesh, and set it to be a sprite
game.entities.addComponent(game.playerEntity, game.entities.components.mesh, {
  mesh: pmesh,
  offset: [pw/2, ph/2, pw/2]
})
game.entities.addComponent(game.playerEntity, game.entities.components.sprite)

// set player animation frame..
var facing = 1
game.on('tick',function() {
  var body = game.entities.getPhysicsBody(game.playerEntity)
  var onground = body.resting[1] < 0
  var fr = (onground) ? stand_frame : jump_frame
  atlas.setMeshFrame(pmesh, fr)
  
  if (game.inputs.state.left) facing = -1
  if (game.inputs.state.right) facing = 1
  pmesh.scaling.x = vw * facing
})


/*
 *    spawn some simple "mob" entities
*/

var numMobs = 20
var range = 20
for (var i=0; i<numMobs; ++i) {
  var size = 1+Math.random()*2
  var x = range - 2*range*Math.random()
  var y = 8 + 8*Math.random()
  var z = range - 2*range*Math.random()
  createMob( game, atlas, size, size, x, y, z )
}





/*
 *      Set inputs to get/set blocks on L/M/R mouse click
*/

// on left mouse, set targeted block to be air
game.inputs.down.on('fire', function() {
  // skip click if just gaining pointer lock
  var cont = game.container
  if (!cont.hasPointerLock() && cont.supportsPointerLock()) return

  var loc = game.getTargetBlock()
  if (loc) {
    game.setBlock(0, loc)
    // smoke for removed block
    var parts = addParticles('blocksmoke')
    parts.mesh.position.copyFromFloats( loc[0]+0.5, loc[1]+0.5, loc[2]+0.5 )
  }
})

// on middle mouse, remember type of targeted block
var placeBlockID = 1
game.inputs.down.on('mid-fire', function() {
  var loc = game.getTargetBlock()
  if (loc) placeBlockID = game.getBlock(loc);
})

// on right mouse, place remembered block adjacent to target
game.inputs.down.on('alt-fire', function() {
  var loc = game.getTargetBlockAdjacent()
  if (loc) game.addBlock(placeBlockID, loc); // addBlock works only if spot is clear
})

// bind "i" key to invert mouse
game.inputs.bind('invertY', 'I')
game.inputs.down.on('invertY', function() {
  game.cameraControls.inverseY = !game.cameraControls.inverseY
})


// toggle pointerlock on "L"
game.inputs.bind('toggleLock', 'L')
game.inputs.down.on('toggleLock', function() {
  var locked = game.container.hasPointerLock()
  game.container.setPointerLock(!locked)
})


// toggle pause on "P"
var paused = false
game.inputs.bind('togglePause', 'P')
game.inputs.down.on('togglePause', function() {
  paused = !paused
  game.setPaused(paused)
})


/*
 *  Minimal 'UI' (help menu) and a button to toggle it
*/

createUI(game)



/*
 *  A couple of sample 'spells' that create entities and do stuff
*/


game.inputs.bind('blockbomb', '1')
game.inputs.down.on('blockbomb', function() {
  launchProjectile(1, 0.1, 0.5, 0, 0, placeBlockID)
})

game.inputs.bind('timebomb', '2')
game.inputs.down.on('timebomb', function() {
  launchProjectile(2, 0.5, 1.5, 10, 0.25)
})

// hover-pack code in module
createHover(game, addParticles)


/*
 *    Goofing around with 3D Conway/Life
*/

var conway = require('./lib/conway')(game)
game.inputs.bind('conway', '3')
game.inputs.down.on('conway', function() {
  conway.fire()
})
game.inputs.bind('conway-ss', '4')
game.inputs.down.on('conway-ss', function() {
  conway.startStop()
})




/*
 *    ;  - Run a profile for 200 ticks
 *    '  - Run a profile for 200 renders
*/

game.inputs.bind('profileTick', ';')
game.inputs.bind('profileRender', "'")
game.inputs.down.on('profileTick', function() {
  if (!profiling) startProfile(true)
})
game.inputs.down.on('profileRender', function() {
  if (!profiling) startProfile(false)
})
game.on('tick', function(){
  if (!profileTick) return
  if (++pct >= 200) { endProfile() }
})
game.on('afterRender', function(){
  if (!profileRender) return
  if (++pct >= 200) { endProfile() }
})

var profiling = false
var profileTick = false, profileRender = false
var pnum = 0
var pct = 0
var t
function startProfile(isTick) {
  profiling = true
  if (isTick) { profileTick = true } else { profileRender = true }
  pnum++
  pct = 0
  var s = (profileTick) ? '200 ticks - ' : '200 renders - '
  console.profile(s+pnum)
  t = performance.now()
}
function endProfile() {
  var s = (profileTick) ? '200 ticks - ' : '200 renders - '
  console.profileEnd(s+pnum)
  profiling = false
  profileTick = false
  profileRender = false
  console.log('end', pct, 'time: ', (performance.now()-t).toFixed(2))
}




},{"./components/sprite":3,"./lib/conway":5,"./lib/hover":6,"./lib/mob":7,"./lib/particles":8,"./lib/projectile":9,"./lib/ui":10,"./lib/worldgen":11,"babylon-atlas":13,"gl-vec3":33,"noa-engine":75}],5:[function(require,module,exports){
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




},{"ndarray-hash":56}],6:[function(require,module,exports){
'use strict';


module.exports = function(game, particleAdder) {
  return new Hover(game, particleAdder)
}



/*
 *    Keybind and implementation for hover-pack thingy to get around better
*/


function Hover(game, particleAdder) {
  var hovering = false
  var parts = particleAdder('jetpack')
  parts.parent = game.getPlayerMesh()

  game.inputs.bind('hover', 'R')
  game.inputs.down.on('hover', function() {
    hovering = true;
    parts.rate = 100;
    parts.start();
  })
  game.inputs.up.on('hover', function() {
    hovering = false;
    parts.rate = 0;
  })

  var body = game.entities.getPhysicsBody(game.playerEntity)
  game.on('tick', function(dt) {
    if (hovering) hover(game, body);
  })
}




function hover(game, body) {
  var f = (body.velocity[1] < 0) ? 40 : 24
  body.applyForce([0, f, 0])
}





},{}],7:[function(require,module,exports){
'use strict';
/* globals BABYLON */

var vec3 = require('gl-vec3')

module.exports = createMob


var atlas = null
var initted = false
var stand_frame = 'mob_stand.png'
var jump_frame = 'mob_jump.png'


function init(game, _atlas) {
  atlas = _atlas
  game.entities.components.mobAI = require('../components/mobAI')(game)
  game.entities.createComponent( game.entities.components.mobAI )
  initted = true
}


function createMob( game, atlas, w, h, x, y, z ) {
  if (!initted) {
    init(game, atlas)
  }

  var mesh = atlas.makeSpriteMesh( stand_frame )
  mesh.scaling = new BABYLON.Vector3(w, h, 1)
  
  var offset = [w/2, h/2, w/2]
  
  var onCollideEnt = function(ownID, otherID) {
    collideEntity(game, ownID, otherID)
  }
  
  // add an entity for the "mob"
  var id = game.entities.add(
    [x,y,z],              // starting loc
    w, h, mesh, offset,   // size, mesh, mesh offset
    true, true            // do physics, draw shadow
    // true, null,           // collide terrain, onCollide handler
    // true, onCollideEnt,   // collide entities, onCollide handler
    // true                  // shadow
  )
  
  // make entity collide with world/other entities
  game.entities.addComponent(id, game.entities.components.collideTerrain)
  game.entities.addComponent(id, game.entities.components.collideEntities, {
    callback: onCollideEnt
  })

  
  var body = game.entities.getPhysicsBody(id)
  body.friction = 5
  body.gravityMultiplier = 1.5
  
  game.entities.addComponent(id, game.entities.components.mobAI, {
    stand_frame: stand_frame,
    jump_frame: jump_frame,
  })
  game.entities.addComponent(id, game.entities.components.sprite, {
    atlas: atlas
  })
}




var lastHit = 0
function collideEntity(game, ownID, otherID) {
  if (game.entities.isPlayer(otherID)) {
    var d = performance.now()
    if (d-lastHit < 400) return
    lastHit = d
    // repulse along relative vector, angled up a bit
    var v = game.entities.getPosition(ownID)
    vec3.subtract(v, game.entities.getPosition(otherID), v )
    vec3.normalize(v, v)
    v[1] = 1
    vec3.scale(v, v, 15)
    var body = game.entities.getPhysicsBody(otherID)
    body.applyImpulse(v)
  }
}



},{"../components/mobAI":1,"gl-vec3":33}],8:[function(require,module,exports){
'use strict';
/* globals BABYLON */

var MPS = require('mesh-particle-system')


module.exports = function(game) {
  return makeParticleGenerator(game)
}

// remember that Babylon uses a Vector3 class that's unlike gl-vec3
var vec3 = BABYLON.Vector3
var col3 = BABYLON.Color3


/*
 *    Generate a function to manage mesh-particle-system library
*/


function makeParticleGenerator(game) {
  var scene = game.rendering.getScene()

  game.entities.components.particles = require('../components/particles')(game)
  game.entities.createComponent(game.entities.components.particles)
  
  var puffTex = new BABYLON.Texture('textures/puff.png', scene, true, false, 1)
  var gradTex = new BABYLON.Texture('textures/particle_standard.png', scene, true, false)

  var opts = {}

  opts.blocksmoke = {
    cap: 50
    , g: 0
    , emit: 50
    , rate: 0
    , tex: puffTex
    , alphas: [1, 0]
    , colors: [ col3.White(), col3.White() ]
    , sizes: [1, 0.5]
    , init: function(p) {
      p.position.x = Math.random() * 0.8 - 0.4
      p.position.y = Math.random() * 0.8 - 0.4
      p.position.z = Math.random() * 0.8 - 0.4
      p.velocity.x = p.position.x / 2
      p.velocity.y = p.position.y / 2
      p.velocity.z = p.position.z / 2
      p.size =       0.5
      p.age = Math.random()/2
      p.lifetime =   0.6
    }
  }


  opts.bombsmoke = {
    cap: 250
    , g: 0
    , emit: 250
    , rate: 0
    , tex: puffTex
    , alphas: [1, 0]
    , colors: [ col3.White(), col3.White() ]
    , sizes: [1, 0.5]
    , init: function(p, radius) {
      // per gl-vec3#random
      var scale = 2.5
      var r = Math.random() * 2.0 * Math.PI
      var z = (Math.random() * 2.0) - 1.0
      var zScale = Math.sqrt(1.0-z*z) * scale
      p.position.x = Math.cos(r) * zScale
      p.position.y = Math.sin(r) * zScale
      p.position.z = z * scale
      p.velocity.x = Math.random() - 0.5
      p.velocity.y = Math.random() - 0.5
      p.velocity.z = Math.random() - 0.5
      p.size =       0.5
      p.age =        Math.random() * 0.4
      p.lifetime =   0.8
    }
  }


  opts.jetpack = {
    cap: 100
    , g: -3
    , emit: 0
    , rate: 100
    , tex: gradTex
    , alphas: [0.6, 0]
    , colors: [ new col3( 1, .1, .1), new col3(.9, .9, .1) ]
    , sizes: [0.9, 1]
    , init: function(p) {
      p.position.x = 0
      p.position.y = Math.random() * -0.4 - 0.4
      p.position.z = 0
      p.velocity.x = Math.random() * 2 - 1
      p.velocity.y = Math.random() * -1 - 1
      p.velocity.z = Math.random() * 2 - 1
      p.size =       Math.random() * 0.75 + 0.5
      p.age = 0
      p.lifetime = 0.6
    }
  }

  opts.sparks = {
    cap: 200
    , g: -5
    , emit: 0
    , rate: 100
    , tex: gradTex
    , alphas: [0.6, 0]
    , colors: [ new col3( 1, .1, .1), new col3(.9, .9, .1) ]
    , sizes: [.1, .01]
    , init: function(p) {
      p.position.x = 0
      p.position.y = 0.4
      p.position.z = 0
      p.velocity.x = Math.random() * 4 - 2
      p.velocity.y = Math.random() * 4 + 1
      p.velocity.z = Math.random() * 4 - 2
      p.size =       Math.random() + 1
      p.age = 0
      p.lifetime = 1.5
    }
  }


  opts.smoketrail = {
    cap: 100
    , g: 5
    , emit: 0
    , rate: 200
    , tex: gradTex
    , alphas: [0.9, 0]
    , colors: [ col3.White(), col3.White() ]
    , sizes: [0.9, 1]
    , init: function(p) {
      //      p.velocity.x = Math.random() * 2 - 1
      //      p.velocity.y = Math.random() * 2 - 1
      //      p.velocity.z = Math.random() * 2 - 1
      p.size =       Math.random() * 0.5 + 0.1
      p.age = 0
      p.lifetime = 0.5
    }
  }




  return function (type) {

    var o = opts[type]
    if (!o) return
    var mps = new MPS(o.cap, o.rate, o.tex, scene)
    mps.gravity = o.g
    mps.setAlphaRange( o.alphas[0], o.alphas[1] )
    mps.setColorRange( o.colors[0], o.colors[1] )
    mps.setSizeRange( o.sizes[0], o.sizes[1] )
    mps.initParticle = o.init
    mps.stopOnEmpty = true

    if (o.emit) {
      mps.emit(o.emit)
      mps.disposeOnEmpty = true
    }

    game.rendering.addDynamicMesh(mps.mesh)

    return mps
  }
}



},{"../components/particles":2,"mesh-particle-system":55}],9:[function(require,module,exports){
'use strict';
/* globals BABYLON */

var vec3 = require('gl-vec3')

module.exports = function(game, partAdder) {
  return makeProjectileLauncher(game, partAdder)
}


/*
 *    example "spells" that create entities on keypress
*/


function makeProjectileLauncher(game, particleAdder) {
  var scene = game.rendering.getScene()
  var mesh = BABYLON.Mesh.CreateSphere('p1', 3, 1, scene)
  mesh.material = makeColorMat(scene, .1, .1, .1)
  game.registry.registerMesh('projectile', mesh)


  return function(spelltype, size, gravMult, friction, restitution, option) {
    var s = size || 1    
    var mesh = game.rendering.makeMeshInstance('projectile')
    mesh.scaling.x = mesh.scaling.y = mesh.scaling.z = s
    var pos = game.getPlayerEyePosition()
    
    // usage: entities.add( pos, w, h, mesh, meshOffset, doPhysics, shadow
    var eid = game.entities.add( pos, s, s, mesh, [s/2,s/2,s/2], true, true )
    // adjust physics properties thusly
    var body = game.entities.getPhysicsBody(eid)
    body.gravityMultiplier = gravMult
    body.friction = friction
    body.restitution = restitution
    
    // make it collide with terrain
    game.entities.addComponent(eid, game.entities.components.collideTerrain)

    // timer for bomb
    if (spelltype===2) {
      game.entities.addComponent(eid, game.entities.components.countdown, {
        time: 3000,
        callback: function() {
          var pos = game.entities.getPosition(eid)
          addBlocksInSphere(game, 0, pos, 2.75)
          game.entities.getData(eid, game.entities.components.particles).parts.rate = 0
          // add smoke
          var parts = particleAdder('bombsmoke')
          parts.mesh.position.copyFromFloats( pos[0], pos[1]+0.5, pos[2] )
          
          game.entities.remove(eid)
        }
      })
    }
    
    // terrain collider for missile
    if (spelltype===1) {
      var dat = game.entities.getData(eid, game.entities.components.collideTerrain)
      dat.callback = function(impulse) {
        onCollideTerrain(game, eid, option)
      }
    }

    
    // flashy particle trail dependent on type
    var partType = (spelltype===1) ? 'smoketrail' : 'sparks'
    var parts = particleAdder(partType)
    parts.disposeOnEmpty = true
    parts.parent = mesh
    parts.start()
    
    game.entities.addComponent(eid, game.entities.components.particles, { parts: parts })

    launchAlongCameraVector(game, eid, 10)
  }


}

/*
 *    Projectile tick/collide fcns
*/ 

function onCollideTerrain(game, eid, option) {
  // turn off collide terrain so as not to inhibit blocks being made
  game.entities.removeComponent(eid, game.entities.components.collideTerrain)
  addBlocksInSphere(game, option, game.entities.getPosition(eid), 2.3)
  game.entities.getData(eid, game.entities.components.particles).parts.rate = 0
  game.entities.remove(eid)
}




/*
 *    Helper functions
*/ 

function makeColorMat(scene, r, g, b) {
  var m = new BABYLON.StandardMaterial('m',scene)
  m.diffuseColor = new BABYLON.Color3(r,g,b)
  return m
}

function launchAlongCameraVector(game, entID, impulse) {
  var vec = game.getCameraVector()
  vec3.normalize(vec, vec)
  vec3.scale(vec, vec, impulse)
  var body = game.entities.getPhysicsBody(entID)
  body.applyImpulse(vec)
}

function addBlocksInSphere(game, id, pos, radius) {
  var rad = Math.ceil(radius)
  for (var i=-rad; i<=rad; ++i) {
    for (var j=-rad; j<=rad; ++j) {
      for (var k=-rad; k<=rad; ++k) {
        if (i*i + j*j + k*k <= radius*radius) {
          game.addBlock( id, 
            i + Math.floor(pos[0]), 
            j + Math.floor(pos[1]), 
            k + Math.floor(pos[2])
          )
        }
      }
    }
  }
}

},{"gl-vec3":33}],10:[function(require,module,exports){
'use strict';


module.exports = function(game) {
  return new UI(game)
}



/*
 *    minimal UI management (help menu)
*/


function UI(game) {
  var toggled = false
  var showing = true
  
  game.inputs.bind('help', 'H')
  game.inputs.down.on('help', function() {
    toggled = true
    showing = !showing
    setVis(showing)
  })
  
  game.container.on('gainedPointerLock', function() {
    if (toggled) return
    showing = false
    setVis(showing)
  })
  game.container.on('lostPointerLock', function() {
    if (toggled) return
    showing = true
    setVis(showing)
  })
}


function setVis(show) {
  var el = document.getElementById('help')
  el.hidden = !show
}



},{}],11:[function(require,module,exports){
'use strict';
/* globals BABYLON */


var SimplexNoise = require('simplex-noise')
var simplex = new SimplexNoise()
var hash = require('ndhash')
var workify = require('webworkify')
var ndarray = require('ndarray')

module.exports = setupFunction


function setupFunction(game) {
  registerBlocks(game)
  initWorldGen(game)
}




/*
 *   Block registration - register blocktypes used in world
*/



var dirtID, grassID, stoneID, block1ID, cloudID, leafID, flowerID, woodID, waterID

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
  reg.registerMaterial( 'water',      [0.20, 0.85, 0.95, 0.5], null )
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
  var waterprop = { fluidDensity: 1.0, viscosity: 0.5 }
  waterID = reg.registerBlock( 'water', 'water', waterprop, false, false, true )
  for (i=1; i<30; i++) {
    reg.registerBlock( 'block'+i, 'color'+i )
  }
  block1ID = reg.getBlockID('block1')


  // object blocks - i.e. non-terrain
  flowerID = reg.registerObjectBlock( 'flower', 'flowerMesh', null, false, false )

  // register a custom mesh to be used for occurrences of the block
  game.registry.registerMaterial('flowersprite', null, 'flower.png')
  var mesh = makeSpriteMesh(game, 'flowersprite')
  var offset = BABYLON.Matrix.Translation(0, 0.5, 0)
  mesh.bakeTransformIntoVertices(offset)
  reg.registerMesh('flowerMesh', mesh, null)
}


// helper function to make a billboard plane mesh showing a given sprite texture
function makeSpriteMesh (game, matname) {
  var id = game.registry.getMaterialId(matname)
  var url = game.registry.getMaterialTexture(id)
  var scene = game.rendering.getScene()
  var tex = new BABYLON.Texture(url, scene, true, true,
                                BABYLON.Texture.NEAREST_SAMPLINGMODE)
  tex.hasAlpha = true
  var mesh = BABYLON.Mesh.CreatePlane('sprite-'+matname, 1, scene)
  var mat = new BABYLON.StandardMaterial('sprite-mat-'+matname, scene)
  mat.specularColor = new BABYLON.Color3(0,0,0)
  mat.emissiveColor = new BABYLON.Color3(1,1,1)
  mat.backFaceCulling = false
  mat.diffuseTexture = tex
  mesh.material = mat
  mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y

  return mesh
}






/*
 *   Worldgen - simple terrain/cloud generator
*/


function initWorldGen(game) {
  // set up worldgen web worker
  var worker = workify(require('./worldgen_worker'))

  // send block id values to worker
  worker.postMessage({
    msg: 'init', 
    ids: getBlockIDObject()
  })

  // game listener for when worldgen is requested (array is an ndarray)
  game.world.on('worldDataNeeded', function(id, array, x, y, z) {
    worker.postMessage({
      msg: 'generate', 
      data: array.data,
      shape: array.shape,
      id: id, 
      x:x, y:y, z:z,
    })
  })

  // worker listener for when chunk generation is finished
  worker.addEventListener('message', function (ev) {
    if (ev.data.msg == 'generated') {
      // wrap result (copied from worker) in a new ndarray before returning
      var id = ev.data.id
      var array = new ndarray( ev.data.data, ev.data.shape )
      // send result to game for processing
      game.world.setChunkData( id, array )
    }
  })

}


function getBlockIDObject() {
  return {
    dirtID:   dirtID,
    grassID:  grassID,
    stoneID:  stoneID,
    block1ID: block1ID,
    cloudID:  cloudID,
    leafID:   leafID,
    flowerID: flowerID,
    woodID:   woodID,
    waterID:  waterID
  }
}




},{"./worldgen_worker":12,"ndarray":59,"ndhash":61,"simplex-noise":189,"webworkify":190}],12:[function(require,module,exports){
'use strict';

var SimplexNoise = require('simplex-noise')
var simplex = new SimplexNoise()
var hash = require('ndhash')
var ndarray = require('ndarray')



// module that runs in a worker, and generates world data for each chunk


module.exports = function (self) {


  /*
   *    message handling
  */

  self.addEventListener('message',function (ev){
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
  })


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





},{"ndarray":59,"ndhash":61,"simplex-noise":189}],13:[function(require,module,exports){
/* global BABYLON */

module.exports = Atlas

var loader = require('load-json-xhr')




// Atlas constructor - keeps the json data and a base texture

function Atlas(imgURL, jsonURL, scene, BAB, noMip, sampling) {
  if (!(this instanceof Atlas)) {
    return new Atlas(imgURL, jsonURL, scene, BAB, noMip, sampling)
  }

  this._ready = false
  this._scene = scene
  this._BABYLON = BAB
  this._data = null
  this._texcache = {}

  this.frames = []

  var dataReady = false
  var texReady = false
  var self = this

  // json loader and event
  loader(jsonURL, function(err, data) {
    if (err) throw err
    self._data = data
    dataReady = true
    if (texReady) initSelf(self);
  })

  // texture loader and event
  this._baseTexture = new BAB.Texture(imgURL, scene, noMip, true, sampling, function() {
    texReady = true
    if (dataReady) initSelf(self);
  })

  // atlas will almost always need alpha
  this._baseTexture.hasAlpha = true
}

// called once json + image are both loaded
/* Expects json like:
      {"frames":{
        "frame_001": {"frame": {"x":0, "y":32,"w":22,"h":18} },
        "frame_002": {"frame": {"x":53,"y":0, "w":22,"h":21} }
      }}
*/
function initSelf(self) {
  for (var s in self._data.frames) {
    self.frames.push(s)
  }
  self._ready = true
}


// Get a texture with the right uv settings for a given frame

Atlas.prototype.getTexture = function(frame) {
  if (this._texcache[frame]) return this._texcache[frame]
  
  var tex = this._baseTexture.clone()
  setTextureSettings(this, frame, tex)
  this._texcache[frame] = tex
  return tex
}


// set an existing texture's offsets etc.
Atlas.prototype.setTextureToFrame = function(tex, frame) {
  setTextureSettings(this, frame, tex)
}



Atlas.prototype.makeSpriteMesh = function(frame, material) {
  var BAB = this._BABYLON
  if (!frame)    frame = 0
  
  // make a material unless one was passed in
  if (!material) {
    material = new BAB.StandardMaterial('spriteMat', this._scene)
    material.specularColor = new BAB.Color3(0,0,0)
    material.emissiveColor = new BAB.Color3(1,1,1)
    material.backFaceCulling = false
  }

  // plane mesh and setup
  var mesh = this._BABYLON.Mesh.CreatePlane('atlas sprite', 1, this._scene)
  mesh.material = material
  material.diffuseTexture = this._baseTexture.clone()
  // decoration property used by this module
  mesh._currentAtlasFrame = null

  setFrame(this, mesh, frame)
  return mesh
}


// public accessor
Atlas.prototype.setMeshFrame = function(mesh, frame) {
  setFrame(this, mesh, frame)
}




// Set a mesh's texture to show a given frame of the altas.
// Also decorates mesh object with property to track current atlas frame

function setFrame(self, mesh, frame) {
  if (frame === mesh._currentAtlasFrame) return

  setTextureSettings(self, frame, mesh.material.diffuseTexture)

  mesh._currentAtlasFrame = frame
}


// function where the main magic is
// defers own call if json/texture data is still loading

function setTextureSettings(self, frame, tex) {
  if (!self._ready) {
    setTimeout(function() { setTextureSettings(self, frame, tex) }, 10)
    return
  }
  
  var framestr = (typeof frame === 'number') ? self.frames[frame] : frame
  var dat = self._data.frames[framestr]
  if (!dat) {
    throw new Error('babylon-atlas: frame "'+framestr+'" not found in atlas')
  }
  
  var size = self._baseTexture.getSize()
  var w = dat.frame.w
  var h = dat.frame.h
  var x = dat.frame.x
  var y = dat.frame.y
  var sw = size.width
  var sh = size.height

  // in Babylon 2.2 and below:
  // tex.uScale = w/sw
  // tex.vScale = h/sh
  // tex.uOffset = ( sw /2 - x)/w - 0.5
  // tex.vOffset = (-sh/2 + y)/h + 0.5
  
  // Babylon 2.3 and above:
  tex.uScale =   w / sw
  tex.vScale =   h / sh
  tex.uOffset =  x / sw
  tex.vOffset =  (sh-y-h)/sh
}



// dispose method - disposes babylon objects

Atlas.prototype.dispose = function() {
  this._baseTexture.dispose()
  this._data = null
  this._scene = null
  this._BABYLON = null
  this.frames.length = 0  
  this._texcache.length = 0
}



},{"load-json-xhr":14}],14:[function(require,module,exports){
var xhr = require("xhr");

module.exports = function getJSON(opt, cb) {
  cb = typeof cb === 'function' ? cb : noop;

  if (typeof opt === 'string')
    opt = { uri: opt };
  else if (!opt)
    opt = { };

  // if (!opt.headers)
  //   opt.headers = { "Content-Type": "application/json" };

  var jsonResponse = /^json$/i.test(opt.responseType);
  return xhr(opt, function(err, res, body) {
    if (err)
      return cb(err);
    if (!/^2/.test(res.statusCode))
      return cb(new Error('http status code: ' + res.statusCode));

    if (jsonResponse) { 
      cb(null, body);
    } else {
      var data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        cb(new Error('cannot parse json: ' + e));
      }
      if(data) cb(null, data);
    }
  })
}

function noop() {}
},{"xhr":15}],15:[function(require,module,exports){
"use strict";
var window = require("global/window")
var once = require("once")
var parseHeaders = require("parse-headers")


var XHR = window.XMLHttpRequest || noop
var XDR = "withCredentials" in (new XHR()) ? XHR : window.XDomainRequest

module.exports = createXHR

function createXHR(options, callback) {
    function readystatechange() {
        if (xhr.readyState === 4) {
            loadFunc()
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else if (xhr.responseType === "text" || !xhr.responseType) {
            body = xhr.responseText || xhr.responseXML
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }
    
    var failureResponse = {
                body: undefined,
                headers: {},
                statusCode: 0,
                method: method,
                url: uri,
                rawRequest: xhr
            }
    
    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "unknown") )
        }
        evt.statusCode = 0
        callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        clearTimeout(timeoutTimer)
        
        var status = (xhr.status === 1223 ? 204 : xhr.status)
        var response = failureResponse
        var err = null
        
        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        callback(err, response, response.body)
        
    }
    
    if (typeof options === "string") {
        options = { uri: options }
    }

    options = options || {}
    if(typeof callback === "undefined"){
        throw new Error("callback argument missing")
    }
    callback = once(callback)

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new XDR()
        }else{
            xhr = new XHR()
        }
    }

    var key
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer

    if ("json" in options) {
        isJson = true
        headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["Content-Type"] = "application/json"
            body = JSON.stringify(options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync)
    //has to be after open
    xhr.withCredentials = !!options.withCredentials
    
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            xhr.abort("timeout");
        }, options.timeout+2 );
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }
    
    if ("beforeSend" in options && 
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    xhr.send(body)

    return xhr


}


function noop() {}

},{"global/window":16,"once":17,"parse-headers":21}],16:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],17:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],18:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":19}],19:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],20:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],21:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":18,"trim":20}],22:[function(require,module,exports){
module.exports = add;

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    out[2] = a[2] + b[2]
    return out
}
},{}],23:[function(require,module,exports){
module.exports = angle

var fromValues = require('./fromValues')
var normalize = require('./normalize')
var dot = require('./dot')

/**
 * Get the angle between two 3D vectors
 * @param {vec3} a The first operand
 * @param {vec3} b The second operand
 * @returns {Number} The angle in radians
 */
function angle(a, b) {
    var tempA = fromValues(a[0], a[1], a[2])
    var tempB = fromValues(b[0], b[1], b[2])
 
    normalize(tempA, tempA)
    normalize(tempB, tempB)
 
    var cosine = dot(tempA, tempB)

    if(cosine > 1.0){
        return 0
    } else {
        return Math.acos(cosine)
    }     
}

},{"./dot":30,"./fromValues":32,"./normalize":41}],24:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
function clone(a) {
    var out = new Float32Array(3)
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],25:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
function copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    out[2] = a[2]
    return out
}
},{}],26:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
function create() {
    var out = new Float32Array(3)
    out[0] = 0
    out[1] = 0
    out[2] = 0
    return out
}
},{}],27:[function(require,module,exports){
module.exports = cross;

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2]

    out[0] = ay * bz - az * by
    out[1] = az * bx - ax * bz
    out[2] = ax * by - ay * bx
    return out
}
},{}],28:[function(require,module,exports){
module.exports = distance;

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
function distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],29:[function(require,module,exports){
module.exports = divide;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function divide(out, a, b) {
    out[0] = a[0] / b[0]
    out[1] = a[1] / b[1]
    out[2] = a[2] / b[2]
    return out
}
},{}],30:[function(require,module,exports){
module.exports = dot;

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
},{}],31:[function(require,module,exports){
module.exports = forEach;

var vec = require('./create')()

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
function forEach(a, stride, offset, count, fn, arg) {
        var i, l
        if(!stride) {
            stride = 3
        }

        if(!offset) {
            offset = 0
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length)
        } else {
            l = a.length
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i] 
            vec[1] = a[i+1] 
            vec[2] = a[i+2]
            fn(vec, vec, arg)
            a[i] = vec[0] 
            a[i+1] = vec[1] 
            a[i+2] = vec[2]
        }
        
        return a
}
},{"./create":26}],32:[function(require,module,exports){
module.exports = fromValues;

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
function fromValues(x, y, z) {
    var out = new Float32Array(3)
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],33:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , angle: require('./angle')
  , fromValues: require('./fromValues')
  , copy: require('./copy')
  , set: require('./set')
  , add: require('./add')
  , subtract: require('./subtract')
  , multiply: require('./multiply')
  , divide: require('./divide')
  , min: require('./min')
  , max: require('./max')
  , scale: require('./scale')
  , scaleAndAdd: require('./scaleAndAdd')
  , distance: require('./distance')
  , squaredDistance: require('./squaredDistance')
  , length: require('./length')
  , squaredLength: require('./squaredLength')
  , negate: require('./negate')
  , inverse: require('./inverse')
  , normalize: require('./normalize')
  , dot: require('./dot')
  , cross: require('./cross')
  , lerp: require('./lerp')
  , random: require('./random')
  , transformMat4: require('./transformMat4')
  , transformMat3: require('./transformMat3')
  , transformQuat: require('./transformQuat')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , forEach: require('./forEach')
}
},{"./add":22,"./angle":23,"./clone":24,"./copy":25,"./create":26,"./cross":27,"./distance":28,"./divide":29,"./dot":30,"./forEach":31,"./fromValues":32,"./inverse":34,"./length":35,"./lerp":36,"./max":37,"./min":38,"./multiply":39,"./negate":40,"./normalize":41,"./random":42,"./rotateX":43,"./rotateY":44,"./rotateZ":45,"./scale":46,"./scaleAndAdd":47,"./set":48,"./squaredDistance":49,"./squaredLength":50,"./subtract":51,"./transformMat3":52,"./transformMat4":53,"./transformQuat":54}],34:[function(require,module,exports){
module.exports = inverse;

/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to invert
 * @returns {vec3} out
 */
function inverse(out, a) {
  out[0] = 1.0 / a[0]
  out[1] = 1.0 / a[1]
  out[2] = 1.0 / a[2]
  return out
}
},{}],35:[function(require,module,exports){
module.exports = length;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
function length(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return Math.sqrt(x*x + y*y + z*z)
}
},{}],36:[function(require,module,exports){
module.exports = lerp;

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
function lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    out[2] = az + t * (b[2] - az)
    return out
}
},{}],37:[function(require,module,exports){
module.exports = max;

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function max(out, a, b) {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    out[2] = Math.max(a[2], b[2])
    return out
}
},{}],38:[function(require,module,exports){
module.exports = min;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function min(out, a, b) {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    out[2] = Math.min(a[2], b[2])
    return out
}
},{}],39:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function multiply(out, a, b) {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    out[2] = a[2] * b[2]
    return out
}
},{}],40:[function(require,module,exports){
module.exports = negate;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
function negate(out, a) {
    out[0] = -a[0]
    out[1] = -a[1]
    out[2] = -a[2]
    return out
}
},{}],41:[function(require,module,exports){
module.exports = normalize;

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
function normalize(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    var len = x*x + y*y + z*z
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
        out[2] = a[2] * len
    }
    return out
}
},{}],42:[function(require,module,exports){
module.exports = random;

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
function random(out, scale) {
    scale = scale || 1.0

    var r = Math.random() * 2.0 * Math.PI
    var z = (Math.random() * 2.0) - 1.0
    var zScale = Math.sqrt(1.0-z*z) * scale

    out[0] = Math.cos(r) * zScale
    out[1] = Math.sin(r) * zScale
    out[2] = z * scale
    return out
}
},{}],43:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateX(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]

    //perform rotation
    r[0] = p[0]
    r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c)
    r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c)

    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]

    return out
}
},{}],44:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateY(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]
  
    //perform rotation
    r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c)
    r[1] = p[1]
    r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c)
  
    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]
  
    return out
}
},{}],45:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec3} out
 */
function rotateZ(out, a, b, c){
    var p = [], r=[]
    //Translate point to the origin
    p[0] = a[0] - b[0]
    p[1] = a[1] - b[1]
    p[2] = a[2] - b[2]
  
    //perform rotation
    r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c)
    r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c)
    r[2] = p[2]
  
    //translate to correct position
    out[0] = r[0] + b[0]
    out[1] = r[1] + b[1]
    out[2] = r[2] + b[2]
  
    return out
}
},{}],46:[function(require,module,exports){
module.exports = scale;

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
function scale(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    out[2] = a[2] * b
    return out
}
},{}],47:[function(require,module,exports){
module.exports = scaleAndAdd;

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
function scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale)
    out[1] = a[1] + (b[1] * scale)
    out[2] = a[2] + (b[2] * scale)
    return out
}
},{}],48:[function(require,module,exports){
module.exports = set;

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
function set(out, x, y, z) {
    out[0] = x
    out[1] = y
    out[2] = z
    return out
}
},{}],49:[function(require,module,exports){
module.exports = squaredDistance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
function squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2]
    return x*x + y*y + z*z
}
},{}],50:[function(require,module,exports){
module.exports = squaredLength;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
function squaredLength(a) {
    var x = a[0],
        y = a[1],
        z = a[2]
    return x*x + y*y + z*z
}
},{}],51:[function(require,module,exports){
module.exports = subtract;

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
function subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    out[2] = a[2] - b[2]
    return out
}
},{}],52:[function(require,module,exports){
module.exports = transformMat3;

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
function transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2]
    out[0] = x * m[0] + y * m[3] + z * m[6]
    out[1] = x * m[1] + y * m[4] + z * m[7]
    out[2] = x * m[2] + y * m[5] + z * m[8]
    return out
}
},{}],53:[function(require,module,exports){
module.exports = transformMat4;

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15]
    w = w || 1.0
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    return out
}
},{}],54:[function(require,module,exports){
module.exports = transformQuat;

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
function transformQuat(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
    return out
}
},{}],55:[function(require,module,exports){
/* global BABYLON */

module.exports = MeshParticleSystem;


var vec3 = BABYLON.Vector3;
var col3 = BABYLON.Color3;




/*
 *    particle data structure
*/

function ParticleData () {
  this.position = vec3.Zero()
  this.velocity = vec3.Zero()
  this.size = 1.0
  this.age = 0.0
  this.lifetime = 1.0 // seconds
}


/*
 *    Over-writeable user functions
*/

function initParticle(pdata) {
  pdata.position.copyFromFloats(0,0,0)
  pdata.velocity.x = 5 * (Math.random() - 0.5);
  pdata.velocity.y = 5 * (Math.random() * 0.5) + 2;
  pdata.velocity.z = 5 * (Math.random() - 0.5);
  pdata.size = 1*Math.random();
  pdata.age = 0;
  pdata.lifetime = 2;
}




/*
 *    system ctor
*/

function MeshParticleSystem(capacity, rate, texture, scene) {

  // public
  this.capacity = capacity;
  this.rate = rate;
  this.mesh = new BABYLON.Mesh('SPS-mesh', scene);
  this.material = new BABYLON.StandardMaterial("SPS-mat", scene);
  this.texture = texture;
  this.gravity = -1;
  this.disposeOnEmpty = false;
  this.stopOnEmpty = false;
  this.parent = null;

  // internal
  this._scene = scene;
  this._alive = 0;
  this._data = new Float32Array(capacity*9) // pos*3, vel*3, size, age, lifetime
  this._dummyParticle = new ParticleData()
  this._color0 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0)
  this._color1 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0)
  this._updateColors = true;
  this._size0 = 1.0;
  this._size1 = 1.0;
  this._positions = [];
  this._colors = [];
  this._playing = false;
  this._disposed = false;
  this._lastPos = vec3.Zero();
  this._startingThisFrame = false;
  this._toEmit = 0;

  // init mesh and vertex data
  var positions = this._positions;
  var colors = this._colors;
  var indices = [];
  var uvs = [];
  // quads : 2 triangles per particle
  for (var p = 0; p < capacity; p ++) {
    positions.push(0,0,0,  0,0,0,  0,0,0,  0,0,0);
    indices.push(p*4, p*4+1, p*4+2);
    indices.push(p*4, p*4+2, p*4+3);
    uvs.push(0,1, 1,1, 1,0, 0,0);
    colors.push( 1,0,1,1,  1,0,1,1,  1,0,1,1,  1,0,1,1 );
  }
  var vertexData = new BABYLON.VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.uvs = uvs;
  vertexData.colors = colors;

  vertexData.applyToMesh(this.mesh, true);

  // init material
  this.mesh.material = this.material
  this.material.specularColor = col3.Black();
//  this.material.checkReadyOnlyOnce = true;  // testing....

  // configurable functions
  this.initParticle = initParticle;

  // initialize mat/color/alpha settings
  updateColorSettings(this)

  // curried animate function
  var self = this;
  var lastTime = performance.now();
  this.curriedAnimate = function curriedAnimate() {
    var t = performance.now();    // ms
    var s = (t-lastTime) / 1000;  // sec
    self.animate(s);
    lastTime = t;
  }
  
  // debugging..
  // this.mesh.showBoundingBox = true;
}

var MPS = MeshParticleSystem;

/*
 *    
 *    API
 *    
*/


MPS.prototype.start = function startMPS() {
  if (this._playing) return;
  if (this._disposed) throw new Error('Already disposed');
  this._scene.registerBeforeRender( this.curriedAnimate );
  recalculateBounds(this);
  this._playing = true;
  this._startingThisFrame = true;
};

MPS.prototype.stop = function stopMPS() {
  if (!this._playing) return;
  this._scene.unregisterBeforeRender( this.curriedAnimate );
  this._playing = false;
};

MPS.prototype.setAlphaRange = function setAlphas(from, to) {
  this._color0.a = from;
  this._color1.a = to;
  updateColorSettings(this);
};

MPS.prototype.setColorRange = function setColors(from, to) {
  this._color0.r = from.r;
  this._color0.g = from.g;
  this._color0.b = from.b;
  this._color1.r = to.r;
  this._color1.g = to.g;
  this._color1.b = to.b;
  updateColorSettings(this);
};

MPS.prototype.setSizeRange = function setSizes(from, to) {
  this._size0 = from;
  this._size1 = to;
};

MPS.prototype.emit = function mpsEmit(count) {
  this.start();
  this._toEmit += count;
};

MPS.prototype.dispose = function mpsDispose() {
  disposeMPS(this);
};



/*
 *    
 *    Internals
 *    
*/


// set mesh/mat properties based on color/alpha parameters
function updateColorSettings(sys) {
  var c0 = sys._color0;
  var c1 = sys._color1;
  var doAlpha = !( equal(c0.a, 1) && equal(c0.a, c1.a) );
  var doColor = !( equal(c0.r, c1.r) && equal(c0.g, c1.g) && equal(c0.b, c1.b) );

  sys.mesh.hasVertexAlpha = doAlpha;
  if (doColor || doAlpha) {
    sys.material.ambientTexture = sys.texture;
    sys.material.opacityTexture = sys.texture;
    sys.material.diffuseTexture = null;
    sys.texture.hasAlpha = false;
    sys.material.useAlphaFromDiffuseTexture = true;
    sys.material.diffuseColor = col3.White();
  } else {
    sys.material.diffuseTexture = sys.texture;
    sys.material.ambientTexture = null;
    sys.material.opacityTexture = null;
    sys.texture.hasAlpha = true;
    sys.material.useAlphaFromDiffuseTexture = false;
    sys.material.diffuseColor = c0;
  }

  sys._updateColors = doAlpha || doColor;
}
function equal(a,b) {
  return (Math.abs(a-b) < 1e-5)
}


function recalculateBounds(system) {
  // toooootal hack.
  var reps = 30;
  var p = system._dummyParticle;
  var s = 0,
      min = new vec3( Infinity, Infinity, Infinity ),
      max = new vec3(-Infinity,-Infinity,-Infinity );
  var halfg = system.gravity / 2;
  for (var i=0; i<reps; ++i) {
    system.initParticle(p);
    updateMinMax(min, max, p.position.x, p.position.y, p.position.z)
    // x1 = x0 + v*t + 1/2*a*t^2
    var t = p.lifetime;
    var x = p.position.x + t*p.velocity.x;
    var y = p.position.y + t*p.velocity.y + t*t*halfg;
    var z = p.position.z + t*p.velocity.z;
    updateMinMax(min, max, x, y, z)
    s = Math.max( s, p.size );
  }
  min.subtractFromFloatsToRef( s,  s,  s, min);
  max.subtractFromFloatsToRef(-s, -s, -s, max);  // no addFromFloats, for some reason
  system.mesh._boundingInfo = new BABYLON.BoundingInfo(min, max);
}
function updateMinMax(min, max, x, y, z) {
  if (x<min.x) min.x = x; else if (x>max.x) max.x = x;
  if (y<min.y) min.y = y; else if (y>max.y) max.y = y;
  if (z<min.z) min.z = z; else if (z>max.z) max.z = z;
}



function addNewParticle(sys) {
  // pass dummy data structure to user-definable init fcn
  var part = sys._dummyParticle
  sys.initParticle(part)
  // copy particle data into internal Float32Array
  var data = sys._data
  var ix = sys._alive * 9
  data[ix]   = part.position.x
  data[ix+1] = part.position.y
  data[ix+2] = part.position.z
  data[ix+3] = part.velocity.x
  data[ix+4] = part.velocity.y
  data[ix+5] = part.velocity.z
  data[ix+6] = part.size
  data[ix+7] = part.age
  data[ix+8] = part.lifetime
  sys._alive += 1
}

function removeParticle(sys, n) {
  // copy particle data from last live location to removed location
  var data = sys._data
  var from = (sys._alive-1) * 9
  var to = n * 9
  for (var i=0; i<9; ++i) {
    data[to+i] = data[from+i]
  }
  sys._alive -= 1;
}



/*
 *    animate all the particles!
*/

MPS.prototype.animate = function animateSPS(dt) {
  if (dt > 0.1) dt = 0.1;

  // adjust particles if mesh has moved
  adjustParticlesForMovement(this)
  
  // add/update/remove particles
  spawnParticles(this, this.rate * dt)
  updateAndRecycle(this, dt)

  // write new position/color data
  updatePositionsData(this)
  if (this._updateColors) updateColorsArray(this)

  // only draw active mesh positions
  this.mesh.subMeshes[0].indexCount = this._alive*6

  // possibly stop/dispose if no rate and no living particles
  if (this._alive===0 && this.rate===0) {
    if (this.disposeOnEmpty) this.dispose();
    else if (this.stopOnEmpty) this.stop();
  }
};


function spawnParticles(system, count) {
  system._toEmit += count;
  var toAdd = Math.floor(system._toEmit);
  system._toEmit -= toAdd;
  var ct = system._alive + toAdd;
  if (ct > system.capacity) ct = system.capacity;
  while (system._alive < ct) {
    addNewParticle(system);
  }
}

function updateAndRecycle(system, dt) {
  // update particles and remove any that pass recycle check
  var grav = system.gravity * dt
  var data = system._data
  for (var i=0; i<system._alive; ++i) {
    var ix = i * 9
    data[ix+4] += grav                  // vel.y += g * dt
    data[ix]   += data[ix+3] * dt
    data[ix+1] += data[ix+4] * dt       // pos += vel * dt
    data[ix+2] += data[ix+5] * dt
    var t = data[ix+7] + dt             // t = age + dt
    if (t > data[ix+8]) {               // if (t>lifetime)..
      removeParticle(system, i)
      i--;
    } else {
      data[ix+7] = t;                   // age = dt
    }
  }
}


// if mesh system has moved since last frame, adjust particles to compensate

function adjustParticlesForMovement(system) {
  // relocate to parent if needed
  if (system.parent) {
    var p = system.parent.absolutePosition;
    if (system._startingThisFrame) {
      // bug workaround: on first frame parent may be newly created
      p = system.parent.getAbsolutePosition();
      system._startingThisFrame = false;
    }
    system.mesh.position.copyFrom(p)
  }
  var dx = system.mesh.position.x - system._lastPos.x;
  var dy = system.mesh.position.y - system._lastPos.y;
  var dz = system.mesh.position.z - system._lastPos.z;
  system._lastPos.copyFrom( system.mesh.position );
  if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < .001) return;
    
  var alive = system._alive;
  var data = system._data;
  for (var i=0; i<alive; i++) {
    var di = i*9;
    data[di]   -= dx;
    data[di+1] -= dy;
    data[di+2] -= dz;
  }
}


function updatePositionsData(system) {
  var positions = system._positions;
  var data = system._data;
  var cam = system._scene.activeCamera;

  // prepare transform
  var mat = BABYLON.Matrix.Identity();
  BABYLON.Matrix.LookAtLHToRef(cam.globalPosition,      // eye
                               system.mesh.position,    // target
                               vec3.Up(), mat);
  mat.m[12] = mat.m[13] = mat.m[14] = 0;
  mat.invert();
  var m = mat.m

  var alive = system._alive;
  var s0 = system._size0;
  var ds = system._size1 - s0;

  for (var i=0; i<alive; i++) {
    var di = i*9;
    var scale = data[di+7] / data[di+8];
    var size = data[di+6] * (s0 + ds*scale) / 2;

    var idx = i*12;
    for (var pt=0; pt<4; pt++) {

      var vx = (pt===1 || pt===2) ? size : -size;
      var vy = (pt>1) ? size : -size;
      
      // following is unrolled version of Vector3.TransformCoordinatesToRef
      // minus the bits zeroed out due to having no z coord
      
      var w = (vx * m[3]) + (vy * m[7]) + m[15];
      positions[idx]   = data[di]   + (vx * m[0] + vy * m[4])/w;
      positions[idx+1] = data[di+1] + (vx * m[1] + vy * m[5])/w;
      positions[idx+2] = data[di+2] + (vx * m[2] + vy * m[6])/w;

      idx += 3;
    }
  }

  system.mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions, false, false);
}



function updateColorsArray(system) {
  var alive = system._alive;
  var data = system._data;
  var colors = system._colors;

  var r0 = system._color0.r;
  var g0 = system._color0.g;
  var b0 = system._color0.b;
  var a0 = system._color0.a;
  var dr = system._color1.r - r0;
  var dg = system._color1.g - g0;
  var db = system._color1.b - b0;
  var da = system._color1.a - a0;

  for (var i=0; i<alive; i++) {
    var di = i*9;

    var scale = data[di+7] / data[di+8];
    // scale alpha from startAlpha to endAlpha by (age/lifespan)
    var r = r0 + dr * scale;
    var g = g0 + dg * scale;
    var b = b0 + db * scale;
    var a = a0 + da * scale;

    var idx = i*16;
    for (var pt=0; pt<4; pt++) {
      colors[idx]   = r;
      colors[idx+1] = g;
      colors[idx+2] = b;
      colors[idx+3] = a;
      idx += 4;
    }
  }

  system.mesh.updateVerticesData(BABYLON.VertexBuffer.ColorKind, colors, false, false);
}



// dispose function

function disposeMPS(system) {
  system.stop();
  system.material.ambientTexture = null;
  system.material.opacityTexture = null;
  system.material.diffuseTexture = null;
  system.material.dispose();
  system.material = null;
  system.mesh.geometry.dispose();
  system.mesh.dispose();
  system.mesh = null;
  system.texture = null;
  system.curriedAnimate = null;
  system.initParticle = null;
  system._scene = null;
  system._dummyParticle = null;
  system._color0 = null;
  system._color1 = null;
  system._data = null;
  system._positions.length = 0;
  system._colors.length = 0;
  system._positions = null;
  system._colors = null;
  system.parent = null;
  system._disposed = true;
}




},{}],56:[function(require,module,exports){
"use strict"

var ndarray = require("ndarray")

function HashMap(n) {
  this.length = n
  this.store = {}
}
HashMap.prototype.get = function(i) {
  return this.store[i] || 0
}
HashMap.prototype.set = function(i,v) {
  return this.store[i] = v
}

function createNDHash(shape) {
  var sz = 1
  for(var i=0; i<shape.length; ++i) {
    sz *= shape[i]
  }
  return ndarray(new HashMap(sz), shape)
}

module.exports = createNDHash
},{"ndarray":57}],57:[function(require,module,exports){
(function (Buffer){
var iota = require("iota-array")

var hasTypedArrays  = ((typeof Float64Array) !== "undefined")
var hasBuffer       = ((typeof Buffer) !== "undefined")

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride
  var terms = new Array(stride.length)
  var i
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i]
  }
  terms.sort(compare1st)
  var result = new Array(terms.length)
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1]
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("")
  if(dimension < 0) {
    className = "View_Nil" + dtype
  }
  var useGetters = (dtype === "generic")
  
  if(dimension === -1) {
    //Special case for trivial arrays
    var code = 
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}"
    var procedure = new Function(code)
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
    var procedure = new Function("TrivialArray", code)
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"]
    
  //Create constructor for view
  var indices = iota(dimension)
  var args = indices.map(function(i) { return "i"+i })
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+")
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",")
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",")
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension)
  
  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})")

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]")
  } else {
    code.push("Object.defineProperty(proto,'order',{get:")
    if(dimension < 4) {
      code.push("function "+className+"_order(){")
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})")
      }
    } else {
      code.push("ORDER})")
    }
  }
  
  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){")
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}")
  } else {
    code.push("return this.data["+index_str+"]=v}")
  }
  
  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}")
  } else {
    code.push("return this.data["+index_str+"]}")
  }
  
  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}")
  
  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}")
  
  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}")
  
  //view.transpose():
  var tShape = new Array(dimension)
  var tStride = new Array(dimension)
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]"
    tStride[i] = "b[i"+i+"]"
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")
  
  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")
    
  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}")

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(hasBuffer) {
    if(Buffer.isBuffer(data)) {
      return "buffer"
    }
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "buffer":[],
  "generic":[]
}

;(function() {
  for(var id in CACHED_CONSTRUCTORS) {
    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
  }
});

function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0]
    return ctor([])
  } else if(typeof data === "number") {
    data = [data]
  }
  if(shape === undefined) {
    shape = [ data.length ]
  }
  var d = shape.length
  if(stride === undefined) {
    stride = new Array(d)
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
  }
  if(offset === undefined) {
    offset = 0
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i]
      }
    }
  }
  var dtype = arrayDType(data)
  var ctor_list = CACHED_CONSTRUCTORS[dtype]
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
  }
  var ctor = ctor_list[d+1]
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor
}).call(this,require("buffer").Buffer)
},{"buffer":191,"iota-array":58}],58:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],59:[function(require,module,exports){
module.exports=require(57)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/ndarray-hash/node_modules/ndarray/ndarray.js":57,"buffer":191,"iota-array":60}],60:[function(require,module,exports){
module.exports=require(58)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/ndarray-hash/node_modules/ndarray/node_modules/iota-array/iota.js":58}],61:[function(require,module,exports){

/*
 *  ndhash
 * 
 *  simple n-D hash function with random-looking output
 * 
*/


var A = Math.sqrt(5)
var B = Math.sqrt(7)
var h, accum, i, k

var floor = Math.floor
function frac(n) {
  return n-floor(n)
}

function hash() {
  h = A
  accum = B

  for (i=0; i<arguments.length; ++i) {
    k = arguments[i]
    h = frac( h * (k+B) )
    accum *= (k+A)
  }

  h = frac( h * accum )
  return h
}

module.exports = hash


},{}],62:[function(require,module,exports){
'use strict';

var aabb = require('aabb-3d')

module.exports = function (noa) {
	return {

		name: 'bounding-box',

		state: {
			aabb: null
		},

		onAdd: function (eid, state) {
			if (!state.aabb) state.aabb = new aabb([0,0,0], [0,0,0])
		},

		onRemove: null,

		processor: null


	}
}


},{"aabb-3d":85}],63:[function(require,module,exports){
'use strict';


module.exports = function () {
	return {
		
		name: 'autostepping',

		state: {
			time: 100.1
		},

		onAdd: null,

		onRemove: null,

		processor: null


	}
}


},{}],64:[function(require,module,exports){
'use strict';

var boxIntersect = require('box-intersect')

var intervals = [],
	ids = [],
	idToi = []

module.exports = function (noa) {
	return {

		name: 'collide-entities',

		state: {
			callback: null
		},

		onAdd: function (eid, state) {
			// add collide handler for physics engine to call
			var ents = noa.entities
			if (ents.hasComponent(eid, ents.components.physics)) {
				var body = ents.getPhysicsBody(eid)
				body.onCollide = function (impulse) {
					var cb = ents.getData(eid, 'collide-terrain').callback
					if (cb) cb(impulse, eid)
				}
			}
		},

		onRemove: function (eid, state) {
			var ents = noa.entities
			if (ents.hasComponent(eid, ents.components.physics)) {
				ents.getPhysicsBody(eid).onCollide = null
			}
		},


		processor: function entityCollider(dt, states) {
			// populate data struct that boxIntersect looks for
			populateIntervals(intervals, ids, idToi, states, noa.entities)
			// find collisions and call callbacks
			var collideEnt = noa.entities.components.collideEntities
			boxIntersect(intervals, function (i, j) {
				var iid = ids[i]
				var jid = ids[j]
				// var ihandler = states[idToi[iid]].callback
				var ihandler = noa.entities.getData(iid, collideEnt).callback
				if (ihandler) ihandler(iid, jid)
				// var jhandler = states[idToi[jid]].callback
				var jhandler = noa.entities.getData(jid, collideEnt).callback
				if (jhandler) jhandler(jid, iid)
				// if (iid==0 || jid==0) throw new Error()
			})
		}



	}
}


// implementation:

function populateIntervals(intervals, ids, idToi, states, entitites) {
	// grow/shrink [lo, lo, hi, hi] array entries
	// optimized to common case where states.length is the same as last time
	while (intervals.length < states.length) {
		intervals.push(new Float32Array(6))
	}
	intervals.length = states.length
	ids.length = states.length
	idToi.length = states.length
	// populate [lo, lo, lo, hi, hi, hi] arrays
	for (var i = 0; i < states.length; i++) {
		var id = states[i].__id
		var box = entitites.getAABB(id)
		var lo = box.base
		var hi = box.max
		var arr = intervals[i]
		for (var j = 0; j < 3; j++) {
			arr[j] = lo[j]
			arr[j + 3] = hi[j]
		}
		ids[i] = id
		idToi[id] = i
	}
}




},{"box-intersect":87}],65:[function(require,module,exports){
'use strict';


module.exports = function (noa) {
	return {

		name: 'collide-terrain',

		state: {
			callback: null
		},

		onAdd: function(eid, state) {
			// add collide handler for physics engine to call
			var ents = noa.entities
			if (ents.hasComponent(eid, ents.components.physics)) {
				var body = ents.getPhysicsBody(eid)
				body.onCollide = function bodyOnCollide(impulse) {
					var cb = ents.getData(eid, 'collide-terrain').callback
					if (cb) cb(impulse, eid)
				}
			}
		},

		onRemove: function(eid, state) {
			var ents = noa.entities
			if (ents.hasComponent(eid, ents.components.physics)) {
				ents.getPhysicsBody(eid).onCollide = null
			}
		},
		

		processor: null


	}
}


},{}],66:[function(require,module,exports){
'use strict';


module.exports = function (noa) {
	return {
		
		name: 'countdown',

		state: {
			callback:	null,
			time:		500.1  // ms
		},

		onAdd: null,

		onRemove: function (entID, state) {
			state.callback()
		},

		processor: function countdownProcessor(dt, states) {
			for (var i=0; i<states.length; i++) {
				var state = states[i]
				state.time -= dt
				if (state.time < 0) {
					noa.entities.removeComponent(state.__id, 'countdown')
				}
			}
		}


	}
}


},{}],67:[function(require,module,exports){
'use strict';

/**
 * Component for the player entity, when active hides the player's mesh 
 * when camera zoom is less than a certain amount
 */

module.exports = function (noa) {
	return {

		name: 'fade-on-zoom',

		state: {
			cutoff: 2.999,
			_showing: true
		},

		onAdd: null,

		onRemove: null,

		processor: function fadeOnZoomProc(dt, states) {
			var zoom = noa.rendering._currentZoom
			var ents = noa.entities
			for (var i = 0; i < states.length; i++) {
				var state = states[i]
				checkZoom(state, state.__id, zoom, ents)
			}
		}
	}
}


function checkZoom(state, id, zoom, ents) {
	if (!ents.hasComponent(id, ents.components.mesh)) return

	if (state._showing && zoom < state.cutoff || !state._showing && zoom > state.cutoff) {
		var mesh = ents.getMeshData(id).mesh
		mesh.visibility = state._showing = (zoom > state.cutoff)
	}
}



},{}],68:[function(require,module,exports){
'use strict';

/**
 * Simple flag to indicate that an entity follows the player position
 * (used for camera position tracking)
 */

module.exports = function (noa) {
	
	return {

		name: 'follows-player',

		state: { },

		onAdd: null,

		onRemove: null,

		processor: null


	}
}


},{}],69:[function(require,module,exports){
'use strict';

var vec3 = require('gl-vec3')

module.exports = function (noa) {
	return {
		
		name: 'has-mesh',

		state: {
			mesh: null, 
			offset: null 
		},


		onAdd: function (eid, state) {
			if (state.mesh) {
				noa.rendering.addDynamicMesh(state.mesh)
			} else {
				throw new Error('Mesh component added without a mesh - probably a bug!')
			}
			if (!state.offset) {
				state.offset = new vec3.create()
			}
		},


		onRemove: function(eid, state) {
			state.mesh.dispose()
		},


		processor: null


	}
}



},{"gl-vec3":124}],70:[function(require,module,exports){
'use strict';

var vec3 = require('gl-vec3')

/**
 * 
 * Movement component. State stores settings like jump height, etc.,
 * as well as current state (running, jumping, heading angle).
 * Processor checks state and applies movement/friction/jump forces
 * to the entity's physics body. 
 * 
 */

module.exports = function (noa) {
	return {

		name: 'movement',

		state: {
			// current state
			heading: 0, 			// radians
			running: false,
			jumping: false,
			
			// options:
			maxSpeed: 10,
			moveForce: 30,
			responsiveness: 15,
			runningFriction: 0,
			standingFriction: 50,

			airMoveMult: 0.5,
			jumpImpulse: 10,
			jumpForce: 12,
			jumpTime: 500, 			// ms
			airJumps: 1,
			
			// internal state
			_jumpCount: 0,
			_isJumping: 0,
			_currjumptime: 0,
		},

		onAdd: null,

		onRemove: null,


		processor: function movementProcessor(dt, states) {
			var ents = noa.entities

			for (var i = 0; i < states.length; i++) {
				var state = states[i]
				var body = ents.getPhysicsBody(state.__id)
				applyMovementPhysics(dt, state, body)
			}

		}


	}
}


var tempvec = vec3.create()
var tempvec2 = vec3.create()
var zeroVec = vec3.create()


function applyMovementPhysics (dt, state, body) {
	// move implementation originally written as external module
	//   see https://github.com/andyhall/voxel-fps-controller
	//   for original code

	// jumping
	var onGround = (body.atRestY() < 0)
	var canjump = (onGround || state._jumpCount < state.airJumps)
	if (onGround) {
		state._isJumping = false
		state._jumpCount = 0
	}
	
	// process jump input
	if (state.jumping) {
		if (state._isJumping) { // continue previous jump
			if (state._currjumptime > 0) {
				var jf = state.jumpForce
				if (state._currjumptime < dt) jf *= state._currjumptime / dt
				body.applyForce([0, jf, 0])
				state._currjumptime -= dt
			}
		} else if (canjump) { // start new jump
			state._isJumping = true
			if (!onGround) state._jumpCount++
			state._currjumptime = state.jumpTime
			body.applyImpulse([0, state.jumpImpulse, 0])
			// clear downward velocity on airjump
			if (!onGround && body.velocity[1] < 0) body.velocity[1] = 0
		}
	} else {
		state._isJumping = false
	}
	
	// apply movement forces if entity is moving, otherwise just friction
	var m = tempvec
	var push = tempvec2
	if (state.running) {
		
		var speed = state.maxSpeed
		// todo: add crouch/sprint modifiers if needed
		// if (state.sprint) speed *= state.sprintMoveMult
		// if (state.crouch) speed *= state.crouchMoveMult
		vec3.set(m, 0, 0, speed)
		
		// rotate move vector to entity's heading
		vec3.rotateY(m, m, zeroVec, state.heading)

		// push vector to achieve desired speed & dir
		// following code to adjust 2D velocity to desired amount is patterned on Quake: 
		// https://github.com/id-Software/Quake-III-Arena/blob/master/code/game/bg_pmove.c#L275
		vec3.subtract(push, m, body.velocity)
		push[1] = 0
		var pushLen = vec3.length(push)
		vec3.normalize(push, push)

		if (pushLen > 0) {
			// pushing force vector
			var canPush = state.moveForce
			if (!onGround) canPush *= state.airMoveMult

			// apply final force
			var pushAmt = state.responsiveness * pushLen
			if (canPush > pushAmt) canPush = pushAmt

			vec3.scale(push, push, canPush)
			body.applyForce(push)
		}
		
		// different friction when not moving
		// idea from Sonic: http://info.sonicretro.org/SPG:Running
		body.friction = state.runningFriction
	} else {
		body.friction = state.standingFriction
	}
	
	
	
}




},{"gl-vec3":124}],71:[function(require,module,exports){
'use strict';


module.exports = function (noa) {
	return {
		
		name: 'physics-body',


		state: {
			body: null
		},


		onAdd: function (entID, state) {
			state.body = noa.physics.addBody()
		},


		onRemove: function (entID, state) {
			noa.physics.removeBody( state.body )
		},


		processor: null


	}
}


},{}],72:[function(require,module,exports){
'use strict';


module.exports = function () {
	return {
		
		name: 'is-player',

		state: {},

		onAdd: null,

		onRemove: null,

		processor: null


	}
}


},{}],73:[function(require,module,exports){
'use strict';

/**
 * 
 * Input processing component - gets (key) input state and  
 * applies it to receiving entities by updating their movement 
 * component state (heading, movespeed, jumping, etc.)
 * 
 */

module.exports = function (noa) {
	return {

		name: 'receives-inputs',

		state: {},

		onAdd: null,

		onRemove: null,

		processor: function inputProcessor(dt, states) {
			var ents = noa.entities
			var moveComp = ents.components.movement
			var inputState = noa.inputs.state
			var camHeading = noa.rendering.getCameraRotation()[1]

			for (var i = 0; i < states.length; i++) {
				var moveState = ents.getData(states[i].__id, moveComp)
				setMovementState(moveState, inputState, camHeading)
			}
		}

	}
}



function setMovementState(state, inputs, camHeading) {
	state.jumping = !!inputs.jump

	var fb = inputs.forward ? (inputs.backward ? 0 : 1) : (inputs.backward ? -1 : 0)
	var rl = inputs.right ? (inputs.left ? 0 : 1) : (inputs.left ? -1 : 0)

	if ((fb | rl) === 0) {
		state.running = false
	} else {
		state.running = true
		if (fb) {
			if (fb == -1) camHeading += Math.PI
			if (rl) {
				camHeading += Math.PI / 4 * fb * rl // didn't plan this but it works!
			}
		} else {
			camHeading += rl * Math.PI / 2
		}
		state.heading = camHeading
	}
	
}




},{}],74:[function(require,module,exports){
'use strict';


module.exports = function (noa) {
	return {
		
		name: 'has-shadow',

		state: {
			mesh:	null,
			size:	0.5
		},


		onAdd: function (eid, state) {
			state.mesh = noa.rendering.makeMeshInstance('shadow', false)
		},


		onRemove: function(eid, state) {
			state.mesh.dispose()
		},


		processor: function shadowProcessor(dt, states) {
			for (var i=0; i<states.length; i++) {
				var state = states[i]
				var shadowDist = noa.entities.shadowDist
				updateShadowHeight(state.__id, state.mesh, state.size, shadowDist, noa)
			}
		}


	}
}

var down = new Float32Array([0, -1, 0])

function updateShadowHeight(id, mesh, size, shadowDist, noa) {
	var loc = noa.entities.getPosition(id)
	var pick = noa.pick(loc, down, shadowDist)
	if (pick) {
		var y = pick.position[1]
		mesh.position.y = y + 0.05
		var dist = loc[1] - y
		var scale = size * 0.7 * (1-dist/shadowDist)
		mesh.scaling.copyFromFloats(scale, scale, scale)
		mesh.setEnabled(true)
	} else {
		mesh.setEnabled(false)
	}
}



},{}],75:[function(require,module,exports){

var aabb = require('aabb-3d')
var vec3 = require('gl-vec3')
var extend = require('extend')
var ndarray = require('ndarray')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var createContainer = require('./lib/container')
var createRendering = require('./lib/rendering')
var createWorld = require('./lib/world')
var createInputs = require('./lib/inputs')
var createPhysics = require('./lib/physics')
var createCamControls = require('./lib/camera')
var createRegistry = require('./lib/registry')
var createEntities = require('./lib/entities')
var raycast = require('voxel-raycast')


module.exports = Engine




var defaults = {
  playerHeight: 1.8,
  playerWidth: 0.6,
  playerStart: [0,10,0],
  playerAutoStep: false,
  tickRate: 30,
  blockTestDistance: 10
}

/**
 * Main engine object.  
 * Emits: *tick, beforeRender, afterRender*
 * 
 * ```js
 * var noaEngine = require('noa-engine')
 * var noa = noaEngine(opts)
 * ```
 * 
 * @class noa
*/

function Engine(opts) {
  if (!(this instanceof Engine)) return new Engine(opts)
  opts = extend(defaults, opts)
  this._tickRate = opts.tickRate
  this._paused = false

  // container (html/div) manager
  this.container = createContainer(this, opts)

  // inputs manager - abstracts key/mouse input
  this.inputs = createInputs(this, opts, this.container._element)

  // create block/item property registry
  this.registry = createRegistry( this, opts )

  // create world manager
  this.world = createWorld( this, opts )

  // rendering manager - abstracts all draws to 3D context
  this.rendering = createRendering(this, opts, this.container.canvas)

  // physics engine - solves collisions, properties, etc.
  this.physics = createPhysics( this, opts )

  // camera controller
  this.cameraControls = createCamControls( this, opts )
  
  // Entity manager / Entity Component System (ECS)
  this.entities = createEntities( this, opts )
  
  // convenience
  this.ents = this.entities
  this.ents.comps = this.entities.components
  var ents = this.ents

  // keep reference to the player's mesh for convenience
  // use placeholder to start with (to be overwritten by client)
  // this.playerMesh = this.rendering.makePlaceholderMesh()
  
  /** Entity id for the player entity */
  this.playerEntity = ents.add(
    opts.playerStart,    // starting location- TODO: get from options
    opts.playerWidth, opts.playerHeight,
    null, null,          // no mesh for now, no meshOffset, 
    true, true
  )
  
  // tag the entity as the player, make it collide with terrain and other entities
  ents.addComponent(this.playerEntity, ents.components.player)
	ents.addComponent(this.playerEntity, ents.components.collideTerrain)
	ents.addComponent(this.playerEntity, ents.components.collideEntities)

  // adjust default physics parameters
  var body = ents.getPhysicsBody(this.playerEntity)
  body.gravityMultiplier = 2 // less floaty
  body.autoStep = opts.playerAutoStep // auto step onto blocks
  
  /** reference to player entity's physics body */
  this.playerBody = body
  
  // input component - sets entity's movement state from key inputs
  ents.addComponent(this.playerEntity, ents.components.receivesInputs)
  
  // add a component to make player mesh fade out when zooming in
  ents.addComponent(this.playerEntity, ents.components.fadeOnZoom)
  
  // movement component - applies movement forces
  // todo: populate movement settings from options
  var moveOpts = {
    airJumps: 1
  }
  ents.addComponent(this.playerEntity, ents.components.movement, moveOpts)
  
  
  /** entity to track camera target position */
  this.cameraTarget = ents.createEntity([
    ents.components.followsPlayer, 
    ents.components.aabb
  ])



  // Set up block picking functions
  this.blockTestDistance = opts.blockTestDistance || 10

  // plumbing for picking/raycasting
  var world = this.world
  var blockGetter = { getBlock:function(x,y,z) {
    return world.getBlock(x,y,z)
  }}
  var solidGetter = { getBlock:function(x,y,z) {
    return world.getBlockSolidity(x,y,z)
  }}
  
  // accessors
  this._traceWorldRay = function(pos, vec, dist, hitPos, hitNorm) {
    return raycast(blockGetter, pos, vec, dist, hitPos, hitNorm)
  }
  
  this._traceWorldRayCollision = function(pos, vec, dist, hitPos, hitNorm) {
    return raycast(solidGetter, pos, vec, dist, hitPos, hitNorm)
  }
  



  // temp hacks for development

  window.noa = this
  window.ndarray = ndarray
  window.vec3 = vec3
  var debug = false
  this.inputs.bind( 'debug', 'Z' )
  this.inputs.down.on('debug', function onDebug() {
    debug = !debug
    if (debug) window.scene.debugLayer.show(); else window.scene.debugLayer.hide();
  })



}

inherits( Engine, EventEmitter )


/*
 *   Core Engine API
*/ 




/*
 * Tick function, called by container module at a fixed timestep. Emits #tick(dt),
 * where dt is the tick rate in ms (default 16.6)
*/

Engine.prototype.tick = function() {
  if (this._paused) return
  var dt = this._tickRate         // fixed timesteps!
  this.world.tick(dt)             // chunk creation/removal
  this.cameraControls.tickCamera(dt) // ticks camera zoom based on scroll events
  this.rendering.tick(dt)         // zooms camera, does deferred chunk meshing
// t0()
  this.physics.tick(dt)           // iterates physics
// t1('physics tick')
  this.entities.update(dt)        // tells ECS to run all processors
  this.setBlockTargets()          // finds targeted blocks, and highlights one if needed
  this.emit('tick', dt)
}


// hacky temporary profiling substitute 
// since chrome profiling drops fps so much... :(
var t, tt=0, tc=0, tlc
function t0() {
  t = performance.now()
}
function t1(s) {
  tt += performance.now()-t
  tc += 1
  tlc += 1
  if (tlc<100) return
  tlc = 0
  console.log( s, ': avg ', (tt/tc).toFixed(2), 'ms')
}



/*
 * Render function, called every animation frame. Emits #beforeRender(dt), #afterRender(dt) 
 * where dt is the time in ms *since the last tick*.
*/

Engine.prototype.render = function(framePart) {
  if (this._paused) return
  var dt = framePart*this._tickRate // ms since last tick
  // only move camera during pointerlock or mousedown, or if pointerlock is unsupported
  if (this.container.hasPointerLock() || 
      !this.container.supportsPointerLock() || 
      this.inputs.state.fire) {
    this.cameraControls.updateForRender()
  }
  // clear cumulative mouse inputs
  this.inputs.state.dx = this.inputs.state.dy = 0
  // events and render
  this.emit('beforeRender', dt)
  this.rendering.render(dt)
  this.emit('afterRender', dt)
}




/*
 *   Utility APIs
*/ 

/** 
 * Pausing the engine will also stop render/tick events, etc.
 * @param paused
*/
Engine.prototype.setPaused = function(paused) {
  this._paused = !!paused
  // when unpausing, clear any built-up mouse inputs
  if (!paused) {
    this.inputs.state.dx = this.inputs.state.dy = 0
  }
}

/** @param x,y,z */
Engine.prototype.getBlock = function(x, y, z) {
  var arr = (x.length) ? x : [x,y,z]
  return this.world.getBlockID( arr[0], arr[1], arr[2] );
}

/** @param x,y,z */
Engine.prototype.setBlock = function(id, x, y, z) {
  // skips the entity collision check
  var arr = (x.length) ? x : [x,y,z]
  this.world.setBlockID( id, arr[0], arr[1], arr[2] );
}

/**
 * Adds a block unless obstructed by entities 
 * @param id,x,y,z */
Engine.prototype.addBlock = function(id, x, y, z) {
  // add a new terrain block, if nothing blocks the terrain there
  var arr = (x.length) ? x : [x,y,z]
  if (this.entities.isTerrainBlocked(arr[0], arr[1], arr[2])) return
  this.world.setBlockID( id, arr[0], arr[1], arr[2] );
}

/**
 * Returns location of currently targeted block
 */
Engine.prototype.getTargetBlock = function() {
  return this._blockTargetLoc
}

/**
 * Returns location adjactent to target (e.g. for block placement)
 */
Engine.prototype.getTargetBlockAdjacent = function() {
  return this._blockPlacementLoc
}


/** */
Engine.prototype.getPlayerPosition = function() {
  return this.entities.getPosition(this.playerEntity)
}

/** */
Engine.prototype.getPlayerMesh = function() {
  return this.entities.getMeshData(this.playerEntity).mesh
}

/** */
Engine.prototype.getPlayerEyePosition = function() {
  var box = this.entities.getAABB(this.playerEntity)
  var height = box.vec[1]
  var loc = this.getPlayerPosition()
  loc[1] += height * .9 // eyes below top of head
  return loc
}

/** */
Engine.prototype.getCameraVector = function() {
  // rendering works with babylon's xyz vectors
  var v = this.rendering.getCameraVector()
  vec3.set(_camVec, v.x, v.y, v.z)
  return _camVec
}
var _camVec = vec3.create()

/**
 * @param pos
 * @param vec
 * @param dist
 */
// Determine which block if any is targeted and within range
Engine.prototype.pick = function(pos, vec, dist) {
  if (dist===0) return null
  pos = pos || this.getPlayerEyePosition()
  vec = vec || this.getCameraVector()
  dist = dist || this.blockTestDistance
  var hitNorm = []
  var hitPos = []
  var hitBlock = this._traceWorldRayCollision(pos, vec, dist, hitPos, hitNorm)
  if (hitBlock) return {
    block: hitBlock,
    position: hitPos,
    normal: hitNorm
  }
  return null
}


// Determine which block if any is targeted and within range
// also tell rendering to highlight the struck block face
Engine.prototype.setBlockTargets = function() {
  var result = this.pick()
  // process and cache results
  if (result) {
    var loc = result.position.map(Math.floor)
    var norm = result.normal
    this._blockTargetLoc = loc
    this._blockPlacementLoc = [ loc[0]+norm[0], loc[1]+norm[1], loc[2]+norm[2] ]
    this.rendering.highlightBlockFace(true, loc, norm)
  } else {
    this._blockTargetLoc = this._blockPlacementLoc = null
    this.rendering.highlightBlockFace( false )
  }
}










},{"./lib/camera":76,"./lib/container":78,"./lib/entities":79,"./lib/inputs":80,"./lib/physics":81,"./lib/registry":82,"./lib/rendering":83,"./lib/world":84,"aabb-3d":85,"events":195,"extend":99,"gl-vec3":124,"inherits":146,"ndarray":147,"voxel-raycast":188}],76:[function(require,module,exports){
'use strict';

var extend = require('extend')

module.exports = function (noa, opts) {
	return new CameraController(noa, opts)
}



/*
*    Controller for the camera
*
*/


var defaults = {
	rotationScale: 0.0025,
	inverseY: false,
	
	// zoom stuff
	minCameraZoom: 0,
	maxCameraZoom: 10,
	cameraZoomStep: 1.5,
}


function CameraController(noa, opts) {
	this.noa = noa
	
	// options
	opts = extend({}, defaults, opts)
	this.rotationScale = opts.rotationScale
	this.inverseY = opts.inverseY
	this.zoomMin = opts.minCameraZoom
	this.zoomMax = opts.maxCameraZoom
	this.zoomStep = opts.cameraZoomStep
}




/**
 * On tick, consume scroll inputs and set (target) camera zoom level
 */

CameraController.prototype.tickCamera = function(dt) {
	// process any (cumulative) scroll inputs and then clear
	var scroll = this.noa.inputs.state.scrolly
	if (scroll === 0) return
	this.noa.inputs.state.scrolly = 0

	// handle zoom controls
	var z = this.noa.rendering.zoomDistance
	z += (scroll > 0) ? this.zoomStep : -this.zoomStep
	if (z < this.zoomMin) z = this.zoomMin
	if (z > this.zoomMax) z = this.zoomMax
	this.noa.rendering.zoomDistance = z
}





/**
 * On render, move/rotate the camera based on target and mouse inputs
 */

CameraController.prototype.updateForRender = function () {
	// input state
	var state = this.noa.inputs.state

	// Rotation: translate dx/dy inputs into y/x axis camera angle changes
	var dx = this.rotationScale * state.dy * ((this.inverseY) ? -1 : 1)
	var dy = this.rotationScale * state.dx
	
	// normalize/clamp/update
	var camrot = this.noa.rendering.getCameraRotation() // [x,y]
	var rotX = clamp(camrot[0] + dx, rotXcutoff)
	var rotY = (camrot[1] + dy) % (Math.PI*2)
	this.noa.rendering.setCameraRotation(rotX, rotY)
	
}

var rotXcutoff = (Math.PI/2) - .0001 // engines can be weird when xRot == pi/2

function clamp(value, to) {
	return isFinite(to) ? Math.max(Math.min(value, to), -to) : value
}





},{"extend":99}],77:[function(require,module,exports){
'use strict';

var ndarray = require('ndarray')

window.ndarray = ndarray

module.exports = Chunk


/* 
 *   BabylonJS Voxel Chunk
 *
 *  Stores block ids and related data for each voxel within chunk
 *  
 *  
 *  Stores, from right to left:
 *    12 bits of voxel ID
 *    1 bit solidity (i.e. physics-wise)
 *    1 bit opacity (whether voxel obscures neighboring faces)
 *    1 bit object marker (marks non-terrain blocks with custom meshes)
*/


// internal data representation
var ID_BITS = 12
var ID_MASK = (1<<ID_BITS)-1
var SOLID_BIT  = 1<<ID_BITS
var OPAQUE_BIT = 1<<ID_BITS+1
var OBJECT_BIT = 1<<ID_BITS+2




/*
 *
 *    Chunk constructor
 *
*/

function Chunk( noa, i, j, k, size ) {
  this.noa = noa
  this.isDisposed = false
  this.isGenerated = false
  this.isMeshed = false

  // packed data storage
  var s = size+2 // 1 block of padding on each side
  var arr = new Uint16Array(s*s*s)
  this.array = new ndarray( arr, [s, s, s] )
  this.i = i
  this.j = j
  this.k = k
  this.size = size
  // storage for object meshes
  this._objectMeshes = {}
  // used only once for init
  this._objMeshCoordList = []
  this._objectMeshesInitted = false

  // vars to track if terrain needs re-meshing
  this._terrainDirty = false

  // lookup arrays mapping block ID to block properties
  this._solidLookup = noa.registry._blockSolidity
  this._opaqueLookup = noa.registry._blockOpacity
  this._objectMeshLookup = noa.registry._blockCustomMesh

  // view onto block data without padding
  this._unpaddedView = this.array.lo(1,1,1).hi(size,size,size)

  // storage for block for selection octree
  this.octreeBlock = null;
}




/*
 *
 *    Chunk API
 *
*/

// get/set deal with block IDs, so that this class acts like an ndarray

Chunk.prototype.get = function( x, y, z ) {
  return ID_MASK & this._unpaddedView.get(x,y,z)
}

Chunk.prototype.getSolidityAt = function( x, y, z ) {
  return SOLID_BIT & this._unpaddedView.get(x,y,z)
}

Chunk.prototype.set = function( x, y, z, id ) {
  var oldID = this._unpaddedView.get(x,y,z)
  if (id===(oldID & ID_MASK)) return

  // manage data
  var newID = packID(id, this._solidLookup, this._opaqueLookup, this._objectMeshLookup)
  this._unpaddedView.set( x,y,z, newID )

  // handle object meshes
  if (oldID & OBJECT_BIT) removeObjectMeshAt(this, x,y,z)
  if (newID & OBJECT_BIT) addObjectMeshAt(this, id, x,y,z)

  // mark terrain dirty unless neither block was terrain
  if (isTerrain(oldID) || isTerrain(newID)) this._terrainDirty = true;
}



// helper to determine if a block counts as "terrain" (non-air, non-object)
function isTerrain(id) {
  if (id===0) return false
  if (id & OBJECT_BIT) return false
  return true
}

// helper to pack a block ID into the internally stored form, given lookup tables
function packID(id, sol, op, obj) {
  var newID = id
  if (sol[id])    newID |= SOLID_BIT
  if (op[id])     newID |= OPAQUE_BIT
  if (obj[id]>=0) newID |= OBJECT_BIT
  return newID
}










Chunk.prototype.initData = function() {
  // assuming data has been filled with block IDs, pack it with opacity/etc.
  var arr = this.array.data,
      len = arr.length,
      sol = this._solidLookup,
      op  = this._opaqueLookup,
      obj = this._objectMeshLookup
  var i, j, k
  for (i=0; i<len; ++i) {
    arr[i] = packID(arr[i], sol, op, obj)
  }
  this._terrainDirty = true

  // remake local view on assumption that data has changed
  this._unpaddedView = this.array.lo(1,1,1).hi(this.size,this.size,this.size)

  // do one scan through looking for object blocks (for later meshing)
  var view = this._unpaddedView
  var len0 = view.shape[0]
  var len1 = view.shape[1]
  var len2 = view.shape[2]
  var list = this._objMeshCoordList
  for (i=0; i<len0; ++i) {
    for (j=0; j<len1; ++j) {
      for (k=0; k<len2; ++k) {
        if (view.get(i,j,k) & OBJECT_BIT) {
          list.push(i,j,k)
        }
      }
    }
  }

  this.isGenerated = true
}







// dispose function - just clears properties and references

Chunk.prototype.dispose = function() {
  // dispose any object meshes - TODO: pool?
  for (var key in this._objectMeshes) {
    var m = this._objectMeshes[key]
    m.dispose()
    delete(this._objectMeshes[key])
  }
  // apparently there's no way to dispose typed arrays, so just null everything
  this.array.data = null
  this.array = null
  this._unpaddedView = null
  this._solidLookup = null
  this._opaqueLookup = null
  this._customMeshLookup = null

  if (this.octreeBlock) {
    var octree = this.noa.rendering.getScene()._selectionOctree
    var i = octree.blocks.indexOf(this.octreeBlock)
    if (i>=0) octree.blocks.splice(i,1)
    this.octreeBlock.entries = null
    this.octreeBlock = null
  }

  this.isMeshed = false
  this.isGenerated = false
  this.isDisposed = true
}







// create a Submesh (class below) of meshes needed for this chunk

Chunk.prototype.mesh = function(getMaterial, getColor, doAO, aoValues, revAoVal) {
  if (!this._objectMeshesInitted) this.initObjectMeshes()
  this._terrainDirty = false
  var res = greedyND(this.array, getMaterial, getColor, doAO, aoValues, revAoVal)
  this.isMeshed = true
  return res
}


// helper class to hold submeshes.
function Submesh(id) {
  this.id = id
  this.positions = []
  this.indices = []
  this.normals = []
  this.colors = []
  this.uvs = []
}



// one-time processing of object block custom meshes

Chunk.prototype.initObjectMeshes = function () {
  this._objectMeshesInitted = true
  var list = this._objMeshCoordList
  while(list.length>2) {
    var z = list.pop()
    var y = list.pop()
    var x = list.pop()
    // instantiate custom meshes..
    var id = this.get(x,y,z)
    addObjectMeshAt(this, id, x, y, z)
  }
  // this is never needed again
  this._objMeshCoordList = null
}


// helper to remove object meshes
function removeObjectMeshAt(chunk,x,y,z) {
  var key = [x,y,z].join('|')
  var m = chunk._objectMeshes[key]

  if (m) {
    // object mesh may not exist in this chunk, if we're on a border

    if (chunk.octreeBlock) {
      var i = chunk.octreeBlock.entries.indexOf(m)
      if (i>=0) chunk.octreeBlock.entries.splice(i,1);
    }

    m.dispose()
    delete(chunk._objectMeshes[key])
  }
}


// helper to add object meshes
function addObjectMeshAt(chunk, id, x,y,z) {
  var key = [x,y,z].join('|')
  var m = chunk.noa.rendering._makeMeshInstanceByID(id, true)
  // place object mesh's origin at bottom-center of block
  m.position.x = x + chunk.i*chunk.size + 0.5
  m.position.y = y + chunk.j*chunk.size
  m.position.z = z + chunk.k*chunk.size + 0.5
  // add them to tracking hash
  chunk._objectMeshes[key] = m

  if (chunk.octreeBlock) {
    chunk.octreeBlock.entries.push(m)
  }

  if (!m.billboardMode) m.freezeWorldMatrix();
}










/*
 *    Greedy voxel meshing algorithm with AO
 *        Meshing based on algo by Mikola Lysenko:
 *        http://0fps.net/2012/07/07/meshing-minecraft-part-2/
 *        AO handling by me, stitched together out of cobwebs and dreams
 *    
 *    Arguments:
 *        arr: 3D ndarray of dimensions X,Y,Z
 *             packed with solidity/opacity booleans in higher bits
 *        getMaterial: function( blockID, dir )
 *             returns a material ID based on block id and which cube face it is
 *             (assume for now that each mat ID should get its own mesh)
 *        getColor: function( materialID )
 *             looks up a color (3-array) by material ID
 *             TODO: replace this with a lookup array?
 *        doAO: whether or not to bake ambient occlusion into vertex colors
 *        aoValues: array[3] of color multipliers for AO (least to most occluded)
 *        revAoVal: "reverse ao" - color multiplier for unoccluded exposed edges
 *
 *    Return object: array of mesh objects keyed by material ID
 *        arr[id] = {
 *          id:       material id for mesh
 *          vertices: ints, range 0 .. X/Y/Z
 *          indices:  ints
 *          normals:  ints,   -1 .. 1
 *          colors:   floats,  0 .. 1
 *          uvs:      floats,  0 .. X/Y/Z
 *        }
*/


var maskCache = new Int8Array(4096),
    aomaskCache = new Uint8Array(4096)

var t0=0, t1=0, t3=0, ct=0

function greedyND(arr, getMaterial, getColor, doAO, aoValues, revAoVal) {

  var DEBUG = 0, timeStart, time0, time1, time2
  if (DEBUG) { timeStart = performance.now() }

  // return object, holder for Submeshes
  var submeshes = []

  //Sweep over each axis, mapping axes to [d,u,v]
  for(var d=0; d<3; ++d) {
    var u = (d+1)%3
    var v = (d+2)%3

    // make transposed ndarray so index i is the axis we're sweeping
    var tmp = arr.transpose(d,u,v)
    var arrT = tmp.lo(1,1,1).hi(tmp.shape[0]-2, tmp.shape[1]-2, tmp.shape[2]-2)
    var len0 = arrT.shape[0]-1
    var len1 = arrT.shape[1]
    var len2 = arrT.shape[2]

    // preallocate mask arrays if needed
    if (maskCache.length < len1 * len2) {
      maskCache = new Int8Array(len1*len2)
      aomaskCache = new Uint8Array(len1*len2)
    }
    var mask = maskCache
    var aomask = aomaskCache

    // precalc whether we can skip reverse AO inside first loop
    var skipReverseAO = (doAO && (revAoVal===aoValues[0]))

    // iterate along current major axis..
    for(var i=0; i<=len0; ++i) {

      if (DEBUG) time0 = performance.now()
      
      // inner loop part 1
      constructMeshMasks(i, d, arrT, getMaterial, doAO, skipReverseAO)

      if (DEBUG) time1=performance.now()
      
      // inner loop part 2
      constructMeshDataFromMasks(i, d, u, v, len1, len2,  
                                 doAO, submeshes, getColor, aoValues, revAoVal)

      if (DEBUG) {
        time2 = performance.now();
        t0 += time1-time0; t1+=time2-time1
      }

    }
  }

  if (DEBUG) {
    t3 += time2-timeStart; ct++
    console.log('took: ', (time2-timeStart).toFixed(2),
                'avg masking:', (t0/ct).toFixed(2),
                ' - meshing:', (t1/ct).toFixed(2),
                ' - overall', (t3/ct).toFixed(2) )
    if (window.resetDebug) {
      window.resetDebug = false
      t0 = t1 = t3 = ct = 0
    }
  }

  // done, return array of submeshes
  return submeshes
}





//      Greedy meshing inner loop one
//
// iterating across ith 2d plane, with n being index into masks

function constructMeshMasks(i, d, arrT, getMaterial, doAO, skipReverseAO) {
  var n = 0
  var len1 = arrT.shape[1]
  var len2 = arrT.shape[2]
  var mask = maskCache
  var aomask = aomaskCache
  for(var k=0; k<len2; ++k) {
    for(var j=0; j<len1; ++j) {

      // mask[n] represents the face needed between i,j,k and i+1,j,k
      // for now, assume we never have two faces in both directions
      // So mask value is face material id, sign is direction

      var id0 = arrT.get(i-1, j, k)
      var id1 = arrT.get(  i, j, k)

      var op0 = id0 & OPAQUE_BIT
      var op1 = id1 & OPAQUE_BIT

      // draw no face if both blocks are opaque, or if ids match
      // otherwise, draw a face if one block is opaque or the other is air
      // (and the first isn't an object block)

      var maskVal = 0

      if ( ! (id0===id1 || op0&&op1)) {
        if (op0 || (id1===0 && !(id0 & OBJECT_BIT) )) {
          maskVal =  getMaterial(id0 & ID_MASK, d*2)
        }
        if (op1 || (id0===0 && !(id1 & OBJECT_BIT) )) {
          maskVal = -getMaterial(id1 & ID_MASK, d*2+1)
        }
      }
      mask[n] = maskVal

      // if doing AO, precalculate AO level for each face into second mask
      if (maskVal && doAO) {
        // i values in direction face is/isn't pointing
        var ipos = (maskVal>0) ? i : i-1
        var ineg = (maskVal>0) ? i-1 : i

        if (arrT.get(ipos,j,k) & SOLID_BIT) {
          // face points into a solid (non-opaque) block, so treat as fully occluded
          aomask[n] = 255 // i.e. (1<<8)-1, or 8 bits of occlusion
        } else {
          // this got so big I rolled it into a function
          aomask[n] = packAOMask( arrT, ipos, ineg, j, k, skipReverseAO )
        }
      }
      // done, advance mask index
      ++n
    }
  }
}


//      Greedy meshing inner loop two
//
// construct data for mesh using the masks
//(i, d, len1, len2, arrT, getMaterial, mask, aomask, doAO, skipReverseAO) {
function constructMeshDataFromMasks(i, d, u, v, len1, len2,  
                                     doAO, submeshes, getColor, aoValues, revAoVal) {
  var n = 0
  var mask = maskCache
  var aomask = aomaskCache
  for(var k=0; k<len2; ++k) {
    for(var j=0; j<len1; ) {
      if (mask[n]) {

        var maskVal = mask[n]
        // var dir = (maskVal > 0)
        var ao = aomask[n]

        //Compute width of area with same mask/aomask values
        var w
        if (doAO) {
          for(w=1; maskVal===mask[n+w] && ao===aomask[n+w] && j+w<len1; ++w) { }
        } else {
          for(w=1; maskVal===mask[n+w] && j+w<len1; ++w) { }
        }

        // Compute height (this is slightly awkward)
        var h, m
        heightloop:
        for(h=1; k+h<len2; ++h) {
          for(m=0; m<w; ++m) {
            if (doAO) {
              if( maskVal!==mask[n+m+h*len1] || (ao!==aomask[n+m+h*len1]) )
                break heightloop;
            } else {
              if(maskVal!==mask[n+m+h*len1]) 
                break heightloop;
            }
          }
        }

        // for testing: doing the following will disable greediness
        //w=h=1

        // material and mesh for this face
        var matID = Math.abs(maskVal)
        if (!submeshes[matID]) submeshes[matID] = new Submesh(matID)
        var mesh = submeshes[matID]
        var c = getColor(matID)

        var ao00, ao10, ao11, ao01
        // push AO-modified vertex colors (or just colors)
        if (doAO) {
          ao00 = unpackAOMask( ao, 0, 0 )
          ao10 = unpackAOMask( ao, 1, 0 )
          ao11 = unpackAOMask( ao, 1, 1 )
          ao01 = unpackAOMask( ao, 0, 1 )
          pushAOColor( mesh.colors, c, ao00, aoValues, revAoVal )
          pushAOColor( mesh.colors, c, ao10, aoValues, revAoVal )
          pushAOColor( mesh.colors, c, ao11, aoValues, revAoVal )
          pushAOColor( mesh.colors, c, ao01, aoValues, revAoVal )
        } else {
          mesh.colors.push( c[0], c[1], c[2], 1 )
          mesh.colors.push( c[0], c[1], c[2], 1 )
          mesh.colors.push( c[0], c[1], c[2], 1 )
          mesh.colors.push( c[0], c[1], c[2], 1 )
        }

        //Add quad, vertices = x -> x+du -> x+du+dv -> x+dv
        var x = [0,0,0]
        x[d] = i
        x[u] = j
        x[v] = k
        var du = [0,0,0]; du[u] = w;
        var dv = [0,0,0]; dv[v] = h;

        var pos = mesh.positions
        pos.push(x[0],             x[1],             x[2],
                 x[0]+du[0],       x[1]+du[1],       x[2]+du[2],
                 x[0]+du[0]+dv[0], x[1]+du[1]+dv[1], x[2]+du[2]+dv[2],
                 x[0]      +dv[0], x[1]      +dv[1], x[2]      +dv[2]  )

        // add uv values
        if (d===0) {
          // draw +x/-x faces in different order, so that
          // texture-space's V axis matches world-space's Y
          mesh.uvs.push( 0, w )
          mesh.uvs.push( 0, 0 )
          mesh.uvs.push( h, 0 )
          mesh.uvs.push( h, w )
        } else {
          mesh.uvs.push( 0, h )
          mesh.uvs.push( w, h )
          mesh.uvs.push( w, 0 )
          mesh.uvs.push( 0, 0 )
        }

        // Add indexes, ordered clockwise for the facing direction;
        // decide which way to split the quad based on ao colors

        var triDir = true
        if (doAO) {
          if (ao00===ao11) {
            triDir = (ao01===ao10) ? (ao00<ao01) : true
          } else {
            triDir = (ao01===ao10) ? false : (ao00+ao11>ao01+ao10)
          }
        }

        var vs = pos.length/3 - 4

        if (maskVal<0) {
          if (triDir) {
            mesh.indices.push( vs, vs+1, vs+2, vs, vs+2, vs+3 )
          } else {
            mesh.indices.push( vs+1, vs+2, vs+3, vs, vs+1, vs+3 )
          }
        } else {
          if (triDir) {
            mesh.indices.push( vs, vs+2, vs+1, vs, vs+3, vs+2 )
          } else {
            mesh.indices.push( vs+3, vs+1, vs, vs+3, vs+2, vs+1 )
          }
        }

        // norms depend on which direction the mask was solid in..
        var norm = [0,0,0]
        norm[d] = maskVal>0 ? 1 : -1
        // same norm for all vertices
        mesh.normals.push(norm[0], norm[1], norm[2], 
                          norm[0], norm[1], norm[2], 
                          norm[0], norm[1], norm[2], 
                          norm[0], norm[1], norm[2] )


        //Zero-out mask
        for(var l=0; l<h; ++l) {
          for(m=0; m<w; ++m) {
            mask[n+m+l*len1] = 0
          }
        }
        //Increment counters and continue
        j += w
        n += w
      } else {
        ++j;
        ++n
      }
    }
  }
}






/* 
 *  packAOMask:
 *
 *    For a given face, find occlusion levels for each vertex, then
 *    pack 4 such (2-bit) values into one Uint8 value
 * 
 *  Occlusion levels:
 *    1 is flat ground, 2 is partial occlusion, 3 is max (corners)
 *    0 is "reverse occlusion" - an unoccluded exposed edge 
 *  Packing order var(bit offset):
 *      a01(2)  -   a11(6)   ^  K
 *        -     -            +> J
 *      a00(0)  -   a10(4)
*/

function packAOMask( data, ipos, ineg, j, k, skipReverse ) {
  var a00 = 1
  var a01 = 1
  var a10 = 1
  var a11 = 1
  var solidBit = SOLID_BIT

  // inc occlusion of vertex next to obstructed side
  if (data.get(ipos, j+1, k  ) & solidBit) { ++a10; ++a11 }
  if (data.get(ipos, j-1, k  ) & solidBit) { ++a00; ++a01 }
  if (data.get(ipos, j  , k+1) & solidBit) { ++a01; ++a11 }
  if (data.get(ipos, j  , k-1) & solidBit) { ++a00; ++a10 }

  // if skipping reverse (exposed edge) AO, just check corners and bail
  if (skipReverse) {

    if (a11===1 && (data.get(ipos,j+1,k+1) & solidBit)) { a11 = 2 }
    if (a01===1 && (data.get(ipos,j-1,k+1) & solidBit)) { a01 = 2 }
    if (a10===1 && (data.get(ipos,j+1,k-1) & solidBit)) { a10 = 2 }
    if (a00===1 && (data.get(ipos,j-1,k-1) & solidBit)) { a00 = 2 }

  } else {

    // otherwise handle corners, and if not present do reverse AO
    if (a11===1) {
      if (data.get(ipos, j+1, k+1) & solidBit) { a11 = 2 }
      else if (!(data.get(ineg, j,   k+1) & solidBit) ||
               !(data.get(ineg, j+1, k  ) & solidBit) ||
               !(data.get(ineg, j+1, k+1) & solidBit)) {
        a11 = 0
      }
    }

    if (a10===1) {
      if (data.get(ipos, j+1, k-1) & solidBit) { a10 = 2 }
      else if (!(data.get(ineg, j  , k-1) & solidBit) ||
               !(data.get(ineg, j+1, k  ) & solidBit) ||
               !(data.get(ineg, j+1, k-1) & solidBit)) {
        a10 = 0
      }
    }

    if (a01===1) {
      if (data.get(ipos, j-1, k+1) & solidBit) { a01 = 2 }
      else if (!(data.get(ineg, j,   k+1) & solidBit) ||
               !(data.get(ineg, j-1, k  ) & solidBit) ||
               !(data.get(ineg, j-1, k+1) & solidBit)) {
        a01 = 0
      }
    }

    if (a00===1) {
      if (data.get(ipos, j-1, k-1) & solidBit) { a00 = 2 }
      else if (!(data.get(ineg, j,   k-1) & solidBit) ||
               !(data.get(ineg, j-1, k  ) & solidBit) ||
               !(data.get(ineg, j-1, k-1) & solidBit)) {
        a00 = 0
      }
    }
  }
  return a11<<6 | a10<<4 | a01<<2 | a00
}



// unpack (2 bit) ao value from ao mask
// see above for details
function unpackAOMask( aomask, jpos, kpos ) {
  var offset = jpos ? (kpos ? 6 : 4) : (kpos ? 2 : 0)
  return aomask >> offset & 3
}


// premultiply vertex colors by value depending on AO level
// then push them into color array
function pushAOColor( colors, baseCol, ao, aoVals, revAOval ) {
  var mult = (ao===0) ? revAOval : aoVals[ao-1]
  colors.push( baseCol[0]*mult, baseCol[1]*mult, baseCol[2]*mult, 1 )
}







},{"ndarray":147}],78:[function(require,module,exports){
'use strict';

var extend = require('extend')
var createGameShell = require('game-shell')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter


module.exports = function(noa, opts) {
  return new Container(noa, opts)
}

/*
 *  Container module
 *    Wraps game-shell module and manages HTML container, canvas, etc.
 *    Emits: DOMready
*/

function Container(noa, opts) {
  opts = opts || {}
  this._noa = noa
  this._element = opts.domElement || createContainerDiv()
  this._shell = createShell( this._element, opts )
  this.canvas = getOrCreateCanvas(this._element)

  // feature detection
  this._pointerLockSupported = false

  this._shell.on('init', onShellInit.bind(null,this))
}

inherits(Container, EventEmitter)



/*
 *   SHELL EVENTS
*/ 

function onShellInit(self) {
  // create shell listeners that drive engine functions
  var noa = self._noa
  var shell = self._shell
  shell.on('tick',   function onTick(n)   { noa.tick(n)   })
  shell.on('render', function onRender(n) { noa.render(n) })
  shell.on('resize', noa.rendering.resize.bind(noa.rendering) )

  detectPointerLock(self)
  // track pointer lock
  var lockChange = onLockChange.bind(undefined, self)
  document.addEventListener("pointerlockchange", lockChange, false)
  document.addEventListener("mozpointerlockchange", lockChange, false)
  document.addEventListener("webkitpointerlockchange", lockChange, false)



  // let other components know DOM is ready
  self.emit( 'DOMready' )
}


/*
 *   PUBLIC API 
*/ 

Container.prototype.appendTo = function(htmlElement) {
  this._element.appendChild( htmlElement )
}


Container.prototype.hasPointerLock = function() {
  return this._shell.pointerLock
}

Container.prototype.supportsPointerLock = function() {
  return this._pointerLockSupported
}


Container.prototype.setPointerLock = function(lock) {
  // not sure if this will work robustly
  this._shell.pointerLock = !!lock
}





/*
 *   INTERNALS
*/ 



function createContainerDiv() {
  // based on github.com/mikolalysenko/game-shell - makeDefaultContainer()
  var container = document.createElement("div")
  container.tabindex = 1
  container.style.position = "absolute"
  container.style.left = "0px"
  container.style.right = "0px"
  container.style.top = "0px"
  container.style.bottom = "0px"
  container.style.height = "100%"
  container.style.overflow = "hidden"
  document.body.appendChild(container)
  document.body.style.overflow = "hidden" //Prevent bounce
  document.body.style.height = "100%"
  container.id = 'noa-container'
  return container
}


function createShell(container, _opts) {
  var shellDefaults = {
    pointerLock: true,
    preventDefaults: false
  }
  var opts = extend( shellDefaults, _opts )
  opts.element = container
  var shell = createGameShell(opts)
  shell.preventDefaults = opts.preventDefaults
  return shell
}

function getOrCreateCanvas(el) {
  // based on github.com/stackgl/gl-now - default canvas
  var canvas = el.querySelector('canvas')
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.style.position = "absolute"
    canvas.style.left = "0px"
    canvas.style.top = "0px"
    canvas.style.height = "100%"
    canvas.style.width = "100%"
    canvas.id = 'noa-canvas'
    el.appendChild(canvas)
  }
  return canvas
}


// track changes in Pointer Lock state
function onLockChange(self, ev) {
  var el = document.pointerLockElement ||
      document.mozPointerLockElement ||
      document.webkitPointerLockElement
  if (el) self.emit('gainedPointerLock')
  else    self.emit('lostPointerLock')
}


// set up stuff to detect pointer lock support.
// Needlessly complex because Chrome/Android claims to support but doesn't.
// For now, just feature detect, but assume no support if a touch event occurs
// TODO: see if this makes sense on hybrid touch/mouse devices
function detectPointerLock(self) {
  var lockElementExists = 
      ('pointerLockElement' in document) ||
      ('mozPointerLockElement' in document) ||
      ('webkitPointerLockElement' in document)
  if (lockElementExists) {
    self._pointerLockSupported = true
    var listener = function(e) {
      self._pointerLockSupported = false
      document.removeEventListener(e.type, listener)
    }
    document.addEventListener('touchmove', listener)
  }
}




},{"events":195,"extend":99,"game-shell":112,"inherits":146}],79:[function(require,module,exports){
'use strict';

var extend = require('extend')
var aabb = require('aabb-3d')
var vec3 = require('gl-vec3')
var EntitySystem = require('ensy')

module.exports = function (noa, opts) {
	return new Entities(noa, opts)
}

var defaults = {
	shadowDistance: 10,
}


/**
 * Wrangles entities. 
 * Encapsulates an ECS. Exposes helpers for adding entities, components, 
 * and getting component data for entities. 
 * 
 * Expects entity definitions in a specific format - see source `components` folder for examples.
 * 
 * @class noa.entities
*/

function Entities(noa, opts) {
	this.noa = noa
	opts = extend(defaults, opts)
	
	// internals
	this.shadowDist = opts.shadowDistance
	this._toRemove = []
	
	// set up ECS and built-in components
	this.ecs = new EntitySystem()
	/** Collection of known components */
	this.components = {}
	this.processors = {}
	setupComponents(this)

	var self = this
	noa.on('beforeRender', function (dt) {
		updateMeshPositions(self, dt)
		doCameraTracking(self, dt) 
	})
	noa.on('tick', function (dt) { tick(self, dt) })
}




/*
 *
 *    ECS API - hides/encapsulates ensy library
 *
*/

/**
 * Creates a new component from a definiton object
 * @param comp
 */
Entities.prototype.createComponent = function (comp) {
	
	this.ecs.addComponent(comp.name, comp)

	if (comp.processor) {
		var ecs = this.ecs
		var name = comp.name
		var proc = comp.processor
		this.processors[name] = {
			update: function runProcessor(dt) {
				var states = ecs.getComponentsData(name)
				proc(dt, states)
			}
		}
		this.ecs.addProcessor(this.processors[name])
	}
}

/** @param comp */
Entities.prototype.deleteComponent = function (comp) {
	var name = (typeof comp === 'string') ? comp : comp.name
	this.ecs.removeProcessor(this.processors[name])
	return this.ecs.removeComponent(name)
}

/** 
 * Takes an array of components to add (per `addComponent`)
 * @param compList */
Entities.prototype.createEntity = function (compList) {
	var eid = this.ecs.createEntity([])
	if (compList && compList.length) {
		for (var i = 0; i < compList.length; ++i) {
			this.addComponent(eid, compList[i])
		}
	}
	return eid
}

/** 
 * deletes an entity, after removing all its components
 * @param id */
Entities.prototype.removeEntity = function (entID) {
	// manually remove components so that callbacks can fire
	var compNames = this.ecs.getComponentsList()
	for (var i = 0; i < compNames.length; ++i) {
		var name = compNames[i]
		if (this.ecs.entityHasComponent(entID, name)) {
			this.removeComponent(entID, name)
		}
	}
	return this.ecs.removeEntity(entID)
}

/**
 * Add component to an entity. Optional `state` param can be only partially populated.
 * @param id
 * @param comp
 * @param state
 */
Entities.prototype.addComponent = function (entID, comp, data) {
	var name = (typeof comp === 'string') ? comp : comp.name
	
	if (this.ecs.entityHasComponent(entID, name)) {
		this.removeComponent(entID, name)
	}
	
	tmpArray[0] = name
	this.ecs.addComponentsToEntity(tmpArray, entID)

	var compData = this.ecs.getComponentDataForEntity(name, entID)
	if (data) {
		for (var s in data) {
			if (!compData.hasOwnProperty(s)) throw new Error("Supplied data object doesn't match component data")
			compData[s] = data[s]
		}
	}
	var compDef = this.ecs.components[name]
	if (compDef.onAdd) compDef.onAdd(entID, compData)
}
var tmpArray = ['foo']

/**
 * Remove a component from an entity
 * @param id
 * @param comp
 */
Entities.prototype.removeComponent = function (entID, comp) {
	if (comp.length && typeof comp === 'object') throw new Error("Remove one component at a time..")

	var name = (typeof comp === 'string') ? comp : comp.name
	var compDef = this.ecs.components[name]
	if (compDef.onRemove) {
		var compData = this.ecs.getComponentDataForEntity(name, entID)
		compDef.onRemove(entID, compData)
	}
	return this.ecs.removeComponentsFromEntity([name], entID)
}

/**
 * @param id
 * @param comp
 */
Entities.prototype.hasComponent = function (entID, comp) {
	var name = (typeof comp === 'string') ? comp : comp.name
	return this.ecs.entityHasComponent(entID, name)
}

/**
 * Get state data for an entity's component 
 * @param id
 * @param comp
 */
Entities.prototype.getData = function (entID, comp) {
	var name = (typeof comp === 'string') ? comp : comp.name
	return this.ecs.getComponentDataForEntity(name, entID)
}

/**
 * Get array of state objects for all entities having a given component 
 * @param comp
 */
Entities.prototype.getDataList = function (comp) {
	var name = (typeof comp === 'string') ? comp : comp.name
	return this.ecs.getComponentsData(name)
}

// Accessor for 'systems' to map a function over each item in a component data list
// takes: function(componentData, id) 
// breaks early if fn() returns false
Entities.prototype.loopOverComponent = function (comp, fn) {
	var name = (typeof comp === 'string') ? comp : comp.name
	var ents = this.ecs.getComponentsData(name)
	for (var i = 0; i < ents.length; ++i) {
		var dat = ents[i]
		var res = fn(dat, dat.__id)
		if (res === false) return false
	}
	return true
}

Entities.prototype.update = function (dt) {
	this.ecs.update(dt)
}



/*
 *
 *		BUILT IN COMPONENTS
 *
*/

function setupComponents(self) {
	var comps = self.components
	var noa = self.noa

	comps.aabb = require('../components/aabb')(noa)
	comps.shadow = require('../components/shadow')(noa)
	comps.physics = require('../components/physics')(noa)
	comps.mesh = require('../components/mesh')(noa)
	comps.player = require('../components/player')(noa)
	comps.collideTerrain = require('../components/collideTerrain')(noa)
	comps.collideEntities = require('../components/collideEntities')(noa)
	comps.countdown = require('../components/countdown')(noa)
	comps.autoStepping = require('../components/autostepping')(noa)
	comps.movement = require('../components/movement')(noa)
	comps.receivesInputs = require('../components/receivesInputs')(noa)
	comps.followsPlayer = require('../components/followsPlayer')(noa)
	comps.fadeOnZoom = require('../components/fadeOnZoom')(noa)

	var names = Object.keys(comps)
	for (var i = 0; i < names.length; i++) {
		self.createComponent(comps[names[i]])
	}
}



/*
 *  Built-in component data accessors
 *	Hopefully monomorphic and easy to optimize..
*/

/** test if entity is the player
 * @param id */
Entities.prototype.isPlayer = function (eid) {
	return this.hasComponent(eid, this.components.player)
}
/** get an entity's bounding box
 * @param id */
Entities.prototype.getAABB = function (eid) {
	return this.getData(eid, this.components.aabb).aabb
}
/** get an entity's position (bottom center of aabb)
 * @param id */
Entities.prototype.getPosition = function (eid) {
	var box = this.getData(eid, this.components.aabb).aabb
	var loc = box.base
	var size = box.vec
	return vec3.fromValues(
		loc[0] + size[0] / 2,
		loc[1],
		loc[2] + size[2] / 2)
}
/** get reference to an entity's physics body
 * @param id */
Entities.prototype.getPhysicsBody = function (eid) {
	return this.getData(eid, this.components.physics).body
}
/** returns `{mesh, offset}`
 * @param id */
Entities.prototype.getMeshData = function (eid) {
	return this.getData(eid, this.components.mesh)
}




/*
 *
 *    ENTITY MANAGER API
 *
*/

/** @param x,y,z */
Entities.prototype.isTerrainBlocked = function (x, y, z) {
	// checks if terrain location is blocked by entities
	var newbb = new aabb([x, y, z], [1, 1, 1])
	var datArr = this.getDataList(this.components.collideTerrain)
	for (var i = 0; i < datArr.length; i++) {
		var bb = this.getAABB(datArr[i].__id)
		if (newbb.intersects(bb) && !newbb.touches(bb)) return true;
	}
	return false
}


// Add a new entity, and automatically populates the main components 
// based on arguments if they're present
/** 
 *   Helper to set up a general entity
 * 
 *   Parameters: position, width, height, mesh, meshOffset, doPhysics, shadow
 * 
 * @param position
 * @param width
 * @param height..
 */
Entities.prototype.add = function (position, width, height, // required
	mesh, meshOffset,
	doPhysics, shadow) {
		
	var comps = this.components
	var self = this
	
	// new entity
	var eid = this.createEntity()
		  
	// bounding box for new entity
	var box = new aabb([position[0] - width / 2, position[1], position[2] - width / 2],
		[width, height, width])
	
	// rigid body in physics simulator
	var body
	if (doPhysics) {
		// body = this.noa.physics.addBody(box)
		this.addComponent(eid, comps.physics)
		body = this.getPhysicsBody(eid)
		body.aabb = box
		
		// handler for physics engine to call on auto-step
		body.onStep = function () {
			self.addComponent(eid, self.components.autoStepping)
		}
	}	
	
	// aabb component - use aabb from physics body if it's present
	var boxData = { aabb: box }
	if (body) boxData.aabb = body.aabb
	this.addComponent(eid, comps.aabb, boxData)
	
	// mesh for the entity
	if (mesh) {
		if (!meshOffset) meshOffset = vec3.create()
		this.addComponent(eid, comps.mesh, {
			mesh: mesh,
			offset: meshOffset
		})
	}
	
	// add shadow-drawing component
	if (shadow) {
		this.addComponent(eid, comps.shadow, { size: width })
	}
	
	return eid
}


/**
 * Queues an entity to be removed next tick
 */
Entities.prototype.remove = function (eid) {
	// defer removal until next tick function, since entities are likely to
	// call this on themselves during collsion handlers or tick functions
	if (this._toRemove.indexOf(eid) < 0) this._toRemove.push(eid);
}






/*
*
*  INTERNALS
*
*/



function tick(self, dt) {
	// handle any deferred entities that need removing
	while (self._toRemove.length) {
		var eid = self._toRemove.pop()
		self.removeEntity(eid)
	}
}



var tempvec = vec3.create()


function updateMeshPositions(self, dt) {
	// update meshes to physics positions, advanced into the future by dt
	// dt is time (ms) since physics engine tick, to avoid temporal aliasing
	// http://gafferongames.com/game-physics/fix-your-timestep/
	var comps = self.components
	var pos = tempvec

	var states = self.ecs.getComponentsData(comps.mesh.name)
	for (var i = 0; i < states.length; ++i) {
		var data = states[i]
		var id = data.__id

		if (!self.hasComponent(id, comps.physics)) continue
		var mesh = data.mesh
		var offset = data.offset
		var body = self.getPhysicsBody(id)

		vec3.add(pos, body.aabb.base, offset)
		vec3.scaleAndAdd(pos, pos, body.velocity, dt / 1000)
		mesh.position.x = pos[0]
		mesh.position.z = pos[2]

		if (self.hasComponent(id, comps.autoStepping)) {
			// soften player mesh movement for a short while after autosteps
			mesh.position.y += .3 * (pos[1] - mesh.position.y)
			var dat = self.getData(id, comps.autoStepping)
			dat.time -= dt
			if (dat.time < 0) self.removeComponent(id, comps.autoStepping)
		} else {
			mesh.position.y = pos[1]
		}

		if (self.hasComponent(id, comps.shadow)) {
			var shadow = self.getData(id, comps.shadow).mesh
			shadow.position.x = pos[0]
			shadow.position.z = pos[2]
		}
	}
}


function doCameraTracking(self, dt) {
	// set the camera target entity to track the player mesh's position
	// tests for the tracking component so that client can easily override
	
	var cid = self.noa.cameraTarget
	if (!self.hasComponent(cid, self.components.followsPlayer)) return
	
	var pid = self.noa.playerEntity
	var cam = self.getAABB(cid)
	var player = self.getAABB(pid)
	
	// camera target at 90% of entity's height
	if (self.hasComponent(pid, self.components.mesh)) {
		var pos = self.getMeshData(pid).mesh.position
		vec3.set(cam.base, pos.x, pos.y, pos.z)
		cam.base[1] += player.vec[1] * 0.4
	} else {
		vec3.scaleAndAdd(cam.base, player.base, player.vec, 0.5)  
		cam.base[1] += player.vec[1] * 0.4
	}
}






},{"../components/aabb":62,"../components/autostepping":63,"../components/collideEntities":64,"../components/collideTerrain":65,"../components/countdown":66,"../components/fadeOnZoom":67,"../components/followsPlayer":68,"../components/mesh":69,"../components/movement":70,"../components/physics":71,"../components/player":72,"../components/receivesInputs":73,"../components/shadow":74,"aabb-3d":85,"ensy":97,"extend":99,"gl-vec3":124}],80:[function(require,module,exports){
'use strict';

var createInputs = require('game-inputs')
var extend = require('extend')


module.exports = function(noa, opts, element) {
  return makeInputs(noa, opts, element)
}


var defaultBindings = {
  bindings: {
    "forward":  [ "W", "<up>" ],
    "left":     [ "A", "<left>" ],
    "backward": [ "S", "<down>" ],
    "right":    [ "D", "<right>" ],
    "fire":       "<mouse 1>",
    "mid-fire": [ "<mouse 2>", "Q" ],
    "alt-fire": [ "<mouse 3>", "E" ],
    "jump":       "<space>",
    "sprint":     "<shift>",
    "crouch":     "<control>"
  }
}


function makeInputs(noa, opts, element) {
  opts = extend( {}, defaultBindings, opts )
  var inputs = createInputs( element, opts )
  var b = opts.bindings
  for (var name in b) {
    var arr = ( Array.isArray(b[name]) ) ? b[name] : [b[name]]
    arr.unshift(name)
    inputs.bind.apply(inputs, arr)
  }
  return inputs
}






},{"extend":99,"game-inputs":100}],81:[function(require,module,exports){
'use strict';

var createPhysics = require('voxel-physics-engine')
var extend = require('extend')

module.exports = function(noa, opts) {
  return makePhysics(noa, opts)
}

/*
 *
 *    Simple wrapper module for the physics library
 *
*/


var defaults = {
  gravity: [0, -10, 0],
  airFriction: 0.999
}


function makePhysics(noa, opts) {
  opts = extend( {}, defaults, opts )
  var world = noa.world
  var blockGetter = function(x,y,z) { return world.getBlockSolidity(x,y,z) }
  var isFluidGetter = function(x,y,z) { return world.getBlockFluidity(x,y,z) }
  var physics = createPhysics(opts, blockGetter, isFluidGetter)
  return physics
}






},{"extend":99,"voxel-physics-engine":149}],82:[function(require,module,exports){
'use strict';

var extend = require('extend')

module.exports = function(noa, opts) {
  return new Registry(noa, opts)
}


/*
 *   Registry - registering game assets and data abstractly
*/

var defaults = {
  texturePath: ''
}

function Registry(noa, opts) {
  this.noa = noa
  var _opts = extend( defaults, opts )
  this._texturePath = _opts.texturePath

  this._blockIDs = {}       // Block registry
  this._blockMats = []
  this._blockProps = []
  this._matIDs = {}         // Material (texture/color) registry
  this._matData = []
  this._meshIDs = {}        // Mesh registry
  this._meshData = []
  //  this._atlases = {}

  // make several special arrays for often looked-up block properties
  // (hopefully v8 will inline the lookups..)
  this._blockSolidity = [false]
  this._blockOpacity = [false]
  this._blockIsFluid = [false]
  this._blockCustomMesh = [-1]

  // make block type 0 empty space
  this._blockProps[0] = null

  // define some default values that may be overwritten
  this.registerBlock( 'dirt', 'dirt', {} )
  this.registerMaterial( 'dirt', [0.4, 0.3, 0], null )
}


/*
 *   APIs for registering game assets
 *   
 *   Block flags:
 *      solid  (true) : whether it's solid for physics purposes
 *      opaque (true) : whether it fully obscures neighboring blocks
 *      fluid (false) : whether nonsolid block is a fluid (buoyant, viscous..)
*/

// material can be: a single material name, an array [top, bottom, sides],
// or a 6-array: [ +x, -x, +y, -y, +z, -z ]
Registry.prototype.registerBlock = function(name, material, properties,
                                             solid, opaque, fluid ) {
  // allow overwrites, for now anyway
  var id = this._blockIDs[name] || this._blockProps.length
  this._blockIDs[name] = id
  this._blockProps[id] = properties || null

  // always store 6 material IDs per blockID, so material lookup is monomorphic
  for (var i=0; i<6; ++i) {
    var matname
    if (typeof material=='string') matname = material
    else if (material.length==6) matname = material[i]
    else if (material.length==3) {
      matname = (i==2) ? material[0] : (i==3) ? material[1] : material[2]
    }
    if (!matname) throw new Error('Register block: "material" must be a material name, or an array of 3 or 6 of them.')
    this._blockMats[id*6 + i] = this.getMaterialId(matname, true)
  }

  // flags default to solid/opaque
  this._blockSolidity[id]   = (solid===undefined)  ? true : !!solid
  this._blockOpacity[id]    = (opaque===undefined) ? true : !!opaque
  this._blockIsFluid[id]    = !solid && !!fluid

  // if block is fluid, initialize properties if needed
  if (this._blockIsFluid[id]) {
    var p = this._blockProps[id]
    if (p.fluidDensity == void 0) { p.fluidDensity = 1.0 }
    if (p.viscosity == void 0)    { p.viscosity = 0.5 }
  }
  
  // terrain blocks have no custom mesh
  this._blockCustomMesh[id] = -1

  return id
}




// register an object (non-terrain) block type

Registry.prototype.registerObjectBlock = function(name, meshName, properties,
                                                   solid, opaque, fluid ) {
  var id = this.registerBlock(name, ' ', properties, solid, opaque, fluid)
  var meshID = this.getMeshID(meshName, true)
  this._blockCustomMesh[id] = meshID
  return id
}





// register a material - name, ... color, texture, texHasAlpha
Registry.prototype.registerMaterial = function(name, color, textureURL, texHasAlpha) {
  var id = this._matIDs[name] || this._matData.length
  this._matIDs[name] = id
  var alpha = 1
  if (color && color.length==4) {
    alpha = color.pop()
  }
  this._matData[id] = {
    color: color ? color : [1,1,1],
    alpha: alpha,
    texture: textureURL ? this._texturePath+textureURL : null,
    textureAlpha: !!texHasAlpha
  }
  return id
}




// Register a mesh that can be instanced later
Registry.prototype.registerMesh = function(name, mesh, props) {
  var id = this._meshIDs[name] || this._meshData.length
  this._meshIDs[name] = id
  if (mesh) {
    this._meshData[id] = {
      mesh: mesh,
      props: props
    }
    // disable mesh so original doesn't stay in scene
    mesh.setEnabled(false)
  }
  return id
}

Registry.prototype.getMeshID = function(name, lazyInit) {
  var id = this._meshIDs[name]
  if (typeof id == 'undefined' && lazyInit) {
    id = this.registerMesh(name)
  }
  return id
}

Registry.prototype.getMesh = function(name) {
  return this._meshData[this._meshIDs[name]].mesh
}

Registry.prototype._getMeshByBlockID = function(id) {
  var mid = this._blockCustomMesh[id]
  return this._meshData[mid].mesh
}


/*
 *   APIs for querying about game assets
*/


Registry.prototype.getBlockID = function(name) {
  return this._blockIDs[name]
}

// block solidity (as in physics)
Registry.prototype.getBlockSolidity = function(id) {
  return this._blockSolidity[id]
}

// block opacity - whether it obscures the whole voxel (dirt) or 
// can be partially seen through (like a fencepost, etc)
Registry.prototype.getBlockOpacity = function(id) {
  return this._blockOpacity[id]
}

// block is fluid or not
Registry.prototype.getBlockFluidity = function(id) {
  return this._blockIsFluid[id]
}

// Get block property object passed in at registration
Registry.prototype.getBlockProps = function(id) {
  return this._blockProps[id]
}






/*
 *   Meant for internal use within the engine
*/


// Returns accessor to look up material ID given block id and face
//    accessor is function(blockID, dir)
//    dir is a value 0..5: [ +x, -x, +y, -y, +z, -z ]
Registry.prototype.getBlockFaceMaterialAccessor = function() {
  if (!this._storedBFMAccessor) {
    var bms = this._blockMats
    this._storedBFMAccessor = function(blockId, dir) {
      return bms[blockId*6 + dir]
    }
  }
  return this._storedBFMAccessor
}

// look up material color given ID
// if lazy is set, pre-register the name and return an ID
Registry.prototype.getMaterialId = function(name, lazyInit) {
  var id = this._matIDs[name]
  if (typeof id == 'undefined' && lazyInit) {
    id = this.registerMaterial(name)
  }
  return id
}




// look up material color given ID
Registry.prototype.getMaterialColor = function(matID) {
  return this._matData[matID].color
}

// returns accessor to look up color used for vertices of blocks of given material
// - i.e. white if it has a texture, color otherwise
Registry.prototype.getMaterialVertexColorAccessor = function() {
  if (!this._storedMVCAccessor) {
    var matData = this._matData
    this._storedMVCAccessor = function(matID) {
      if (matData[matID].texture) return [1,1,1]
      return matData[matID].color
    }
  }
  return this._storedMVCAccessor
}

// look up material texture given ID
Registry.prototype.getMaterialTexture = function(matID) {
  return this._matData[matID].texture
}

// look up material's properties: color, alpha, texture, textureAlpha
Registry.prototype.getMaterialData = function(matID) {
  return this._matData[matID]
}





},{"extend":99}],83:[function(require,module,exports){
'use strict';
/* globals BABYLON */

var extend = require('extend')
var glvec3 = require('gl-vec3')

// For now, assume Babylon.js has been imported into the global space already
if (!BABYLON) {
  throw new Error('Babylon.js reference not found! Abort! Abort!')
}

module.exports = function(noa, opts, canvas) {
  return new Rendering(noa, opts, canvas)
}

var vec3 = BABYLON.Vector3 // not a gl-vec3, in this module only!!
var col3 = BABYLON.Color3
var halfPi = Math.PI/2
window.BABYLON = BABYLON


var defaults = {
  antiAlias: true,
  clearColor:       [ 0.8, 0.9, 1],
  ambientColor:     [ 1, 1, 1 ],
  lightDiffuse:     [ 1, 1, 1 ],
  lightSpecular:    [ 1, 1, 1 ],
  groundLightColor: [ 0.5, 0.5, 0.5 ],
  initialCameraZoom: 0,
  cameraZoomSpeed: .3,
  cameraMaxAngle: halfPi - 0.01,
  useAO: true,
  AOmultipliers: [ 0.93, 0.8, 0.5 ],
  reverseAOmultiplier: 1.0,
}





function Rendering(noa, _opts, canvas) {
  this.noa = noa
  var opts = extend( {}, defaults, _opts )
  this.zoomDistance = opts.initialCameraZoom      // zoom setting
  this._cappedZoom = this.zoomDistance        // zoom, capped by obstacles
  this._currentZoom = this.zoomDistance       // current actual zoom level
  this._cameraZoomSpeed = opts.cameraZoomSpeed
  this._maxCamAngle = opts.cameraMaxAngle

  // set up babylon scene
  initScene(this, canvas, opts)

  // Events and handling for meshing chunks when needed
  var self = this
  this._meshedChunks = {}
  this._chunksToMesh = []
  noa.world.on('chunkAdded',   function(chunk) { onChunkAdded(self, chunk) })
  noa.world.on('chunkRemoved', function(chunk) { onChunkRemoved(self, chunk) })
  noa.world.on('chunkChanged', function(i,j,k) { onChunkChanged(self, i, j, k) })

  // internals
  this._materialCache = {}
  this.useAO = !!opts.useAO
  this.aoVals = opts.AOmultipliers
  this.revAoVal = opts.reverseAOmultiplier

  // for debugging
  window.scene = this._scene
}


// Constructor helper - set up the Babylon.js scene and basic components
function initScene(self, canvas, opts) {
  if (!BABYLON) throw new Error('BABYLON.js engine not found!')

  // init internal properties
  self._engine = new BABYLON.Engine(canvas, opts.antiAlias)
  self._scene =  new BABYLON.Scene( self._engine )
  var scene = self._scene

  // octree setup
  self._octree = new BABYLON.Octree()
  self._octree.blocks = []
  scene._selectionOctree = self._octree

  // camera and empty mesh to hold camera rotations
  self._rotationHolder = new BABYLON.Mesh('rotHolder',scene)
  self._cameraHolder = new BABYLON.Mesh('camHolder',scene)
  self._camera = new BABYLON.FreeCamera('camera', new vec3(0,0,0), scene)
  self._camera.parent = self._cameraHolder
  self._camera.minZ = .01
  self._cameraHolder.visibility = false
  self._rotationHolder.visibility = false
  self._camPosOffset = new vec3(0,0,0)

  // plane obscuring the camera - for overlaying an effect on the whole view
  self._camScreen = BABYLON.Mesh.CreatePlane('camScreen', 10, scene)
  self.addDynamicMesh(self._camScreen) 
  self._camScreen.position.z = .1
  self._camScreen.parent = self._camera
  self._camScreenMat = new BABYLON.StandardMaterial('camscreenmat', scene)
  self._camScreenMat.specularColor = new col3(0,0,0)
  self._camScreen.material = self._camScreenMat
  self._camScreen.setEnabled(false)
  self._camLocBlock = 0

  // apply some defaults
  self._light = new BABYLON.HemisphericLight('light', new vec3(0.1,1,0.3), scene )
  function arrToColor(a) { return new col3( a[0], a[1], a[2] )  }
  scene.clearColor =  arrToColor( opts.clearColor )
  scene.ambientColor= arrToColor( opts.ambientColor )
  self._light.diffuse =     arrToColor( opts.lightDiffuse )
  self._light.specular =    arrToColor( opts.lightSpecular )
  self._light.groundColor = arrToColor( opts.groundLightColor )

  // create a mesh to serve as the built-in shadow mesh
  var disc = BABYLON.Mesh.CreateDisc('shadowMesh', 0.75, 30, scene)
  disc.rotation.x = halfPi
  self.noa.registry.registerMesh('shadow', disc)
  disc.material = new BABYLON.StandardMaterial('shadowMat', scene)
  disc.material.diffuseColor = new col3(0,0,0)
  disc.material.specularColor = new col3(0,0,0)
  disc.material.alpha = 0.5

  // create a terrain material to be the base for all terrain
  // this material is also used for colored terrain (that has no texture)
  self._terrainMaterial = new BABYLON.StandardMaterial('terrainMat', scene)
  self._terrainMaterial.specularColor = new col3(0,0,0)
}



/*
 *   PUBLIC API 
*/ 

// accessor for client app to build meshes and register materials
Rendering.prototype.getScene = function() {
  return this._scene
}

// tick function manages deferred meshing
Rendering.prototype.tick = function(dt) {
  checkCameraObstructions(this)

  // chunk a mesh, or a few if they're fast
  var time = performance.now()
  while(this._chunksToMesh.length && (performance.now() < time+3)) {
    doDeferredMeshing(this)
  }
}


Rendering.prototype.render = function(dt) {
  updateCamera(this)
  this._engine.beginFrame()
  this._scene.render()
  this._engine.endFrame()
}

Rendering.prototype.resize = function(e) {
  this._engine.resize()
}

Rendering.prototype.highlightBlockFace = function(show, posArr, normArr) {
  var m = getHighlightMesh(this)
  if (show) {
    var pos=[]
    for (var i=0; i<3; ++i) {
      pos[i] = posArr[i] + .5 + (.505 * normArr[i])
    }
    m.position.copyFromFloats( pos[0], pos[1], pos[2] ) 
    m.rotation.x = (normArr[1]) ? halfPi : 0
    m.rotation.y = (normArr[0]) ? halfPi : 0
  }
  m.setEnabled(show)
}


Rendering.prototype.getCameraVector = function() {
  var vec = new vec3(0,0,1)
  return vec3.TransformCoordinates(vec, this._rotationHolder.getWorldMatrix())
}
var zero = vec3.Zero()
Rendering.prototype.getCameraPosition = function() {
  return vec3.TransformCoordinates(zero, this._camera.getWorldMatrix())
}
Rendering.prototype.getCameraRotation = function() {
  var rot = this._rotationHolder.rotation
  return [ rot.x, rot.y ]
}
Rendering.prototype.setCameraRotation = function(x,y) {
  var rot = this._rotationHolder.rotation
  rot.x = Math.max( -this._maxCamAngle, Math.min(this._maxCamAngle, x) )
  rot.y = y
}


// add a dynamic (mobile, non-terrain) mesh to the scene
Rendering.prototype.addDynamicMesh = function(mesh) {
  var i = this._octree.dynamicContent.indexOf(mesh)
  if (i>=0) return
  this._octree.dynamicContent.push(mesh)
  mesh.onDispose = this.removeDynamicMesh.bind(this, mesh)
}

// remove a dynamic (mobile, non-terrain) mesh to the scene
Rendering.prototype.removeDynamicMesh = function(mesh) {
  removeUnorderedListItem( this._octree.dynamicContent, mesh )
}

// helper to swap item to end and pop(), instead of splice()ing
function removeUnorderedListItem(list, item) {
  var i = list.indexOf(item)
  if (i < 0) { return }
  if (i === list.length-1) {
    list.pop()
  } else {
    list[i] = list.pop()
  }
}



Rendering.prototype.makeMeshInstance = function(meshname, isTerrain) {
  var mesh = this.noa.registry.getMesh(meshname)
  return instantiateMesh(this, mesh, meshname, isTerrain)
}

Rendering.prototype._makeMeshInstanceByID = function(id, isTerrain) {
  var mesh = this.noa.registry._getMeshByBlockID(id)
  return instantiateMesh(this, mesh, mesh.name, isTerrain)
}

function instantiateMesh(self, mesh, name, isTerrain) {
  var m = mesh.createInstance(name)
  if (mesh.billboardMode) m.billboardMode = mesh.billboardMode
  if (!isTerrain) {
    // non-terrain stuff should be dynamic w.r.t. selection octrees
    self.addDynamicMesh(m)
  }
  return m
}


// used to fill in some blanks in empty projects
Rendering.prototype.makePlaceholderMesh = function() {
  return BABYLON.Mesh.CreateBox('placeholder', 1, this._scene)
}


/*
 *   CHUNK ADD/CHANGE/REMOVE HANDLING
*/ 

function onChunkAdded( self, chunk ){
  // newly created chunks go to the end of the queue
  enqueueChunkUniquely( chunk, self._chunksToMesh, false )
}

function onChunkChanged( self, chunk ) {
  // changed chunks go to the head of the queue
  enqueueChunkUniquely( chunk, self._chunksToMesh, true )
}

function onChunkRemoved( self, i, j, k ) {
  removeMesh( self, [i,j,k].join('|') )
}

function doDeferredMeshing(self) {
  var chunk = null

  // find a chunk to mesh, starting from front, skipping if not meshable
  while(self._chunksToMesh.length && !chunk) {
    var c = self._chunksToMesh.shift()
    if (!c._terrainDirty) continue
    if (c.isDisposed) continue
    chunk = c
  }
  if (!chunk) return

  var id = [chunk.i,chunk.j,chunk.k].join('|')
  // remove current version if this is an update to an existing chunk
  if (self._meshedChunks[id]) removeMesh(self, id)
  // mesh it and add to babylon scene
  var meshdata = meshChunk(self, chunk)
  if (meshdata.length) {
    var mesh = makeChunkMesh(self, meshdata, id, chunk )
    self._meshedChunks[id] = mesh
  }
}


/*
 *
 *   INTERNALS
 *
*/ 

function enqueueChunkUniquely( obj, queue, infront ) {
  // remove any duplicate chunk descriptor objects
  for (var i=0; i<queue.length; ++i) {
    if (queue[i]===obj) queue.splice(i--,1);
  }
  // add to front/end of queue
  if (infront) queue.unshift(obj)
  else queue.push(obj);
}


function removeMesh(self, id) {
  var m = self._meshedChunks[id]
  if (m) m.dispose()
  delete self._meshedChunks[id]
}


// given an updated chunk reference, run it through mesher
function meshChunk(self, chunk) {
  var noa = self.noa
  var matGetter = noa.registry.getBlockFaceMaterialAccessor()
  var colGetter = noa.registry.getMaterialVertexColorAccessor()
  // returns an array of chunk#Submesh
  var blockFaceMats = noa.registry._blockMats
  return chunk.mesh(matGetter, colGetter, self.useAO, self.aoVals, self.revAoVal, blockFaceMats )
}


/*
 *
 *  zoom/camera related internals
 *
*/

var tempVec = new vec3(), cachedCamPos

function getCameraFocusPos(self) {
  if (!cachedCamPos) cachedCamPos = self.noa.entities.getAABB(self.noa.cameraTarget).base
  tempVec.copyFromFloats(cachedCamPos[0], cachedCamPos[1], cachedCamPos[2])
  return tempVec
}


// check if camera zoom should be capped, or camera offset
function checkCameraObstructions(self) {
  var z = self.zoomDistance
  var slop = 0.3
  var result = pickAlongCameraVector(self, z+slop, true)
  if (result) {
    z = result.distance - slop
    var off = result.normal
    var offdist = 0.25
    self._camPosOffset.copyFromFloats(off[0], off[1], off[2]).scaleInPlace(offdist)
  } else {
    self._camPosOffset.copyFromFloats(0,0,0)
  }
  self._cappedZoom = z
}


// find location/distance to solid block, picking from player eye along camera vector
var _posVec = glvec3.create(), _vecVec = glvec3.create()

function pickAlongCameraVector(self, dist, invert) {
  var pos = getCameraFocusPos(self)
  var cam = self.getCameraVector()
  // need cam vector to be a gl-vec3 vectors to pass to noa#pick
  var m = invert ? -1 : 1
  glvec3.set(_posVec, pos.x,   pos.y,   pos.z)
  glvec3.set(_vecVec, m*cam.x, m*cam.y, m*cam.z)
  var res = self.noa.pick(_posVec, _vecVec, dist)
  if (res) res.distance = glvec3.distance(_posVec, res.position)
  return res
}


// Various updates to camera position/zoom, called every render

function updateCamera(self) {
  // set camera holder pos to cameraTarget entity position + camOffset
  getCameraFocusPos(self).addToRef(self._camPosOffset, self._cameraHolder.position)
  self._cameraHolder.rotation.copyFrom(self._rotationHolder.rotation)
  
  // tween camera towards capped position
  self._currentZoom += self._cameraZoomSpeed * (self._cappedZoom-self._currentZoom)
  self._camera.position.z = -self._currentZoom

  // check if camera is in a solid block, if so run obstruction check
  var cam = self.getCameraPosition()
  var id  = self.noa.world.getBlockID( Math.floor(cam.x), Math.floor(cam.y), Math.floor(cam.z) )
  if (id  && self.noa.registry.getBlockSolidity(id)) {
    checkCameraObstructions(self)
    self._currentZoom = self._cappedZoom
    self._camera.position.z = -self._currentZoom
  }

  // misc effects
  checkCameraEffect(self, id)
}




//  If camera's current location block id has alpha color (e.g. water), apply/remove an effect

function checkCameraEffect(self, id) {
  if (id === self._camLocBlock) return
  if (id === 0) {
    self._camScreen.setEnabled(false)
  } else {
    var matAccessor = self.noa.registry.getBlockFaceMaterialAccessor()
    var matId = matAccessor(id, 0)
    var matData = self.noa.registry.getMaterialData(matId)
    var col = matData.color
    var alpha = matData.alpha
    if (col && alpha && alpha<1) {
      self._camScreenMat.diffuseColor = new col3( col[0], col[1], col[2] )
      self._camScreenMat.alpha = alpha
      self._camScreen.setEnabled(true)
    }
  }
  self._camLocBlock = id
}






// make or get a mesh for highlighting active voxel
function getHighlightMesh(rendering) {
  var m = rendering._highlightMesh
  if (!m) {
    var mesh = BABYLON.Mesh.CreatePlane("highlight", 1.0, rendering._scene)
    var hlm = new BABYLON.StandardMaterial("highlightMat", rendering._scene)
    hlm.backFaceCulling = false
    hlm.emissiveColor = new col3(1,1,1)
    hlm.alpha = 0.2
    mesh.material = hlm
    m = rendering._highlightMesh = mesh
    // outline
    var s = 0.5
    var lines = BABYLON.Mesh.CreateLines("hightlightLines", [
      new vec3( s, s, 0),
      new vec3( s,-s, 0),
      new vec3(-s,-s, 0),
      new vec3(-s, s, 0),
      new vec3( s, s, 0)
    ], rendering._scene)
    lines.color = new col3(1,1,1)
    lines.parent = mesh

    rendering._octree.dynamicContent.push(m, lines)
  }
  return m
}



// manage materials/textures to avoid duplicating them
function getOrCreateMaterial(self, matID) {
  var name = 'terrain'+matID
  var mat = self._materialCache[name]
  if (!mat) {
    mat = makeTerrainMaterial(self, matID)
    self._materialCache[name] = mat
  }
  return mat
}








// single canonical function to make a Material for a materialID
function makeTerrainMaterial(self, id) {
  var url = self.noa.registry.getMaterialTexture(id)
  var matData = self.noa.registry.getMaterialData(id)
  var alpha = matData.alpha
  if (!url && alpha==1) {
    // base material is fine for non-textured case, if no alpha
    return self._terrainMaterial
  }
  var mat = self._terrainMaterial.clone('terrain'+id)
  if (url) {
    var tex = new BABYLON.Texture(url, self._scene, true,false, BABYLON.Texture.NEAREST_SAMPLINGMODE)
    if (matData.textureAlpha) {
      tex.hasAlpha = true
      mat.diffuseTexture = tex
    } else {
      mat.ambientTexture = tex
    }
  }
  if (matData.alpha < 1) {
    mat.alpha = matData.alpha
  }
  return mat
}






//
// Given arrays of data for an enmeshed chunk, create a 
// babylon mesh with child meshes for each terrain material
//
function makeChunkMesh(self, meshdata, id, chunk) {
  var scene = self._scene

  // create/position parent mesh
  var mesh = new BABYLON.Mesh( 'chunk_'+id, scene )
  var x = chunk.i * chunk.size
  var y = chunk.j * chunk.size
  var z = chunk.k * chunk.size
  mesh.position.x = x
  mesh.position.y = y
  mesh.position.z = z
  mesh.freezeWorldMatrix()

  // preprocess meshdata entries to merge those that use default terrain material
  var s, mdat, i
  var first = null
  var keylist = Object.keys(meshdata)
  for (i=0; i<keylist.length; ++i) {
    mdat = meshdata[keylist[i]]
    var url = self.noa.registry.getMaterialTexture(mdat.id)
    var alpha = self.noa.registry.getMaterialData(mdat.id).alpha
    if (url || alpha<1) continue

    if (!first) {
      first = mdat
    } else {
      // merge data in "mdat" onto "first"
      var offset = first.positions.length/3
      first.positions = first.positions.concat(mdat.positions)
      first.normals = first.normals.concat(mdat.normals)
      first.colors = first.colors.concat(mdat.colors)
      first.uvs = first.uvs.concat(mdat.uvs)
      // indices must be offset relative to data being merged onto
      for (var j=0, len=mdat.indices.length; j<len; ++j) {
        first.indices.push( mdat.indices[j] + offset )
      }
      // get rid of entry that's been merged
      delete meshdata[s]
    }
  }

  // go through (remaining) meshdata entries and create a mesh for each
  keylist = Object.keys(meshdata)
  for (i=0; i<keylist.length; ++i) {
    mdat = meshdata[keylist[i]]
    var matID = mdat.id
    var m = new BABYLON.Mesh( 'terr'+matID, self._scene )
    m.parent = mesh

    m.material = getOrCreateMaterial(self, matID)

    var vdat = new BABYLON.VertexData()
    vdat.positions = mdat.positions
    vdat.indices =   mdat.indices
    vdat.normals =   mdat.normals
    vdat.colors =    mdat.colors
    vdat.uvs =       mdat.uvs
    vdat.applyToMesh( m )

    m.freezeWorldMatrix();
  } 

  createOctreeBlock(self, mesh, chunk, x, y, z)

  return mesh
}



function createOctreeBlock(self, mesh, chunk, x, y, z) {
  var octree = self._octree

  if (chunk.octreeBlock) {
    var b = chunk.octreeBlock
    var i = octree.blocks.indexOf(b)
    if (i>=0) octree.blocks.splice(i,1)
    if (b.entries) b.entries.length = 0
    chunk.octreeBlock = null
  }

  var cs = chunk.size
  var min = new vec3(   x,    y,    z)
  var max = new vec3(x+cs, y+cs, z+cs)
  var block = new BABYLON.OctreeBlock(min, max)
  mesh.getChildren().map(function(m) {
    block.entries.push(m)
  })
  chunk.octreeBlock = block

  octree.blocks.push(block)
  for (var key in chunk._objectMeshes) {
    block.entries.push( chunk._objectMeshes[key] )
  }
}








},{"extend":99,"gl-vec3":124}],84:[function(require,module,exports){
'use strict';

var extend = require('extend')
var ndarray = require('ndarray')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Chunk = require('./chunk')


module.exports = function(noa, opts) {
  return new World(noa, opts)
}


var defaultOptions = {
  chunkSize: 24,
  chunkAddDistance: 2,
  chunkRemoveDistance: 3

}

/**
 * Module for managing the world, and its chunks
 * @class noa.world
 */

function World(noa, _opts) {
  this.noa = noa
  var opts = extend( defaultOptions, _opts )

  this.chunkSize = opts.chunkSize
  this.chunkAddDistance = opts.chunkAddDistance
  this.chunkRemoveDistance = opts.chunkRemoveDistance
  if (this.chunkRemoveDistance < this.chunkAddDistance) {
    this.chunkRemoveDistance = this.chunkAddDistance
  }

  // internals
  this._chunkIDsToAdd = []
  this._chunkIDsToRemove = []
  this._chunks = {}
}

inherits( World, EventEmitter )



/*
 *   PUBLIC API 
*/ 

var cs, i, j, k, chunk

/** @param x,y,z */ 
World.prototype.getBlockID = function (x,y,z) {
  cs = this.chunkSize
  i = Math.floor(x/cs)
  j = Math.floor(y/cs)
  k = Math.floor(z/cs)
  chunk = this._chunks[ getChunkID(i,j,k) ]
  if (chunk === void 0) return 0
  return chunk.get( x-i*cs, y-j*cs, z-k*cs )
  // TODO: consider constraining chunksize to be power of 2, 
  // using math tricks from voxel.js: Chunker#voxelAtCoordinates
}

/** @param x,y,z */ 
World.prototype.getBlockSolidity = function (x,y,z) {
  // very hot function, so reproduce guts of above rather than passing arrays around
  cs = this.chunkSize
  i = Math.floor(x/this.chunkSize)|0
  j = Math.floor(y/this.chunkSize)|0
  k = Math.floor(z/this.chunkSize)|0
  chunk = this._chunks[ getChunkID(i,j,k) ]
  if (chunk === void 0) return 0
  return chunk.getSolidityAt( x-i*cs, y-j*cs, z-k*cs )
}

/** @param x,y,z */
World.prototype.getBlockOpacity = function (x,y,z) {
  return this.noa.registry._blockOpacity[ this.getBlockID(x,y,z) ]
}

/** @param x,y,z */
World.prototype.getBlockTransparency = function (x,y,z) {
  return this.noa.registry._blockTransparency[ this.getBlockID(x,y,z) ]
}

/** @param x,y,z */
World.prototype.getBlockFluidity = function (x,y,z) {
  return this.noa.registry._blockIsFluid[ this.getBlockID(x,y,z) ]
}

/** @param x,y,z */
World.prototype.getBlockProperties = function (x,y,z) {
  return this.noa.registry._blockProps[ this.getBlockID(x,y,z) ]
}


/** @param x,y,z */
World.prototype.setBlockID = function (val,x,y,z) {
  cs = this.chunkSize
  i = Math.floor(x/cs)
  j = Math.floor(y/cs)
  k = Math.floor(z/cs)
  x -= i*cs
  y -= j*cs
  z -= k*cs

  // if update is on chunk border, update neighbor's padding data too
  _updateChunkAndBorders(this, i, j, k, cs, x, y, z, val)
}





World.prototype.tick = function() {
  // check player position and needed/unneeded chunks
  var pos = this.noa.getPlayerPosition()
  var cs = this.chunkSize
  var i = Math.floor(pos[0]/cs)
  var j = Math.floor(pos[1]/cs)
  var k = Math.floor(pos[2]/cs)
  var chunkID = getChunkID( i,j,k )
  if (chunkID != this._lastPlayerChunkID) {
    updateChunkQueues( this, i, j, k )
  }
  this._lastPlayerChunkID = chunkID

  // add or remove one chunk if needed. If fast, do a couple.
  var d = performance.now()
  var notDone = true
  while(notDone && (performance.now() < d+3)) {
    notDone = processChunkQueues(this, i, j, k)
  }
}


/** client should call this after creating a chunk's worth of data (as an ndarray) 
 * @param id
 * @param array
 */
World.prototype.setChunkData = function(id, array) {
  var chunk = this._chunks[id]
  chunk.array = array
  chunk.initData()
  this.emit( 'chunkAdded', chunk )
}




/*
 *    INTERNALS
*/


// canonical string ID handling for the i,j,k-th chunk
function getChunkID( i, j, k ) {
  return i+'|'+j+'|'+k
}
function parseChunkID( id ) {
  var arr = id.split('|')
  return [ parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]) ]
}



// run through chunk tracking queues looking for work to do next
function processChunkQueues(self, i, j, k) {
  if (self._chunkIDsToRemove.length) {
    var remove = parseChunkID( self._chunkIDsToRemove.shift() )
    removeChunk( self, remove[0], remove[1], remove[2] )
  } else if (self._chunkIDsToAdd.length) {
    var index = findClosestChunk( i, j, k, self._chunkIDsToAdd )
    var id = self._chunkIDsToAdd.splice(index,1)[0]
    var toadd = parseChunkID(id)
    requestNewChunk( self, toadd[0], toadd[1], toadd[2] )
  } else {
    return false
  }
  return true
}




// make a new chunk and emit an event for it to be populated with world data
function requestNewChunk( world, i, j, k ) {
  var id = getChunkID(i,j,k)
  var cs = world.chunkSize
  var chunk = new Chunk(world.noa, i, j, k, cs)
  world._chunks[id] = chunk
  var x = i*cs-1
  var y = j*cs-1
  var z = k*cs-1
  world.emit('worldDataNeeded', id, chunk.array, x, y, z)
}




function removeChunk( world, i, j, k ) {
  var id = getChunkID(i,j,k)
  world._chunks[id].dispose()
  delete world._chunks[id]
  // alert the world
  world.emit( 'chunkRemoved', i, j, k )
}





// for a given chunk (i/j/k) and local location (x/y/z), 
// update all chunks that need it (including border chunks with the 
// changed block in their 1-block padding)

function _updateChunkAndBorders(world, i, j, k, size, x, y, z, val) {
  // can't for the life of me think of a more sensible way to do this...
  var iBorder = (x===0) ? -1 : (x===size-1) ? 1 : 0
  var jBorder = (y===0) ? -1 : (y===size-1) ? 1 : 0
  var kBorder = (z===0) ? -1 : (z===size-1) ? 1 : 0

  for (var di=-1; di<2; ++di) {
    for (var dj=-1; dj<2; ++dj) {
      for (var dk=-1; dk<2; ++dk) {

        if ((di===0 || di===iBorder) &&
            (dj===0 || dj===jBorder) &&
            (dk===0 || dk===kBorder) ) {
          _modifyBlockData(world, i+di, j+dj, k+dk,
                           [size, x, -1][di+1], 
                           [size, y, -1][dj+1], 
                           [size, z, -1][dk+1], 
                           val)
        }

      }
    }
  }
}



// internal function to modify a chunk's block

function _modifyBlockData( world, i, j, k, x, y, z, val ) {
  var id = getChunkID(i,j,k)
  var chunk = world._chunks[id]
  if (!chunk) return
  chunk.set(x, y, z, val)
  world.emit('chunkChanged', chunk)
}




// check for needed/unneeded chunks around (ci,cj,ck)
function updateChunkQueues( world, ci, cj, ck ) {
  var chunks = world._chunks,
      add = world.chunkAddDistance,
      rem = world.chunkRemoveDistance,
      id
  // enqueue chunks needing to be added
  for (var i=ci-add; i<=ci+add; ++i) {
    for (var j=cj-add; j<=cj+add; ++j) {
      for (var k=ck-add; k<=ck+add; ++k) {
        id = getChunkID(i,j,k)
        if (chunks[id]) continue
        enqueueID(   id, world._chunkIDsToAdd )
        unenqueueID( id, world._chunkIDsToRemove )
      }
    }
  }
  // enqueue chunks needing to be removed
  for (id in world._chunks) {
    var loc = parseChunkID(id)
    if ((Math.abs(loc[0]-ci) > rem) ||
        (Math.abs(loc[1]-cj) > rem) ||
        (Math.abs(loc[2]-ck) > rem)) {
      enqueueID(   id, world._chunkIDsToRemove )
      unenqueueID( id, world._chunkIDsToAdd )
    }
  }
}


// uniquely enqueue a string id into an array of them
function enqueueID( id, queue ) {
  var i = queue.indexOf(id)
  if (i>=0) return
  queue.push(id)
}

// remove string id from queue if it exists
function unenqueueID( id, queue ) {
  var i = queue.indexOf(id)
  if (i>=0) queue.splice(i,1)
}

// find index of nearest chunk in queue of [i,j,k] arrays
function findClosestChunk( ci, cj, ck, queue ) {
  var index = -1, 
      dist = Number.POSITIVE_INFINITY
  for (var i=0; i<queue.length; ++i) {
    var qarr = parseChunkID(queue[i])
    var di = qarr[0]-ci
    var dj = qarr[1]-cj
    var dk = qarr[2]-ck
    var dsq = di*di + dj*dj + dk*dk
    if (dsq<dist) {
      dist = dsq
      index = i
      // bail early if very closeby
      if (dsq<3) return i
    }
  }
  return index
}








},{"./chunk":77,"events":195,"extend":99,"inherits":146,"ndarray":147}],85:[function(require,module,exports){
module.exports = AABB

var vec3 = require('gl-matrix').vec3

function AABB(pos, vec) {

  if(!(this instanceof AABB)) {
    return new AABB(pos, vec)
  }

  var pos2 = vec3.create()
  vec3.add(pos2, pos, vec)
 
  this.base = vec3.min(vec3.create(), pos, pos2)
//  this.vec = vec
  this.vec = vec3.clone(vec)
  this.max = vec3.max(vec3.create(), pos, pos2)

  this.mag = vec3.length(this.vec)

}

var cons = AABB
  , proto = cons.prototype

proto.width = function() {
  return this.vec[0]
}

proto.height = function() {
  return this.vec[1]
}

proto.depth = function() {
  return this.vec[2]
}

proto.x0 = function() {
  return this.base[0]
}

proto.y0 = function() {
  return this.base[1]
}

proto.z0 = function() {
  return this.base[2]
}

proto.x1 = function() {
  return this.max[0]
}

proto.y1 = function() {
  return this.max[1]
}

proto.z1 = function() {
  return this.max[2]
}

proto.translate = function(by) {
  vec3.add(this.max, this.max, by)
  vec3.add(this.base, this.base, by)
  return this
}

proto.expand = function(aabb) {
  var max = vec3.create()
    , min = vec3.create()

  vec3.max(max, aabb.max, this.max)
  vec3.min(min, aabb.base, this.base)
  vec3.sub(max, max, min)

  return new AABB(min, max)
}

proto.intersects = function(aabb) {
  if(aabb.base[0] > this.max[0]) return false
  if(aabb.base[1] > this.max[1]) return false
  if(aabb.base[2] > this.max[2]) return false
  if(aabb.max[0] < this.base[0]) return false
  if(aabb.max[1] < this.base[1]) return false
  if(aabb.max[2] < this.base[2]) return false

  return true
}

proto.touches = function(aabb) {

  var intersection = this.union(aabb);

  return (intersection !== null) &&
         ((intersection.width() == 0) ||
         (intersection.height() == 0) || 
         (intersection.depth() == 0))

}

proto.union = function(aabb) {
  if(!this.intersects(aabb)) return null

  var base_x = Math.max(aabb.base[0], this.base[0])
    , base_y = Math.max(aabb.base[1], this.base[1])
    , base_z = Math.max(aabb.base[2], this.base[2])
    , max_x = Math.min(aabb.max[0], this.max[0])
    , max_y = Math.min(aabb.max[1], this.max[1])
    , max_z = Math.min(aabb.max[2], this.max[2])

  return new AABB([base_x, base_y, base_z], [max_x - base_x, max_y - base_y, max_z - base_z])
}





},{"gl-matrix":86}],86:[function(require,module,exports){
/**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.2.1
 */

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


(function(_global) {
  "use strict";

  var shim = {};
  if (typeof(exports) === 'undefined') {
    if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
      shim.exports = {};
      define(function() {
        return shim.exports;
      });
    } else {
      // gl-matrix lives in a browser, define its namespaces in global
      shim.exports = typeof(window) !== 'undefined' ? window : _global;
    }
  }
  else {
    // gl-matrix lives in commonjs, define its namespaces in exports
    shim.exports = exports;
  }

  (function(exports) {
    /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


if(!GLMAT_EPSILON) {
    var GLMAT_EPSILON = 0.000001;
}

if(!GLMAT_ARRAY_TYPE) {
    var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
}

if(!GLMAT_RANDOM) {
    var GLMAT_RANDOM = Math.random;
}

/**
 * @class Common utilities
 * @name glMatrix
 */
var glMatrix = {};

/**
 * Sets the type of array used when creating new vectors and matricies
 *
 * @param {Type} type Array type, such as Float32Array or Array
 */
glMatrix.setMatrixArrayType = function(type) {
    GLMAT_ARRAY_TYPE = type;
}

if(typeof(exports) !== 'undefined') {
    exports.glMatrix = glMatrix;
}

var degree = Math.PI / 180;

/**
* Convert Degree To Radian
*
* @param {Number} Angle in Degrees
*/
glMatrix.toRadian = function(a){
     return a * degree;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2 Dimensional Vector
 * @name vec2
 */

var vec2 = {};

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
vec2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = 0;
    out[1] = 0;
    return out;
};

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */
vec2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */
vec2.fromValues = function(x, y) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */
vec2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
vec2.set = function(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

/**
 * Alias for {@link vec2.subtract}
 * @function
 */
vec2.sub = vec2.subtract;

/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

/**
 * Alias for {@link vec2.multiply}
 * @function
 */
vec2.mul = vec2.multiply;

/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
};

/**
 * Alias for {@link vec2.divide}
 * @function
 */
vec2.div = vec2.divide;

/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
};

/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
};

/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */
vec2.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
};

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */
vec2.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */
vec2.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.distance}
 * @function
 */
vec2.dist = vec2.distance;

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec2.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */
vec2.sqrDist = vec2.squaredDistance;

/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */
vec2.length = function (a) {
    var x = a[0],
        y = a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.length}
 * @function
 */
vec2.len = vec2.length;

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec2.squaredLength = function (a) {
    var x = a[0],
        y = a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */
vec2.sqrLen = vec2.squaredLength;

/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */
vec2.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
};

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
vec2.normalize = function(out, a) {
    var x = a[0],
        y = a[1];
    var len = x*x + y*y;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
vec2.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */
vec2.cross = function(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
};

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec2} out
 */
vec2.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */
vec2.random = function (out, scale) {
    scale = scale || 1.0;
    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    out[0] = Math.cos(r) * scale;
    out[1] = Math.sin(r) * scale;
    return out;
};

/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
};

/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2d = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
};

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat3 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat4 = function(out, a, m) {
    var x = a[0], 
        y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
};

/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec2.forEach = (function() {
    var vec = vec2.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 2;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec2} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec2.str = function (a) {
    return 'vec2(' + a[0] + ', ' + a[1] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec2 = vec2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3 Dimensional Vector
 * @name vec3
 */

var vec3 = {};

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
vec3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
};

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
vec3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
vec3.fromValues = function(x, y, z) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
vec3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
vec3.set = function(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

/**
 * Alias for {@link vec3.subtract}
 * @function
 */
vec3.sub = vec3.subtract;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

/**
 * Alias for {@link vec3.multiply}
 * @function
 */
vec3.mul = vec3.multiply;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
};

/**
 * Alias for {@link vec3.divide}
 * @function
 */
vec3.div = vec3.divide;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
};

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
};

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
vec3.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
};

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
vec3.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
vec3.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.distance}
 * @function
 */
vec3.dist = vec3.distance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec3.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */
vec3.sqrDist = vec3.squaredDistance;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
vec3.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.length}
 * @function
 */
vec3.len = vec3.length;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec3.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */
vec3.sqrLen = vec3.squaredLength;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
vec3.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
};

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
vec3.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    var len = x*x + y*y + z*z;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
vec3.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.cross = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
vec3.random = function (out, scale) {
    scale = scale || 1.0;

    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    var z = (GLMAT_RANDOM() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;

    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale;
    return out;
};

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return out;
};

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat3 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
};

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
vec3.transformQuat = function(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/*
* Rotate a 3D vector around the x-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateX = function(out, a, b, c){
   var p = [], r=[];
	  //Translate point to the origin
	  p[0] = a[0] - b[0];
	  p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];

	  //perform rotation
	  r[0] = p[0];
	  r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
	  r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

	  //translate to correct position
	  out[0] = r[0] + b[0];
	  out[1] = r[1] + b[1];
	  out[2] = r[2] + b[2];

  	return out;
};

/*
* Rotate a 3D vector around the y-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateY = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
  	r[1] = p[1];
  	r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/*
* Rotate a 3D vector around the z-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateZ = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
  	r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
  	r[2] = p[2];
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec3.forEach = (function() {
    var vec = vec3.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 3;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec3} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec3.str = function (a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec3 = vec3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4 Dimensional Vector
 * @name vec4
 */

var vec4 = {};

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
vec4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
};

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {vec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */
vec4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */
vec4.fromValues = function(x, y, z, w) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the source vector
 * @returns {vec4} out
 */
vec4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */
vec4.set = function(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link vec4.subtract}
 * @function
 */
vec4.sub = vec4.subtract;

/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
};

/**
 * Alias for {@link vec4.multiply}
 * @function
 */
vec4.mul = vec4.multiply;

/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
};

/**
 * Alias for {@link vec4.divide}
 * @function
 */
vec4.div = vec4.divide;

/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
};

/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
};

/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */
vec4.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */
vec4.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} distance between a and b
 */
vec4.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.distance}
 * @function
 */
vec4.dist = vec4.distance;

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec4.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */
vec4.sqrDist = vec4.squaredDistance;

/**
 * Calculates the length of a vec4
 *
 * @param {vec4} a vector to calculate length of
 * @returns {Number} length of a
 */
vec4.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.length}
 * @function
 */
vec4.len = vec4.length;

/**
 * Calculates the squared length of a vec4
 *
 * @param {vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec4.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */
vec4.sqrLen = vec4.squaredLength;

/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to negate
 * @returns {vec4} out
 */
vec4.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
};

/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to normalize
 * @returns {vec4} out
 */
vec4.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
        out[3] = a[3] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} dot product of a and b
 */
vec4.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec4} out
 */
vec4.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */
vec4.random = function (out, scale) {
    scale = scale || 1.0;

    //TODO: This is a pretty awful way of doing this. Find something better.
    out[0] = GLMAT_RANDOM();
    out[1] = GLMAT_RANDOM();
    out[2] = GLMAT_RANDOM();
    out[3] = GLMAT_RANDOM();
    vec4.normalize(out, out);
    vec4.scale(out, out, scale);
    return out;
};

/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec4} out
 */
vec4.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
};

/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec4} out
 */
vec4.transformQuat = function(out, a, q) {
    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec4.forEach = (function() {
    var vec = vec4.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 4;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec4} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec4.str = function (a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec4 = vec4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x2 Matrix
 * @name mat2
 */

var mat2 = {};

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */
mat2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {mat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */
mat2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */
mat2.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a1 = a[1];
        out[1] = a[2];
        out[2] = a1;
    } else {
        out[0] = a[0];
        out[1] = a[2];
        out[2] = a[1];
        out[3] = a[3];
    }
    
    return out;
};

/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

        // Calculate the determinant
        det = a0 * a3 - a2 * a1;

    if (!det) {
        return null;
    }
    det = 1.0 / det;
    
    out[0] =  a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] =  a0 * det;

    return out;
};

/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.adjoint = function(out, a) {
    // Caching this value is nessecary if out == a
    var a0 = a[0];
    out[0] =  a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] =  a0;

    return out;
};

/**
 * Calculates the determinant of a mat2
 *
 * @param {mat2} a the source matrix
 * @returns {Number} determinant of a
 */
mat2.determinant = function (a) {
    return a[0] * a[3] - a[2] * a[1];
};

/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    return out;
};

/**
 * Alias for {@link mat2.multiply}
 * @function
 */
mat2.mul = mat2.multiply;

/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */
mat2.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    return out;
};

/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/
mat2.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    return out;
};

/**
 * Returns a string representation of a mat2
 *
 * @param {mat2} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2.str = function (a) {
    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

/**
 * Returns Frobenius norm of a mat2
 *
 * @param {mat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
};

/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {mat2} L the lower triangular matrix 
 * @param {mat2} D the diagonal matrix 
 * @param {mat2} U the upper triangular matrix 
 * @param {mat2} a the input matrix to factorize
 */

mat2.LDU = function (L, D, U, a) { 
    L[2] = a[2]/a[0]; 
    U[0] = a[0]; 
    U[1] = a[1]; 
    U[3] = a[3] - L[2] * U[1]; 
    return [L, D, U];       
}; 

if(typeof(exports) !== 'undefined') {
    exports.mat2 = mat2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x3 Matrix
 * @name mat2d
 * 
 * @description 
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, c, tx,
 *  b, d, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, c, tx,
 *  b, d, ty,
 *  0, 0, 1]
 * </pre>
 * The last row is ignored so the array is shorter and operations are faster.
 */

var mat2d = {};

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.create = function() {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {mat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */
mat2d.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.invert = function(out, a) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
        atx = a[4], aty = a[5];

    var det = aa * ad - ab * ac;
    if(!det){
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
};

/**
 * Calculates the determinant of a mat2d
 *
 * @param {mat2d} a the source matrix
 * @returns {Number} determinant of a
 */
mat2d.determinant = function (a) {
    return a[0] * a[3] - a[1] * a[2];
};

/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    out[4] = a0 * b4 + a2 * b5 + a4;
    out[5] = a1 * b4 + a3 * b5 + a5;
    return out;
};

/**
 * Alias for {@link mat2d.multiply}
 * @function
 */
mat2d.mul = mat2d.multiply;


/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */
mat2d.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/
mat2d.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/
mat2d.translate = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
};

/**
 * Returns a string representation of a mat2d
 *
 * @param {mat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2d.str = function (a) {
    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
};

/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {mat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2d.frob = function (a) { 
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
}; 

if(typeof(exports) !== 'undefined') {
    exports.mat2d = mat2d;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3x3 Matrix
 * @name mat3
 */

var mat3 = {};

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
mat3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {mat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */
mat3.fromMat4 = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
};

/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {mat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */
mat3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
mat3.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a12 = a[5];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a01;
        out[5] = a[7];
        out[6] = a02;
        out[7] = a12;
    } else {
        out[0] = a[0];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a[1];
        out[4] = a[4];
        out[5] = a[7];
        out[6] = a[2];
        out[7] = a[5];
        out[8] = a[8];
    }
    
    return out;
};

/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
};

/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    out[0] = (a11 * a22 - a12 * a21);
    out[1] = (a02 * a21 - a01 * a22);
    out[2] = (a01 * a12 - a02 * a11);
    out[3] = (a12 * a20 - a10 * a22);
    out[4] = (a00 * a22 - a02 * a20);
    out[5] = (a02 * a10 - a00 * a12);
    out[6] = (a10 * a21 - a11 * a20);
    out[7] = (a01 * a20 - a00 * a21);
    out[8] = (a00 * a11 - a01 * a10);
    return out;
};

/**
 * Calculates the determinant of a mat3
 *
 * @param {mat3} a the source matrix
 * @returns {Number} determinant of a
 */
mat3.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
};

/**
 * Alias for {@link mat3.multiply}
 * @function
 */
mat3.mul = mat3.multiply;

/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */
mat3.translate = function(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],
        x = v[0], y = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
};

/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
mat3.rotate = function (out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        s = Math.sin(rad),
        c = Math.cos(rad);

    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;

    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
};

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/
mat3.scale = function(out, a, v) {
    var x = v[0], y = v[1];

    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];

    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];

    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat2d} a the matrix to copy
 * @returns {mat3} out
 **/
mat3.fromMat2d = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;

    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;

    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
};

/**
* Calculates a 3x3 matrix from the given quaternion
*
* @param {mat3} out mat3 receiving operation result
* @param {quat} q Quaternion to create matrix from
*
* @returns {mat3} out
*/
mat3.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;

    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;

    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;

    return out;
};

/**
* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
*
* @param {mat3} out mat3 receiving operation result
* @param {mat4} a Mat4 to derive the normal matrix from
*
* @returns {mat3} out
*/
mat3.normalFromMat4 = function (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
};

/**
 * Returns a string representation of a mat3
 *
 * @param {mat3} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat3.str = function (a) {
    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

/**
 * Returns Frobenius norm of a mat3
 *
 * @param {mat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat3.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
};


if(typeof(exports) !== 'undefined') {
    exports.mat3 = mat3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4x4 Matrix
 * @name mat4
 */

var mat4 = {};

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
mat4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
mat4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
mat4.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
mat4.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/**
 * Alias for {@link mat4.multiply}
 * @function
 */
mat4.mul = mat4.multiply;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.translate = function (out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
mat4.scale = function(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
mat4.rotate = function (out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < GLMAT_EPSILON) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateX = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateY = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateZ = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
mat4.fromRotationTranslation = function (out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};

mat4.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.frustum = function (out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.perspective = function (out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.ortho = function (out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
mat4.lookAt = function (out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < GLMAT_EPSILON &&
        Math.abs(eyey - centery) < GLMAT_EPSILON &&
        Math.abs(eyez - centerz) < GLMAT_EPSILON) {
        return mat4.identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat4.str = function (a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

/**
 * Returns Frobenius norm of a mat4
 *
 * @param {mat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat4.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
};


if(typeof(exports) !== 'undefined') {
    exports.mat4 = mat4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class Quaternion
 * @name quat
 */

var quat = {};

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
quat.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */
quat.rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(out, a, b) {
        var dot = vec3.dot(a, b);
        if (dot < -0.999999) {
            vec3.cross(tmpvec3, xUnitVec3, a);
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(tmpvec3, yUnitVec3, a);
            vec3.normalize(tmpvec3, tmpvec3);
            quat.setAxisAngle(out, tmpvec3, Math.PI);
            return out;
        } else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(tmpvec3, a, b);
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return quat.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {vec3} view  the vector representing the viewing direction
 * @param {vec3} right the vector representing the local "right" direction
 * @param {vec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */
quat.setAxes = (function() {
    var matr = mat3.create();

    return function(out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return quat.normalize(out, quat.fromMat3(out, matr));
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */
quat.clone = vec4.clone;

/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */
quat.fromValues = vec4.fromValues;

/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the source quaternion
 * @returns {quat} out
 * @function
 */
quat.copy = vec4.copy;

/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */
quat.set = vec4.set;

/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */
quat.identity = function(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/
quat.setAxisAngle = function(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 * @function
 */
quat.add = vec4.add;

/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 */
quat.multiply = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 */
quat.mul = quat.multiply;

/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */
quat.scale = vec4.scale;

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateX = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateY = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateZ = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate W component of
 * @returns {quat} out
 */
quat.calculateW = function (out, a) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */
quat.dot = vec4.dot;

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 * @function
 */
quat.lerp = vec4.lerp;

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 */
quat.slerp = function (out, a, b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    
    return out;
};

/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate inverse of
 * @returns {quat} out
 */
quat.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate conjugate of
 * @returns {quat} out
 */
quat.conjugate = function (out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {quat} a vector to calculate length of
 * @returns {Number} length of a
 * @function
 */
quat.length = vec4.length;

/**
 * Alias for {@link quat.length}
 * @function
 */
quat.len = quat.length;

/**
 * Calculates the squared length of a quat
 *
 * @param {quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */
quat.squaredLength = vec4.squaredLength;

/**
 * Alias for {@link quat.squaredLength}
 * @function
 */
quat.sqrLen = quat.squaredLength;

/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */
quat.normalize = vec4.normalize;

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
quat.fromMat3 = function(out, m) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[7]-m[5])*fRoot;
        out[1] = (m[2]-m[6])*fRoot;
        out[2] = (m[3]-m[1])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;
        
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[k*3+j] - m[j*3+k]) * fRoot;
        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }
    
    return out;
};

/**
 * Returns a string representation of a quatenion
 *
 * @param {quat} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
quat.str = function (a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.quat = quat;
}
;













  })(shim.exports);
})(this);

},{}],87:[function(require,module,exports){
'use strict'

module.exports = boxIntersectWrapper

var pool = require('typedarray-pool')
var sweep = require('./lib/sweep')
var boxIntersectIter = require('./lib/intersect')

function boxEmpty(d, box) {
  for(var j=0; j<d; ++j) {
    if(!(box[j] <= box[j+d])) {
      return true
    }
  }
  return false
}

//Unpack boxes into a flat typed array, remove empty boxes
function convertBoxes(boxes, d, data, ids) {
  var ptr = 0
  var count = 0
  for(var i=0, n=boxes.length; i<n; ++i) {
    var b = boxes[i]
    if(boxEmpty(d, b)) {
      continue
    }
    for(var j=0; j<2*d; ++j) {
      data[ptr++] = b[j]
    }
    ids[count++] = i
  }
  return count
}

//Perform type conversions, check bounds
function boxIntersect(red, blue, visit, full) {
  var n = red.length
  var m = blue.length

  //If either array is empty, then we can skip this whole thing
  if(n <= 0 || m <= 0) {
    return
  }

  //Compute dimension, if it is 0 then we skip
  var d = (red[0].length)>>>1
  if(d <= 0) {
    return
  }

  var retval

  //Convert red boxes
  var redList  = pool.mallocDouble(2*d*n)
  var redIds   = pool.mallocInt32(n)
  n = convertBoxes(red, d, redList, redIds)

  if(n > 0) {
    if(d === 1 && full) {
      //Special case: 1d complete
      sweep.init(n)
      retval = sweep.sweepComplete(
        d, visit, 
        0, n, redList, redIds,
        0, n, redList, redIds)
    } else {

      //Convert blue boxes
      var blueList = pool.mallocDouble(2*d*m)
      var blueIds  = pool.mallocInt32(m)
      m = convertBoxes(blue, d, blueList, blueIds)

      if(m > 0) {
        sweep.init(n+m)

        if(d === 1) {
          //Special case: 1d bipartite
          retval = sweep.sweepBipartite(
            d, visit, 
            0, n, redList,  redIds,
            0, m, blueList, blueIds)
        } else {
          //General case:  d>1
          retval = boxIntersectIter(
            d, visit,    full,
            n, redList,  redIds,
            m, blueList, blueIds)
        }

        pool.free(blueList)
        pool.free(blueIds)
      }
    }

    pool.free(redList)
    pool.free(redIds)
  }

  return retval
}


var RESULT

function appendItem(i,j) {
  RESULT.push([i,j])
}

function intersectFullArray(x) {
  RESULT = []
  boxIntersect(x, x, appendItem, true)
  return RESULT
}

function intersectBipartiteArray(x, y) {
  RESULT = []
  boxIntersect(x, y, appendItem, false)
  return RESULT
}

//User-friendly wrapper, handle full input and no-visitor cases
function boxIntersectWrapper(arg0, arg1, arg2) {
  var result
  switch(arguments.length) {
    case 1:
      return intersectFullArray(arg0)
    case 2:
      if(typeof arg1 === 'function') {
        return boxIntersect(arg0, arg0, arg1, true)
      } else {
        return intersectBipartiteArray(arg0, arg1)
      }
    case 3:
      return boxIntersect(arg0, arg1, arg2, false)
    default:
      throw new Error('box-intersect: Invalid arguments')
  }
}
},{"./lib/intersect":89,"./lib/sweep":93,"typedarray-pool":96}],88:[function(require,module,exports){
'use strict'

var DIMENSION   = 'd'
var AXIS        = 'ax'
var VISIT       = 'vv'
var FLIP        = 'fp'

var ELEM_SIZE   = 'es'

var RED_START   = 'rs'
var RED_END     = 're'
var RED_BOXES   = 'rb'
var RED_INDEX   = 'ri'
var RED_PTR     = 'rp'

var BLUE_START  = 'bs'
var BLUE_END    = 'be'
var BLUE_BOXES  = 'bb'
var BLUE_INDEX  = 'bi'
var BLUE_PTR    = 'bp'

var RETVAL      = 'rv'

var INNER_LABEL = 'Q'

var ARGS = [
  DIMENSION,
  AXIS,
  VISIT,
  RED_START,
  RED_END,
  RED_BOXES,
  RED_INDEX,
  BLUE_START,
  BLUE_END,
  BLUE_BOXES,
  BLUE_INDEX
]

function generateBruteForce(redMajor, flip, full) {
  var funcName = 'bruteForce' + 
    (redMajor ? 'Red' : 'Blue') + 
    (flip ? 'Flip' : '') +
    (full ? 'Full' : '')

  var code = ['function ', funcName, '(', ARGS.join(), '){',
    'var ', ELEM_SIZE, '=2*', DIMENSION, ';']

  var redLoop = 
    'for(var i=' + RED_START + ',' + RED_PTR + '=' + ELEM_SIZE + '*' + RED_START + ';' +
        'i<' + RED_END +';' +
        '++i,' + RED_PTR + '+=' + ELEM_SIZE + '){' +
        'var x0=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '],' +
            'x1=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '+' + DIMENSION + '],' +
            'xi=' + RED_INDEX + '[i];'

  var blueLoop = 
    'for(var j=' + BLUE_START + ',' + BLUE_PTR + '=' + ELEM_SIZE + '*' + BLUE_START + ';' +
        'j<' + BLUE_END + ';' +
        '++j,' + BLUE_PTR + '+=' + ELEM_SIZE + '){' +
        'var y0=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '],' +
            (full ? 'y1=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '+' + DIMENSION + '],' : '') +
            'yi=' + BLUE_INDEX + '[j];'

  if(redMajor) {
    code.push(redLoop, INNER_LABEL, ':', blueLoop)
  } else {
    code.push(blueLoop, INNER_LABEL, ':', redLoop)
  }

  if(full) {
    code.push('if(y1<x0||x1<y0)continue;')
  } else if(flip) {
    code.push('if(y0<=x0||x1<y0)continue;')
  } else {
    code.push('if(y0<x0||x1<y0)continue;')
  }

  code.push('for(var k='+AXIS+'+1;k<'+DIMENSION+';++k){'+
    'var r0='+RED_BOXES+'[k+'+RED_PTR+'],'+
        'r1='+RED_BOXES+'[k+'+DIMENSION+'+'+RED_PTR+'],'+
        'b0='+BLUE_BOXES+'[k+'+BLUE_PTR+'],'+
        'b1='+BLUE_BOXES+'[k+'+DIMENSION+'+'+BLUE_PTR+'];'+
      'if(r1<b0||b1<r0)continue ' + INNER_LABEL + ';}' +
      'var ' + RETVAL + '=' + VISIT + '(')

  if(flip) {
    code.push('yi,xi')
  } else {
    code.push('xi,yi')
  }

  code.push(');if(' + RETVAL + '!==void 0)return ' + RETVAL + ';}}}')

  return {
    name: funcName, 
    code: code.join('')
  }
}

function bruteForcePlanner(full) {
  var funcName = 'bruteForce' + (full ? 'Full' : 'Partial')
  var prefix = []
  var fargs = ARGS.slice()
  if(!full) {
    fargs.splice(3, 0, FLIP)
  }

  var code = ['function ' + funcName + '(' + fargs.join() + '){']

  function invoke(redMajor, flip) {
    var res = generateBruteForce(redMajor, flip, full)
    prefix.push(res.code)
    code.push('return ' + res.name + '(' + ARGS.join() + ');')
  }

  code.push('if(' + RED_END + '-' + RED_START + '>' +
                    BLUE_END + '-' + BLUE_START + '){')

  if(full) {
    invoke(true, false)
    code.push('}else{')
    invoke(false, false)
  } else {
    code.push('if(' + FLIP + '){')
    invoke(true, true)
    code.push('}else{')
    invoke(true, false)
    code.push('}}else{if(' + FLIP + '){')
    invoke(false, true)
    code.push('}else{')
    invoke(false, false)
    code.push('}')
  }
  code.push('}}return ' + funcName)

  var codeStr = prefix.join('') + code.join('')
  var proc = new Function(codeStr)
  return proc()
}


exports.partial = bruteForcePlanner(false)
exports.full    = bruteForcePlanner(true)
},{}],89:[function(require,module,exports){
'use strict'

module.exports = boxIntersectIter

var pool = require('typedarray-pool')
var bits = require('bit-twiddle')
var bruteForce = require('./brute')
var bruteForcePartial = bruteForce.partial
var bruteForceFull = bruteForce.full
var sweep = require('./sweep')
var findMedian = require('./median')
var genPartition = require('./partition')

//Twiddle parameters
var BRUTE_FORCE_CUTOFF    = 128       //Cut off for brute force search
var SCAN_CUTOFF           = (1<<22)   //Cut off for two way scan
var SCAN_COMPLETE_CUTOFF  = (1<<22)  

//Partition functions
var partitionInteriorContainsInterval = genPartition(
  '!(lo>=p0)&&!(p1>=hi)', 
  ['p0', 'p1'])

var partitionStartEqual = genPartition(
  'lo===p0',
  ['p0'])

var partitionStartLessThan = genPartition(
  'lo<p0',
  ['p0'])

var partitionEndLessThanEqual = genPartition(
  'hi<=p0',
  ['p0'])

var partitionContainsPoint = genPartition(
  'lo<=p0&&p0<=hi',
  ['p0'])

var partitionContainsPointProper = genPartition(
  'lo<p0&&p0<=hi',
  ['p0'])

//Frame size for iterative loop
var IFRAME_SIZE = 6
var DFRAME_SIZE = 2

//Data for box statck
var INIT_CAPACITY = 1024
var BOX_ISTACK  = pool.mallocInt32(INIT_CAPACITY)
var BOX_DSTACK  = pool.mallocDouble(INIT_CAPACITY)

//Initialize iterative loop queue
function iterInit(d, count) {
  var levels = (8 * bits.log2(count+1) * (d+1))|0
  var maxInts = bits.nextPow2(IFRAME_SIZE*levels)
  if(BOX_ISTACK.length < maxInts) {
    pool.free(BOX_ISTACK)
    BOX_ISTACK = pool.mallocInt32(maxInts)
  }
  var maxDoubles = bits.nextPow2(DFRAME_SIZE*levels)
  if(BOX_DSTACK < maxDoubles) {
    pool.free(BOX_DSTACK)
    BOX_DSTACK = pool.mallocDouble(maxDoubles)
  }
}

//Append item to queue
function iterPush(ptr,
  axis, 
  redStart, redEnd, 
  blueStart, blueEnd, 
  state, 
  lo, hi) {

  var iptr = IFRAME_SIZE * ptr
  BOX_ISTACK[iptr]   = axis
  BOX_ISTACK[iptr+1] = redStart
  BOX_ISTACK[iptr+2] = redEnd
  BOX_ISTACK[iptr+3] = blueStart
  BOX_ISTACK[iptr+4] = blueEnd
  BOX_ISTACK[iptr+5] = state

  var dptr = DFRAME_SIZE * ptr
  BOX_DSTACK[dptr]   = lo
  BOX_DSTACK[dptr+1] = hi
}

//Special case:  Intersect single point with list of intervals
function onePointPartial(
  d, axis, visit, flip,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d
  var bluePtr  = blueOffset * elemSize
  var blueX    = blue[bluePtr + axis]

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var r0 = red[redPtr+axis]
    var r1 = red[redPtr+axis+d]
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    if(flip && blueX === r0) {
      continue
    }
    var redId = redIndex[i]
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j]
      var r1 = red[redPtr+j+d]
      var b0 = blue[bluePtr+j]
      var b1 = blue[bluePtr+j+d]
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval
    if(flip) {
      retval = visit(blueId, redId)
    } else {
      retval = visit(redId, blueId)
    }
    if(retval !== void 0) {
      return retval
    }
  }
}

//Special case:  Intersect one point with list of intervals
function onePointFull(
  d, axis, visit,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d
  var bluePtr  = blueOffset * elemSize
  var blueX    = blue[bluePtr + axis]

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var redId = redIndex[i]
    if(redId === blueId) {
      continue
    }
    var r0 = red[redPtr+axis]
    var r1 = red[redPtr+axis+d]
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j]
      var r1 = red[redPtr+j+d]
      var b0 = blue[bluePtr+j]
      var b1 = blue[bluePtr+j+d]
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval = visit(redId, blueId)
    if(retval !== void 0) {
      return retval
    }
  }
}

//The main box intersection routine
function boxIntersectIter(
  d, visit, initFull,
  xSize, xBoxes, xIndex,
  ySize, yBoxes, yIndex) {

  //Reserve memory for stack
  iterInit(d, xSize + ySize)

  var top  = 0
  var elemSize = 2 * d
  var retval

  iterPush(top++,
      0,
      0, xSize,
      0, ySize,
      initFull ? 16 : 0, 
      -Infinity, Infinity)
  if(!initFull) {
    iterPush(top++,
      0,
      0, ySize,
      0, xSize,
      1, 
      -Infinity, Infinity)
  }

  while(top > 0) {
    top  -= 1

    var iptr = top * IFRAME_SIZE
    var axis      = BOX_ISTACK[iptr]
    var redStart  = BOX_ISTACK[iptr+1]
    var redEnd    = BOX_ISTACK[iptr+2]
    var blueStart = BOX_ISTACK[iptr+3]
    var blueEnd   = BOX_ISTACK[iptr+4]
    var state     = BOX_ISTACK[iptr+5]

    var dptr = top * DFRAME_SIZE
    var lo        = BOX_DSTACK[dptr]
    var hi        = BOX_DSTACK[dptr+1]

    //Unpack state info
    var flip      = (state & 1)
    var full      = !!(state & 16)

    //Unpack indices
    var red       = xBoxes
    var redIndex  = xIndex
    var blue      = yBoxes
    var blueIndex = yIndex
    if(flip) {
      red         = yBoxes
      redIndex    = yIndex
      blue        = xBoxes
      blueIndex   = xIndex
    }

    if(state & 2) {
      redEnd = partitionStartLessThan(
        d, axis,
        redStart, redEnd, red, redIndex,
        hi)
      if(redStart >= redEnd) {
        continue
      }
    }
    if(state & 4) {
      redStart = partitionEndLessThanEqual(
        d, axis,
        redStart, redEnd, red, redIndex,
        lo)
      if(redStart >= redEnd) {
        continue
      }
    }
    
    var redCount  = redEnd  - redStart
    var blueCount = blueEnd - blueStart

    if(full) {
      if(d * redCount * (redCount + blueCount) < SCAN_COMPLETE_CUTOFF) {
        retval = sweep.scanComplete(
          d, axis, visit, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    } else {
      if(d * Math.min(redCount, blueCount) < BRUTE_FORCE_CUTOFF) {
        //If input small, then use brute force
        retval = bruteForcePartial(
            d, axis, visit, flip,
            redStart,  redEnd,  red,  redIndex,
            blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      } else if(d * redCount * blueCount < SCAN_CUTOFF) {
        //If input medium sized, then use sweep and prune
        retval = sweep.scanBipartite(
          d, axis, visit, flip, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    }
    
    //First, find all red intervals whose interior contains (lo,hi)
    var red0 = partitionInteriorContainsInterval(
      d, axis, 
      redStart, redEnd, red, redIndex,
      lo, hi)

    //Lower dimensional case
    if(redStart < red0) {

      if(d * (red0 - redStart) < BRUTE_FORCE_CUTOFF) {
        //Special case for small inputs: use brute force
        retval = bruteForceFull(
          d, axis+1, visit,
          redStart, red0, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
      } else if(axis === d-2) {
        if(flip) {
          retval = sweep.sweepBipartite(
            d, visit,
            blueStart, blueEnd, blue, blueIndex,
            redStart, red0, red, redIndex)
        } else {
          retval = sweep.sweepBipartite(
            d, visit,
            redStart, red0, red, redIndex,
            blueStart, blueEnd, blue, blueIndex)
        }
        if(retval !== void 0) {
          return retval
        }
      } else {
        iterPush(top++,
          axis+1,
          redStart, red0,
          blueStart, blueEnd,
          flip,
          -Infinity, Infinity)
        iterPush(top++,
          axis+1,
          blueStart, blueEnd,
          redStart, red0,
          flip^1,
          -Infinity, Infinity)
      }
    }

    //Divide and conquer phase
    if(red0 < redEnd) {

      //Cut blue into 3 parts:
      //
      //  Points < mid point
      //  Points = mid point
      //  Points > mid point
      //
      var blue0 = findMedian(
        d, axis, 
        blueStart, blueEnd, blue, blueIndex)
      var mid = blue[elemSize * blue0 + axis]
      var blue1 = partitionStartEqual(
        d, axis,
        blue0, blueEnd, blue, blueIndex,
        mid)

      //Right case
      if(blue1 < blueEnd) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blue1, blueEnd,
          (flip|4) + (full ? 16 : 0),
          mid, hi)
      }

      //Left case
      if(blueStart < blue0) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blueStart, blue0,
          (flip|2) + (full ? 16 : 0),
          lo, mid)
      }

      //Center case (the hard part)
      if(blue0 + 1 === blue1) {
        //Optimization: Range with exactly 1 point, use a brute force scan
        if(full) {
          retval = onePointFull(
            d, axis, visit,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0])
        } else {
          retval = onePointPartial(
            d, axis, visit, flip,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0])
        }
        if(retval !== void 0) {
          return retval
        }
      } else if(blue0 < blue1) {
        var red1
        if(full) {
          //If full intersection, need to handle special case
          red1 = partitionContainsPoint(
            d, axis,
            red0, redEnd, red, redIndex,
            mid)
          if(red0 < red1) {
            var redX = partitionStartEqual(
              d, axis,
              red0, red1, red, redIndex,
              mid)
            if(axis === d-2) {
              //Degenerate sweep intersection:
              //  [red0, redX] with [blue0, blue1]
              if(red0 < redX) {
                retval = sweep.sweepComplete(
                  d, visit,
                  red0, redX, red, redIndex,
                  blue0, blue1, blue, blueIndex)
                if(retval !== void 0) {
                  return retval
                }
              }

              //Normal sweep intersection:
              //  [redX, red1] with [blue0, blue1]
              if(redX < red1) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  redX, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex)
                if(retval !== void 0) {
                  return retval
                }
              }
            } else {
              if(red0 < redX) {
                iterPush(top++,
                  axis+1,
                  red0, redX,
                  blue0, blue1,
                  16,
                  -Infinity, Infinity)
              }
              if(redX < red1) {
                iterPush(top++,
                  axis+1,
                  redX, red1,
                  blue0, blue1,
                  0,
                  -Infinity, Infinity)
                iterPush(top++,
                  axis+1,
                  blue0, blue1,
                  redX, red1,
                  1,
                  -Infinity, Infinity)
              }
            }
          }
        } else {
          if(flip) {
            red1 = partitionContainsPointProper(
              d, axis,
              red0, redEnd, red, redIndex,
              mid)
          } else {
            red1 = partitionContainsPoint(
              d, axis,
              red0, redEnd, red, redIndex,
              mid)
          }
          if(red0 < red1) {
            if(axis === d-2) {
              if(flip) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  blue0, blue1, blue, blueIndex,
                  red0, red1, red, redIndex)
              } else {
                retval = sweep.sweepBipartite(
                  d, visit,
                  red0, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex)
              }
            } else {
              iterPush(top++,
                axis+1,
                red0, red1,
                blue0, blue1,
                flip,
                -Infinity, Infinity)
              iterPush(top++,
                axis+1,
                blue0, blue1,
                red0, red1,
                flip^1,
                -Infinity, Infinity)
            }
          }
        }
      }
    }
  }
}
},{"./brute":88,"./median":90,"./partition":91,"./sweep":93,"bit-twiddle":94,"typedarray-pool":96}],90:[function(require,module,exports){
'use strict'

module.exports = findMedian

var genPartition = require('./partition')

var partitionStartLessThan = genPartition('lo<p0', ['p0'])

var PARTITION_THRESHOLD = 8   //Cut off for using insertion sort in findMedian

//Base case for median finding:  Use insertion sort
function insertionSort(d, axis, start, end, boxes, ids) {
  var elemSize = 2 * d
  var boxPtr = elemSize * (start+1) + axis
  for(var i=start+1; i<end; ++i, boxPtr+=elemSize) {
    var x = boxes[boxPtr]
    for(var j=i, ptr=elemSize*(i-1); 
        j>start && boxes[ptr+axis] > x; 
        --j, ptr-=elemSize) {
      //Swap
      var aPtr = ptr
      var bPtr = ptr+elemSize
      for(var k=0; k<elemSize; ++k, ++aPtr, ++bPtr) {
        var y = boxes[aPtr]
        boxes[aPtr] = boxes[bPtr]
        boxes[bPtr] = y
      }
      var tmp = ids[j]
      ids[j] = ids[j-1]
      ids[j-1] = tmp
    }
  }
}

//Find median using quick select algorithm
//  takes O(n) time with high probability
function findMedian(d, axis, start, end, boxes, ids) {
  if(end <= start+1) {
    return start
  }

  var lo       = start
  var hi       = end
  var mid      = ((end + start) >>> 1)
  var elemSize = 2*d
  var pivot    = mid
  var value    = boxes[elemSize*mid+axis]
  
  while(lo < hi) {
    if(hi - lo < PARTITION_THRESHOLD) {
      insertionSort(d, axis, lo, hi, boxes, ids)
      value = boxes[elemSize*mid+axis]
      break
    }
    
    //Select pivot using median-of-3
    var count  = hi - lo
    var pivot0 = (Math.random()*count+lo)|0
    var value0 = boxes[elemSize*pivot0 + axis]
    var pivot1 = (Math.random()*count+lo)|0
    var value1 = boxes[elemSize*pivot1 + axis]
    var pivot2 = (Math.random()*count+lo)|0
    var value2 = boxes[elemSize*pivot2 + axis]
    if(value0 <= value1) {
      if(value2 >= value1) {
        pivot = pivot1
        value = value1
      } else if(value0 >= value2) {
        pivot = pivot0
        value = value0
      } else {
        pivot = pivot2
        value = value2
      }
    } else {
      if(value1 >= value2) {
        pivot = pivot1
        value = value1
      } else if(value2 >= value0) {
        pivot = pivot0
        value = value0
      } else {
        pivot = pivot2
        value = value2
      }
    }

    //Swap pivot to end of array
    var aPtr = elemSize * (hi-1)
    var bPtr = elemSize * pivot
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr]
      boxes[aPtr] = boxes[bPtr]
      boxes[bPtr] = x
    }
    var y = ids[hi-1]
    ids[hi-1] = ids[pivot]
    ids[pivot] = y

    //Partition using pivot
    pivot = partitionStartLessThan(
      d, axis, 
      lo, hi-1, boxes, ids,
      value)

    //Swap pivot back
    var aPtr = elemSize * (hi-1)
    var bPtr = elemSize * pivot
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr]
      boxes[aPtr] = boxes[bPtr]
      boxes[bPtr] = x
    }
    var y = ids[hi-1]
    ids[hi-1] = ids[pivot]
    ids[pivot] = y

    //Swap pivot to last pivot
    if(mid < pivot) {
      hi = pivot-1
      while(lo < hi && 
        boxes[elemSize*(hi-1)+axis] === value) {
        hi -= 1
      }
      hi += 1
    } else if(pivot < mid) {
      lo = pivot + 1
      while(lo < hi &&
        boxes[elemSize*lo+axis] === value) {
        lo += 1
      }
    } else {
      break
    }
  }

  //Make sure pivot is at start
  return partitionStartLessThan(
    d, axis, 
    start, mid, boxes, ids,
    boxes[elemSize*mid+axis])
}
},{"./partition":91}],91:[function(require,module,exports){
'use strict'

module.exports = genPartition

var code = 'for(var j=2*a,k=j*c,l=k,m=c,n=b,o=a+b,p=c;d>p;++p,k+=j){var _;if($)if(m===p)m+=1,l+=j;else{for(var s=0;j>s;++s){var t=e[k+s];e[k+s]=e[l],e[l++]=t}var u=f[p];f[p]=f[m],f[m++]=u}}return m'

function genPartition(predicate, args) {
  var fargs ='abcdef'.split('').concat(args)
  var reads = []
  if(predicate.indexOf('lo') >= 0) {
    reads.push('lo=e[k+n]')
  }
  if(predicate.indexOf('hi') >= 0) {
    reads.push('hi=e[k+o]')
  }
  fargs.push(
    code.replace('_', reads.join())
        .replace('$', predicate))
  return Function.apply(void 0, fargs)
}
},{}],92:[function(require,module,exports){
'use strict';

//This code is extracted from ndarray-sort
//It is inlined here as a temporary workaround

module.exports = wrapper;

var INSERT_SORT_CUTOFF = 32

function wrapper(data, n0) {
  if (n0 <= 4*INSERT_SORT_CUTOFF) {
    insertionSort(0, n0 - 1, data);
  } else {
    quickSort(0, n0 - 1, data);
  }
}

function insertionSort(left, right, data) {
  var ptr = 2*(left+1)
  for(var i=left+1; i<=right; ++i) {
    var a = data[ptr++]
    var b = data[ptr++]
    var j = i
    var jptr = ptr-2
    while(j-- > left) {
      var x = data[jptr-2]
      var y = data[jptr-1]
      if(x < a) {
        break
      } else if(x === a && y < b) {
        break
      }
      data[jptr]   = x
      data[jptr+1] = y
      jptr -= 2
    }
    data[jptr]   = a
    data[jptr+1] = b
  }
}

function swap(i, j, data) {
  i *= 2
  j *= 2
  var x = data[i]
  var y = data[i+1]
  data[i] = data[j]
  data[i+1] = data[j+1]
  data[j] = x
  data[j+1] = y
}

function move(i, j, data) {
  i *= 2
  j *= 2
  data[i] = data[j]
  data[i+1] = data[j+1]
}

function rotate(i, j, k, data) {
  i *= 2
  j *= 2
  k *= 2
  var x = data[i]
  var y = data[i+1]
  data[i] = data[j]
  data[i+1] = data[j+1]
  data[j] = data[k]
  data[j+1] = data[k+1]
  data[k] = x
  data[k+1] = y
}

function shufflePivot(i, j, px, py, data) {
  i *= 2
  j *= 2
  data[i] = data[j]
  data[j] = px
  data[i+1] = data[j+1]
  data[j+1] = py
}

function compare(i, j, data) {
  i *= 2
  j *= 2
  var x = data[i],
      y = data[j]
  if(x < y) {
    return false
  } else if(x === y) {
    return data[i+1] > data[j+1]
  }
  return true
}

function comparePivot(i, y, b, data) {
  i *= 2
  var x = data[i]
  if(x < y) {
    return true
  } else if(x === y) {
    return data[i+1] < b
  }
  return false
}

function quickSort(left, right, data) {
  var sixth = (right - left + 1) / 6 | 0, 
      index1 = left + sixth, 
      index5 = right - sixth, 
      index3 = left + right >> 1, 
      index2 = index3 - sixth, 
      index4 = index3 + sixth, 
      el1 = index1, 
      el2 = index2, 
      el3 = index3, 
      el4 = index4, 
      el5 = index5, 
      less = left + 1, 
      great = right - 1, 
      tmp = 0
  if(compare(el1, el2, data)) {
    tmp = el1
    el1 = el2
    el2 = tmp
  }
  if(compare(el4, el5, data)) {
    tmp = el4
    el4 = el5
    el5 = tmp
  }
  if(compare(el1, el3, data)) {
    tmp = el1
    el1 = el3
    el3 = tmp
  }
  if(compare(el2, el3, data)) {
    tmp = el2
    el2 = el3
    el3 = tmp
  }
  if(compare(el1, el4, data)) {
    tmp = el1
    el1 = el4
    el4 = tmp
  }
  if(compare(el3, el4, data)) {
    tmp = el3
    el3 = el4
    el4 = tmp
  }
  if(compare(el2, el5, data)) {
    tmp = el2
    el2 = el5
    el5 = tmp
  }
  if(compare(el2, el3, data)) {
    tmp = el2
    el2 = el3
    el3 = tmp
  }
  if(compare(el4, el5, data)) {
    tmp = el4
    el4 = el5
    el5 = tmp
  }

  var pivot1X = data[2*el2]
  var pivot1Y = data[2*el2+1]
  var pivot2X = data[2*el4]
  var pivot2Y = data[2*el4+1]

  var ptr0 = 2 * el1;
  var ptr2 = 2 * el3;
  var ptr4 = 2 * el5;
  var ptr5 = 2 * index1;
  var ptr6 = 2 * index3;
  var ptr7 = 2 * index5;
  for (var i1 = 0; i1 < 2; ++i1) {
    var x = data[ptr0+i1];
    var y = data[ptr2+i1];
    var z = data[ptr4+i1];
    data[ptr5+i1] = x;
    data[ptr6+i1] = y;
    data[ptr7+i1] = z;
  }

  move(index2, left, data)
  move(index4, right, data)
  for (var k = less; k <= great; ++k) {
    if (comparePivot(k, pivot1X, pivot1Y, data)) {
      if (k !== less) {
        swap(k, less, data)
      }
      ++less;
    } else {
      if (!comparePivot(k, pivot2X, pivot2Y, data)) {
        while (true) {
          if (!comparePivot(great, pivot2X, pivot2Y, data)) {
            if (--great < k) {
              break;
            }
            continue;
          } else {
            if (comparePivot(great, pivot1X, pivot1Y, data)) {
              rotate(k, less, great, data)
              ++less;
              --great;
            } else {
              swap(k, great, data)
              --great;
            }
            break;
          }
        }
      }
    }
  }
  shufflePivot(left, less-1, pivot1X, pivot1Y, data)
  shufflePivot(right, great+1, pivot2X, pivot2Y, data)
  if (less - 2 - left <= INSERT_SORT_CUTOFF) {
    insertionSort(left, less - 2, data);
  } else {
    quickSort(left, less - 2, data);
  }
  if (right - (great + 2) <= INSERT_SORT_CUTOFF) {
    insertionSort(great + 2, right, data);
  } else {
    quickSort(great + 2, right, data);
  }
  if (great - less <= INSERT_SORT_CUTOFF) {
    insertionSort(less, great, data);
  } else {
    quickSort(less, great, data);
  }
}
},{}],93:[function(require,module,exports){
'use strict'

module.exports = {
  init:           sqInit,
  sweepBipartite: sweepBipartite,
  sweepComplete:  sweepComplete,
  scanBipartite:  scanBipartite,
  scanComplete:   scanComplete
}

var pool  = require('typedarray-pool')
var bits  = require('bit-twiddle')
var isort = require('./sort')

//Flag for blue
var BLUE_FLAG = (1<<28)

//1D sweep event queue stuff (use pool to save space)
var INIT_CAPACITY      = 1024
var RED_SWEEP_QUEUE    = pool.mallocInt32(INIT_CAPACITY)
var RED_SWEEP_INDEX    = pool.mallocInt32(INIT_CAPACITY)
var BLUE_SWEEP_QUEUE   = pool.mallocInt32(INIT_CAPACITY)
var BLUE_SWEEP_INDEX   = pool.mallocInt32(INIT_CAPACITY)
var COMMON_SWEEP_QUEUE = pool.mallocInt32(INIT_CAPACITY)
var COMMON_SWEEP_INDEX = pool.mallocInt32(INIT_CAPACITY)
var SWEEP_EVENTS       = pool.mallocDouble(INIT_CAPACITY * 8)

//Reserves memory for the 1D sweep data structures
function sqInit(count) {
  var rcount = bits.nextPow2(count)
  if(RED_SWEEP_QUEUE.length < rcount) {
    pool.free(RED_SWEEP_QUEUE)
    RED_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(RED_SWEEP_INDEX.length < rcount) {
    pool.free(RED_SWEEP_INDEX)
    RED_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  if(BLUE_SWEEP_QUEUE.length < rcount) {
    pool.free(BLUE_SWEEP_QUEUE)
    BLUE_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(BLUE_SWEEP_INDEX.length < rcount) {
    pool.free(BLUE_SWEEP_INDEX)
    BLUE_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  if(COMMON_SWEEP_QUEUE.length < rcount) {
    pool.free(COMMON_SWEEP_QUEUE)
    COMMON_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(COMMON_SWEEP_INDEX.length < rcount) {
    pool.free(COMMON_SWEEP_INDEX)
    COMMON_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  var eventLength = 8 * rcount
  if(SWEEP_EVENTS.length < eventLength) {
    pool.free(SWEEP_EVENTS)
    SWEEP_EVENTS = pool.mallocDouble(eventLength)
  }
}

//Remove an item from the active queue in O(1)
function sqPop(queue, index, count, item) {
  var idx = index[item]
  var top = queue[count-1]
  queue[idx] = top
  index[top] = idx
}

//Insert an item into the active queue in O(1)
function sqPush(queue, index, count, item) {
  queue[count] = item
  index[item]  = count
}

//Recursion base case: use 1D sweep algorithm
function sweepBipartite(
    d, visit,
    redStart,  redEnd, red, redIndex,
    blueStart, blueEnd, blue, blueIndex) {

  //store events as pairs [coordinate, idx]
  //
  //  red create:  -(idx+1)
  //  red destroy: idx
  //  blue create: -(idx+BLUE_FLAG)
  //  blue destroy: idx+BLUE_FLAG
  //
  var ptr      = 0
  var elemSize = 2*d
  var istart   = d-1
  var iend     = elemSize-1

  for(var i=redStart; i<redEnd; ++i) {
    var idx = redIndex[i]
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -(idx+1)
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = blueIndex[i]+BLUE_FLAG
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive  = 0
  var blueActive = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e >= BLUE_FLAG) {
      //blue destroy event
      e = (e-BLUE_FLAG)|0
      sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, e)
    } else if(e >= 0) {
      //red destroy event
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e)
    } else if(e <= -BLUE_FLAG) {
      //blue create event
      e = (-e-BLUE_FLAG)|0
      for(var j=0; j<redActive; ++j) {
        var retval = visit(RED_SWEEP_QUEUE[j], e)
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, e)
    } else {
      //red create event
      e = (-e-1)|0
      for(var j=0; j<blueActive; ++j) {
        var retval = visit(e, BLUE_SWEEP_QUEUE[j])
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, e)
    }
  }
}

//Complete sweep
function sweepComplete(d, visit, 
  redStart, redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0
  var elemSize = 2*d
  var istart   = d-1
  var iend     = elemSize-1

  for(var i=redStart; i<redEnd; ++i) {
    var idx = (redIndex[i]+1)<<1
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = (blueIndex[i]+1)<<1
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = (-idx)|1
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend]
    SWEEP_EVENTS[ptr++] = idx|1
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  var blueActive   = 0
  var commonActive = 0
  for(var i=0; i<n; ++i) {
    var e     = SWEEP_EVENTS[2*i+1]|0
    var color = e&1
    if(i < n-1 && (e>>1) === (SWEEP_EVENTS[2*i+3]>>1)) {
      color = 2
      i += 1
    }
    
    if(e < 0) {
      //Create event
      var id = -(e>>1) - 1

      //Intersect with common
      for(var j=0; j<commonActive; ++j) {
        var retval = visit(COMMON_SWEEP_QUEUE[j], id)
        if(retval !== void 0) {
          return retval
        }
      }

      if(color !== 0) {
        //Intersect with red
        for(var j=0; j<redActive; ++j) {
          var retval = visit(RED_SWEEP_QUEUE[j], id)
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color !== 1) {
        //Intersect with blue
        for(var j=0; j<blueActive; ++j) {
          var retval = visit(BLUE_SWEEP_QUEUE[j], id)
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color === 0) {
        //Red
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, id)
      } else if(color === 1) {
        //Blue
        sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, id)
      } else if(color === 2) {
        //Both
        sqPush(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive++, id)
      }
    } else {
      //Destroy event
      var id = (e>>1) - 1
      if(color === 0) {
        //Red
        sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, id)
      } else if(color === 1) {
        //Blue
        sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, id)
      } else if(color === 2) {
        //Both
        sqPop(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive--, id)
      }
    }
  }
}

//Sweep and prune/scanline algorithm:
//  Scan along axis, detect intersections
//  Brute force all boxes along axis
function scanBipartite(
  d, axis, visit, flip,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {
  
  var ptr      = 0
  var elemSize = 2*d
  var istart   = axis
  var iend     = axis+d

  var redShift  = 1
  var blueShift = 1
  if(flip) {
    blueShift = BLUE_FLAG
  } else {
    redShift  = BLUE_FLAG
  }

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + redShift
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + blueShift
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e < 0) {
      var idx   = -e
      var isRed = false
      if(idx >= BLUE_FLAG) {
        isRed = !flip
        idx -= BLUE_FLAG 
      } else {
        isRed = !!flip
        idx -= 1
      }
      if(isRed) {
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, idx)
      } else {
        var blueId  = blueIndex[idx]
        var bluePtr = elemSize * idx
        
        var b0 = blue[bluePtr+axis+1]
        var b1 = blue[bluePtr+axis+1+d]

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j]
          var redPtr = elemSize * oidx

          if(b1 < red[redPtr+axis+1] || 
             red[redPtr+axis+1+d] < b0) {
            continue
          }

          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d] < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var redId  = redIndex[oidx]
          var retval
          if(flip) {
            retval = visit(blueId, redId)
          } else {
            retval = visit(redId, blueId)
          }
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e - redShift)
    }
  }
}

function scanComplete(
  d, axis, visit,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0
  var elemSize = 2*d
  var istart   = axis
  var iend     = axis+d

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + BLUE_FLAG
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + 1
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e < 0) {
      var idx   = -e
      if(idx >= BLUE_FLAG) {
        RED_SWEEP_QUEUE[redActive++] = idx - BLUE_FLAG
      } else {
        idx -= 1
        var blueId  = blueIndex[idx]
        var bluePtr = elemSize * idx

        var b0 = blue[bluePtr+axis+1]
        var b1 = blue[bluePtr+axis+1+d]

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j]
          var redId  = redIndex[oidx]

          if(redId === blueId) {
            break
          }

          var redPtr = elemSize * oidx
          if(b1 < red[redPtr+axis+1] || 
            red[redPtr+axis+1+d] < b0) {
            continue
          }
          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d]   < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var retval = visit(redId, blueId)
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      var idx = e - BLUE_FLAG
      for(var j=redActive-1; j>=0; --j) {
        if(RED_SWEEP_QUEUE[j] === idx) {
          for(var k=j+1; k<redActive; ++k) {
            RED_SWEEP_QUEUE[k-1] = RED_SWEEP_QUEUE[k]
          }
          break
        }
      }
      --redActive
    }
  }
}
},{"./sort":92,"bit-twiddle":94,"typedarray-pool":96}],94:[function(require,module,exports){
/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

"use strict"; "use restrict";

//Number of bits in an integer
var INT_BITS = 32;

//Constants
exports.INT_BITS  = INT_BITS;
exports.INT_MAX   =  0x7fffffff;
exports.INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
exports.sign = function(v) {
  return (v > 0) - (v < 0);
}

//Computes absolute value of integer
exports.abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
}

//Computes minimum of integers x and y
exports.min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
}

//Computes maximum of integers x and y
exports.max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
}

//Checks if a number is a power of two
exports.isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
}

//Computes log base 2 of v
exports.log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
}

//Computes log base 10 of v
exports.log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
}

//Counts number of bits
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
exports.countTrailingZeros = countTrailingZeros;

//Rounds to next power of 2
exports.nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
}

//Rounds down to previous power of 2
exports.prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
}

//Computes parity of word
exports.parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
}

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
exports.reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
}

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
exports.interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

//Extracts the nth interleaved component
exports.deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
}


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
exports.interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
}

//Extracts nth interleaved component of a 3-tuple
exports.deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
}

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
exports.nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
}


},{}],95:[function(require,module,exports){
"use strict"

function dupe_array(count, value, i) {
  var c = count[i]|0
  if(c <= 0) {
    return []
  }
  var result = new Array(c), j
  if(i === count.length-1) {
    for(j=0; j<c; ++j) {
      result[j] = value
    }
  } else {
    for(j=0; j<c; ++j) {
      result[j] = dupe_array(count, value, i+1)
    }
  }
  return result
}

function dupe_number(count, value) {
  var result, i
  result = new Array(count)
  for(i=0; i<count; ++i) {
    result[i] = value
  }
  return result
}

function dupe(count, value) {
  if(typeof value === "undefined") {
    value = 0
  }
  switch(typeof count) {
    case "number":
      if(count > 0) {
        return dupe_number(count|0, value)
      }
    break
    case "object":
      if(typeof (count.length) === "number") {
        return dupe_array(count, value, 0)
      }
    break
  }
  return []
}

module.exports = dupe
},{}],96:[function(require,module,exports){
(function (global,Buffer){
'use strict'

var bits = require('bit-twiddle')
var dup = require('dup')

//Legacy pool support
if(!global.__TYPEDARRAY_POOL) {
  global.__TYPEDARRAY_POOL = {
      UINT8   : dup([32, 0])
    , UINT16  : dup([32, 0])
    , UINT32  : dup([32, 0])
    , INT8    : dup([32, 0])
    , INT16   : dup([32, 0])
    , INT32   : dup([32, 0])
    , FLOAT   : dup([32, 0])
    , DOUBLE  : dup([32, 0])
    , DATA    : dup([32, 0])
    , UINT8C  : dup([32, 0])
    , BUFFER  : dup([32, 0])
  }
}

var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined'
var POOL = global.__TYPEDARRAY_POOL

//Upgrade pool
if(!POOL.UINT8C) {
  POOL.UINT8C = dup([32, 0])
}
if(!POOL.BUFFER) {
  POOL.BUFFER = dup([32, 0])
}

//New technique: Only allocate from ArrayBufferView and Buffer
var DATA    = POOL.DATA
  , BUFFER  = POOL.BUFFER

exports.free = function free(array) {
  if(Buffer.isBuffer(array)) {
    BUFFER[bits.log2(array.length)].push(array)
  } else {
    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
      array = array.buffer
    }
    if(!array) {
      return
    }
    var n = array.length || array.byteLength
    var log_n = bits.log2(n)|0
    DATA[log_n].push(array)
  }
}

function freeArrayBuffer(buffer) {
  if(!buffer) {
    return
  }
  var n = buffer.length || buffer.byteLength
  var log_n = bits.log2(n)
  DATA[log_n].push(buffer)
}

function freeTypedArray(array) {
  freeArrayBuffer(array.buffer)
}

exports.freeUint8 =
exports.freeUint16 =
exports.freeUint32 =
exports.freeInt8 =
exports.freeInt16 =
exports.freeInt32 =
exports.freeFloat32 = 
exports.freeFloat =
exports.freeFloat64 = 
exports.freeDouble = 
exports.freeUint8Clamped = 
exports.freeDataView = freeTypedArray

exports.freeArrayBuffer = freeArrayBuffer

exports.freeBuffer = function freeBuffer(array) {
  BUFFER[bits.log2(array.length)].push(array)
}

exports.malloc = function malloc(n, dtype) {
  if(dtype === undefined || dtype === 'arraybuffer') {
    return mallocArrayBuffer(n)
  } else {
    switch(dtype) {
      case 'uint8':
        return mallocUint8(n)
      case 'uint16':
        return mallocUint16(n)
      case 'uint32':
        return mallocUint32(n)
      case 'int8':
        return mallocInt8(n)
      case 'int16':
        return mallocInt16(n)
      case 'int32':
        return mallocInt32(n)
      case 'float':
      case 'float32':
        return mallocFloat(n)
      case 'double':
      case 'float64':
        return mallocDouble(n)
      case 'uint8_clamped':
        return mallocUint8Clamped(n)
      case 'buffer':
        return mallocBuffer(n)
      case 'data':
      case 'dataview':
        return mallocDataView(n)

      default:
        return null
    }
  }
  return null
}

function mallocArrayBuffer(n) {
  var n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var d = DATA[log_n]
  if(d.length > 0) {
    return d.pop()
  }
  return new ArrayBuffer(n)
}
exports.mallocArrayBuffer = mallocArrayBuffer

function mallocUint8(n) {
  return new Uint8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocUint8 = mallocUint8

function mallocUint16(n) {
  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocUint16 = mallocUint16

function mallocUint32(n) {
  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocUint32 = mallocUint32

function mallocInt8(n) {
  return new Int8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocInt8 = mallocInt8

function mallocInt16(n) {
  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocInt16 = mallocInt16

function mallocInt32(n) {
  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocInt32 = mallocInt32

function mallocFloat(n) {
  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocFloat32 = exports.mallocFloat = mallocFloat

function mallocDouble(n) {
  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
}
exports.mallocFloat64 = exports.mallocDouble = mallocDouble

function mallocUint8Clamped(n) {
  if(hasUint8C) {
    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
  } else {
    return mallocUint8(n)
  }
}
exports.mallocUint8Clamped = mallocUint8Clamped

function mallocDataView(n) {
  return new DataView(mallocArrayBuffer(n), 0, n)
}
exports.mallocDataView = mallocDataView

function mallocBuffer(n) {
  n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var cache = BUFFER[log_n]
  if(cache.length > 0) {
    return cache.pop()
  }
  return new Buffer(n)
}
exports.mallocBuffer = mallocBuffer

exports.clearCache = function clearCache() {
  for(var i=0; i<32; ++i) {
    POOL.UINT8[i].length = 0
    POOL.UINT16[i].length = 0
    POOL.UINT32[i].length = 0
    POOL.INT8[i].length = 0
    POOL.INT16[i].length = 0
    POOL.INT32[i].length = 0
    POOL.FLOAT[i].length = 0
    POOL.DOUBLE[i].length = 0
    POOL.UINT8C[i].length = 0
    DATA[i].length = 0
    BUFFER[i].length = 0
  }
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"bit-twiddle":94,"buffer":191,"dup":95}],97:[function(require,module,exports){
/*!
 * EntityManager JavaScript Library v0.2.0
 *
 * A JavaScript implementation of the Entity System model as described by
 * Adam Martin in http://t-machine.org/index.php/2009/10/26/entity-systems-are-the-future-of-mmos-part-5/
 *
 * @author Adrian Gaudebert - adrian@gaudebert.fr
 * @license MIT license.
 *
 */

// for compatibility with node.js and require.js
if (typeof define !== 'function') {
    var define = require('amdefine')(module)
}

define(function () {

    /*!
     * Return a clone of an object.
     * From http://stackoverflow.com/questions/728360
     */
    function clone(obj) {
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;

        // Handle Date
        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        // Handle Object
        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }
    }

    /**
     * @class EntityManager
     *
     * Implement the Entity System model and provide tools to easily
     * create and manipulate Entities, Components and Processors.
     */
    var EntityManager = function () {
        // A list of entity IDs, each being a simple integer.
        this.entities = [];

        // A dictionary of components, where keys are the name of each
        // component. Components are objects containing:
        //  * metadata (name, description)
        //  * the initial set of data that defines the default state of a
        //    newly instanciated component
        this.components = {};

        // A dictionary of assemblages, where keys are the name of each
        // assemblage. Assemblages are objects containing:
        //  * metadata (name, description)
        //  * a list of components to add to the entity
        //  * an initial state for some components, to override the defaults
        this.assemblages = {};

        /*!
         * A relational-like list of entity states. There is one line for
         * each entity - component association.
         *
         * To optimize the access time to this data, it is stored in a
         * dictionary of dictionaries of this form:
         * {
         *   "componentId": {
         *     "entityId": {
         *       ...
         *       here comes the state of this entity for this component
         *       ...
         *     }
         *   }
         * }
         *
         * This way, getting the data of one entity for one component is:
         *   this.entityComponentData[componentId][entityId]
         * and getting all entities for one component is:
         *   this.entityComponentData[componentId]
         */
        this.entityComponentData = {};
        this.entityComponentMap = {};

        // The ordered list of processors known by this manager.
        this.processors = [];

        // The next unique identifier.
        this.uid = 0;
    };

    /**
     * Return an identifier unique to this system.
     *
     * @return {int} - Unique identifier.
     */
    EntityManager.prototype.getUid = function () {
        return this.uid++;
    };

    //=========================================================================
    // ENTITIES

    /**
     * Create a new entity in the system by creating a new instance of each of
     * its components.
     *
     * @param {array} componentIds - List of identifiers of the components that compose the new entity.
     * @return {int} - Unique identifier of the new entity.
     */
    EntityManager.prototype.createEntity = function (componentIds) {
        var id = this.getUid();
        this.addComponentsToEntity(componentIds, id);
        this.entities.push(id);
        return id;
    };

    /**
     * Remove an entity and its instanciated components from the system.
     *
     * @param {int} id - Unique identifier of the entity.
     * @return {object} - this
     */
    EntityManager.prototype.removeEntity = function (id) {
        // Remove all data for this entity.
        var toRemove = [];
        for (var comp in this.entityComponentMap) {
            if (this.entityComponentMap[comp].hasOwnProperty(id)) {
                toRemove.push(comp);
            }
        }
        this.removeComponentsFromEntity(toRemove, id);

        // Remove the entity from the list of known entities.
        this.entities.splice(this.entities.indexOf(id), 1);

        return this;
    };

    //=========================================================================
    // COMPONENTS

    /**
     * Add a component to the list of known components.
     *
     * @param {string} id - Unique identifier of the component.
     * @param {object} component - Object containing the metadata and data of the component.
     * @return {object} - this
     */
    EntityManager.prototype.addComponent = function (id, component) {
        this.components[id] = component;
        this.entityComponentMap[id] = {};
        this.entityComponentData[id] = [];
        return this;
    };

    /**
     * Remove a component from the list of known components.
     *
     * @param {string} id - Unique identifier of the component.
     * @return {object} - this
     */
    EntityManager.prototype.removeComponent = function (id) {
        delete this.components[id];
        delete this.entityComponentMap[id];
        delete this.entityComponentData[id];
        return this;
    };

    /**
     * Get the list of components this instance knows.
     *
     * @return {array} - List of names of components.
     */
    EntityManager.prototype.getComponentsList = function () {
        return Object.keys(this.components);
    };

    /**
     * Create a new instance of each listed component and associate them
     * with the entity.
     *
     * @param {array} componentIds - List of identifiers of the components to add to the entity.
     * @param {int} entityId - Unique identifier of the entity.
     * @return {object} - this
     */
    EntityManager.prototype.addComponentsToEntity = function (componentIds, entityId) {
        var i;
        var comp;
        var self = this;

        // First verify that all the components exist, and throw an error
        // if any is unknown.
        for (i = componentIds.length - 1; i >= 0; i--) {
            comp = componentIds[i];

            if (!this.components[comp]) {
                throw new Error('Trying to use unknown component: ' + comp);
            }
        }

        // Now we know that this request is correct, let's create the new
        // entity and instanciate the component's states.
        for (i = componentIds.length - 1; i >= 0; i--) {
            comp = componentIds[i];

            var newCompState = null;

            // If the manager has an emit function, we want to create getters
            // and setters so that we can emit state changes. But if it does
            // not have such a function, there is no need to add the overhead.
            if (self.emit instanceof Function) {
                newCompState = {};
                (function (newCompState) {
                    var state = clone(self.components[comp].state);

                    // Create a setter for each state attribute, so we can emit an
                    // event whenever the state of this component changes.
                    for (var property in state) {
                        if (state.hasOwnProperty(property)) {
                            (function (property) {
                                Object.defineProperty(newCompState, property, {
                                    get: function () {
                                        return state[property];
                                    },
                                    set: function (val) {
                                        state[property] = val;

                                        // Keeping this check here, even if
                                        // there is already one above because
                                        // this is JS and someone can remove
                                        // the emit function at runtime.
                                        if (self.emit instanceof Function) {
                                            self.emit('entityComponentUpdated', entityId, comp);
                                        }
                                    }
                                });
                            })(property);
                        }
                    }
                })(newCompState);
            }
            else {
                newCompState = clone(self.components[comp].state);
            }

            // Store the entity's ID so it's easier to find other components for that entity.
            newCompState.__id = entityId;

            var map = this.entityComponentMap[comp]; 
            var arr = this.entityComponentData[comp];
            map[entityId] = arr.length;
            arr.push(newCompState);
        }

        return this;
    };

    /**
     * De-associate a list of components from the entity.
     *
     * @param {array} componentIds - List of identifiers of the components to remove from the entity.
     * @param {int} entityId - Unique identifier of the entity.
     * @return {object} - this
     */
    EntityManager.prototype.removeComponentsFromEntity = function (componentIds, entityId) {
        var i;
        var comp;

        // First verify that all the components exist, and throw an error
        // if any is unknown.
        for (i = componentIds.length - 1; i >= 0; i--) {
            comp = componentIds[i];

            if (!this.components[comp]) {
                throw new Error('Trying to use unknown component: ' + comp);
            }
        }

        // Now we know that this request is correct, let's create the new
        // entity and instanciate the component's states.
        for (i = componentIds.length - 1; i >= 0; i--) {
            comp = componentIds[i];

            var datMap = this.entityComponentMap[comp];
            var datArr = this.entityComponentData[comp];
            var id = datMap[entityId]
            if (datArr[id]) {
                if (id==datArr.length-1) {
                    // just remove last entry
                    datArr.pop();
                } else {
                    // swap last entry in place of one to splice, and fix map 
                    datArr[id] = datArr.pop()
                    var movedID = datArr[id].__id
                    datMap[movedID] = id
                }
                delete datMap[entityId]
            }
        }


        return this;
    };

    /**
     * Return a reference to an object that contains the data of an
     * instanciated component of an entity.
     *
     * @param {int} entityId - Unique identifier of the entity.
     * @param {string} componentId - Unique identifier of the component.
     * @return {object} - Component data of one entity.
     */
    EntityManager.prototype.getComponentDataForEntity = function (componentId, entityId) {
        var datMap = this.entityComponentMap[componentId];
        var datArr = this.entityComponentData[componentId];
        if (!datMap) {
            throw new Error('Trying to use unknown component: ' + componentId);
        }

        if (!datMap.hasOwnProperty(entityId)) {
            throw new Error('No data for component ' + componentId + ' and entity ' + entityId);
        }

        return datArr[ datMap[entityId] ];
    };

    /**
     * Update the state of a component, many keys at once.
     *
     * @param {int} entityId - Unique identifier of the entity.
     * @param {string} componentId - Unique identifier of the component.
     * @param {object} newState - Object containing the new state to apply.
     * @return {object} - this
     */
    EntityManager.prototype.updateComponentDataForEntity = function (componentId, entityId, newState) {
        var compState = this.getComponentDataForEntity(componentId, entityId);

        for (var key in newState) {
            if (newState.hasOwnProperty(key) && compState.hasOwnProperty(key)) {
                compState[key] = newState[key];
            }
        }

        return this;
    };

    /**
     * Return a list of objects containing the data of all of a given component.
     *
     * @param {string} componentId - Unique identifier of the component.
     * @return {array} - List of component data for one component.
     */
    EntityManager.prototype.getComponentsData = function (componentId) {
        if (!this.entityComponentData.hasOwnProperty(componentId)) {
            throw new Error('Trying to use unknown component: ' + componentId);
        }


        return this.entityComponentData[componentId];
    };

    /**
     * Return true if the entity has the component.
     *
     * @param {int} entityId - Unique identifier of the entity.
     * @param {string} componentId - Unique identifier of the component.
     * @return {boolean} - True if the entity has the component.
     */
    EntityManager.prototype.entityHasComponent = function (entityId, componentId) {
        var map = this.entityComponentMap[componentId]; 
        if (!map) {
            throw new Error('Trying to use unknown component: ' + componentId);
        }

        return map.hasOwnProperty(entityId);
    };

    //=========================================================================
    // ASSEMBLAGES

    /**
     * Add an assemblage to the list of known assemblages.
     *
     * @param {string} id - Unique identifier of the assemblage.
     * @param {object} assemblage - An instance of an assemblage to add.
     * @return {object} - this
     */
    EntityManager.prototype.addAssemblage = function (id, assemblage) {
        this.assemblages[id] = assemblage;
        return this;
    };

    /**
     * Remove an assemblage from the list of known assemblages.
     *
     * @param {string} id - Unique identifier of the assemblage.
     * @return {object} - this
     */
    EntityManager.prototype.removeAssemblage = function (id) {
        delete this.assemblages[id];
        return this;
    };

    /**
     * Create a new entity in the system by creating a new instance of each of
     * its components and setting their initial state, using an assemblage.
     *
     * @param {string} assemblageId - Id of the assemblage to create the entity from.
     * @return {int} - Unique identifier of the new entity.
     */
    EntityManager.prototype.createEntityFromAssemblage = function (assemblageId) {
        if (!(assemblageId in this.assemblages)) {
            throw new Error('Trying to use unknown assemblage: ' + assemblageId);
        }

        var assemblage = this.assemblages[assemblageId];
        var entity = this.createEntity(assemblage.components);

        for (var comp in assemblage.initialState) {
            if (assemblage.initialState.hasOwnProperty(comp)) {
                var newState = assemblage.initialState[comp];
                this.updateComponentDataForEntity(comp, entity, newState);
            }
        }

        return entity;
    };

    //=========================================================================
    // PROCESSORS

    /**
     * Add a processor to the list of known processors.
     *
     * @param {object} processor - An instance of a processor to manage.
     * @return {object} - this
     */
    EntityManager.prototype.addProcessor = function (processor) {
        this.processors.push(processor);
        return this;
    };

    /**
     * Remove a processor from the list of known processors.
     *
     * @param {object} processor - An instance of a processor to remove.
     * @return {object} - this
     */
    EntityManager.prototype.removeProcessor = function (processor) {
        this.processors.splice(this.processors.indexOf(processor), 1);
        return this;
    };

    /**
     * Update all the known processors.
     *
     * @param {int} dt - The time delta since the last call to update. Will be passed as an argument to all processor's `update` method.
     * @return {object} - this
     */
    EntityManager.prototype.update = function (dt) {
        for (var i = 0; i < this.processors.length; i++) {
            this.processors[i].update(dt);
        }
        return this;
    };

    return EntityManager;
});

},{"amdefine":98}],98:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 1.0.0 Copyright (c) 2011-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                if (callback) {
                    process.nextTick(function () {
                        callback.apply(null, deps);
                    });
                }
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require('_process'),"/node_modules/noa-engine/node_modules/ensy/node_modules/amdefine/amdefine.js")
},{"_process":198,"path":197}],99:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],100:[function(require,module,exports){
'use strict';

var vkey = require('vkey')
var EventEmitter = require('events').EventEmitter;
// mousewheel polyfill borrowed directly from game-shell
var addMouseWheel = require("./lib/mousewheel-polyfill.js")

module.exports = function(domElement, options) {
  return new Inputs(domElement, options)
}


/*
 *   Simple inputs manager to abstract key/mouse inputs.
 *        Inspired by (and where applicable stealing code from) 
 *        game-shell: https://github.com/mikolalysenko/game-shell
 *  
 *  inputs.bind( 'move-right', 'D', '<right>' )
 *  inputs.bind( 'move-left',  'A' )
 *  inputs.unbind( 'move-left' )
 *  
 *  inputs.down.on( 'move-right',  function( binding, event ) {})
 *  inputs.up.on(   'move-right',  function( binding, event ) {})
 *
 *  inputs.state['move-right']  // true when corresponding keys are down
 *  inputs.state.dx             // mouse x movement since tick() was last called
 *  inputs.getBindings()        // [ 'move-right', 'move-left', ... ]
*/


function Inputs(element, opts) {

  // settings
  this.element = element || document
  opts = opts || {}
  this.preventDefaults = !!opts.preventDefaults
  this.stopPropagation = !!opts.stopPropagation

  // emitters
  this.down = new EventEmitter()
  this.up = new EventEmitter()

  // state object to be queried
  this.state = {
    dx: 0, dy: 0, 
    scrollx: 0, scrolly: 0, scrollz: 0
  }

  // internal state
  this._keybindmap = {}       // { 'vkeycode' : [ 'binding', 'binding2' ] }
  this._keyStates = {}        // { 'vkeycode' : boolean }
  this._bindPressCounts = {}  // { 'binding' : int }

  // register for dom events
  this.initEvents()
}


/*
 *
 *   PUBLIC API 
 *
*/ 

Inputs.prototype.initEvents = function() {
  // keys
  window.addEventListener( 'keydown', onKeyEvent.bind(undefined,this,true), false )
  window.addEventListener( 'keyup', onKeyEvent.bind(undefined,this,false), false )
  // mouse buttons
  this.element.addEventListener("mousedown", onMouseEvent.bind(undefined,this,true), false)
  this.element.addEventListener("mouseup", onMouseEvent.bind(undefined,this,false), false)
  this.element.oncontextmenu = onContextMenu.bind(undefined,this)
  // touch/mouse movement
  this.element.addEventListener("mousemove", onMouseMove.bind(undefined,this), false)
  this.element.addEventListener("touchmove", onMouseMove.bind(undefined,this), false)
  this.element.addEventListener("touchstart", onTouchStart.bind(undefined,this), false)
  // scroll/mousewheel
  addMouseWheel(this.element, onMouseWheel.bind(undefined,this), false)
}


// Usage:  bind( bindingName, vkeyCode, vkeyCode.. )
//    Note that inputs._keybindmap maps vkey codes to binding names
//    e.g. this._keybindmap['a'] = 'move-left'
Inputs.prototype.bind = function(binding) {
  for (var i=1; i<arguments.length; ++i) {
    var vkeyCode = arguments[i]
    var arr = this._keybindmap[vkeyCode] || []
    if (arr.indexOf(binding) == -1) {
      arr.push(binding)
    }
    this._keybindmap[vkeyCode] = arr
  }
  this.state[binding] = !!this.state[binding]
}

// search out and remove all keycodes bound to a given binding
Inputs.prototype.unbind = function(binding) {
  for (var b in this._keybindmap) {
    var arr = this._keybindmap[b]
    var i = arr.indexOf(binding)
    if (i>-1) { arr.splice(i,1) }
  }
}

// tick function - clears out cumulative mouse movement state variables
Inputs.prototype.tick = function() {
  this.state.dx = this.state.dy = 0
  this.state.scrollx = this.state.scrolly = this.state.scrollz = 0
}



Inputs.prototype.getBoundKeys = function() {
  var arr = []
  for (var b in this._keybindmap) { arr.push(b) }
  return arr
}



/*
 *   INTERNALS - DOM EVENT HANDLERS
*/ 


function onKeyEvent(inputs, wasDown, ev) {
  handleKeyEvent( ev.keyCode, vkey[ev.keyCode], wasDown, inputs, ev )
}

function onMouseEvent(inputs, wasDown, ev) {
  // simulate a code out of range of vkey
  var keycode = -1 - ev.button
  var vkeycode = '<mouse '+ (ev.button+1) +'>' 
  handleKeyEvent( keycode, vkeycode, wasDown, inputs, ev )
  return false
}

function onContextMenu(inputs) {
  // cancel context menu if there's a binding for right mousebutton
  var arr = inputs._keybindmap['<mouse 3>']
  if (arr) { return false }
}

function onMouseMove(inputs, ev) {
  // for now, just populate the state object with mouse movement
  var dx = ev.movementX || 0,
      dy = ev.movementY || 0
  // ad-hoc experimental touch support
  if (ev.touches && (dx|dy)===0) {
    var xy = getTouchMovement(ev)
    dx = xy[0]
    dy = xy[1]
  }
  inputs.state.dx += dx
  inputs.state.dy += dy
}

// experimental - for touch events, extract useful dx/dy
var lastTouchX = 0
var lastTouchY = 0
var lastTouchID = null

function onTouchStart(inputs, ev) {
  var touch = ev.changedTouches[0]
  lastTouchX = touch.clientX
  lastTouchY = touch.clientY
  lastTouchID = touch.identifier
}

function getTouchMovement(ev) {
  var touch
  var touches = ev.changedTouches
  for (var i=0; i<touches.length; ++i) {
    if (touches[i].identifier == lastTouchID) touch = touches[i]
  }
  if (!touch) return [0,0]
  var res = [ touch.clientX-lastTouchX, touch.clientY-lastTouchY ]
  lastTouchX = touch.clientX
  lastTouchY = touch.clientY
  return res
}

function onMouseWheel(inputs, ev) {
  // basically borrowed from game-shell
  var scale = 1
  switch(ev.deltaMode) {
    case 0: scale=1;   break;  // Pixel
    case 1: scale=12;  break;  // Line
    case 2:  // page
      // TODO: investigagte when this happens, what correct handling is
      scale = inputs.element.clientHeight || window.innerHeight
      break;
  }
  // accumulate state
  inputs.state.scrollx += ev.deltaX * scale
  inputs.state.scrolly += ev.deltaY * scale
  inputs.state.scrollz +=(ev.deltaZ * scale) || 0
  return false
}


/*
 *   KEY BIND HANDLING
*/ 


function handleKeyEvent(keycode, vcode, wasDown, inputs, ev) {
  var arr = inputs._keybindmap[vcode]
  // don't prevent defaults if there's no binding
  if (!arr) { return }
  if (inputs.preventDefaults) ev.preventDefault()
  if (inputs.stopPropagation) ev.stopPropagation()

  // if the key's state has changed, handle an event for all bindings
  var currstate = inputs._keyStates[keycode]
  if ( XOR(currstate, wasDown) ) {
    // for each binding: emit an event, and update cached state information
    for (var i=0; i<arr.length; ++i) {
      handleBindingEvent( arr[i], wasDown, inputs, ev )
    }
  }
  inputs._keyStates[keycode] = wasDown
}


function handleBindingEvent(binding, wasDown, inputs, ev) {
  // keep count of presses mapped by binding
  // (to handle two keys with the same binding pressed at once)
  var ct = inputs._bindPressCounts[binding] || 0
  ct += wasDown ? 1 : -1
  if (ct<0) { ct = 0 } // shouldn't happen
  inputs._bindPressCounts[binding] = ct

  // emit event if binding's state has changed
  var currstate = inputs.state[binding]
  if ( XOR(currstate, ct) ) {
    var emitter = wasDown ? inputs.down : inputs.up
    emitter.emit( binding, ev )
  }
  inputs.state[binding] = !!ct
}


/*
 *    HELPERS
 *
*/


// how is this not part of Javascript?
function XOR(a,b) {
  return a ? !b : b
}





},{"./lib/mousewheel-polyfill.js":101,"events":195,"vkey":102}],101:[function(require,module,exports){
//Adapted from here: https://developer.mozilla.org/en-US/docs/Web/Reference/Events/wheel?redirectlocale=en-US&redirectslug=DOM%2FMozilla_event_reference%2Fwheel

var prefix = "", _addEventListener, onwheel, support;

// detect event model
if ( window.addEventListener ) {
  _addEventListener = "addEventListener";
} else {
  _addEventListener = "attachEvent";
  prefix = "on";
}

// detect available wheel event
support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
          document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
          "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

function _addWheelListener( elem, eventName, callback, useCapture ) {
  elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
    !originalEvent && ( originalEvent = window.event );

    // create a normalized event object
    var event = {
      // keep a ref to the original event object
      originalEvent: originalEvent,
      target: originalEvent.target || originalEvent.srcElement,
      type: "wheel",
      deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
      deltaX: 0,
      delatZ: 0,
      preventDefault: function() {
        originalEvent.preventDefault ?
          originalEvent.preventDefault() :
          originalEvent.returnValue = false;
      }
    };
    
    // calculate deltaY (and deltaX) according to the event
    if ( support == "mousewheel" ) {
      event.deltaY = - 1/40 * originalEvent.wheelDelta;
      // Webkit also support wheelDeltaX
      originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
    } else {
      event.deltaY = originalEvent.detail;
    }

    // it's time to fire the callback
    return callback( event );
  }, useCapture || false );
}

module.exports = function( elem, callback, useCapture ) {
  _addWheelListener( elem, support, callback, useCapture );

  // handle MozMousePixelScroll in older Firefox
  if( support == "DOMMouseScroll" ) {
    _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
  }
};
},{}],102:[function(require,module,exports){
var ua = typeof window !== 'undefined' ? window.navigator.userAgent : ''
  , isOSX = /OS X/.test(ua)
  , isOpera = /Opera/.test(ua)
  , maybeFirefox = !/like Gecko/.test(ua) && !isOpera

var i, output = module.exports = {
  0:  isOSX ? '<menu>' : '<UNK>'
, 1:  '<mouse 1>'
, 2:  '<mouse 2>'
, 3:  '<break>'
, 4:  '<mouse 3>'
, 5:  '<mouse 4>'
, 6:  '<mouse 5>'
, 8:  '<backspace>'
, 9:  '<tab>'
, 12: '<clear>'
, 13: '<enter>'
, 16: '<shift>'
, 17: '<control>'
, 18: '<alt>'
, 19: '<pause>'
, 20: '<caps-lock>'
, 21: '<ime-hangul>'
, 23: '<ime-junja>'
, 24: '<ime-final>'
, 25: '<ime-kanji>'
, 27: '<escape>'
, 28: '<ime-convert>'
, 29: '<ime-nonconvert>'
, 30: '<ime-accept>'
, 31: '<ime-mode-change>'
, 27: '<escape>'
, 32: '<space>'
, 33: '<page-up>'
, 34: '<page-down>'
, 35: '<end>'
, 36: '<home>'
, 37: '<left>'
, 38: '<up>'
, 39: '<right>'
, 40: '<down>'
, 41: '<select>'
, 42: '<print>'
, 43: '<execute>'
, 44: '<snapshot>'
, 45: '<insert>'
, 46: '<delete>'
, 47: '<help>'
, 91: '<meta>'  // meta-left -- no one handles left and right properly, so we coerce into one.
, 92: '<meta>'  // meta-right
, 93: isOSX ? '<meta>' : '<menu>'      // chrome,opera,safari all report this for meta-right (osx mbp).
, 95: '<sleep>'
, 106: '<num-*>'
, 107: '<num-+>'
, 108: '<num-enter>'
, 109: '<num-->'
, 110: '<num-.>'
, 111: '<num-/>'
, 144: '<num-lock>'
, 145: '<scroll-lock>'
, 160: '<shift-left>'
, 161: '<shift-right>'
, 162: '<control-left>'
, 163: '<control-right>'
, 164: '<alt-left>'
, 165: '<alt-right>'
, 166: '<browser-back>'
, 167: '<browser-forward>'
, 168: '<browser-refresh>'
, 169: '<browser-stop>'
, 170: '<browser-search>'
, 171: '<browser-favorites>'
, 172: '<browser-home>'

  // ff/osx reports '<volume-mute>' for '-'
, 173: isOSX && maybeFirefox ? '-' : '<volume-mute>'
, 174: '<volume-down>'
, 175: '<volume-up>'
, 176: '<next-track>'
, 177: '<prev-track>'
, 178: '<stop>'
, 179: '<play-pause>'
, 180: '<launch-mail>'
, 181: '<launch-media-select>'
, 182: '<launch-app 1>'
, 183: '<launch-app 2>'
, 186: ';'
, 187: '='
, 188: ','
, 189: '-'
, 190: '.'
, 191: '/'
, 192: '`'
, 219: '['
, 220: '\\'
, 221: ']'
, 222: "'"
, 223: '<meta>'
, 224: '<meta>'       // firefox reports meta here.
, 226: '<alt-gr>'
, 229: '<ime-process>'
, 231: isOpera ? '`' : '<unicode>'
, 246: '<attention>'
, 247: '<crsel>'
, 248: '<exsel>'
, 249: '<erase-eof>'
, 250: '<play>'
, 251: '<zoom>'
, 252: '<no-name>'
, 253: '<pa-1>'
, 254: '<clear>'
}

for(i = 58; i < 65; ++i) {
  output[i] = String.fromCharCode(i)
}

// 0-9
for(i = 48; i < 58; ++i) {
  output[i] = (i - 48)+''
}

// A-Z
for(i = 65; i < 91; ++i) {
  output[i] = String.fromCharCode(i)
}

// num0-9
for(i = 96; i < 106; ++i) {
  output[i] = '<num-'+(i - 96)+'>'
}

// F1-F24
for(i = 112; i < 136; ++i) {
  output[i] = 'F'+(i-111)
}

},{}],103:[function(require,module,exports){
if(typeof window.performance === "object") {
  if(window.performance.now) {
    module.exports = function() { return window.performance.now() }
  } else if(window.performance.webkitNow) {
    module.exports = function() { return window.performance.webkitNow() }
  }
} else if(Date.now) {
  module.exports = Date.now
} else {
  module.exports = function() { return (new Date()).getTime() }
}

},{}],104:[function(require,module,exports){
module.exports=require(101)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/noa-engine/node_modules/game-inputs/lib/mousewheel-polyfill.js":101}],105:[function(require,module,exports){
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 
// MIT license
var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];
for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                               || window[vendors[x]+'CancelRequestAnimationFrame'];
}

if (!window.requestAnimationFrame)
    window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

if (!window.cancelAnimationFrame)
    window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };

},{}],106:[function(require,module,exports){
"use strict"

function compileSearch(funcName, predicate, reversed, extraArgs, useNdarray, earlyOut) {
  var code = [
    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
";while(l<=h){\
var m=(l+h)>>>1,x=a", useNdarray ? ".get(m)" : "[m]"]
  if(earlyOut) {
    if(predicate.indexOf("c") < 0) {
      code.push(";if(x===y){return m}else if(x<=y){")
    } else {
      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){")
    }
  } else {
    code.push(";if(", predicate, "){i=m;")
  }
  if(reversed) {
    code.push("l=m+1}else{h=m-1}")
  } else {
    code.push("h=m-1}else{l=m+1}")
  }
  code.push("}")
  if(earlyOut) {
    code.push("return -1};")
  } else {
    code.push("return i};")
  }
  return code.join("")
}

function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
  var result = new Function([
  compileSearch("A", "x" + predicate + "y", reversed, ["y"], false, earlyOut),
  compileSearch("B", "x" + predicate + "y", reversed, ["y"], true, earlyOut),
  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], false, earlyOut),
  compileSearch("Q", "c(x,y)" + predicate + "0", reversed, ["y", "c"], true, earlyOut),
"function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(a.shape){\
if(typeof(c)==='function'){\
return Q(a,(l===undefined)?0:l|0,(h===undefined)?a.shape[0]-1:h|0,y,c)\
}else{\
return B(a,(c===undefined)?0:c|0,(l===undefined)?a.shape[0]-1:l|0,y)\
}}else{\
if(typeof(c)==='function'){\
return P(a,(l===undefined)?0:l|0,(h===undefined)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===undefined)?0:c|0,(l===undefined)?a.length-1:l|0,y)\
}}}\
return dispatchBsearch", suffix].join(""))
  return result()
}

module.exports = {
  ge: compileBoundsSearch(">=", false, "GE"),
  gt: compileBoundsSearch(">", false, "GT"),
  lt: compileBoundsSearch("<", true, "LT"),
  le: compileBoundsSearch("<=", true, "LE"),
  eq: compileBoundsSearch("-", true, "EQ", true)
}

},{}],107:[function(require,module,exports){
/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()

}('domready', function () {

  var fns = [], listener
    , doc = document
    , hack = doc.documentElement.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener)
    loaded = 1
    while (listener = fns.shift()) listener()
  })

  return function (fn) {
    loaded ? fn() : fns.push(fn)
  }

});

},{}],108:[function(require,module,exports){
"use strict"

function invert(hash) {
  var result = {}
  for(var i in hash) {
    if(hash.hasOwnProperty(i)) {
      result[hash[i]] = i
    }
  }
  return result
}

module.exports = invert
},{}],109:[function(require,module,exports){
module.exports=require(58)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/ndarray-hash/node_modules/ndarray/node_modules/iota-array/iota.js":58}],110:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}],111:[function(require,module,exports){
module.exports=require(102)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/noa-engine/node_modules/game-inputs/node_modules/vkey/index.js":102}],112:[function(require,module,exports){
"use strict"

var EventEmitter = require("events").EventEmitter
  , util         = require("util")
  , domready     = require("domready")
  , vkey         = require("vkey")
  , invert       = require("invert-hash")
  , uniq         = require("uniq")
  , bsearch      = require("binary-search-bounds")
  , iota         = require("iota-array")
  , min          = Math.min

//Browser compatibility hacks
require("./lib/raf-polyfill.js")
var addMouseWheel = require("./lib/mousewheel-polyfill.js")
var hrtime = require("./lib/hrtime-polyfill.js")

//Remove angle braces and other useless crap
var filtered_vkey = (function() {
  var result = new Array(256)
    , i, j, k
  for(i=0; i<256; ++i) {
    result[i] = "UNK"
  }
  for(i in vkey) {
    k = vkey[i]
    if(k.charAt(0) === '<' && k.charAt(k.length-1) === '>') {
      k = k.substring(1, k.length-1)
    }
    k = k.replace(/\s/g, "-")
    result[parseInt(i)] = k
  }
  return result
})()

//Compute minimal common set of keyboard functions
var keyNames = uniq(Object.keys(invert(filtered_vkey)))

//Translates a virtual keycode to a normalized keycode
function virtualKeyCode(key) {
  return bsearch.eq(keyNames, key)
}

//Maps a physical keycode to a normalized keycode
function physicalKeyCode(key) {
  return virtualKeyCode(filtered_vkey[key])
}

//Game shell
function GameShell() {
  EventEmitter.call(this)
  this._curKeyState  = new Array(keyNames.length)
  this._pressCount   = new Array(keyNames.length)
  this._releaseCount = new Array(keyNames.length)
  
  this._tickInterval = null
  this._rafHandle = null
  this._tickRate = 0
  this._lastTick = hrtime()
  this._frameTime = 0.0
  this._paused = true
  this._width = 0
  this._height = 0
  
  this._wantFullscreen = false
  this._wantPointerLock = false
  this._fullscreenActive = false
  this._pointerLockActive = false
  
  this._render = render.bind(undefined, this)

  this.preventDefaults = true
  this.stopPropagation = false
  
  for(var i=0; i<keyNames.length; ++i) {
    this._curKeyState[i] = false
    this._pressCount[i] = this._releaseCount[i] = 0
  }
  
  //Public members
  this.element = null
  this.bindings = {}
  this.frameSkip = 100.0
  this.tickCount = 0
  this.frameCount = 0
  this.startTime = hrtime()
  this.tickTime = this._tickRate
  this.frameTime = 10.0
  this.stickyFullscreen = false
  this.stickyPointLock = false
  
  //Scroll stuff
  this.scroll = [0,0,0]
    
  //Mouse state
  this.mouseX = 0
  this.mouseY = 0
  this.prevMouseX = 0
  this.prevMouseY = 0
}

util.inherits(GameShell, EventEmitter)

var proto = GameShell.prototype

//Bind keynames
proto.keyNames = keyNames

//Binds a virtual keyboard event to a physical key
proto.bind = function(virtual_key) {
  //Look up previous key bindings
  var arr
  if(virtual_key in this.bindings) {
    arr = this.bindings[virtual_key]
  } else {
    arr = []
  }
  //Add keys to list
  var physical_key
  for(var i=1, n=arguments.length; i<n; ++i) {
    physical_key = arguments[i]
    if(virtualKeyCode(physical_key) >= 0) {
      arr.push(physical_key)
    } else if(physical_key in this.bindings) {
      var keybinds = this.bindings[physical_key]
      for(var j=0; j<keybinds.length; ++j) {
        arr.push(keybinds[j])
      }
    }
  }
  //Remove any duplicate keys
  arr = uniq(arr)
  if(arr.length > 0) {
    this.bindings[virtual_key] = arr
  }
  this.emit('bind', virtual_key, arr)
}

//Unbinds a virtual keyboard event
proto.unbind = function(virtual_key) {
  if(virtual_key in this.bindings) {
    delete this.bindings[virtual_key]
  }
  this.emit('unbind', virtual_key)
}

//Checks if a key is set in a given state
function lookupKey(state, bindings, key) {
  if(key in bindings) {
    var arr = bindings[key]
    for(var i=0, n=arr.length; i<n; ++i) {
      if(state[virtualKeyCode(arr[i])]) {
        return true
      }
    }
    return false
  }
  var kc = virtualKeyCode(key)
  if(kc >= 0) {
    return state[kc]
  }
  return false
}

//Checks if a key is set in a given state
function lookupCount(state, bindings, key) {
  if(key in bindings) {
    var arr = bindings[key], r = 0
    for(var i=0, n=arr.length; i<n; ++i) {
      r += state[virtualKeyCode(arr[i])]
    }
    return r
  }
  var kc = virtualKeyCode(key)
  if(kc >= 0) {
    return state[kc]
  }
  return 0
}

//Checks if a key (either physical or virtual) is currently held down
proto.down = function(key) {
  return lookupKey(this._curKeyState, this.bindings, key)
}

//Checks if a key was ever down
proto.wasDown = function(key) {
  return this.down(key) || !!this.press(key)
}

//Opposite of down
proto.up = function(key) {
  return !this.down(key)
}

//Checks if a key was released during previous frame
proto.wasUp = function(key) {
  return this.up(key) || !!this.release(key)
}

//Returns the number of times a key was pressed since last tick
proto.press = function(key) {
  return lookupCount(this._pressCount, this.bindings, key)
}

//Returns the number of times a key was released since last tick
proto.release = function(key) {
  return lookupCount(this._releaseCount, this.bindings, key)
}

//Pause/unpause the game loop
Object.defineProperty(proto, "paused", {
  get: function() {
    return this._paused
  },
  set: function(state) {
    var ns = !!state
    if(ns !== this._paused) {
      if(!this._paused) {
        this._paused = true
        this._frameTime = min(1.0, (hrtime() - this._lastTick) / this._tickRate)
        clearInterval(this._tickInterval)
        //cancelAnimationFrame(this._rafHandle)
      } else {
        this._paused = false
        this._lastTick = hrtime() - Math.floor(this._frameTime * this._tickRate)
        this._tickInterval = setInterval(tick, this._tickRate, this)
        this._rafHandle = requestAnimationFrame(this._render)
      }
    }
  }
})

//Fullscreen state toggle

function tryFullscreen(shell) {
  //Request full screen
  var elem = shell.element
  
  if(shell._wantFullscreen && !shell._fullscreenActive) {
    var fs = elem.requestFullscreen ||
             elem.requestFullScreen ||
             elem.webkitRequestFullscreen ||
             elem.webkitRequestFullScreen ||
             elem.mozRequestFullscreen ||
             elem.mozRequestFullScreen ||
             function() {}
    fs.call(elem)
  }
  if(shell._wantPointerLock && !shell._pointerLockActive) {
    var pl =  elem.requestPointerLock ||
              elem.webkitRequestPointerLock ||
              elem.mozRequestPointerLock ||
              elem.msRequestPointerLock ||
              elem.oRequestPointerLock ||
              function() {}
    pl.call(elem)
  }
}

var cancelFullscreen = document.exitFullscreen ||
                       document.cancelFullscreen ||  //Why can no one agree on this?
                       document.cancelFullScreen ||
                       document.webkitCancelFullscreen ||
                       document.webkitCancelFullScreen ||
                       document.mozCancelFullscreen ||
                       document.mozCancelFullScreen ||
                       function(){}

Object.defineProperty(proto, "fullscreen", {
  get: function() {
    return this._fullscreenActive
  },
  set: function(state) {
    var ns = !!state
    if(!ns) {
      this._wantFullscreen = false
      cancelFullscreen.call(document)
    } else {
      this._wantFullscreen = true
      tryFullscreen(this)
    }
    return this._fullscreenActive
  }
})

function handleFullscreen(shell) {
  shell._fullscreenActive = document.fullscreen ||
                            document.mozFullScreen ||
                            document.webkitIsFullScreen ||
                            false
  if(!shell.stickyFullscreen && shell._fullscreenActive) {
    shell._wantFullscreen = false
  }
}

//Pointer lock state toggle
var exitPointerLock = document.exitPointerLock ||
                      document.webkitExitPointerLock ||
                      document.mozExitPointerLock ||
                      function() {}

Object.defineProperty(proto, "pointerLock", {
  get: function() {
    return this._pointerLockActive
  },
  set: function(state) {
    var ns = !!state
    if(!ns) {
      this._wantPointerLock = false
      exitPointerLock.call(document)
    } else {
      this._wantPointerLock = true
      tryFullscreen(this)
    }
    return this._pointerLockActive
  }
})

function handlePointerLockChange(shell, event) {
  shell._pointerLockActive = shell.element === (
      document.pointerLockElement ||
      document.mozPointerLockElement ||
      document.webkitPointerLockElement ||
      null)
  if(!shell.stickyPointerLock && shell._pointerLockActive) {
    shell._wantPointerLock = false
  }
}

//Width and height
Object.defineProperty(proto, "width", {
  get: function() {
    return this.element.clientWidth
  }
})
Object.defineProperty(proto, "height", {
  get: function() {
    return this.element.clientHeight
  }
})

//Set key state
function setKeyState(shell, key, state) {
  var ps = shell._curKeyState[key]
  if(ps !== state) {
    if(state) {
      shell._pressCount[key]++
    } else {
      shell._releaseCount[key]++
    }
    shell._curKeyState[key] = state
  }
}

//Ticks the game state one update
function tick(shell) {
  var skip = hrtime() + shell.frameSkip
    , pCount = shell._pressCount
    , rCount = shell._releaseCount
    , i, s, t
    , tr = shell._tickRate
    , n = keyNames.length
  while(!shell._paused &&
        hrtime() >= shell._lastTick + tr) {
    
    //Skip frames if we are over budget
    if(hrtime() > skip) {
      shell._lastTick = hrtime() + tr
      return
    }
    
    //Tick the game
    s = hrtime()
    shell.emit("tick")
    t = hrtime()
    shell.tickTime = t - s
    
    //Update counters and time
    ++shell.tickCount
    shell._lastTick += tr
    
    //Shift input state
    for(i=0; i<n; ++i) {
      pCount[i] = rCount[i] = 0
    }
    if(shell._pointerLockActive) {
      shell.prevMouseX = shell.mouseX = shell.width>>1
      shell.prevMouseY = shell.mouseY = shell.height>>1
    } else {
      shell.prevMouseX = shell.mouseX
      shell.prevMouseY = shell.mouseY
    }
    shell.scroll[0] = shell.scroll[1] = shell.scroll[2] = 0
  }
}

//Render stuff
function render(shell) {

  //Request next frame
  shell._rafHandle = requestAnimationFrame(shell._render)

  //Tick the shell
  tick(shell)
  
  //Compute frame time
  var dt
  if(shell._paused) {
    dt = shell._frameTime
  } else {
    dt = min(1.0, (hrtime() - shell._lastTick) / shell._tickRate)
  }
  
  //Draw a frame
  ++shell.frameCount
  var s = hrtime()
  shell.emit("render", dt)
  var t = hrtime()
  shell.frameTime = t - s
  
}

function isFocused(shell) {
  return (document.activeElement === document.body) ||
         (document.activeElement === shell.element)
}

function handleEvent(shell, ev) {
  if(shell.preventDefaults) {
    ev.preventDefault()
  }
  if(shell.stopPropagation) {
    ev.stopPropagation()
  }
}

//Set key up
function handleKeyUp(shell, ev) {
  handleEvent(shell, ev)
  var kc = physicalKeyCode(ev.keyCode || ev.char || ev.which || ev.charCode)
  if(kc >= 0) {
    setKeyState(shell, kc, false)
  }
}

//Set key down
function handleKeyDown(shell, ev) {
  if(!isFocused(shell)) {
    return
  }
  handleEvent(shell, ev)
  if(ev.metaKey) {
    //Hack: Clear key state when meta gets pressed to prevent keys sticking
    handleBlur(shell, ev)
  } else {
    var kc = physicalKeyCode(ev.keyCode || ev.char || ev.which || ev.charCode)
    if(kc >= 0) {
      setKeyState(shell, kc, true)
    }
  }
}

//Mouse events are really annoying
var mouseCodes = iota(32).map(function(n) {
  return virtualKeyCode("mouse-" + (n+1))
})

function setMouseButtons(shell, buttons) {
  for(var i=0; i<32; ++i) {
    setKeyState(shell, mouseCodes[i], !!(buttons & (1<<i)))
  }
}

function handleMouseMove(shell, ev) {
  handleEvent(shell, ev)
  if(shell._pointerLockActive) {
    var movementX = ev.movementX       ||
                    ev.mozMovementX    ||
                    ev.webkitMovementX ||
                    0,
        movementY = ev.movementY       ||
                    ev.mozMovementY    ||
                    ev.webkitMovementY ||
                    0
    shell.mouseX += movementX
    shell.mouseY += movementY
  } else {
    shell.mouseX = ev.clientX - shell.element.offsetLeft
    shell.mouseY = ev.clientY - shell.element.offsetTop
  }
  return false
}

function handleMouseDown(shell, ev) {
  handleEvent(shell, ev)
  setKeyState(shell, mouseCodes[ev.button], true)
  return false
}

function handleMouseUp(shell, ev) {
  handleEvent(shell, ev)
  setKeyState(shell, mouseCodes[ev.button], false)
  return false
}

function handleMouseEnter(shell, ev) {
  handleEvent(shell, ev)
  if(shell._pointerLockActive) {
    shell.prevMouseX = shell.mouseX = shell.width>>1
    shell.prevMouseY = shell.mouseY = shell.height>>1
  } else {
    shell.prevMouseX = shell.mouseX = ev.clientX - shell.element.offsetLeft
    shell.prevMouseY = shell.mouseY = ev.clientY - shell.element.offsetTop
  }
  return false
}

function handleMouseLeave(shell, ev) {
  handleEvent(shell, ev)
  setMouseButtons(shell, 0)
  return false
}

//Handle mouse wheel events
function handleMouseWheel(shell, ev) {
  handleEvent(shell, ev)
  var scale = 1
  switch(ev.deltaMode) {
    case 0: //Pixel
      scale = 1
    break
    case 1: //Line
      scale = 12
    break
    case 2: //Page
       scale = shell.height
    break
  }
  //Add scroll
  shell.scroll[0] +=  ev.deltaX * scale
  shell.scroll[1] +=  ev.deltaY * scale
  shell.scroll[2] += (ev.deltaZ * scale)||0.0
  return false
}

function handleContexMenu(shell, ev) {
  handleEvent(shell, ev)
  return false
}

function handleBlur(shell, ev) {
  var n = keyNames.length
    , c = shell._curKeyState
    , r = shell._releaseCount
    , i
  for(i=0; i<n; ++i) {
    if(c[i]) {
      ++r[i]
    }
    c[i] = false
  }
  return false
}

function handleResizeElement(shell, ev) {
  var w = shell.element.clientWidth|0
  var h = shell.element.clientHeight|0
  if((w !== shell._width) || (h !== shell._height)) {
    shell._width = w
    shell._height = h
    shell.emit("resize", w, h)
  }
}

function makeDefaultContainer() {
  var container = document.createElement("div")
  container.tabindex = 1
  container.style.position = "absolute"
  container.style.left = "0px"
  container.style.right = "0px"
  container.style.top = "0px"
  container.style.bottom = "0px"
  container.style.height = "100%"
  container.style.overflow = "hidden"
  document.body.appendChild(container)
  document.body.style.overflow = "hidden" //Prevent bounce
  document.body.style.height = "100%"
  return container
}

function createShell(options) {
  options = options || {}
  
  //Check fullscreen and pointer lock flags
  var useFullscreen = !!options.fullscreen
  var usePointerLock = useFullscreen
  if(typeof options.pointerLock !== undefined) {
    usePointerLock = !!options.pointerLock
  }
  
  //Create initial shell
  var shell = new GameShell()
  shell._tickRate = options.tickRate || 30
  shell.frameSkip = options.frameSkip || (shell._tickRate+5) * 5
  shell.stickyFullscreen = !!options.stickyFullscreen || !!options.sticky
  shell.stickyPointerLock = !!options.stickPointerLock || !options.sticky
  
  //Set bindings
  if(options.bindings) {
    shell.bindings = options.bindings
  }
  
  //Wait for dom to intiailize
  setTimeout(function() { domready(function initGameShell() {
    
    //Retrieve element
    var element = options.element
    if(typeof element === "string") {
      var e = document.querySelector(element)
      if(!e) {
        e = document.getElementById(element)
      }
      if(!e) {
        e = document.getElementByClass(element)[0]
      }
      if(!e) {
        e = makeDefaultContainer()
      }
      shell.element = e
    } else if(typeof element === "object" && !!element) {
      shell.element = element
    } else if(typeof element === "function") {
      shell.element = element()
    } else {
      shell.element = makeDefaultContainer()
    }
    
    //Disable user-select
    if(shell.element.style) {
      shell.element.style["-webkit-touch-callout"] = "none"
      shell.element.style["-webkit-user-select"] = "none"
      shell.element.style["-khtml-user-select"] = "none"
      shell.element.style["-moz-user-select"] = "none"
      shell.element.style["-ms-user-select"] = "none"
      shell.element.style["user-select"] = "none"
    }
    
    //Hook resize handler
    shell._width = shell.element.clientWidth
    shell._height = shell.element.clientHeight
    var handleResize = handleResizeElement.bind(undefined, shell)
    if(typeof MutationObserver !== "undefined") {
      var observer = new MutationObserver(handleResize)
      observer.observe(shell.element, {
        attributes: true,
        subtree: true
      })
    } else {
      shell.element.addEventListener("DOMSubtreeModified", handleResize, false)
    }
    window.addEventListener("resize", handleResize, false)
    
    //Hook keyboard listener
    window.addEventListener("keydown", handleKeyDown.bind(undefined, shell), false)
    window.addEventListener("keyup", handleKeyUp.bind(undefined, shell), false)
    
    //Disable right click
    shell.element.oncontextmenu = handleContexMenu.bind(undefined, shell)
    
    //Hook mouse listeners
    shell.element.addEventListener("mousedown", handleMouseDown.bind(undefined, shell), false)
    shell.element.addEventListener("mouseup", handleMouseUp.bind(undefined, shell), false)
    shell.element.addEventListener("mousemove", handleMouseMove.bind(undefined, shell), false)
    shell.element.addEventListener("mouseenter", handleMouseEnter.bind(undefined, shell), false)
    
    //Mouse leave
    var leave = handleMouseLeave.bind(undefined, shell)
    shell.element.addEventListener("mouseleave", leave, false)
    shell.element.addEventListener("mouseout", leave, false)
    window.addEventListener("mouseleave", leave, false)
    window.addEventListener("mouseout", leave, false)
    
    //Blur event 
    var blur = handleBlur.bind(undefined, shell)
    shell.element.addEventListener("blur", blur, false)
    shell.element.addEventListener("focusout", blur, false)
    shell.element.addEventListener("focus", blur, false)
    window.addEventListener("blur", blur, false)
    window.addEventListener("focusout", blur, false)
    window.addEventListener("focus", blur, false)

    //Mouse wheel handler
    addMouseWheel(shell.element, handleMouseWheel.bind(undefined, shell), false)

    //Fullscreen handler
    var fullscreenChange = handleFullscreen.bind(undefined, shell)
    document.addEventListener("fullscreenchange", fullscreenChange, false)
    document.addEventListener("mozfullscreenchange", fullscreenChange, false)
    document.addEventListener("webkitfullscreenchange", fullscreenChange, false)

    //Stupid fullscreen hack
    shell.element.addEventListener("click", tryFullscreen.bind(undefined, shell), false)

    //Pointer lock change handler
    var pointerLockChange = handlePointerLockChange.bind(undefined, shell)
    document.addEventListener("pointerlockchange", pointerLockChange, false)
    document.addEventListener("mozpointerlockchange", pointerLockChange, false)
    document.addEventListener("webkitpointerlockchange", pointerLockChange, false)
    document.addEventListener("pointerlocklost", pointerLockChange, false)
    document.addEventListener("webkitpointerlocklost", pointerLockChange, false)
    document.addEventListener("mozpointerlocklost", pointerLockChange, false)
    
    //Update flags
    shell.fullscreen = useFullscreen
    shell.pointerLock = usePointerLock
  
    //Default mouse button aliases
    shell.bind("mouse-left",   "mouse-1")
    shell.bind("mouse-right",  "mouse-3")
    shell.bind("mouse-middle", "mouse-2")
    
    //Initialize tick counter
    shell._lastTick = hrtime()
    shell.startTime = hrtime()

    //Unpause shell
    shell.paused = false
    
    //Emit initialize event
    shell.emit("init")
  })}, 0)
  
  return shell
}

module.exports = createShell

},{"./lib/hrtime-polyfill.js":103,"./lib/mousewheel-polyfill.js":104,"./lib/raf-polyfill.js":105,"binary-search-bounds":106,"domready":107,"events":195,"invert-hash":108,"iota-array":109,"uniq":110,"util":200,"vkey":111}],113:[function(require,module,exports){
module.exports=require(22)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/add.js":22}],114:[function(require,module,exports){
module.exports=require(23)
},{"./dot":121,"./fromValues":123,"./normalize":132,"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/angle.js":23}],115:[function(require,module,exports){
module.exports=require(24)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/clone.js":24}],116:[function(require,module,exports){
module.exports=require(25)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/copy.js":25}],117:[function(require,module,exports){
module.exports=require(26)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/create.js":26}],118:[function(require,module,exports){
module.exports=require(27)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/cross.js":27}],119:[function(require,module,exports){
module.exports=require(28)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/distance.js":28}],120:[function(require,module,exports){
module.exports=require(29)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/divide.js":29}],121:[function(require,module,exports){
module.exports=require(30)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/dot.js":30}],122:[function(require,module,exports){
module.exports=require(31)
},{"./create":117,"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/forEach.js":31}],123:[function(require,module,exports){
module.exports=require(32)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/fromValues.js":32}],124:[function(require,module,exports){
module.exports=require(33)
},{"./add":113,"./angle":114,"./clone":115,"./copy":116,"./create":117,"./cross":118,"./distance":119,"./divide":120,"./dot":121,"./forEach":122,"./fromValues":123,"./inverse":125,"./length":126,"./lerp":127,"./max":128,"./min":129,"./multiply":130,"./negate":131,"./normalize":132,"./random":133,"./rotateX":134,"./rotateY":135,"./rotateZ":136,"./scale":137,"./scaleAndAdd":138,"./set":139,"./squaredDistance":140,"./squaredLength":141,"./subtract":142,"./transformMat3":143,"./transformMat4":144,"./transformQuat":145,"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/index.js":33}],125:[function(require,module,exports){
module.exports=require(34)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/inverse.js":34}],126:[function(require,module,exports){
module.exports=require(35)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/length.js":35}],127:[function(require,module,exports){
module.exports=require(36)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/lerp.js":36}],128:[function(require,module,exports){
module.exports=require(37)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/max.js":37}],129:[function(require,module,exports){
module.exports=require(38)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/min.js":38}],130:[function(require,module,exports){
module.exports=require(39)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/multiply.js":39}],131:[function(require,module,exports){
module.exports=require(40)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/negate.js":40}],132:[function(require,module,exports){
module.exports=require(41)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/normalize.js":41}],133:[function(require,module,exports){
module.exports=require(42)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/random.js":42}],134:[function(require,module,exports){
module.exports=require(43)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/rotateX.js":43}],135:[function(require,module,exports){
module.exports=require(44)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/rotateY.js":44}],136:[function(require,module,exports){
module.exports=require(45)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/rotateZ.js":45}],137:[function(require,module,exports){
module.exports=require(46)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/scale.js":46}],138:[function(require,module,exports){
module.exports=require(47)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/scaleAndAdd.js":47}],139:[function(require,module,exports){
module.exports=require(48)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/set.js":48}],140:[function(require,module,exports){
module.exports=require(49)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/squaredDistance.js":49}],141:[function(require,module,exports){
module.exports=require(50)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/squaredLength.js":50}],142:[function(require,module,exports){
module.exports=require(51)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/subtract.js":51}],143:[function(require,module,exports){
module.exports=require(52)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/transformMat3.js":52}],144:[function(require,module,exports){
module.exports=require(53)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/transformMat4.js":53}],145:[function(require,module,exports){
module.exports=require(54)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/transformQuat.js":54}],146:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],147:[function(require,module,exports){
module.exports=require(57)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/ndarray-hash/node_modules/ndarray/ndarray.js":57,"buffer":191,"iota-array":148}],148:[function(require,module,exports){
module.exports=require(58)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/ndarray-hash/node_modules/ndarray/node_modules/iota-array/iota.js":58}],149:[function(require,module,exports){
'use strict';

var collisions = require('collide-3d-tilemap')
,   extend = require('extend')
,   aabb = require('aabb-3d')
,   vec3 = require('gl-vec3')

var RigidBody = require('./rigidBody')

module.exports = function(opts, testSolid, testFluid) {
  return new Physics(opts, testSolid, testFluid)
}

var defaults = {
  gravity: [0, -10, 0], 
  airFriction: 0.995,
  minBounceImpulse: .5, // lowest collision impulse that bounces
  fluidDensity: 1.2,
  fluidDrag: 4.0,
}


/* 
 *    CONSTRUCTOR - represents a world of rigid bodies.
 * 
 *  Takes testSolid(x,y,z) function to query block solidity
 *  Takes testFluid(x,y,z) function to query if a block is a fluid
*/
function Physics(opts, testSolid, testFluid) {
  opts = extend( {}, defaults, opts )

  this.gravity = opts.gravity
  this.airFriction = opts.airFriction
  this.fluidDensity = opts.fluidDensity
  this.fluidDrag = opts.fluidDrag
  this.minBounceImpulse = opts.minBounceImpulse
  this.bodies = []

  // collision function - TODO: abstract this into a setter?
  this.collideWorld = collisions(
    testSolid,
    1,
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity]
  )
  this.testFluid = testFluid
}


/*
 *    ADDING AND REMOVING RIGID BODIES
*/

Physics.prototype.addBody = function(_aabb, mass,
                                      friction, restitution, gravMult,
                                      onCollide) {
  _aabb = _aabb || new aabb( [0,0,0], [1,1,1] )
  if (typeof mass == 'undefined') mass = 1
  if (typeof friction == 'undefined') friction = 1
  if (typeof restitution == 'undefined') restitution = 0
  if (typeof gravMult == 'undefined') gravMult = 1
  var b = new RigidBody(_aabb, mass, friction, restitution, gravMult, onCollide)
  this.bodies.push(b)
  return b
}

Physics.prototype.removeBody = function(b) {
  var i = this.bodies.indexOf(b)
  if (i < 0) return undefined
  this.bodies.splice(i, 1)
  b.aabb = b.onCollide = null // in case it helps the GC
}




/*
 *    PHYSICS AND COLLISIONS
*/

var world_x0 = vec3.create(),
    world_x1 = vec3.create(),
    world_dx = vec3.create(),
    friction = vec3.create(),
    a = vec3.create(),
    g = vec3.create(),
    dv = vec3.create(),
    dx = vec3.create(),
    impacts = vec3.create(),
    tmpDx = vec3.create(),
    tmpResting = vec3.create(),
    flag = { // boolean holder to get around scope peculiarities below
      value: false
    }
    

Physics.prototype.tick = function(dt) {
  
  var b, i, j, len, tmpBox
  // convert dt to seconds
  dt = dt/1000
  for(i=0, len=this.bodies.length; i<len; ++i) {
    b = this.bodies[i]

    // semi-implicit Euler integration

    // a = f/m + gravity*gravityMultiplier
    vec3.scale( a, b._forces, 1/b.mass )
    vec3.scale( g, this.gravity, b.gravityMultiplier )
    vec3.add  ( a, a, g )

    // v1 = v0 + i/m + a*dt
    vec3.scale( dv, b._impulses, 1/b.mass )
    vec3.add  ( b.velocity, b.velocity, dv )
    vec3.scale( dv, a, dt )
    vec3.add  ( b.velocity, b.velocity, dv )

    // apply friction if body was on ground last frame
    if (b.resting[1]<0) {
      // friction force <= - u |vel|
      // max friction impulse = (F/m)*dt = (mg)/m*dt = u*g*dt = dt*b.friction
      var fMax = dt * b.friction
      // friction direction - inversed horizontal velocity
      vec3.scale( friction, b.velocity, -1 )
      friction[1] = 0
      var vAmt = vec3.length(friction)
      if (vAmt > fMax) { // slow down
        vec3.scale( friction, friction, fMax/vAmt )
        vec3.add( b.velocity, b.velocity, friction )
      } else { // stop
        b.velocity[0] = b.velocity[2] = 0
      }
    } else {
      // not on ground, apply air resistance
      vec3.scale( b.velocity, b.velocity, this.airFriction )
    }

    // x1-x0 = v1*dt
    vec3.scale( dx, b.velocity, dt )

    // clear forces and impulses for next timestep
    vec3.set( b._forces, 0, 0, 0 )
    vec3.set( b._impulses, 0, 0, 0 )

    // cache stepped base/dx values for autostep
    if (b.autoStep) {
      tmpBox = new aabb( b.aabb.base, b.aabb.vec )
      vec3.copy( tmpDx, dx )
    }

    // run collisions
    vec3.set( b.resting, 0, 0, 0 )
    // flag.value is a check whether the body was collided already before
    // taking the movement vector into account. It's wrapped in an object
    // so we can pass it to and reference it from processHit()
    flag.value = false
    this.collideWorld(b.aabb, dx, 
                      getCurriedProcessHit(dx, b.resting, flag) )

    // if autostep, and on ground, run collisions again with stepped up aabb
    if (b.autoStep && 
        (b.resting[1]<0 || b.inFluid) && 
        (b.resting[0] || b.resting[2])) {
      vec3.set( tmpResting, 0, 0, 0 )
      var y = tmpBox.base[1]
      if (b.resting[1]<0) tmpDx[1]=0
      tmpBox.translate( [0, Math.floor(y+1.01)-y, 0] )
      this.collideWorld(tmpBox, tmpDx, 
                        getCurriedProcessHit(tmpDx, tmpResting, flag) )
      var stepx = b.resting[0] && !tmpResting[0]
      var stepz = b.resting[2] && !tmpResting[2]
      // if stepping avoids collisions, copy stepped results into real data
      if (!flag.value && (stepx || stepz)) {
        setBoxPos( b.aabb, tmpBox.base )
        if (b.resting[1]<0) tmpResting[1]=-1
        vec3.copy( b.resting, tmpResting )
        if (b.onStep) b.onStep();
      }
    }

    // Collision impacts. b.resting shows which axes had collisions:
    for (j=0; j<3; ++j) {
      impacts[j] = 0
      if (b.resting[j]) {
        impacts[j] = -b.velocity[j]
        b.velocity[j] = 0
      }
    }
    var mag = vec3.length(impacts)
    if (mag>.001) { // epsilon
      // bounce if over minBounceImpulse
      if (mag>this.minBounceImpulse && b.restitution) {
        vec3.scale(impacts, impacts, b.restitution)
        b.applyImpulse( impacts )
      }
      // collision event regardless
      if (b.onCollide) b.onCollide(impacts);
    }
    
    // First pass at handling fluids. Assumes fluids are settled
    //   thus, only check at center of body, and only from bottom up
    var box = b.aabb
    var cx = Math.floor((box.base[0] + box.max[0]) / 2)
    var cz = Math.floor((box.base[2] + box.max[2]) / 2)
    var y0 = Math.floor(box.base[1])
    var y1 = Math.floor(box.max[1])
    var submerged = 0
    for (var cy=y0; cy<=y1; ++cy) {
      if(this.testFluid(cx, cy, cz)) {
        ++submerged
      } else {
        break 
      }
    }
    
    if (submerged > 0) {
      // find how much of body is submerged
      var fluidLevel = y0 + submerged
      var heightInFluid = fluidLevel - box.base[1]
      var ratioInFluid = heightInFluid / box.vec[1]
      if (ratioInFluid > 1) ratioInFluid = 1
      var vol = box.vec[0] * box.vec[1] * box.vec[2]
      var displaced = vol * ratioInFluid
      // bouyant force = -gravity * fluidDensity * volumeDisplaced
      vec3.scale( g, this.gravity, -b.gravityMultiplier * this.fluidDensity * displaced )
      // drag force = -dv for some constant d. Here scale it down by ratioInFluid
      vec3.scale( friction, b.velocity, -this.fluidDrag * ratioInFluid )
      vec3.add( g, g, friction )
      b.applyForce( g )
      b.inFluid = true
    } else {
      b.inFluid = false
    }
    
  }
}



function getCurriedProcessHit(vec, resting, wasCollided) {
  return function(axis, tile, coords, dir, edge) {
    return processHit(vec, resting, wasCollided, axis, tile, coords, dir, edge)
  }
}

// the on-hit function called by the collide-tilemap library
function processHit(vec, resting, wasCollided, axis, tile, coords, dir, edge) {
  // assume all truthy tile values collide
  if (!tile) return
  if (Math.abs(vec[axis]) < Math.abs(edge)) {
    // true when the body started out already collided with terrain
    wasCollided.value = true
    return
  }
  // a collision happened, process it
  resting[axis] = dir
  vec[axis] = edge
  return true
}

// helper function, since aabb has no easy way of setting position
function setBoxPos(box, pos) {
  vec3.copy( box.base, pos )
  vec3.add( box.max, box.base, box.vec )
}

},{"./rigidBody":187,"aabb-3d":150,"collide-3d-tilemap":152,"extend":153,"gl-vec3":165}],150:[function(require,module,exports){
module.exports = AABB

var vec3 = require('gl-matrix').vec3

function AABB(pos, vec) {

  if(!(this instanceof AABB)) {
    return new AABB(pos, vec)
  }

  var pos2 = vec3.create()
  vec3.add(pos2, pos, vec)
 
  this.base = vec3.min(vec3.create(), pos, pos2)
  this.vec = vec
  this.max = vec3.max(vec3.create(), pos, pos2)

  this.mag = vec3.length(this.vec)

}

var cons = AABB
  , proto = cons.prototype

proto.width = function() {
  return this.vec[0]
}

proto.height = function() {
  return this.vec[1]
}

proto.depth = function() {
  return this.vec[2]
}

proto.x0 = function() {
  return this.base[0]
}

proto.y0 = function() {
  return this.base[1]
}

proto.z0 = function() {
  return this.base[2]
}

proto.x1 = function() {
  return this.max[0]
}

proto.y1 = function() {
  return this.max[1]
}

proto.z1 = function() {
  return this.max[2]
}

proto.translate = function(by) {
  vec3.add(this.max, this.max, by)
  vec3.add(this.base, this.base, by)
  return this
}

proto.expand = function(aabb) {
  var max = vec3.create()
    , min = vec3.create()

  vec3.max(max, aabb.max, this.max)
  vec3.min(min, aabb.base, this.base)
  vec3.sub(max, max, min)

  return new AABB(min, max)
}

proto.intersects = function(aabb) {
  if(aabb.base[0] > this.max[0]) return false
  if(aabb.base[1] > this.max[1]) return false
  if(aabb.base[2] > this.max[2]) return false
  if(aabb.max[0] < this.base[0]) return false
  if(aabb.max[1] < this.base[1]) return false
  if(aabb.max[2] < this.base[2]) return false

  return true
}

proto.touches = function(aabb) {

  var intersection = this.union(aabb);

  return (intersection !== null) &&
         ((intersection.width() == 0) ||
         (intersection.height() == 0) || 
         (intersection.depth() == 0))

}

proto.union = function(aabb) {
  if(!this.intersects(aabb)) return null

  var base_x = Math.max(aabb.base[0], this.base[0])
    , base_y = Math.max(aabb.base[1], this.base[1])
    , base_z = Math.max(aabb.base[2], this.base[2])
    , max_x = Math.min(aabb.max[0], this.max[0])
    , max_y = Math.min(aabb.max[1], this.max[1])
    , max_z = Math.min(aabb.max[2], this.max[2])

  return new AABB([base_x, base_y, base_z], [max_x - base_x, max_y - base_y, max_z - base_z])
}





},{"gl-matrix":151}],151:[function(require,module,exports){
module.exports=require(86)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/noa-engine/node_modules/aabb-3d/node_modules/gl-matrix/dist/gl-matrix.js":86}],152:[function(require,module,exports){
module.exports = function(field, tilesize, dimensions, offset) {
  dimensions = dimensions || [ 
    Math.sqrt(field.length) >> 0
  , Math.sqrt(field.length) >> 0
  , Math.sqrt(field.length) >> 0
  ] 

  offset = offset || [
    0
  , 0
  , 0
  ]

  field = typeof field === 'function' ? field : function(x, y, z) {
    var i = x + y * dimensions[1] + (z * dimensions[1] * dimensions[2])
    if (i<0 || i>=this.length) return undefined
    return this[i]
  }.bind(field) 

  var coords

  coords = [0, 0, 0]

  return collide

  function ceil(n) {
    return (n===0) ? 0 : Math.ceil(n)
  }
  
  function collide(box, vec, oncollision) {
    // collide x, then y - if vector has a nonzero component
    if(vec[0] !== 0) collideaxis(0, box, vec, oncollision)
    if(vec[1] !== 0) collideaxis(1, box, vec, oncollision)
    if(vec[2] !== 0) collideaxis(2, box, vec, oncollision)
  }

  function collideaxis(i_axis, box, vec, oncollision) {
    var j_axis = (i_axis + 1) % 3
      , k_axis = (i_axis + 2) % 3 
      , posi = vec[i_axis] > 0
      , leading = box[posi ? 'max' : 'base'][i_axis] 
      , dir = posi ? 1 : -1
      , i_start = Math.floor(leading / tilesize)
      , i_end = (Math.floor((leading + vec[i_axis]) / tilesize)) + dir
      , j_start = Math.floor(box.base[j_axis] / tilesize)
      , j_end = ceil(box.max[j_axis] / tilesize)
      , k_start = Math.floor(box.base[k_axis] / tilesize) 
      , k_end = ceil(box.max[k_axis] / tilesize)
      , done = false
      , edge_vector
      , edge
      , tile

    // loop from the current tile coord to the dest tile coord
    //    -> loop on the opposite axis to get the other candidates
    //      -> if `oncollision` return `true` we've hit something and
    //         should break out of the loops entirely.
    //         NB: `oncollision` is where the client gets the chance
    //         to modify the `vec` in-flight.
    // once we're done translate the box to the vec results

    outer: 
    for(var i = i_start; i !== i_end; i += dir) {
      for(var j = j_start; j !== j_end; ++j) {
        for(var k = k_start; k !== k_end; ++k) {
          coords[i_axis] = i
          coords[j_axis] = j
          coords[k_axis] = k
          tile = field(coords[0], coords[1], coords[2])

          if(tile === undefined) continue

          edge = dir > 0 ? i * tilesize : (i + 1) * tilesize
          edge_vector = edge - leading

          if(oncollision(i_axis, tile, coords, dir, edge_vector)) {
            break outer
          }
        } 
      }
    }

    coords[0] = coords[1] = coords[2] = 0
    coords[i_axis] = vec[i_axis]
    box.translate(coords)
  }
}

},{}],153:[function(require,module,exports){
module.exports=require(99)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/noa-engine/node_modules/extend/index.js":99}],154:[function(require,module,exports){
module.exports=require(22)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/add.js":22}],155:[function(require,module,exports){
module.exports=require(23)
},{"./dot":162,"./fromValues":164,"./normalize":173,"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/angle.js":23}],156:[function(require,module,exports){
module.exports=require(24)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/clone.js":24}],157:[function(require,module,exports){
module.exports=require(25)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/copy.js":25}],158:[function(require,module,exports){
module.exports=require(26)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/create.js":26}],159:[function(require,module,exports){
module.exports=require(27)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/cross.js":27}],160:[function(require,module,exports){
module.exports=require(28)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/distance.js":28}],161:[function(require,module,exports){
module.exports=require(29)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/divide.js":29}],162:[function(require,module,exports){
module.exports=require(30)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/dot.js":30}],163:[function(require,module,exports){
module.exports=require(31)
},{"./create":158,"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/forEach.js":31}],164:[function(require,module,exports){
module.exports=require(32)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/fromValues.js":32}],165:[function(require,module,exports){
module.exports=require(33)
},{"./add":154,"./angle":155,"./clone":156,"./copy":157,"./create":158,"./cross":159,"./distance":160,"./divide":161,"./dot":162,"./forEach":163,"./fromValues":164,"./inverse":166,"./length":167,"./lerp":168,"./max":169,"./min":170,"./multiply":171,"./negate":172,"./normalize":173,"./random":174,"./rotateX":175,"./rotateY":176,"./rotateZ":177,"./scale":178,"./scaleAndAdd":179,"./set":180,"./squaredDistance":181,"./squaredLength":182,"./subtract":183,"./transformMat3":184,"./transformMat4":185,"./transformQuat":186,"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/index.js":33}],166:[function(require,module,exports){
module.exports=require(34)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/inverse.js":34}],167:[function(require,module,exports){
module.exports=require(35)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/length.js":35}],168:[function(require,module,exports){
module.exports=require(36)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/lerp.js":36}],169:[function(require,module,exports){
module.exports=require(37)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/max.js":37}],170:[function(require,module,exports){
module.exports=require(38)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/min.js":38}],171:[function(require,module,exports){
module.exports=require(39)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/multiply.js":39}],172:[function(require,module,exports){
module.exports=require(40)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/negate.js":40}],173:[function(require,module,exports){
module.exports=require(41)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/normalize.js":41}],174:[function(require,module,exports){
module.exports=require(42)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/random.js":42}],175:[function(require,module,exports){
module.exports=require(43)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/rotateX.js":43}],176:[function(require,module,exports){
module.exports=require(44)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/rotateY.js":44}],177:[function(require,module,exports){
module.exports=require(45)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/rotateZ.js":45}],178:[function(require,module,exports){
module.exports=require(46)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/scale.js":46}],179:[function(require,module,exports){
module.exports=require(47)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/scaleAndAdd.js":47}],180:[function(require,module,exports){
module.exports=require(48)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/set.js":48}],181:[function(require,module,exports){
module.exports=require(49)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/squaredDistance.js":49}],182:[function(require,module,exports){
module.exports=require(50)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/squaredLength.js":50}],183:[function(require,module,exports){
module.exports=require(51)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/subtract.js":51}],184:[function(require,module,exports){
module.exports=require(52)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/transformMat3.js":52}],185:[function(require,module,exports){
module.exports=require(53)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/transformMat4.js":53}],186:[function(require,module,exports){
module.exports=require(54)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/gl-vec3/transformQuat.js":54}],187:[function(require,module,exports){

var aabb = require('aabb-3d')
,   vec3 = require('gl-vec3')


module.exports = RigidBody
  

/*
 *    RIGID BODY - internal data structure
 *  Only AABB bodies right now. Someday will likely need spheres?
*/

function RigidBody(_aabb, mass, friction, restitution, gravMult, onCollide, autoStep) {
  this.aabb = new aabb(_aabb.base, _aabb.vec) // clone
  this.mass = mass
  // max friction force - i.e. friction coefficient times gravity
  this.friction = friction
  this.restitution = restitution
  this.gravityMultiplier = gravMult
  this.onCollide = onCollide
  this.autoStep = !!autoStep
  this.onStep = null
  // internals
  this.velocity = vec3.create()
  this.resting = [ false, false, false ]
  this.inFluid = false
  this._forces = vec3.create()
  this._impulses = vec3.create()
}

RigidBody.prototype.setPosition = function(p) {
  vec3.subtract(p,p,this.aabb.base)
  this.aabb.translate(p)
}
RigidBody.prototype.getPosition = function() {
  return vec3.clone( this.aabb.base ) 
}
RigidBody.prototype.applyForce = function(f) {
  vec3.add( this._forces, this._forces, f )
}
RigidBody.prototype.applyImpulse = function(i) {
  vec3.add( this._impulses, this._impulses, i )
}


// temp
RigidBody.prototype.atRestX = function() { return this.resting[0] }
RigidBody.prototype.atRestY = function() { return this.resting[1] }
RigidBody.prototype.atRestZ = function() { return this.resting[2] }


},{"aabb-3d":150,"gl-vec3":165}],188:[function(require,module,exports){
"use strict"

function traceRay_impl(
  voxels,
  px, py, pz,
  dx, dy, dz,
  max_d,
  hit_pos,
  hit_norm,
  EPSILON) {
  var t = 0.0
    , nx=0, ny=0, nz=0
    , ix, iy, iz
    , fx, fy, fz
    , ox, oy, oz
    , ex, ey, ez
    , b, step, min_step
    , floor = Math.floor
  //Step block-by-block along ray
  while(t <= max_d) {
    ox = px + t * dx
    oy = py + t * dy
    oz = pz + t * dz
    ix = floor(ox)|0
    iy = floor(oy)|0
    iz = floor(oz)|0
    fx = ox - ix
    fy = oy - iy
    fz = oz - iz
    b = voxels.getBlock(ix, iy, iz)
    if(b) {
      if(hit_pos) {
        //Clamp to face on hit
        hit_pos[0] = fx < EPSILON ? +ix : (fx > 1.0-EPSILON ? ix+1.0-EPSILON : ox)
        hit_pos[1] = fy < EPSILON ? +iy : (fy > 1.0-EPSILON ? iy+1.0-EPSILON : oy)
        hit_pos[2] = fz < EPSILON ? +iz : (fz > 1.0-EPSILON ? iz+1.0-EPSILON : oz)
      }
      if(hit_norm) {
        hit_norm[0] = nx
        hit_norm[1] = ny
        hit_norm[2] = nz
      }
      return b
    }
    //Check edge cases
    min_step = +(EPSILON * (1.0 + t))
    if(t > min_step) {
      ex = nx < 0 ? fx <= min_step : fx >= 1.0 - min_step
      ey = ny < 0 ? fy <= min_step : fy >= 1.0 - min_step
      ez = nz < 0 ? fz <= min_step : fz >= 1.0 - min_step
      if(ex && ey && ez) {
        b = voxels.getBlock(ix+nx, iy+ny, iz) ||
            voxels.getBlock(ix, iy+ny, iz+nz) ||
            voxels.getBlock(ix+nx, iy, iz+nz)
        if(b) {
          if(hit_pos) {
            hit_pos[0] = nx < 0 ? ix-EPSILON : ix + 1.0-EPSILON
            hit_pos[1] = ny < 0 ? iy-EPSILON : iy + 1.0-EPSILON
            hit_pos[2] = nz < 0 ? iz-EPSILON : iz + 1.0-EPSILON
          }
          if(hit_norm) {
            hit_norm[0] = nx
            hit_norm[1] = ny
            hit_norm[2] = nz
          }
          return b
        }
      }
      if(ex && (ey || ez)) {
        b = voxels.getBlock(ix+nx, iy, iz)
        if(b) {
          if(hit_pos) {
            hit_pos[0] = nx < 0 ? ix-EPSILON : ix + 1.0-EPSILON
            hit_pos[1] = fy < EPSILON ? +iy : oy
            hit_pos[2] = fz < EPSILON ? +iz : oz
          }
          if(hit_norm) {
            hit_norm[0] = nx
            hit_norm[1] = ny
            hit_norm[2] = nz
          }
          return b
        }
      }
      if(ey && (ex || ez)) {
        b = voxels.getBlock(ix, iy+ny, iz)
        if(b) {
          if(hit_pos) {
            hit_pos[0] = fx < EPSILON ? +ix : ox
            hit_pos[1] = ny < 0 ? iy-EPSILON : iy + 1.0-EPSILON
            hit_pos[2] = fz < EPSILON ? +iz : oz
          }
          if(hit_norm) {
            hit_norm[0] = nx
            hit_norm[1] = ny
            hit_norm[2] = nz
          }
          return b
        }
      }
      if(ez && (ex || ey)) {
        b = voxels.getBlock(ix, iy, iz+nz)
        if(b) {
          if(hit_pos) {
            hit_pos[0] = fx < EPSILON ? +ix : ox
            hit_pos[1] = fy < EPSILON ? +iy : oy
            hit_pos[2] = nz < 0 ? iz-EPSILON : iz + 1.0-EPSILON
          }
          if(hit_norm) {
            hit_norm[0] = nx
            hit_norm[1] = ny
            hit_norm[2] = nz
          }
          return b
        }
      }
    }
    //Walk to next face of cube along ray
    nx = ny = nz = 0
    step = 2.0
    if(dx < -EPSILON) {
      var s = -fx/dx
      nx = 1
      step = s
    }
    if(dx > EPSILON) {
      var s = (1.0-fx)/dx
      nx = -1
      step = s
    }
    if(dy < -EPSILON) {
      var s = -fy/dy
      if(s < step-min_step) {
        nx = 0
        ny = 1
        step = s
      } else if(s < step+min_step) {
        ny = 1
      }
    }
    if(dy > EPSILON) {
      var s = (1.0-fy)/dy
      if(s < step-min_step) {
        nx = 0
        ny = -1
        step = s
      } else if(s < step+min_step) {
        ny = -1
      }
    }
    if(dz < -EPSILON) {
      var s = -fz/dz
      if(s < step-min_step) {
        nx = ny = 0
        nz = 1
        step = s
      } else if(s < step+min_step) {
        nz = 1
      }
    }
    if(dz > EPSILON) {
      var s = (1.0-fz)/dz
      if(s < step-min_step) {
        nx = ny = 0
        nz = -1
        step = s
      } else if(s < step+min_step) {
        nz = -1
      }
    }
    if(step > max_d - t) {
      step = max_d - t - min_step
    }
    if(step < min_step) {
      step = min_step
    }
    t += step
  }
  if(hit_pos) {
    hit_pos[0] = ox;
    hit_pos[1] = oy;
    hit_pos[2] = oz;
  }
  if(hit_norm) {
    hit_norm[0] = hit_norm[1] = hit_norm[2] = 0;
  }
  return 0
}

function traceRay(voxels, origin, direction, max_d, hit_pos, hit_norm, EPSILON) {
  var px = +origin[0]
    , py = +origin[1]
    , pz = +origin[2]
    , dx = +direction[0]
    , dy = +direction[1]
    , dz = +direction[2]
    , ds = Math.sqrt(dx*dx + dy*dy + dz*dz)
  if(typeof(EPSILON) === "undefined") {
    EPSILON = 1e-8
  }
  if(ds < EPSILON) {
    if(hit_pos) {
      hit_pos[0] = hit_pos[1] = hit_pos[2]
    }
    if(hit_norm) {
      hit_norm[0] = hit_norm[1] = hit_norm[2]
    }
    return 0;
  }
  dx /= ds
  dy /= ds
  dz /= ds
  if(typeof(max_d) === "undefined") {
    max_d = 64.0
  } else {
    max_d = +max_d
  }
  return traceRay_impl(voxels, px, py, pz, dx, dy, dz, max_d, hit_pos, hit_norm, EPSILON)
}

module.exports = traceRay
},{}],189:[function(require,module,exports){
/*
 * A fast javascript implementation of simplex noise by Jonas Wagner
 *
 * Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 *
 *
 * Copyright (C) 2012 Jonas Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
(function () {

var F2 = 0.5 * (Math.sqrt(3.0) - 1.0),
    G2 = (3.0 - Math.sqrt(3.0)) / 6.0,
    F3 = 1.0 / 3.0,
    G3 = 1.0 / 6.0,
    F4 = (Math.sqrt(5.0) - 1.0) / 4.0,
    G4 = (5.0 - Math.sqrt(5.0)) / 20.0;


function SimplexNoise(random) {
    if (!random) random = Math.random;
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (var i = 0; i < 256; i++) {
        this.p[i] = random() * 256;
    }
    for (i = 0; i < 512; i++) {
        this.perm[i] = this.p[i & 255];
        this.permMod12[i] = this.perm[i] % 12;
    }

}
SimplexNoise.prototype = {
    grad3: new Float32Array([1, 1, 0,
                            - 1, 1, 0,
                            1, - 1, 0,

                            - 1, - 1, 0,
                            1, 0, 1,
                            - 1, 0, 1,

                            1, 0, - 1,
                            - 1, 0, - 1,
                            0, 1, 1,

                            0, - 1, 1,
                            0, 1, - 1,
                            0, - 1, - 1]),
    grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1,
                            0, - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1,
                            1, 0, 1, 1, 1, 0, 1, - 1, 1, 0, - 1, 1, 1, 0, - 1, - 1,
                            - 1, 0, 1, 1, - 1, 0, 1, - 1, - 1, 0, - 1, 1, - 1, 0, - 1, - 1,
                            1, 1, 0, 1, 1, 1, 0, - 1, 1, - 1, 0, 1, 1, - 1, 0, - 1,
                            - 1, 1, 0, 1, - 1, 1, 0, - 1, - 1, - 1, 0, 1, - 1, - 1, 0, - 1,
                            1, 1, 1, 0, 1, 1, - 1, 0, 1, - 1, 1, 0, 1, - 1, - 1, 0,
                            - 1, 1, 1, 0, - 1, 1, - 1, 0, - 1, - 1, 1, 0, - 1, - 1, - 1, 0]),
    noise2D: function (xin, yin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0, n1, n2; // Noise contributions from the three corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var X0 = i - t; // Unskew the cell origin back to (x,y) space
        var Y0 = j - t;
        var x0 = xin - X0; // The x,y distances from the cell origin
        var y0 = yin - Y0;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
        else {
            i1 = 0;
            j1 = 1;
        } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1.0 + 2.0 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        var ii = i & 255;
        var jj = j & 255;
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii + perm[jj]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70.0 * (n0 + n1 + n2);
    },
    // 3D simplex noise
    noise3D: function (xin, yin, zin) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad3 = this.grad3;
        var n0, n1, n2, n3; // Noise contributions from the four corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);
        var t = (i + j + k) * G3;
        var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
        var Y0 = j - t;
        var Z0 = k - t;
        var x0 = xin - X0; // The x,y,z distances from the cell origin
        var y0 = yin - Y0;
        var z0 = zin - Z0;
        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // X Y Z order
            else if (x0 >= z0) {
                i1 = 1;
                j1 = 0;
                k1 = 0;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // X Z Y order
            else {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 1;
                j2 = 0;
                k2 = 1;
            } // Z X Y order
        }
        else { // x0<y0
            if (y0 < z0) {
                i1 = 0;
                j1 = 0;
                k1 = 1;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Z Y X order
            else if (x0 < z0) {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 0;
                j2 = 1;
                k2 = 1;
            } // Y Z X order
            else {
                i1 = 0;
                j1 = 1;
                k1 = 0;
                i2 = 1;
                j2 = 1;
                k2 = 0;
            } // Y X Z order
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;
        var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
        var y2 = y0 - j2 + 2.0 * G3;
        var z2 = z0 - k2 + 2.0 * G3;
        var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
        var y3 = y0 - 1.0 + 3.0 * G3;
        var z3 = z0 - 1.0 + 3.0 * G3;
        // Work out the hashed gradient indices of the four simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        // Calculate the contribution from the four corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
            t3 *= t3;
            n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to stay just inside [-1,1]
        return 32.0 * (n0 + n1 + n2 + n3);
    },
    // 4D simplex noise, better simplex rank ordering method 2012-03-09
    noise4D: function (x, y, z, w) {
        var permMod12 = this.permMod12,
            perm = this.perm,
            grad4 = this.grad4;

        var n0, n1, n2, n3, n4; // Noise contributions from the five corners
        // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
        var s = (x + y + z + w) * F4; // Factor for 4D skewing
        var i = Math.floor(x + s);
        var j = Math.floor(y + s);
        var k = Math.floor(z + s);
        var l = Math.floor(w + s);
        var t = (i + j + k + l) * G4; // Factor for 4D unskewing
        var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
        var Y0 = j - t;
        var Z0 = k - t;
        var W0 = l - t;
        var x0 = x - X0; // The x,y,z,w distances from the cell origin
        var y0 = y - Y0;
        var z0 = z - Z0;
        var w0 = w - W0;
        // For the 4D case, the simplex is a 4D shape I won't even try to describe.
        // To find out which of the 24 possible simplices we're in, we need to
        // determine the magnitude ordering of x0, y0, z0 and w0.
        // Six pair-wise comparisons are performed between each possible pair
        // of the four coordinates, and the results are used to rank the numbers.
        var rankx = 0;
        var ranky = 0;
        var rankz = 0;
        var rankw = 0;
        if (x0 > y0) rankx++;
        else ranky++;
        if (x0 > z0) rankx++;
        else rankz++;
        if (x0 > w0) rankx++;
        else rankw++;
        if (y0 > z0) ranky++;
        else rankz++;
        if (y0 > w0) ranky++;
        else rankw++;
        if (z0 > w0) rankz++;
        else rankw++;
        var i1, j1, k1, l1; // The integer offsets for the second simplex corner
        var i2, j2, k2, l2; // The integer offsets for the third simplex corner
        var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
        // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
        // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
        // impossible. Only the 24 indices which have non-zero entries make any sense.
        // We use a thresholding to set the coordinates in turn from the largest magnitude.
        // Rank 3 denotes the largest coordinate.
        i1 = rankx >= 3 ? 1 : 0;
        j1 = ranky >= 3 ? 1 : 0;
        k1 = rankz >= 3 ? 1 : 0;
        l1 = rankw >= 3 ? 1 : 0;
        // Rank 2 denotes the second largest coordinate.
        i2 = rankx >= 2 ? 1 : 0;
        j2 = ranky >= 2 ? 1 : 0;
        k2 = rankz >= 2 ? 1 : 0;
        l2 = rankw >= 2 ? 1 : 0;
        // Rank 1 denotes the second smallest coordinate.
        i3 = rankx >= 1 ? 1 : 0;
        j3 = ranky >= 1 ? 1 : 0;
        k3 = rankz >= 1 ? 1 : 0;
        l3 = rankw >= 1 ? 1 : 0;
        // The fifth corner has all coordinate offsets = 1, so no need to compute that.
        var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
        var y1 = y0 - j1 + G4;
        var z1 = z0 - k1 + G4;
        var w1 = w0 - l1 + G4;
        var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
        var y2 = y0 - j2 + 2.0 * G4;
        var z2 = z0 - k2 + 2.0 * G4;
        var w2 = w0 - l2 + 2.0 * G4;
        var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
        var y3 = y0 - j3 + 3.0 * G4;
        var z3 = z0 - k3 + 3.0 * G4;
        var w3 = w0 - l3 + 3.0 * G4;
        var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
        var y4 = y0 - 1.0 + 4.0 * G4;
        var z4 = z0 - 1.0 + 4.0 * G4;
        var w4 = w0 - 1.0 + 4.0 * G4;
        // Work out the hashed gradient indices of the five simplex corners
        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        var ll = l & 255;
        // Calculate the contribution from the five corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
        if (t0 < 0) n0 = 0.0;
        else {
            var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
            t0 *= t0;
            n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
        if (t1 < 0) n1 = 0.0;
        else {
            var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
            t1 *= t1;
            n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
        if (t2 < 0) n2 = 0.0;
        else {
            var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
            t2 *= t2;
            n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
        if (t3 < 0) n3 = 0.0;
        else {
            var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
            t3 *= t3;
            n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
        }
        var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
        if (t4 < 0) n4 = 0.0;
        else {
            var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
            t4 *= t4;
            n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
        }
        // Sum up and scale the result to cover the range [-1,1]
        return 27.0 * (n0 + n1 + n2 + n3 + n4);
    }


};

// amd
if (typeof define !== 'undefined' && define.amd) define(function(){return SimplexNoise;});
// browser
else if (typeof window !== 'undefined') window.SimplexNoise = SimplexNoise;
//common js
if (typeof exports !== 'undefined') exports.SimplexNoise = SimplexNoise;
// nodejs
if (typeof module !== 'undefined') {
    module.exports = SimplexNoise;
}

})();

},{}],190:[function(require,module,exports){
var bundleFn = arguments[3];
var sources = arguments[4];
var cache = arguments[5];

var stringify = JSON.stringify;

module.exports = function (fn) {
    var keys = [];
    var wkey;
    var cacheKeys = Object.keys(cache);
    
    for (var i = 0, l = cacheKeys.length; i < l; i++) {
        var key = cacheKeys[i];
        if (cache[key].exports === fn) {
            wkey = key;
            break;
        }
    }
    
    if (!wkey) {
        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
        var wcache = {};
        for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            wcache[key] = key;
        }
        sources[wkey] = [
            Function(['require','module','exports'], '(' + fn + ')(self)'),
            wcache
        ];
    }
    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
    
    var scache = {}; scache[wkey] = wkey;
    sources[skey] = [
        Function(['require'],'require(' + stringify(wkey) + ')(self)'),
        scache
    ];
    
    var src = '(' + bundleFn + ')({'
        + Object.keys(sources).map(function (key) {
            return stringify(key) + ':['
                + sources[key][0]
                + ',' + stringify(sources[key][1]) + ']'
            ;
        }).join(',')
        + '},{},[' + stringify(skey) + '])'
    ;
    
    var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
    
    return new Worker(URL.createObjectURL(
        new Blob([src], { type: 'text/javascript' })
    ));
};

},{}],191:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new TypeError('must start with number, buffer, array or string')

  if (this.length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  var buf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if(!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new TypeError('value is out of bounds')
  if (offset + ext > buf.length) throw new TypeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start) throw new TypeError('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new TypeError('targetStart out of bounds')
  if (start < 0 || start >= source.length) throw new TypeError('sourceStart out of bounds')
  if (end < 0 || end > source.length) throw new TypeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new TypeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new TypeError('start out of bounds')
  if (end < 0 || end > this.length) throw new TypeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":192,"ieee754":193,"is-array":194}],192:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],193:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],194:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],195:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],196:[function(require,module,exports){
module.exports=require(146)
},{"/Users/andy/dev/game/work-babylon/noa-testbed/node_modules/noa-engine/node_modules/inherits/inherits_browser.js":146}],197:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":198}],198:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],199:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],200:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":199,"_process":198,"inherits":196}]},{},[4]);
