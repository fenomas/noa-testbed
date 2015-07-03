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
  parts.parent = game.playerEntity.mesh

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

  game.on('tick', function(dt) {
    if (hovering) hover(game);
  })
}




function hover(game) {
  var b = game.playerEntity.body
  var f = (b.velocity[1] < 0) ? 40 : 24
  b.applyForce([0, f, 0])
}




