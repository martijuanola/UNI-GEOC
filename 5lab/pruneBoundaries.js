"use strict";

/*
 * Basic structures:
 * 
 * POITNS 	p = {"x": int, "y": int}
 * 
 * SEGMENTS s = {"from": point, "to": point}
 * 
 * TRIANGLE t = POINTS[3]
 * 
 * DCEL = {"vertexs": VERTEXS[], "faces": FACES[], "edges": EDGES[]}
 *		VERTEXS v = {"x": int, "y": int, "edgeID": int, "pointsIndex"; int}
 *		FACES 	f = {"edgeID": int}
 *		EDGES 	e = {"vBID": int, "fRID": int, "eNID": int, "eTID": int}
 *	---	ID's son posicions de l'array(comencen per 0)
 * 	--- Faces' edges have the face as the fR attribute (clockwise rotation)
 * 	--- Vertexs' edges are outgoing edges
 */

// REMEMBER! --> Counter Clockwise order of the points in a boundary

function pruneBoundaries(points, boundaries, DCEL) {

	let deletedFacesIDs = new Array(DCEL.faces.length).fill(true);

	for (let r = 0; r < boundaries.length; r++) {
		pruneRegion(points, boundaries[r], deletedFacesIDs, DCEL);
	}

	// //Remove added 3 points. If dones only one prune can be performed...
	// points.pop();
	// points.pop();
	// points.pop();

	return getNotDeletedTriangles(deletedFacesIDs, DCEL);
}


function pruneRegion(points, region, deletedFacesIDs, DCEL) {
	if (region.length < 3) {
		if (region.length == 2) throw "Cases with region of two boundary points not considered!!";
		else if (region.length == 1) {
			const outgoingEdgesIDs = getOutgoingEdgesIDs(DCEL.pointToVertexID[region[0]], DCEL);
			for (let e = 0; e < outgoingEdgesIDs.length; e++) {
				removeFaceFromEdge(outgoingEdgesIDs[e], deletedFacesIDs, DCEL);
			}
		}
		else throw "Bad defined region found with no points in the boundary!!";
	}

	for (let pb = 0; pb < region.length; pb++) {
		const pVID = DCEL.pointToVertexID[region[(pb-1+region.length)%region.length]];
		const cVID = DCEL.pointToVertexID[region[pb]];
		const nVID = DCEL.pointToVertexID[region[(pb+1)%region.length]];

		const outgoingEdgesIDs = getOutgoingEdgesIDs(cVID, DCEL);
		const outEdges = outgoingEdgesIDs.length;

		let nextEdgeID = null; // (c --> n)
		let prevEdgeTID = null; // it is the t edge because it's outgoing (c --> p)

		let nextEdgeIndex = -1;
		let prevEdgeIndex = -1;

		for (let e = 0; e < outEdges; e++) {
			if (checkEndVertex(outgoingEdgesIDs[e], nVID, DCEL)) {
				if (nextEdgeID != null) throw "Repeated edges (next)";
				nextEdgeID = outgoingEdgesIDs[e];
				nextEdgeIndex = e;
			}
			else if (checkEndVertex(outgoingEdgesIDs[e], pVID, DCEL)) {
				if (prevEdgeTID != null) throw "Repeated edges (prev)";
				prevEdgeTID = outgoingEdgesIDs[e];
				prevEdgeIndex = e;
			}
		}

		if (nextEdgeID != null && prevEdgeTID != null) {
			// p(no inclos) --> n(inclos)
			for (let e = (prevEdgeIndex+1)%outEdges; e != (nextEdgeIndex+1)%outEdges; e = (e+1)%outEdges) {
				removeFaceFromEdge(outgoingEdgesIDs[e], deletedFacesIDs, DCEL);
			}
		}
		//else throw "Dificult Cases!"
	}
}

function checkEndVertex(eID, vBID, DCEL) {
	const eTID = DCEL.edges[eID].eTID;
	if (eTID == -1) return false;
	return DCEL.edges[eTID].vBID == vBID;
}

/**
 * Returns outgoing edges in counterclockwise order starting from the vertex edge
 */
function getOutgoingEdgesIDs(vID, DCEL) {
	let edgesIDs = []
	const e0ID = DCEL.vertexs[vID].edgeID;
	edgesIDs.push(e0ID);

	let eTID = DCEL.edges[e0ID].eTID;
	let nextEdgeID = DCEL.edges[eTID].eNID;
	while (nextEdgeID != e0ID) {
		edgesIDs.push(nextEdgeID);

		eTID = DCEL.edges[nextEdgeID].eTID;
		nextEdgeID = DCEL.edges[eTID].eNID;
	}

	return edgesIDs;
}


/**
 * Marks a face to be removed
 */
function removeFaceFromEdge(eID, deletedFacesIDs, DCEL) {
	// console.log(eID + " was deleted!")
	const edge = DCEL.edges[eID];
	deletedFacesIDs[edge.fRID] = false;
}


/**
 * Generates triangles only from non deleted faces in the pruning process
 */
function getNotDeletedTriangles(deletedFacesIDs, DCEL) {
	let outputTriangles = [];
	for (let i = 0; i < DCEL.faces.length; i++) {
		if (deletedFacesIDs[i]) {
			const vs = getVertexsOfFace(DCEL.faces[i], DCEL);
			//2 before 1 because the 3d visualization(triangle need to be defined counterclockwise)
			outputTriangles.push([vs[0].pointsIndex, vs[2].pointsIndex, vs[1].pointsIndex]);
		}
	}
	return outputTriangles;
}


