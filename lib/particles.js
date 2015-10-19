'use strict';

var MPS = require('mesh-particle-system')


module.exports = function(game) {
  return makeParticleGenerator(game)
}

// remember that Babylon uses a Vector3 class that's unlike gl-vec3
var vec3 = BABYLON.Vector3
var col3 = BABYLON.Color3


/*
 *    Generate a function to manage mesh-particle-system library
*/


function makeParticleGenerator(game) {
  var scene = game.rendering.getScene()

  game.entities.components.particles = require('../components/particles')(game)
  game.entities.createComponent(game.entities.components.particles)
  
  var puffTex = new BABYLON.Texture('textures/puff.png', scene, true, false, 1)
  var gradTex = new BABYLON.Texture('textures/particle_standard.png', scene, true, false)

  var opts = {}

  opts.blocksmoke = {
    cap: 50
    , g: 0
    , emit: 50
    , rate: 0
    , tex: puffTex
    , alphas: [1, 0]
    , colors: [ col3.White(), col3.White() ]
    , sizes: [1, 0.5]
    , init: function(p) {
      p.position.x = Math.random() * 0.8 - 0.4
      p.position.y = Math.random() * 0.8 - 0.4
      p.position.z = Math.random() * 0.8 - 0.4
      p.velocity.x = p.position.x / 2
      p.velocity.y = p.position.y / 2
      p.velocity.z = p.position.z / 2
      p.size =       0.5
      p.age = Math.random()/2
      p.lifetime =   0.6
    }
  }


  opts.bombsmoke = {
    cap: 250
    , g: 0
    , emit: 250
    , rate: 0
    , tex: puffTex
    , alphas: [1, 0]
    , colors: [ col3.White(), col3.White() ]
    , sizes: [1, 0.5]
    , init: function(p, radius) {
      // per gl-vec3#random
      var scale = 2.5
      var r = Math.random() * 2.0 * Math.PI
      var z = (Math.random() * 2.0) - 1.0
      var zScale = Math.sqrt(1.0-z*z) * scale
      p.position.x = Math.cos(r) * zScale
      p.position.y = Math.sin(r) * zScale
      p.position.z = z * scale
      p.velocity.x = Math.random() - 0.5
      p.velocity.y = Math.random() - 0.5
      p.velocity.z = Math.random() - 0.5
      p.size =       0.5
      p.age =        Math.random() * 0.4
      p.lifetime =   0.8
    }
  }


  opts.jetpack = {
    cap: 100
    , g: -3
    , emit: 0
    , rate: 100
    , tex: gradTex
    , alphas: [0.6, 0]
    , colors: [ new col3( 1, .1, .1), new col3(.9, .9, .1) ]
    , sizes: [0.9, 1]
    , init: function(p) {
      p.position.x = 0
      p.position.y = Math.random() * -0.4 - 0.4
      p.position.z = 0
      p.velocity.x = Math.random() * 2 - 1
      p.velocity.y = Math.random() * -1 - 1
      p.velocity.z = Math.random() * 2 - 1
      p.size =       Math.random() * 0.75 + 0.5
      p.age = 0
      p.lifetime = 0.6
    }
  }

  opts.sparks = {
    cap: 200
    , g: -5
    , emit: 0
    , rate: 100
    , tex: gradTex
    , alphas: [0.6, 0]
    , colors: [ new col3( 1, .1, .1), new col3(.9, .9, .1) ]
    , sizes: [.1, .01]
    , init: function(p) {
      p.position.x = 0
      p.position.y = 0.4
      p.position.z = 0
      p.velocity.x = Math.random() * 4 - 2
      p.velocity.y = Math.random() * 4 + 1
      p.velocity.z = Math.random() * 4 - 2
      p.size =       Math.random() + 1
      p.age = 0
      p.lifetime = 1.5
    }
  }


  opts.smoketrail = {
    cap: 100
    , g: 5
    , emit: 0
    , rate: 200
    , tex: gradTex
    , alphas: [0.9, 0]
    , colors: [ col3.White(), col3.White() ]
    , sizes: [0.9, 1]
    , init: function(p) {
      //      p.velocity.x = Math.random() * 2 - 1
      //      p.velocity.y = Math.random() * 2 - 1
      //      p.velocity.z = Math.random() * 2 - 1
      p.size =       Math.random() * 0.5 + 0.1
      p.age = 0
      p.lifetime = 0.5
    }
  }




  return function (type) {

    var o = opts[type]
    if (!o) return
    var mps = new MPS(o.cap, o.rate, o.tex, scene)
    mps.gravity = o.g
    mps.setAlphaRange( o.alphas[0], o.alphas[1] )
    mps.setColorRange( o.colors[0], o.colors[1] )
    mps.setSizeRange( o.sizes[0], o.sizes[1] )
    mps.initParticle = o.init
    mps.stopOnEmpty = true

    if (o.emit) {
      mps.emit(o.emit)
      mps.disposeOnEmpty = true
    }

    game.rendering.addDynamicMesh(mps.mesh)

    return mps
  }
}


