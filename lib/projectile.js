'use strict';

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
    var pos = game.getPlayerEyePosition()
    
    // usage: entities.add( pos, w, h, mesh, meshOffset, doPhysics, shadow
    var eid = game.entities.add( pos, s, s, mesh, [s/2,s/2,s/2], true, true )
    // adjust physics properties thusly
    var body = game.entities.getPhysicsBody(eid)
    body.gravityMultiplier = gravMult
    body.friction = friction
    body.restitution = restitution
    
    // make it collide with terrain
    game.entities.addComponent(eid, game.entities.components.collideTerrain)

    // timer for bomb
    if (spelltype===2) {
      game.entities.addComponent(eid, game.entities.components.every, {
        every: 3000,
        callback: function() {
          var pos = game.entities.getPositionData(eid).position
          addBlocksInSphere(game, 0, pos, 2.75)
          game.entities.getData(eid, game.entities.components.particles).parts.rate = 0
          // add smoke
          var parts = particleAdder('bombsmoke')
          parts.mesh.position.copyFromFloats( pos[0], pos[1]+0.5, pos[2] )
          
          game.entities.remove(eid)
        }
      })
    }
    
    // terrain collider for missile
    if (spelltype===1) {
      var dat = game.entities.getData(eid, game.entities.components.collideTerrain)
      dat.callback = function(impulse) {
        onCollideTerrain(game, eid, option)
      }
    }

    
    // flashy particle trail dependent on type
    var partType = (spelltype===1) ? 'smoketrail' : 'sparks'
    var parts = particleAdder(partType)
    parts.disposeOnEmpty = true
    parts.parent = mesh
    parts.start()
    
    game.entities.addComponent(eid, game.entities.components.particles, { parts: parts })

    launchAlongCameraVector(game, eid, 10)
  }


}

/*
 *    Projectile tick/collide fcns
*/ 

function onCollideTerrain(game, eid, option) {
  // turn off collide terrain so as not to inhibit blocks being made
  game.entities.removeComponent(eid, game.entities.components.collideTerrain)
  addBlocksInSphere(game, option, game.entities.getPositionData(eid).position, 2.3)
  game.entities.getData(eid, game.entities.components.particles).parts.rate = 0
  game.entities.remove(eid)
}




/*
 *    Helper functions
*/ 

function makeColorMat(scene, r, g, b) {
  var m = new BABYLON.StandardMaterial('m',scene)
  m.diffuseColor = new BABYLON.Color3(r,g,b)
  return m
}

function launchAlongCameraVector(game, entID, impulse) {
  var vec = game.getCameraVector()
  vec3.normalize(vec, vec)
  vec3.scale(vec, vec, impulse)
  var body = game.entities.getPhysicsBody(entID)
  body.applyImpulse(vec)
}

function addBlocksInSphere(game, id, pos, radius) {
  var rad = Math.ceil(radius)
  for (var i=-rad; i<=rad; ++i) {
    for (var j=-rad; j<=rad; ++j) {
      for (var k=-rad; k<=rad; ++k) {
        if (i*i + j*j + k*k <= radius*radius) {
          game.addBlock( id, 
            i + Math.floor(pos[0]), 
            j + Math.floor(pos[1]), 
            k + Math.floor(pos[2])
          )
        }
      }
    }
  }
}
