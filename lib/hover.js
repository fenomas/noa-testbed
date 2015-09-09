'use strict';


module.exports = function(game, particleAdder) {
  return new Hover(game, particleAdder)
}



/*
 *    Keybind and implementation for hover-pack thingy to get around better
*/


function Hover(game, particleAdder) {
  var hovering = false
  var parts = particleAdder('jetpack')
  parts.parent = game.getPlayerMesh()

  game.inputs.bind('hover', 'R')
  game.inputs.down.on('hover', function() {
    hovering = true;
    parts.rate = 100;
    parts.start();
  })
  game.inputs.up.on('hover', function() {
    hovering = false;
    parts.rate = 0;
  })

  var body = game.entities.getPhysicsBody(game.playerEntity)
  game.on('tick', function(dt) {
    if (hovering) hover(game, body);
  })
}




function hover(game, body) {
  var f = (body.velocity[1] < 0) ? 40 : 24
  body.applyForce([0, f, 0])
}




