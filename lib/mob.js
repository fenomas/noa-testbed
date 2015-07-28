'use strict';
/* globals BABYLON */

var vec3 = require('gl-vec3')

module.exports = createMob


var atlas = null
var mobAIComponent = 'mob-AI'
var initted = false
var stand_frame = 'mob_stand.png'
var jump_frame = 'mob_jump.png'


function init(game, _atlas) {
  atlas = _atlas
  game.entities.createComponent(mobAIComponent, {lastJump: 0.1})
  game.on('tick', function(dt) { mobAI(game, dt)})
  initted = true
}


function createMob( game, atlas, w, h, x, y, z ) {
  if (!initted) {
    init(game, atlas)
  }

  var mesh = atlas.makeSpriteMesh( stand_frame )
  mesh.scaling = new BABYLON.Vector3(w, h, 1)
  
  var offset = [w/2, h/2, w/2]
  // var dat = { lastHit:0 }
  
  var onCollideEnt = function(ownID, otherID) {
    collideEntity(game, ownID, otherID)
  }
  
  // add an entity for the "mob"
  var id = game.entities.add(
    [x,y,z],              // starting loc
    w, h, mesh, offset,   // size, mesh, mesh offset
    true,                 // do physics
    true, null,           // collide terrain, onCollide handler
    true, onCollideEnt,   // collide entities, onCollide handler
    true, true            // shadow, isSprite
  )
  
  var body = game.entities.getPhysicsBody(id)
  body.friction = 5
  body.gravityMultiplier = 1.5
  
  game.entities.addComponent(id, mobAIComponent)
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



// temp stand-in for AI
function mobAI(game, dt) {
  var t = performance.now()
	game.entities.loopOverComponent(mobAIComponent,function(data, id) {
    // set display frame
    var body = game.entities.getPhysicsBody(id)
    var onground = body.resting[1] < 0
    var fr = (onground) ? stand_frame : jump_frame
    var mesh = game.entities.getMeshData(id).mesh
    atlas.setMeshFrame(mesh, fr)
    // set 
    if (t > data.lastJump + 500) {
      if (onground && Math.random() < .01) {   // jump!
        var x = 4-8*Math.random()
        var z = 4-8*Math.random()
        var y = 7+5*Math.random()
        body.applyImpulse([x,y,z])
      }
    }
  })
}



