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
 *      Example actions to get/set blocks on L/M/R mouse click
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
 *    example "spells" that create entities on keypress
*/


game.inputs.bind('earthbomb', '1')
var spell1mat
game.inputs.down.on('earthbomb', function() {
  var s = .5 //size
  var scene = game.rendering.getScene()
  var mesh = BABYLON.Mesh.CreateSphere('s1', 2, s, scene)
  if (!spell1mat) {
    spell1mat = new BABYLON.StandardMaterial('mat',scene)
    spell1mat.diffuseColor = new BABYLON.Color3( 1, .5, 0 )
  }
  mesh.material = spell1mat
  var pos = game.getCameraPosition()
  // usage: entities.add( pos, w, h, mesh, meshOffset, data, tick, blockTerrain, doPhysics )
  var e = game.entities.add( pos, s, s, mesh, [s/2,s/2,s/2], null, null, false, true )
  // modify physics body of entity thus
  e.body.onCollide = onSpellCollide.bind(e)
  // give it thwack
  var vec = game.getCameraVector()
  vec3.normalize(vec, vec)
  vec3.scale(vec, vec, 15)
  e.body.applyImpulse(vec)
})

// onCollide function for spell entity's physics body
function onSpellCollide(impulse) {
  // blow up!
  addBlocksInSphere(placeBlockID, this.getPosition(), 2.25)
  game.entities.remove(this)
}


function addBlocksInSphere(id, pos, radius) {
  var loc = pos.map(Math.floor)
  var rad = Math.ceil(radius)
  for (var i=-rad; i<=rad; ++i) {
    for (var j=-rad; j<=rad; ++j) {
      for (var k=-rad; k<=rad; ++k) {
        if (i*i + j*j + k*k <= radius*radius) {
          game.addBlock( id, i+loc[0], j+loc[1], k+loc[2] )
        }
      }
    }
  }
}

game.inputs.bind('timebomb', '2')
var spell2mata, spell2matb
game.inputs.down.on('timebomb', function() {
  var s = .5 //size
  var scene = game.rendering.getScene()
  var mesh = BABYLON.Mesh.CreateSphere('s2', 2, s, scene)
  if (!spell2mata) {
    spell2mata = new BABYLON.StandardMaterial('mat',scene)
    spell2mata.diffuseColor = new BABYLON.Color3( .1, .1, .1 )
    spell2matb = spell2mata.clone()
    spell2matb.diffuseColor = new BABYLON.Color3( .9, .1, .1 )
  }
  mesh.material = spell2mata
  var pos = game.getCameraPosition()
  var dat = { counter: 3000 } // ms
  var e = game.entities.add( pos, s, s, mesh, [s/2,s/2,s/2], dat, spell2Tick, false, true )
  // give it some bounce and friction
  e.body.friction = 8
  e.body.restitution = .3
  e.body.gravityMultiplier = 1.5
  // give it thwack
  var vec = game.getCameraVector()
  vec3.normalize(vec, vec)
  vec3.scale(vec, vec, 10)
  e.body.applyImpulse(vec)
})
// "tick" function - literally, har har!
function spell2Tick(dt) {
  this.data.counter -= dt
  var ct = this.data.counter
  var blinker = (ct/250>>0) % 2
  this.mesh.material = [spell2mata,spell2matb][blinker]
  if (ct < 0) {
    addBlocksInSphere( 0, this.getPosition(), 3.5)
    game.entities.remove(this)
  }
}
