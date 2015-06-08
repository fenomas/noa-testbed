'use strict';
/* globals BABYLON */

var vec3 = require('gl-vec3')

module.exports = createMob


var atlas = null
var stand_frame = 'mob_stand.png'
var jump_frame = 'mob_jump.png'

function createMob( game, _atlas, w, h, x, y, z ) {
  var scene = game.rendering.getScene()
  atlas = _atlas

  var mesh = atlas.makeSpriteMesh( stand_frame )
  mesh.scaling = new BABYLON.Vector3(w, h, 1)
  
  var offset = [w/2, h/2, w/2]
  var dat = { lastHit:0 }
  
  // add an entity for the "mob"
  var ent = game.entities.add(
    [x,y,z],              // starting loc
    w, h, mesh, offset,   // size, mesh, mesh offset
    dat, true,            // data object, do physics
    true, true,           // collide terrain, collide entities
    true, true            // shadow, isSprite
  )
  ent.body.friction = 5
  ent.body.gravityMultiplier = 1.5
  ent.on('tick', mobTick.bind(ent))
  ent.on('collideEntity', collideEntity.bind(ent, game))
}

function collideEntity(game, other) {
  /* jshint validthis:true */
  if (other==game.playerEntity) {
    var d = new Date()
    if (d-this.data.lastHit < 400) return
    this.data.lastHit = d
    // repulse along relative vector, angled up a bit
    var v = vec3.create()
    vec3.subtract(v, other.getPosition(), this.getPosition() )
    vec3.normalize(v, v)
    v[1] = 1
    vec3.scale(v, v, 15)
    other.body.applyImpulse(v)
  }
}

function mobTick(dt) {
  /* jshint validthis:true */
  var onground = this.body.resting[1] < 0
  var fr = (onground) ? stand_frame : jump_frame
  atlas.setMeshFrame(this.mesh, fr)
  
  if (onground && Math.random() < .01) {   // jump!
    var x = 4-8*Math.random()
    var z = 4-8*Math.random()
    var y = 7+5*Math.random()
    this.body.applyImpulse([x,y,z])
  }
}



