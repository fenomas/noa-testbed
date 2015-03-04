var vec3 = require('gl-vec3')
var noa = require('noa')

var opts = {
  // inputs
  pointerLock: true,
  inverseY: true,
  // world data
  chunkSize: 32,
  generator: require('./worldgen'), // pass in a more interesting generator function
  texturePath: 'painterly/',
  chunkAddDistance: 2,
  chunkRemoveDistance: 3,
}


// create engine
var game = noa( opts )


/*
 *      define block types and register materials
 *      TODO: fit these into the options object?
*/

// materials
var reg = game.registry
reg.defineMaterial( 1, [1,1,1], 'dirt.png' )
reg.defineMaterial( 2, [1,1,1], 'grass.png' )
reg.defineMaterial( 3, [1,1,1], 'grass_dirt.png' )
reg.defineMaterial( 4, [1,1,1], 'cobblestone.png' )
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


/*
 *      Set inputs to get/set blocks on L/M/R mouse click
*/

// on left mouse, set targeted block to be air
game.inputs.down.on('fire', function() {
  var loc = game.getTargetBlock()
  if (loc) game.setBlock(0, loc)
  if (loc) addSmokeParticles(game.rendering.getScene(), loc, 80, 1, .4, .2, true);
})

// on middle mouse, remember type of targeted block
var placeBlockID = 2
game.inputs.down.on('mid-fire', function() {
  var loc = game.getTargetBlock()
  if (loc) placeBlockID = game.getBlock(loc);
})

// on right mouse, place remembered block adjacent to target
game.inputs.down.on('alt-fire', function() {
  var loc = game.getTargetBlockAdjacent()
  if (loc) game.addBlock(placeBlockID, loc); // addBlock works only if spot is clear
})

// register "i" key to invert mouse
game.inputs.bind('invertY', 'I')
game.inputs.down.on('invertY', function() {
  game.controls.inverseY = !game.controls.inverseY
})


/*
 *    example "spells" that create entities on keypress
*/


game.inputs.bind('earthbomb', '1')
game.inputs.down.on('earthbomb', function() {
  var s = .3 //size
  var scene = game.rendering.getScene()
  var mesh = BABYLON.Mesh.CreateSphere('s1', 2, s, scene)
  mesh.material = getSpellMat(scene,1)
  var pos = game.getCameraPosition()
  // usage: entities.add( pos, w, h, mesh, meshOffset, data, tick, blockTerrain, doPhysics )
  var dat = {}
  var e = game.entities.add( pos, s, s, mesh, [s/2,s/2,s/2], dat, null, false, true )
  // adjust physics properties thusly
  e.body.gravityMultiplier = .5
  // flashy particle trail
  dat.particles = addSmokeParticles(scene, mesh, 400, s, .2, .3, false)
  // blow up on terrain collision
  e.body.onCollide = function onSpellCollide(impulse) {
    addBlocksInSphere(scene, placeBlockID, this.getPosition(), window.a)
    dat.particles.stop()
    game.entities.remove(e)
  }
  // give it thwack
  launchAlongCameraVector(e, 10)
})
window.a = 2
game.inputs.bind('timebomb', '2')
game.inputs.down.on('timebomb', function() {
  var s = .5 //size
  var scene = game.rendering.getScene()
  var mesh = BABYLON.Mesh.CreateSphere('s2', 2, s, scene)
  mesh.material = getSpellMat(scene,2)
  var pos = game.getCameraPosition()
  var dat = { counter: 3000 } // ms
  var e = game.entities.add( pos, s, s, mesh, [s/2,s/2,s/2], dat, spell2Tick, false, true )
  // give it some bounce and friction
  e.body.friction = 8
  e.body.restitution = .3
  e.body.gravityMultiplier = 1.5
  // fire particles
  dat.particles = addFireParticles(scene, mesh, s/2, 100, .2, .5)
  // give it thwack
  launchAlongCameraVector(e, 12)
})

// timebomb's "tick" function - literally, har har!
function spell2Tick(dt) {
  this.data.counter -= dt
  var ct = this.data.counter
  var blinker = (ct/250>>0) % 2
  var m = getSpellMat(scene, blinker+2) // 2 or 3
  if (this.mesh.material != m) this.mesh.material = m
  if (ct < 0) {
    // blow up
    addBlocksInSphere( scene, 0, this.getPosition(), 2.75)
    this.data.particles.stop()
    game.entities.remove(this)
  }
}



/*
 * Lots of helper functions
*/

var spellMats = []
function getSpellMat(scene, num) {
  if (!spellMats[num]) {
    var m = new BABYLON.StandardMaterial('mat',scene)
    if (num==1) m.diffuseColor = new BABYLON.Color3(  1, .5,  0 )
    if (num==2) m.diffuseColor = new BABYLON.Color3( .1, .1, .1 )
    if (num==3) m.diffuseColor = new BABYLON.Color3( .9, .1, .1 )
    spellMats[num] = m
  }
  return spellMats[num]
}

function addBlocksInSphere(scene, id, pos, radius) {
  var loc = pos.map(Math.floor)
  var rad = Math.ceil(radius)
  for (var i=-rad; i<=rad; ++i) {
    for (var j=-rad; j<=rad; ++j) {
      for (var k=-rad; k<=rad; ++k) {
        if (i*i + j*j + k*k <= radius*radius) {
          game.addBlock( id, i+loc[0], j+loc[1], k+loc[2] )
          if (id===0) {
            addSmokeParticles(scene, [i+loc[0], j+loc[1], k+loc[2]], 5, 1, .8, .2, true)
          }
        }
      }
    }
  }
}

function launchAlongCameraVector(e, impulse) {
  var vec = game.getCameraVector()
  vec3.normalize(vec, vec)
  vec3.scale(vec, vec, impulse)
  e.body.applyImpulse(vec)
}


// particle-related helpers


function addSmokeParticles(scene, src, num, volume, size, duration, oneoff) {
  var vec3 = BABYLON.Vector3
  var col4 = BABYLON.Color4

  // oneoff means emit num particles and stop, otherwise num is emitRate
  var pool = oneoff ? num : num*duration*1.5
  var particles = new BABYLON.ParticleSystem("p", pool, scene)
  var s = volume/2   // half-width of volume to fill
  
  if (src.length) { // array, treat it as a static location
    particles.emitter = new vec3( src[0]+s, src[1]+s, src[2]+s)
  } else { // otherwise assume it's a mesh to attach to
    particles.emitter = src
  }
  particles.particleTexture = getSmokeTex(scene)
  particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD

  particles.color1 = new col4( .3, .3, .3, 1 )
  particles.color2 = new col4( .5, .5, .5, .1 )
  particles.colorDead = new col4( .6,.6,.6, 0)

  particles.minEmitBox = new vec3( -s,-s,-s )
  particles.maxEmitBox = new vec3(  s, s, s )
  particles.minSize = size
  particles.maxSize = size*1.5

  particles.direction1 = new vec3( -s, s,-s )
  particles.direction2 = new vec3(  s, s, s )
  particles.minEmitPower = 2
  particles.maxEmitPower = 4 

  particles.minLifeTime = duration/2
  particles.maxLifeTime = duration
  particles.updateSpeed = 0.005
  particles.gravity = new vec3(0, 10, 0)

  if (oneoff) {
    particles.manualEmitCount = 10*num/particles.updateSpeed
    particles.targetStopDuration = duration*3
  } else {
    particles.emitRate = num
  }
  particles.disposeOnStop = true
  particles.start()
  return particles
}

var smokeTex
function getSmokeTex(scene) {
  if (!smokeTex) smokeTex = new BABYLON.Texture("particle_standard.png", scene)
  return smokeTex.clone()
}


function addFireParticles(scene, mesh, yoff, rate, size, duration) {
  var vec3 = BABYLON.Vector3
  var col4 = BABYLON.Color4

  var pool = rate*duration*1.5
  var particles = new BABYLON.ParticleSystem("p", pool, scene)
  particles.emitter = mesh
  particles.particleTexture = getFireTex(scene)
  particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE

  particles.color1 = new col4( .8, .5, 0, 1 )
  particles.color2 = new col4( .5, .2, 0, 1 )
  particles.colorDead = new col4( .1,.1,.1, 0)

  particles.minEmitBox = new vec3( 0, yoff, 0 )
  particles.maxEmitBox = new vec3( 0, yoff, 0 )
  particles.minSize = size
  particles.maxSize = size*1.5

  particles.direction1 = new vec3( -1,   1, -1 )
  particles.direction2 = new vec3(  1, 1.5,  1 )
  particles.minEmitPower = 2
  particles.maxEmitPower = 3

  particles.minLifeTime = duration/2
  particles.maxLifeTime = duration
  particles.updateSpeed = 0.005
  particles.gravity = new vec3(0, -20, 0)
  particles.emitRate = rate
  particles.disposeOnStop = true
  particles.start()
  return particles
}

var fireTex
function getFireTex(scene) {
  if (!fireTex) fireTex = new BABYLON.Texture("particle_oneone.png", scene)
  return fireTex.clone()
}
