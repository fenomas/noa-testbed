'use strict';

module.exports = function (noa) {
	return {
		
		name: 'is-sprite',

		state: {
			atlas: null
		},

		onAdd: function(eid, state) {
			// turn on mesh's billboard.Y
			var meshData = noa.entities.getMeshData(eid)
			meshData.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y
		},

		onRemove: null,

		system: null


	}
}

