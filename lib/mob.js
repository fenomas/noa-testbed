'use strict';
/* globals BABYLON */

var vec3 = require('gl-vec3')

module.exports = createMob


function createMob( game, w, h, x, y, z ) {
  var scene = game.rendering.getScene()
  var sprite = game.rendering.makeEntitySprite('playermob',2)
  sprite.size = w
  var offset = [w/2, h/2, w/2]
  var dat = { lastHit:0 }
  
  // add an entity for the "mob"
  var ent = game.entities.add(
    [x,y,z],              // starting loc
    w, h, sprite, offset, // size, mesh, mesh offset
    dat, true,            // data object, do physics
    true, true            // collide terrain, collide entities
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
  this.mesh.cellIndex = (onground) ? 2 : 3
  if (onground && Math.random() < .01) {   // jump!
    var x = 4-8*Math.random()
    var z = 4-8*Math.random()
    var y = 7+5*Math.random()
    this.body.applyImpulse([x,y,z])
  }
}

var mobmat
function getMobMat(scene) {
  if (!mobmat) {
    mobmat = new BABYLON.StandardMaterial('m', scene)
    mobmat.diffuseColor = new BABYLON.Color3( .7, .4, .4 )
  }
  return mobmat
}


