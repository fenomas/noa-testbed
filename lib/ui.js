'use strict';


module.exports = function(game) {
  return new UI(game)
}



/*
 *    minimal UI management (help menu)
*/


function UI(game) {
  var toggled = false
  var showing = true
  
  game.inputs.bind('help', 'H')
  game.inputs.down.on('help', function() {
    toggled = true
    showing = !showing
    setVis(showing)
  })
  
  game.container.on('gainedPointerLock', function() {
    if (toggled) return
    showing = false
    setVis(showing)
  })
  game.container.on('lostPointerLock', function() {
    if (toggled) return
    showing = true
    setVis(showing)
  })
}


function setVis(show) {
  var el = document.getElementById('help')
  el.hidden = !show
}


