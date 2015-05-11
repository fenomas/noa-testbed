'use strict';


module.exports = function(game, particleAdder) {
  return new Hover(game, particleAdder)
}



/*
 *    Keybind and implementation for hover-pack thingy to get around better
*/


function Hover(game, particleAdder) {
  var hovering = false
  var parts = null

  game.inputs.bind('hover', 'R')
  game.inputs.down.on('hover', function() {
    hovering = true;
    parts = startParticles(particleAdder, game)
  })
  game.inputs.up.on('hover', function() {
    hovering = false;
    parts.stop()
  })

  game.on('tick', function(dt) {
    if (hovering) hover(game);
  })
}


function startParticles(adder, game) {
  var type = 3
  var loc = game.playerEntity.mesh
  var off = [0, -.8, 0]
  var volume = 0.5
  var num = 200
  var size = 1
  var duration = 0.6
  var oneoff = false
  return adder(type, loc, off, volume, num, size, duration, oneoff)
}

function stopParticles(parts) {
  window.parts = parts
}



function hover(game) {
  var b = game.playerEntity.body
  var f = (b.velocity[1] < 0) ? 40 : 24
  b.applyForce([0, f, 0])
}




