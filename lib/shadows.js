'use strict';
/* globals BABYLON */


module.exports = Shadows

var shadow
var shadows = []
var shadowDist = 10

function Shadows( game ) {
  var scene = game.rendering.getScene()
  
  // build a mesh to instance into shadows
  shadow = new BABYLON.Mesh.CreatePlane('shadow',1,scene)
  var shmat = new BABYLON.StandardMaterial('shmat',scene)
  var tex = new BABYLON.Texture( game.registry._texturePath+'shadow.png', 
                                scene, true, false, BABYLON.Texture.NEAREST_SAMPLINGMODE)
  shmat.diffuseTexture = tex
  shmat.diffuseTexture.hasAlpha = true
  shadow.material = shmat
  shadow.rotation.x = Math.PI/2
  shadow.setEnabled(false)
  
  // handle all entity shadows in future on #tick
  game.on('tick', tickShadows.bind(null, game) )
}


function tickShadows(game) {
  var ents = game.entities.entities
  
  // grow/shrink pool of shadow instances
  while(shadows.length<ents.length) shadows.push(shadow.createInstance(''))
  while(shadows.length>ents.length) shadows.pop().dispose()
  
  // iterate and set properties
  for (var i=0; i<ents.length; ++i) {
    var sh = shadows[i]
    var loc = ents[i].getPosition()
    var pick = game.pick(loc, [0,-1,0], shadowDist)
    if (pick) {
      sh.setEnabled(true)
      sh.position.x = loc[0]
      sh.position.z = loc[2]
      sh.position.y = pick.position[1] + .005
      var dist = loc[1] - pick.position[1]
      var size = ents[i].bb.vec
      var scale = (size[0]+size[2])/2 * (1 - dist/shadowDist)
      sh.scaling.x = sh.scaling.y = scale
    } else {
      sh.setEnabled(false)
    }
  }
  
}

