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
  chunkAddDistance: 3,
  chunkRemoveDistance: 4,
}


// create engine
var game = noa( opts )


/*
 *      create actions for mouse left/mid/right clicks
*/

// on left mouse, set targeted block to be air
game.inputs.down.on('fire', function() {
  var loc = game.getTargetBlock()
  if (loc) game.setBlock(0, loc);
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



/*
 *      define block types and register materials
 *      TODO: fit these into the options object?
*/

var reg = game.registry
// materials
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
 *    create entities on keypresses
*/

game.inputs.bind('fireball', '1')
game.inputs.down.on('fireball', function() {
  var mesh = BABYLON.Mesh.CreateBox("box", 1, game.rendering.getScene())
  var start = game.getCameraPosition()
  var e = game.entities.add( start, 1, 1, mesh, [.5,.5,.5], null, false, true )
  var vec = game.getCameraVector()
  vec3.normalize(vec, vec)
  vec3.scale(vec, vec, 25)
  e.body.applyImpulse(vec)
})

