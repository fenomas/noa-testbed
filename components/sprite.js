'use strict';

module.exports = function (noa) {
	return {
		
		name: 'is-sprite',

		state: {
			atlas: null
		},

		onAdd: function(eid, state) {
			// turn on mesh's billboard.Y
			var meshData = noa.entities.getData(eid, noa.entities.components.mesh)
			meshData.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y
		},

		onRemove: null,

		processor: null


	}
}

