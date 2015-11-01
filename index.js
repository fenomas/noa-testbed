'use strict';

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
  offset: [0, ph/2, 0]
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

  var loc = game.getTargetBlockPosition()
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
  var id = game.getTargetBlock()
  if (id) placeBlockID = id;
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



