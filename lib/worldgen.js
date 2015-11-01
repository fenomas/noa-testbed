'use strict';


var SimplexNoise = require('simplex-noise')
var simplex = new SimplexNoise()
var hash = require('ndhash')
var ndarray = require('ndarray')
var worldgenWorker = require('worker!./worldgen_worker')



module.exports = setupFunction


function setupFunction(game) {
  registerBlocks(game)
  initWorldGen(game)
}




/*
 *   Block registration - register blocktypes used in world
*/



var dirtID, grassID, stoneID, block1ID, cloudID, leafID, flowerID, woodID, waterID

function registerBlocks(game) {
  var reg = game.registry

  // materials used by block faces
  reg.registerMaterial( 'dirt',       [0.45, 0.36, 0.22],  'dirt.png' )
  reg.registerMaterial( 'grass',      [0.22, 0.38, 0.01],  'grass.png' )
  reg.registerMaterial( 'grass_side', [0.30, 0.34, 0.09],  'grass_dirt.png' )
  reg.registerMaterial( 'stone',      [0.50, 0.50, 0.50],  'cobblestone.png' )
  reg.registerMaterial( 'leaf',       [0.31, 0.45, 0.03],  'leaf.png', true )
  reg.registerMaterial( 'wood_face',  [0.60, 0.50, 0.10],  'wood_face.png' )
  reg.registerMaterial( 'wood_side',  [0.55, 0.45, 0.05],  'wood_side.png' )
  reg.registerMaterial( 'water',      [0.20, 0.85, 0.95, 0.5], null )
  for (var i=1; i<30; i++) {
    var color = [ Math.random(), Math.random(), Math.random() ]
    reg.registerMaterial( 'color'+i, color, null)
  }
  reg.registerMaterial( 'white', [1,1,1], null )


  // block types and the faces they use
  dirtID =  reg.registerBlock( 'dirt', 'dirt' )
  grassID = reg.registerBlock( 'grass', ['grass', 'dirt', 'grass_side'] )
  stoneID = reg.registerBlock( 'stone', 'stone' )
  leafID =  reg.registerBlock( 'leaf',  'leaf', null, true, false )
  cloudID = reg.registerBlock( 'cloud', 'white' )
  woodID  = reg.registerBlock( 'wood',  ['wood_face', 'wood_face', 'wood_side'] )
  var waterprop = { fluidDensity: 1.0, viscosity: 0.5 }
  waterID = reg.registerBlock( 'water', 'water', waterprop, false, false, true )
  for (i=1; i<30; i++) {
    reg.registerBlock( 'block'+i, 'color'+i )
  }
  block1ID = reg.getBlockID('block1')


  // object blocks - i.e. non-terrain
  flowerID = reg.registerObjectBlock( 'flower', 'flowerMesh', null, false, false )

  // register a custom mesh to be used for occurrences of the block
  game.registry.registerMaterial('flowersprite', null, 'flower.png')
  var mesh = makeSpriteMesh(game, 'flowersprite')
  var offset = BABYLON.Matrix.Translation(0, 0.5, 0)
  mesh.bakeTransformIntoVertices(offset)
  reg.registerMesh('flowerMesh', mesh, null)
}


// helper function to make a billboard plane mesh showing a given sprite texture
function makeSpriteMesh (game, matname) {
  var id = game.registry.getMaterialId(matname)
  var url = game.registry.getMaterialTexture(id)
  var scene = game.rendering.getScene()
  var tex = new BABYLON.Texture(url, scene, true, true,
                                BABYLON.Texture.NEAREST_SAMPLINGMODE)
  tex.hasAlpha = true
  var mesh = BABYLON.Mesh.CreatePlane('sprite-'+matname, 1, scene)
  var mat = new BABYLON.StandardMaterial('sprite-mat-'+matname, scene)
  mat.specularColor = new BABYLON.Color3(0,0,0)
  mat.emissiveColor = new BABYLON.Color3(1,1,1)
  mat.backFaceCulling = false
  mat.diffuseTexture = tex
  mesh.material = mat
  mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y

  return mesh
}






/*
 *   Worldgen - simple terrain/cloud generator
*/


function initWorldGen(game) {
  // set up worldgen web worker
  var worker = new worldgenWorker()

  // send block id values to worker
  worker.postMessage({
    msg: 'init', 
    ids: getBlockIDObject()
  })

  // game listener for when worldgen is requested (array is an ndarray)
  game.world.on('worldDataNeeded', function(id, array, x, y, z) {
    worker.postMessage({
      msg: 'generate', 
      data: array.data,
      shape: array.shape,
      id: id, 
      x:x, y:y, z:z,
    })
  })

  // worker listener for when chunk generation is finished
  worker.addEventListener('message', function (ev) {
    if (ev.data.msg == 'generated') {
      // wrap result (copied from worker) in a new ndarray before returning
      var id = ev.data.id
      var array = new ndarray( ev.data.data, ev.data.shape )
      // send result to game for processing
      game.world.setChunkData( id, array )
    }
  })

}


function getBlockIDObject() {
  return {
    dirtID:   dirtID,
    grassID:  grassID,
    stoneID:  stoneID,
    block1ID: block1ID,
    cloudID:  cloudID,
    leafID:   leafID,
    flowerID: flowerID,
    woodID:   woodID,
    waterID:  waterID
  }
}



