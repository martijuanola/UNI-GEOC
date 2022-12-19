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
 *		FACES 	f = {"edgeID": int, "leafID": int}
 *		EDGES 	e = {"vBID": int, "fRID": int, "eNID": int, "eTID": int}
 *	---	ID's son posicions de l'array(comencen per 0)
 * 	--- Faces' edges have the face as the fR attribute (clockwise rotation)
 * 	--- Vertexs' edges are outgoing edges
 * 	
 * TREE = ["fID": int, "leafID": [int]}]
 */

/**
 Triangles should be return as arrays of array of indexes
 e.g., [[1,2,3],[2,3,4]] encodes two triangles, where the indices are relative to the array points
**/
function computeTriangulation(points) {
	const n = points.length;

	let outputTriangles = [];
	let DCEL = {"vertexs": [], "faces": [], "edges": []}
	let TREE = [];

	addEncolsingTriangle(points, n, outputTriangles, DCEL, TREE);

	for (let i = 0; i < n; i++) {
		// console.log("----------------------");
		// console.log("POINT " + i);
		
		const faceID = findFaceID(points[i], TREE);
		if (pointInTriangle(points[i], getTriangleFromFace(DCEL.faces[faceID], DCEL)) == 2) {
			// console.log("DEGENERATE CASE");
			const edgeID = findTouchingEdgeID(faceID, points[i], DCEL);
			updateStructuresDegen(i, points[i], faceID, edgeID, DCEL, TREE);
		}
		else updateStructures(i, points[i], faceID, DCEL, TREE);
		
		// console.log("UPDATED DCEL", DCEL);
		// console.log("UPDATED TREE", TREE);
		// console.log("----------------------");
	}
	getTriangles(outputTriangles, DCEL);
	
	return outputTriangles;
}


/****************************************************/
/**************** ENCLOSING TRIANGLE ****************/
/****************************************************/

const noise = 1;

/**
 * Modifies main structures adding an enclosing triangle for the input points.
 *
 *    B
 *	 / \
 *	A _ C
 *	
 * @param      {Array}   points           The points
 * @param      {number}  n                Length of points
 * @param      {<type>}  outputTriangles  The output triangles
 * @param      {Array}   vertexs          The vertexs
 * @param      {Array}   faces            The faces
 * @param      {Array}   edges            The edges
 * @return     {Object}  Fixed point
 */
function addEncolsingTriangle(points, n, outputTriangles, DCEL, TREE) {
	
	const eBox = calculateEnclosingBox(points);

	const dx = eBox.maxx - eBox.minx;
	const dy = eBox.maxy - eBox.miny;
	const midx = eBox.minx + dx/2;
	const midy = eBox.miny + dy/2;
	const side = 2*(dx+dy)/Math.sqrt(3);

	points.push({"x": Math.floor(midx-side/2)-noise,"y": eBox.miny-noise}); //A
	points.push({"x": midx,"y": Math.ceil(eBox.miny +dy+ (Math.sqrt(3)*dx/2))+noise});  //B
	points.push({"x": Math.ceil(midx+side/2)+noise,"y": eBox.miny-noise});  //C

	//MODIFY INTERNAL DATA STRUCTURES
	DCEL.vertexs.push({"x": points[n].x, "y": points[n].y, "edgeID": 0, "pointsIndex": n});
	DCEL.vertexs.push({"x": points[n+1].x, "y": points[n+1].y, "edgeID": 2, "pointsIndex": n+1});
	DCEL.vertexs.push({"x": points[n+2].x, "y": points[n+2].y, "edgeID": 4, "pointsIndex": n+2});

	DCEL.faces.push({"edgeID": 0, "leafID": 0});

	DCEL.edges.push({"vBID": 0, "fRID": 0, "eNID": 2, "eTID": 1});
	DCEL.edges.push({"vBID": 1, "fRID": -1, "eNID": 5, "eTID": 0});

	DCEL.edges.push({"vBID": 1, "fRID": 0, "eNID": 4, "eTID": 3});
	DCEL.edges.push({"vBID": 2, "fRID": -1, "eNID": 3, "eTID": 2});

	DCEL.edges.push({"vBID": 2, "fRID": 0, "eNID": 0, "eTID": 5});
	DCEL.edges.push({"vBID": 0, "fRID": -1, "eNID": 1, "eTID": 4});

	TREE.push({"fID": 0, "triangle": getTriangleFromFace(DCEL.faces[0], DCEL), "leafID": []});
	return;
}

/**
 * Calculates the enclosing box.
 *
 * @param      {"x","y"}  points  Set of points
 * @return     {"minx","miny","maxx","maxy"}  Min and max components for x and y (the enclosing box).
 */
function calculateEnclosingBox(points) {
	let result = {"minx" : points[0].x, "miny" : points[0].y, "maxx" : points[0].x, "maxy" : points[0].y};
	for (let i = 1; i < points.length; i++) {
		if(points[i].x < result.minx) result.minx = points[i].x;
		else if(points[i].x > result.maxx) result.maxx = points[i].x;
		if(points[i].y < result.miny) result.miny = points[i].y;
		else if(points[i].y > result.maxy) result.maxy = points[i].y;
	}
	return result;
}

/****************************************************/
/***************** TRIANGULATION ********************/
/****************************************************/

function findFaceID(p, TREE) {
	let currentLeaf = TREE[0];
	let nSubs = currentLeaf.leafID.length;
	while (nSubs != 0) {
		let found = false;
		for (let i = 0; i < nSubs && !found; i++) {
			const nextLeaf = TREE[currentLeaf.leafID[i]];
			const containsCheck = pointInTriangle(p, nextLeaf.triangle);
			if (containsCheck > 0) {
				found = true;
				currentLeaf = nextLeaf;
				nSubs = currentLeaf.leafID.length;
			}
		}
	}
	if (currentLeaf.fID == -1) throw "Last leaf didn't have a fID";
	return currentLeaf.fID;
}

function updateStructures(pIndex, newPoint, f1ID, DCEL, TREE) {
	const numV = DCEL.vertexs.length;
	const numE = DCEL.edges.length;
	const numF = DCEL.faces.length;

	let f1 = DCEL.faces[f1ID];

	const numT = TREE.length;
	let leaf = TREE[f1.leafID];

	let e1 = DCEL.edges[f1.edgeID];
	let e2 = DCEL.edges[e1.eNID];
	let e3 = DCEL.edges[e2.eNID];
	const e1ID = f1.edgeID;
	const e2ID = e1.eNID
	const e3ID = e2.eNID

	const v1ID = e1.vBID;
	const v2ID = e2.vBID;
	const v3ID = e3.vBID;

	const v4ID = numV;
	
	const f2ID = numF;
	const f3ID = numF+1;
	
	const e4ID = numE;
	const e5ID = numE+1;
	const e6ID = numE+2;
	const e4IDT = numE+3;
	const e5IDT = numE+4;
	const e6IDT = numE+5;

	//Add vertex
	DCEL.vertexs.push({"x": newPoint.x, "y": newPoint.y, "edgeID": e4IDT, "pointsIndex": pIndex});
	
	//Add faces
	DCEL.faces.push({"edgeID": e2ID, "leafID": numT+1});
	DCEL.faces.push({"edgeID": e3ID, "leafID": numT+2});

	const f2 = DCEL.faces[f2ID];
	const f3 = DCEL.faces[f3ID];
	
	//Add edges
	DCEL.edges.push({"vBID": v1ID, "fRID": f3ID, "eNID": e6IDT, "eTID": e4IDT});
	DCEL.edges.push({"vBID": v2ID, "fRID": f1ID, "eNID": e4IDT, "eTID": e5IDT});
	DCEL.edges.push({"vBID": v3ID, "fRID": f2ID, "eNID": e5IDT, "eTID": e6IDT});
	
	DCEL.edges.push({"vBID": v4ID, "fRID": f1ID, "eNID": e1ID, "eTID": e4ID});
	DCEL.edges.push({"vBID": v4ID, "fRID": f2ID, "eNID": e2ID, "eTID": e5ID});
	DCEL.edges.push({"vBID": v4ID, "fRID": f3ID, "eNID": e3ID, "eTID": e6ID});
	
	//Modify pointers of old edges
	e2.fRID = f2ID;
	e3.fRID = f3ID;

	e1.eNID = e5ID;
	e2.eNID = e6ID;
	e3.eNID = e4ID;

	//Modify things of tree
	f1.leafID = numT;

	leaf.leafID.push(numT);
	leaf.leafID.push(numT+1);
	leaf.leafID.push(numT+2);

	leaf.fID = -1;

	TREE.push({"fID": f1ID, "triangle": getTriangleFromFace(f1, DCEL), "leafID": []});
	TREE.push({"fID": f2ID, "triangle": getTriangleFromFace(f2, DCEL), "leafID": []});
	TREE.push({"fID": f3ID, "triangle": getTriangleFromFace(f3, DCEL), "leafID": []});

	return;
}

function findTouchingEdgeID(faceID, p, DCEL) {
	const face = DCEL.faces[faceID];
	let currentEdgeID = face.edgeID;
	let currentEdge = DCEL.edges[currentEdgeID];
	
	for (let i = 0; i < 3; i++) {
		if (orientationTest(getSegmentFromEdge(currentEdge, DCEL), p) == 0) {
			return currentEdgeID;
		}
		currentEdgeID = currentEdge.eNID;
		currentEdge = DCEL.edges[currentEdgeID];
	}
	throw "Touching edge not found!"
}

function updateStructuresDegen(pIndex, newPoint, f1ID, e0ID, DCEL, TREE) {
	const numV = DCEL.vertexs.length;
	const numE = DCEL.edges.length;
	const numF = DCEL.faces.length;

	let e0 = DCEL.edges[e0ID];
	const e0IDT = e0.eTID;
	let e0T = DCEL.edges[e0IDT];

	const e1ID = e0.eNID;
	let e1 = DCEL.edges[e1ID];
	const e2ID = e1.eNID;
	let e2 = DCEL.edges[e2ID];
	const e3ID = e0T.eNID;
	let e3 = DCEL.edges[e3ID];
	const e4ID = e3.eNID;
	let e4 = DCEL.edges[e4ID];

	const e5ID = numE;
	const e6ID = numE+1;
	const e7ID = numE+2;
	const e5IDT = numE+3;
	const e6IDT = numE+4;
	const e7IDT = numE+5;

	const v1ID = e1.vBID;
	const v2ID = e2.vBID;
	const v3ID = e3.vBID;
	const v4ID = e4.vBID;
	let v1 = DCEL.vertexs[v1ID];
	const v5ID = numV;

	let f1 = DCEL.faces[f1ID];
	const f2ID = e0T.fRID;
	let f2 = DCEL.faces[f2ID];

	const numT = TREE.length;
	let leaf1 = TREE[f1.leafID];
	let leaf2 = TREE[f2.leafID];


	//VERTEXS
	DCEL.vertexs.push({"x": newPoint.x, "y": newPoint.y, "edgeID": e0IDT, "pointsIndex": pIndex});
	v1.edgeID = e1ID;

	//FACES
	//old
	f1.edgeID = e2ID;
	f1.leafID = numT;
	f2.edgeID = e3ID;
	f2.leafID = numT+2;
	//new
	DCEL.faces.push({"edgeID": e5ID, "leafID": numT+1});
	DCEL.faces.push({"edgeID": e7ID, "leafID": numT+3});
	let f3 = DCEL.faces[numF];
	let f4 = DCEL.faces[numF+1];
	const f3ID = numF;
	const f4ID = numF+1;

	//EDGES e = {"vBID": int, "fRID": int, "eNID": int, "eTID": int}

	e0.eNID = e5IDT;
	e0T.vBID = v5ID;
	e0T.eNID = e3ID;

	e1.fRID = f3ID;
	e1.eNID = e5ID;

	//E2 no cal

	e3.eNID = e6ID;

	e4.fRID = f4ID;
	e4.eNID = e7ID;

	DCEL.edges.push({"vBID": v2ID, "fRID": f3ID, "eNID": e7IDT, "eTID": e5IDT}); //e5
	DCEL.edges.push({"vBID": v4ID, "fRID": f2ID, "eNID": e0IDT, "eTID": e6IDT}); //e6
	DCEL.edges.push({"vBID": v1ID, "fRID": f4ID, "eNID": e6IDT, "eTID": e7IDT}); //e7
	
	DCEL.edges.push({"vBID": v5ID, "fRID": f1ID, "eNID": e2ID, "eTID": e5ID}); //e5T
	DCEL.edges.push({"vBID": v5ID, "fRID": f4ID, "eNID": e4ID, "eTID": e6ID}); //e6T
	DCEL.edges.push({"vBID": v5ID, "fRID": f3ID, "eNID": e1ID, "eTID": e7ID}); //e7T
	
	//modify tree
	leaf1.fID = -1;
	leaf2.fID = -1;

	leaf1.leafID.push(numT);
	leaf1.leafID.push(numT+1);
	TREE.push({"fID": f1ID, "triangle": getTriangleFromFace(f1, DCEL), "leafID": []});
	TREE.push({"fID": f3ID, "triangle": getTriangleFromFace(f3, DCEL), "leafID": []});

	leaf2.leafID.push(numT+2);
	leaf2.leafID.push(numT+3);
	TREE.push({"fID": f2ID, "triangle": getTriangleFromFace(f2, DCEL), "leafID": []});
	TREE.push({"fID": f4ID, "triangle": getTriangleFromFace(f4, DCEL), "leafID": []});
}


/****************************************************/
/**************** OBJECT CONVERSIONS ****************/
/****************************************************/

function getTriangleFromFace(face, DCEL) {
	let triangle = [];
	let currentEdge = DCEL.edges[face.edgeID];
	for(let i = 0; i < 3; i++) {
		triangle.push(getPointFromVertex(DCEL.vertexs[currentEdge.vBID]));
		currentEdge = DCEL.edges[currentEdge.eNID];
	}
	return triangle;
}

function getSegmentFromEdge(edge, DCEL) {
	const vB = DCEL.vertexs[edge.vBID];
	const eT = DCEL.edges[edge.eTID];
	const vE = DCEL.vertexs[eT.vBID];
	return {"from": getPointFromVertex(vB), "to": getPointFromVertex(vE)};
}

function getPointFromVertex(vertex) {
	return {"x": vertex.x, "y": vertex.y};
}



function getSegment(p1, p2) {
	return {"from": p1, "to": p2};
}

function getPoint(x, y) {
	return {"x": x, "y": y};
}


/****************************************************/
/************ LABS -- GENERAL FUNCTIONS *************/
/****************************************************/

/**
 * Returns if 2 points of the plane are equal.
 */
function equalPoints(p1, p2) {
  return p1.x == p2.x && p1.y == p2.y;
}

function pointInsideColinearSegment(s, p) {
  if (s.from.x == p.x) return aBetweenBD(p.y, s.from.y, s.to.y);
  return aBetweenBD(p.x, s.from.x, s.to.x);
}

/**
 * Returns if a is in the range b,d(could not be ordered)
 */
function aBetweenBD(a, b, d) {
  if (b < d) return b <= a && a <= d;
  return d <= a && a <= b;
}

/**
 * Orientation Test.
 * 
 *  1 -> r is to de LEFT of the segment s
 *  0 -> r is colinear to the segment s
 * -1 -> r is to de RIGHT of the segment s
 *
 * @param      {Segment}  	s       
 * @param      {Point}  	r       
 * @return     {int}  		OT
 */
function orientationTest(s, r) {
  const p = s.from;
  const q = s.to;
  const det = ((q.x-p.x)*(r.y-p.y)) - ((r.x-p.x)*(q.y-p.y));
  if (det > 0) return 1;
  if (det < 0) return -1;
  return 0;
}


/****************************************************/
/********** LAB2 -- POINT IN TRIANGLE ***************/
/****************************************************/

/**
 * 0 --> The point is OUTSIDE the triangle
 * 1 --> The point is INSIDE the triangle
 * 2 --> The point is part of 1 SEGMENT of the triangle
 * 3 --> The point is part of 2 SEGMENT of the triangle(coincides with a vertex of the triangle)
 */
function pointInTriangle(p, triangle) {
	if (equalPoints(p, triangle[0]) || equalPoints(p, triangle[1]) || equalPoints(p, triangle[2])) return 3;
	const s1 = getSegment(triangle[0], triangle[1]);
	const s2 = getSegment(triangle[1], triangle[2]);
	const s3 = getSegment(triangle[2], triangle[0]);

	const ot1 = orientationTest(s1, p);
	const ot2 = orientationTest(s2, p);
	const ot3 = orientationTest(s3, p);

	if (ot1 == ot2 && ot2 == ot3) return 1;
	if (ot1 == 0 && pointInsideColinearSegment(s1, p)) return 2;
	if (ot2 == 0 && pointInsideColinearSegment(s2, p)) return 2;
	if (ot3 == 0 && pointInsideColinearSegment(s3, p)) return 2;
	return 0;
}

/****************************************************/
/********************* OUTPUT ***********************/
/****************************************************/

/**
 * Updates outputTriangles structure from DCEL data.
 *
 * @param      {<type>}  outputTriangles  The output triangles
 * @param      {<type>}  vertexs          The vertexs
 * @param      {<type>}  faces            The faces
 * @param      {<type>}  edges            The edges
 */
function getTriangles(outputTriangles, DCEL) {
	for (let i = 0; i < DCEL.faces.length; i++) {
		const vs = getVertexsOfFace(DCEL.faces[i], DCEL);
		outputTriangles.push([vs[0].pointsIndex, vs[1].pointsIndex, vs[2].pointsIndex]);
	}
}

/**
 * Get vIDs of the Face
 *
 * @param      {<type>}  face    The face
 * @param      {<type>}  edges   The edges
 */
function getVertexsOfFace(face, DCEL) {
	let r = [];
	let e = DCEL.edges[face.edgeID];
	for(let i = 0; i < 3; i++) {
		r.push(DCEL.vertexs[e.vBID]);
		e = DCEL.edges[e.eNID];
	}
	return r;
}



