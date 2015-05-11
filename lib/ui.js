'use strict';


module.exports = function(game) {
  return new UI(game)
}



/*
 *    minimal UI management (help menu)
*/


function UI(game) {
  var toggled = false
  var showHelp = true
  
  game.inputs.bind('help', 'H')
  game.inputs.down.on('help', function() {
    toggled = true
    showHelp = !showHelp
    setVis(showHelp)
  })
  
  game.container.on('gainedPointerLock', function() {
    setVis( toggled ? showHelp : false )
  })
  game.container.on('lostPointerLock', function() {
    setVis( toggled ? showHelp : true )    
  })
}


function setVis(show) {
  var el = document.getElementById('help')
  el.hidden = !show
}


