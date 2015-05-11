'use strict';
/* globals BABYLON */

module.exports = function(game) {
  return makeParticleGenerator(game)
}

// remember that Babylon uses a Vector3 class that's unlike gl-vec3
var babvec3 = BABYLON.Vector3
var babcol4 = BABYLON.Color4


/*
 *    Generate a function to manage some Babylon.js particles
*/


function makeParticleGenerator(game) {
  var scene = game.rendering.getScene()


  return function(type, loc, off, volume,
                   num, size, duration, oneoff) {

    // oneoff means emit num particles and stop, otherwise num is emitRate
    var pool = oneoff ? num : num*duration*1.5
    var particles = new BABYLON.ParticleSystem('p', pool, scene)

    if (loc.length) { // array, treat it as a static location
      particles.emitter = new babvec3(loc[0], loc[1], loc[2])
    } else { // otherwise assume it's a mesh to attach to
      particles.emitter = loc
    }

    var s = volume/2   // half-width of volume to fill
    particles.minEmitBox = new babvec3( off[0]-s, off[1]-s, off[2]-s )
    particles.maxEmitBox = new babvec3( off[0]+s, off[1]+s, off[2]+s )
    particles.minSize = size
    particles.maxSize = size*1.5

    // type-specific settings: type is 1 for smoke, 2 for fire, 3 for jetpack
    var url
    if (type==1) {

      // smoke
      url = 'textures/particle_standard.png'
      particles.particleTexture = getTexture(game.rendering.getScene(), url)
      particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD

      particles.color1 =    new babcol4( .3, .3, .3,  1 )
      particles.color2 =    new babcol4( .5, .5, .5, .1 )
      particles.colorDead = new babcol4( .6, .6, .6,  0 )

      particles.direction1 = new babvec3( -s, s,-s )
      particles.direction2 = new babvec3(  s, s, s )
      particles.minEmitPower = 2
      particles.maxEmitPower = 4
      particles.gravity = new babvec3(0, 10, 0)

    } else if (type==2) {

      // fire
      url = 'textures/particle_oneone.png'
      particles.particleTexture = getTexture(game.rendering.getScene(), url)
      particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE

      particles.color1 =    new babcol4( .8, .5,  0, 1 )
      particles.color2 =    new babcol4( .5, .2,  0, 1 )
      particles.colorDead = new babcol4( .1, .1, .1, 0 )

      particles.direction1 = new babvec3( -1,   1, -1 )
      particles.direction2 = new babvec3(  1, 1.5,  1 )
      particles.minEmitPower = 4
      particles.maxEmitPower = 5
      particles.gravity = new babvec3(0, -20, 0)

    } else if (type==3) {

      // jetpack fire/smoke
      url = 'textures/particle_standard.png'
      particles.particleTexture = getTexture(game.rendering.getScene(), url)
      particles.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD

      particles.color1 =    new babcol4( .8, .8, .8, .8 )
      particles.color2 =    new babcol4( .6, .6, .6, .5 )
      particles.colorDead = new babcol4( .1, .1, .1,  0 )

      particles.direction1 = new babvec3( -1, -5, -1 )
      particles.direction2 = new babvec3(  1, -5,  1 )
      particles.minEmitPower = 0.5
      particles.maxEmitPower = 1
      particles.gravity = new babvec3(0, 10, 0)

    }

    particles.minLifeTime = duration/2
    particles.maxLifeTime = duration
    particles.updateSpeed = 0.005


    if (oneoff) {
      particles.manualEmitCount = 10*num/particles.updateSpeed
      particles.targetStopDuration = duration*3
    } else {
      particles.emitRate = num
    }
    particles.disposeOnStop = true
    particles.start()
    return particles    

  }
}

/*
 *    particle-related helpers
*/ 

// temporary ad-hoc material storage
var mats = {}
function getTexture(scene, url) {
  if (!mats[url]) {
    mats[url] = new BABYLON.Texture(url, scene)
  }
  return mats[url].clone()
}

