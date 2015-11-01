'use strict';

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
  
  var offset = [0, h/2, 0]
  
  
  // add an entity for the "mob"
  var id = game.entities.add(
    [x,y,z],              // starting loc
    w, h, mesh, offset,   // size, mesh, mesh offset
    true, true            // do physics, draw shadow
  )
  
  // make entity collide with world/other entities
  game.entities.addComponent(id, game.entities.components.collideTerrain)
  game.entities.addComponent(id, game.entities.components.collideEntities, {
    callback: function(other) { collideEntity(game, id, other) }
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
    var v = game.entities.getPositionData(ownID).position
    vec3.subtract(v, game.entities.getPositionData(otherID).position, v )
    vec3.normalize(v, v)
    v[1] = 1
    vec3.scale(v, v, 15)
    var body = game.entities.getPhysicsBody(otherID)
    body.applyImpulse(v)
  }
}


