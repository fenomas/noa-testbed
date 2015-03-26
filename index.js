var vec3 = require('gl-vec3')
var noa = require('noa')

// local modules
var createMob = require('./lib/mob')
var worldgen = require('./lib/worldgen')
var projectile = require('./lib/projectile')
var makeShadows = require('./lib/shadows')
var makeParticles = require('./lib/particles')

var opts = {
  // inputs
  pointerLock: true,
  inverseY: true,
  // world data
  chunkSize: 32,
  generator: worldgen, // pass in a more interesting generator function
  texturePath: 'textures/',
  chunkAddDistance: 2,
  chunkRemoveDistance: 3,
  // rendering
  // player
  playerStart: [0,20,0],
  playerHeight: 1.8,
  playerWidth: 0.6,
  playerAutoStep: true,
}


// create engine
var game = noa( opts )
var addParticles = makeParticles(game)
var launchProjectile = projectile(game, addParticles)

makeShadows(game)




/*
 *    placeholder mesh for the player
*/

// register a spritesheet which has player/mob sprites
game.registry.registerSpritesheet('playermob','sprites.png',100,32)

var ph = opts.playerHeight,
    pw = opts.playerWidth
var s = game.rendering.getScene()
//var psprite = game.rendering.makeEntitySprite('playermob',0)
//psprite.size = ph
var box = BABYLON.Mesh.CreateBox('',1,game.rendering.getScene())
box.scaling = new BABYLON.Vector3(pw,ph,pw)
game.setPlayerMesh(box, [pw/2, ph/2, pw/2] )

// simplest animation evar
//game.playerEntity.on('tick',function() {
//  var onground = this.body.resting[1] < 0
//  this.mesh.cellIndex = (onground) ? 0 : 1
//})


/*
 *    spawn some simple "mob" entities
*/


for (var i=0; i<30; ++i) {
  var size = 1+Math.random()*2
  var x = 50 - 100*Math.random()
  var y =  8 +   8*Math.random()
  var z = 50 - 100*Math.random()
  createMob( game, size, size, x, y, z )
}

/*
 *      define block types and register materials
 *      TODO: fit these into the options object?
*/

// materials
var reg = game.registry
reg.registerMaterial( 'dirt',       null, 'dirt.png' )
reg.registerMaterial( 'grass',      null, 'grass.png' )
reg.registerMaterial( 'grass_side', null, 'grass_dirt.png' )
reg.registerMaterial( 'stone',      null, 'cobblestone.png' )
for (i=1; i<30; i++) {
  var color = [ Math.random(), Math.random(), Math.random() ]
  reg.registerMaterial( 'color'+i, color, null)
}

// block types
reg.registerBlock( 'dirt', 'dirt' )
reg.registerBlock( 'grass', ['grass', 'dirt', 'grass_side'] )
reg.registerBlock( 'stone', 'stone' )
for (i=1; i<30; i++) {
  reg.registerBlock( 'block'+i, 'color'+i )
}



/*
 *      Set inputs to get/set blocks on L/M/R mouse click
*/

// on left mouse, set targeted block to be air
game.inputs.down.on('fire', function() {
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

// register "i" key to invert mouse
game.inputs.bind('invertY', 'I')
game.inputs.down.on('invertY', function() {
  game.controls.inverseY = !game.controls.inverseY
})


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







