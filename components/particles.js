'use strict';



// simple holder for reference to a particle system

module.exports = function (noa) {
	return {
		
		name: 'particles',

		state: {
			parts: null
		},

		onAdd: null,

		onRemove: null,

		processor: null


	}
}

