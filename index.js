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
game.setPlayerMesh(pmesh, [pw/2, ph/2, pw/2], true )

// simplest animation evar
var facing = 1
game.playerEntity.on('tick',function() {
  var onground = this.body.resting[1] < 0
  var fr = (onground) ? stand_frame : jump_frame
  atlas.setMeshFrame(pmesh, fr)
  
  if (game.inputs.state.left) facing = -1
  if (game.inputs.state.right) facing = 1
  game.playerEntity.mesh.scaling.x = vw * facing
})


/*
 *    spawn some simple "mob" entities
*/

var numMobs = 20
for (var i=0; i<numMobs; ++i) {
  var size = 1+Math.random()*2
  var x = 50 - 100*Math.random()
  var y =  8 +   8*Math.random()
  var z = 50 - 100*Math.random()
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
    addParticles(1, loc, [0.5, 0.5, 0.5], 1, 80, .4, .2, true);
  }
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

// bind "i" key to invert mouse
game.inputs.bind('invertY', 'I')
game.inputs.down.on('invertY', function() {
  game.controls.inverseY = !game.controls.inverseY
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




