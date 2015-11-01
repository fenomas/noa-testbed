'use strict';

/*
 * 
 *	Simple driver for mob movement
 * 
*/

module.exports = function (noa) {
	return {
		
		name: 'mob-ai',

		state: {
			lastJump: 0.1,
			stand_frame: '',
			jump_frame: '',
		},

		onAdd: function(eid, state) {
			// turn on mesh's billboard.Y
			var meshData = noa.entities.getData(eid, noa.entities.components.mesh)
			meshData.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y
		},

		onRemove: null,

		processor: function (dt, states) {
			var t = performance.now()
			for (var i = 0; i < states.length; i++) {
				var state = states[i]
				var id = state.__id
				
				var body = noa.ents.getPhysicsBody(id)
				var onground = body.resting[1] < 0
				var fr = (onground) ? state.stand_frame : state.jump_frame
				var mesh = noa.entities.getMeshData(id).mesh
				var atlas = noa.ents.getData(id, noa.ents.comps.sprite).atlas
				atlas.setMeshFrame(mesh, fr)
				
				// set 
				if (t > state.lastJump + 500) {
					if (onground && Math.random() < .01) {   // jump!
						var x = 4-8*Math.random()
						var z = 4-8*Math.random()
						var y = 7+5*Math.random()
						body.applyImpulse([x,y,z])
						state.lastJump = t
					}
				}

			}
		}


	}
}

