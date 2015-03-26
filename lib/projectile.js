'use strict';
/* globals BABYLON */

var vec3 = require('gl-vec3')

module.exports = function(game, partAdder) {
  return makeProjectileLauncher(game, partAdder)
}


/*
 *    example "spells" that create entities on keypress
*/


function makeProjectileLauncher(game, particleAdder) {
  var scene = game.rendering.getScene()
  var mesh = BABYLON.Mesh.CreateSphere('p1', 3, 1, scene)
  mesh.material = makeColorMat(scene, .1, .1, .1)
  game.registry.registerMesh('projectile', mesh)


  return function(spelltype, size, gravMult, friction, restitution, option) {
    var s = size || 1    
    var mesh = game.rendering.makeMeshInstance('projectile')
    mesh.scaling.x = mesh.scaling.y = mesh.scaling.z = s
    var scene = game.rendering.getScene()
    var pos = game.getPlayerEyePosition()
    var dat = { counter:0 }
    // usage: entities.add( pos, w, h, mesh, meshOffset, data, doPhysics,
    //                      collideTerrain, collideEntities )
    var e = game.entities.add( pos, s, s, mesh, [s/2,s/2,s/2], 
                              dat, true, true, false )
    // adjust physics properties thusly
    e.body.gravityMultiplier = gravMult
    e.body.friction = friction
    e.body.restitution = restitution

    e.on('collideTerrain', function(impulse) {
      onCollide(game, e, spelltype, option)
    })
    e.on('tick', function(dt) {
      onTick(game, e, spelltype, dt)
    })

    // flashy particle trail dependent on type
    var off = (spelltype===1) ? [0,0,0] : [0,s/2,0]
    var vol = (spelltype===1) ? s/2 : 0
    e.data.particles = particleAdder( spelltype, mesh, off, vol,
                                     400, .2, .3, false)
    e.data.particleAdder = particleAdder


    launchAlongCameraVector(game, e, 10)
  }


}

/*
 *    Projectile tick/collide fcns
*/ 

function onCollide(game, entity, spelltype, option) {
  if (spelltype==2) return
  addBlocksInSphere(game, option, entity.getPosition(), 2.3, 
                    entity.data.particleAdder)
  entity.data.particles.stop()
  game.entities.remove(entity)
}

function onTick(game, entity, spelltype, dt) {
  if (spelltype==1) return
  entity.data.counter += dt
  var ct = entity.data.counter
  //  var blinker = (ct/250>>0) % 2
  //  entity.mesh.material.diffuseColor.r = (blinker) ? 1 : 0.1
  if (ct > 2500) { // blow up
    addBlocksInSphere(game, 0, entity.getPosition(), 2.75, 
                      entity.data.particleAdder)
    entity.data.particles.stop()
    game.entities.remove(entity)
  }
}




/*
 *    Helper functions
*/ 

function makeColorMat(scene, r, g, b) {
  var m = new BABYLON.StandardMaterial('m',scene)
  m.diffuseColor = new BABYLON.Color3(r,g,b)
  return m
}

function launchAlongCameraVector(game, entity, impulse) {
  var vec = game.getCameraVector()
  vec3.normalize(vec, vec)
  vec3.scale(vec, vec, impulse)
  entity.body.applyImpulse(vec)
}

function addBlocksInSphere(game, id, pos, radius, particleAdder) {
  var scene = game.rendering.getScene()
  var loc = pos.map(Math.floor)
  var rad = Math.ceil(radius)
  for (var i=-rad; i<=rad; ++i) {
    for (var j=-rad; j<=rad; ++j) {
      for (var k=-rad; k<=rad; ++k) {
        if (i*i + j*j + k*k <= radius*radius) {
          game.addBlock( id, i+loc[0], j+loc[1], k+loc[2] )
          if (id===0 && particleAdder) {
            var pos = [i+loc[0], j+loc[1], k+loc[2]]
            particleAdder(1, pos, [0.5, 0.5, 0.5], 1, 5, .8, .2, true)
          }
        }
      }
    }
  }
}
