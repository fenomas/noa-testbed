'use strict';
/* globals BABYLON */

var vec3 = require('gl-vec3')

module.exports = createMob


function createMob( game, w, h, x, y, z ) {
  var scene = game.rendering.getScene()
  var mesh = new BABYLON.Mesh.CreateBox('m', 1, scene)
  mesh.material = getMobMat(scene)
  mesh.scaling = new BABYLON.Vector3( w, h, w )
  var offset = [w/2, h/2, w/2]
  var dat = { lastHit:0 }
  
  // add an entity for the "mob"
  var ent = game.entities.add(
    [x,y,z],              // starting loc
    w, h, mesh, offset,   // size, mesh, mesh offset
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
    if (d-this.data.lastHit < 200) return
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
  if (this.body.resting[1] >= 0) return // don't jump unless on ground
  if (Math.random() < .01) {
    // jump
    var x = 4-8*Math.random()
    var z = 4-8*Math.random()
    this.body.applyForce([x,7,z])
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


