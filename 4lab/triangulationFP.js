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


/**
 Triangles should be return as arrays of array of indexes
 e.g., [[1,2,3],[2,3,4]] encodes two triangles, where the indices are relative to the array points
**/
function computeTriangulation(points) {
	console.log("START");
	const k = Math.floor(points.length/3);
	const n = points.length;
	let outputTriangles = [];

	//TODO: create empty datastructures
	let DCEL = {"vertexs": [], "faces": [], "edges": []}

	//TODO: Calculate & Add encolsing triangle
	//TODO: Add/choose fixed point
	const fixedPoint = addEncolsingTriangle(points, n, outputTriangles, DCEL);
	let fixedPointFaceID = 0; 
	
	// console.log("ENCLOSING TRIANGLE CALCULATED");
	// console.log("DCEL", DCEL);
	// console.log("FIXED POINT", fixedPoint);

	console.log("TRAINGULATION STARTED!");
	//TODO: Iterate over all sorted points:
	for (let i = 0; i < n; i++) { //should not get last 3 added points
		// console.log("----------------------");
		// console.log("POINT " + i);
		let faceID = findFaceID(points[i], fixedPoint, fixedPointFaceID, DCEL);
		fixedPointFaceID = updateDCEL(i, points[i], faceID, fixedPoint, fixedPointFaceID, DCEL);
		// console.log("UPDATED DCEL", DCEL);
		// console.log("NEW FIXED POINT FACE ID", fixedPointFaceID);
		// console.log("----------------------");
	}

	console.log("TRAINGULATION DONE!");
	// console.log("DCEL", DCEL);
	
	//TODO: Traverse the faces structure and add all faces as triangles
	getTriangles(outputTriangles, DCEL);

	// console.log("TRIANGLES", DCEL);

	console.log("END");
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
function addEncolsingTriangle(points, n, outputTriangles, DCEL) {
	
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

	DCEL.faces.push({"edgeID": 0});

	DCEL.edges.push({"vBID": 0, "fRID": 0, "eNID": 2, "eTID": 1});
	DCEL.edges.push({"vBID": 1, "fRID": -1, "eNID": 5, "eTID": 0});

	DCEL.edges.push({"vBID": 1, "fRID": 0, "eNID": 4, "eTID": 3});
	DCEL.edges.push({"vBID": 2, "fRID": -1, "eNID": 3, "eTID": 2});

	DCEL.edges.push({"vBID": 2, "fRID": 0, "eNID": 0, "eTID": 5});
	DCEL.edges.push({"vBID": 0, "fRID": -1, "eNID": 1, "eTID": 4});

	//Return middle point to use as the fixed point
	//TODO: remove noise
	return getPoint(midx+noise, midy+noise);
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

function findFaceID(p, fp, fpFaceID, DCEL) {
	const MAX_ITER = DCEL.faces.length;
	let iter = 0;

	let found = false;
	let currentFaceID = fpFaceID;
	let prevFaceID = -1;
	let currentFace = DCEL.faces[currentFaceID];
	while (!found && (iter < MAX_ITER)) {
		const containsCheck = pointInTriangle(p, getTriangleFromFace(currentFace, DCEL));
		// console.log("\tcontainsCheck = " + containsCheck + " | in face " + currentFaceID);
		if (containsCheck > 0) {
			found = true;
			if (containsCheck == 2) {
				//TODO: Special case!!!
				//
			}
			// else if (containsCheck == 3) {
			// 	console.log("Something went wrong! Repeated Point!");
			// 	throw "REPEATED POINT";
			// }
		}
		else {
			let edgeFound = false;
			let currentEdge = DCEL.edges[currentFace.edgeID];
			for (let i = 0; i < 3 && !edgeFound; i++) {
				const s1 = getSegmentFromEdge(currentEdge, DCEL);
				const s2 = getSegment(fp, p);
				const et = DCEL.edges[currentEdge.eTID];
				if (prevFaceID != et.fRID) {
					const intersectionCheck = segmentsIntersecction(s1, s2);
					// console.log("\tintersectionCheck = " + intersectionCheck + " | to face " + et.fRID);
					if (intersectionCheck > 1) {
						prevFaceID = currentFaceID;
						currentFaceID = et.fRID;
						currentFace = DCEL.faces[currentFaceID];
						edgeFound = true;
						// console.log(prevFaceID + " --> " + currentFaceID);
					}
				}
				
				if(!edgeFound) currentEdge = DCEL.edges[currentEdge.eNID];
			}

			if (!edgeFound) {
				throw "NEW FACE NOT FOUND\nNew face not found for p = " + JSON.stringify(p);
			}
			iter++;
		}
	}

	if (iter >= MAX_ITER) {
		throw "MAX ITERATIONS\n for p = " + JSON.stringify(p);
	}

	return currentFaceID;
}


/**
 * Updates DCEL adding 1 vertex, 2 new faces and 6 new edges and updating necessary pointers.
 * It also changes de face
 * 
 * f1 --> e1
 * 
 *      *
 *     / \
 *   e1   e2
 *	 /     \
 *	*___e3__*
 *
 * @param      {Point}  p            	   Added point/vertex
 * @param      {Face}  f          	       Face that need to be modified
 * @param      {<type>}  fp                Fixed point
 * @param      {<type>}  fixedPointFaceID  The fixed point face id
 * @param      {<type>}  DCEL              The dcel
 */
function updateDCEL(pIndex, newPoint, f1ID, fp, fixedPointFaceID, DCEL) {

	const numV = DCEL.vertexs.length;
	const numE = DCEL.edges.length;
	const numF = DCEL.faces.length;

	const f1 = DCEL.faces[f1ID];

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
	DCEL.faces.push({"edgeID": e2ID});
	DCEL.faces.push({"edgeID": e3ID});
	
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

	//Modify fixedPointFaceID
	if(pointInTriangle(fp, getTriangleFromFace(DCEL.faces[numF], DCEL)) > 0) {
		// console.log("FPFID changed(1)");
		return numF;
	}
	else if(pointInTriangle(fp, getTriangleFromFace(DCEL.faces[numF+1], DCEL)) > 0) {
		// console.log("FPFID changed(2)");
		return numF+1;
	}
	else return fixedPointFaceID;
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


/*
* Points of the segments get swaped to follow ascendentend order by x and y components.
*/
function sortPoints(s) {
  if(s.from.x > s.to.x || (s.from.x == s.to.x && s.from.y > s.to.y)) {
    [s.from, s.to] = [s.to, s.from];
  }
}

/*
* Returns inverse transposed matrix to tranform segments to new coordinates
* where the first component is s as a vector.
*/
function getBaseMatrix(s) {
  const v = [s.to.x-s.from.x, s.to.y-s.from.y];
  const p = [v[1], -v[0]];
  return math.inv(math.transpose([v,p]));
}

/*
* Change base of segment according to newBase matrix
*/
function changeBaseOfSegment(newBase, s) {
  const p1 = changeBaseOfPoint(newBase, s.from);
  const p2 = changeBaseOfPoint(newBase, s.to);
  return {from: p1, to: p2};
}

/*
* Change base of point according to newBase matrix
*/
function changeBaseOfPoint(newBase, p) {
  const aux = math.multiply(newBase,[p.x, p.y]);
  return {'x':aux[0], 'y':aux[1]};
}


/***********************/


/**
* Returns if 2 points of the plane are equal.
**/
function equalPoints(p1, p2) {
  return p1.x == p2.x && p1.y == p2.y;
}

function pointInsideColinearSegment(s, p) {
  if (s.from.x == p.x) return aBetweenBD(p.y, s.from.y, s.to.y);
  else return aBetweenBD(p.x, s.from.x, s.to.x);
}

/**
* Returns if a is in the range b,d(could not be ordered)
**/
function aBetweenBD(a, b, d) {
  if (b < d) return b <= a && a <= d;
  else return d <= a && a <= b;
}

/*
* s Segment
* r Point
* return 3 options:
*  1 -> r is to de LEFT of the segment s
*  0 -> r is colinear to the segment s
* -1 -> r is to de RIGHT of the segment s
*/
function orientationTest(s, r) {
  const p = s.from;
  const q = s.to;
  const det = ((q.x-p.x)*(r.y-p.y)) - ((r.x-p.x)*(q.y-p.y));
  if (det > 0) return 1;
  else if (det < 0) return -1;
  else return det;
}

/****************************************************/
/********* LAB1 -- SEGMENT INTERSECTION *************/
/****************************************************/

/**
 * 0 --> Segments do NOT intersect!
 * 1 --> Segments are COLINEAR and do not intersect!
 * 
 * 2 --> Segments intersect in a INFINITE set of points(new segment).
 * 3 --> Segments are COLINEAR and intersect in a SINGLE POINT(edge to edge).
 * 4 --> Segments intersect in a SINGLE POINT(middlepoint to middlepoint).
 * 5 --> One segment CONTAINS the other.
 * 6 --> IDENTICAL segments!
 * 7 --> Segments are NOT COLINEAR and intersect in a SINGLE POINT(edge to edge).
 * 8 --> Segments are NOT COLINEAR and intersect in a SINGLE POINT(middlepoint to edge).
 * 
 * 5 -> 1 should be changed
 */
function segmentsIntersecction(s1, s2) {
	let intersectionType;

	sortPoints(s1);
	sortPoints(s2);

	const ot1 = orientationTest(s1, s2.from);
	const ot2 = orientationTest(s1, s2.to);
	const ot3 = orientationTest(s2, s1.from);
	const ot4 = orientationTest(s2, s1.to);

	//COLINEAR
	if(ot1 == 0 && ot2 == 0) {
		const newBase = getBaseMatrix(s1);
		const cb1 = changeBaseOfSegment(newBase, s1);
		const cb2 = changeBaseOfSegment(newBase, s2);

		if(cb2.to.x < cb1.from.x) intersectionType = 1;
		else if(cb2.to.x == cb1.from.x) intersectionType = 3;
		else if(cb2.to.x <= cb1.to.x) {
			if(cb2.to.x == cb1.to.x && cb1.from.x == cb1.from.x) intersectionType = 6;
			else if(cb2.from.x < cb1.from.x) intersectionType = 2;
			else intersectionType = 5;
		} else {
			if(cb2.from.x <= cb1.from.x) intersectionType = 5;
			else if(cb2.from.x < cb1.to.x) intersectionType = 2;
			else if(cb2.from.x == cb1.to.x) intersectionType = 3;
			else intersectionType = 1;
		}
	} //1 POINT IS COLINEAR
	else if(ot1 == 0 || ot2 == 0 || ot3 == 0 || ot4 == 0) {
		let point;
		let segment;
		if(ot1 == 0) {
			point = s2.from;
			segment = s1;
		} else if(ot2 == 0) {
			point = s2.to;
			segment = s1;
		} else if(ot3 == 0) {
			point = s1.from;
			segment = s2;
		} else if(ot4 == 0) {
			point = s1.to;
			segment = s2;
		}
		if(equalPoints(segment.from, point) || equalPoints(segment.to, point)) intersectionType = 7;
		else {
			const newBase = getBaseMatrix(segment);
			const cbSegment = changeBaseOfSegment(newBase, segment);
			const cbpoint = changeBaseOfPoint(newBase, point);
			if(cbpoint.x < cbSegment.from.x || cbpoint.x > cbSegment.to.x) intersectionType = 0;
			else intersectionType = 8;
		}
	} //NOT COLINEAR
	else {
		if(ot1 == ot2 || ot3 == ot4) intersectionType = 0;
		else intersectionType = 4;
	}

	return intersectionType;
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
	let result;
	if (equalPoints(p, triangle[0]) || equalPoints(p, triangle[1]) || equalPoints(p, triangle[2])) result = 3;
	else {
		const s1 = getSegment(triangle[0], triangle[1]);
		const s2 = getSegment(triangle[1], triangle[2]);
		const s3 = getSegment(triangle[2], triangle[0]);

		const ot1 = orientationTest(s1, p);
		const ot2 = orientationTest(s2, p);
		const ot3 = orientationTest(s3, p);

		if (ot1 == ot2 && ot2 == ot3) result = 1;
		else if (ot1 == 0 && pointInsideColinearSegment(s1, p)) result = 2;
		else if (ot2 == 0 && pointInsideColinearSegment(s2, p)) result = 2;
		else if (ot3 == 0 && pointInsideColinearSegment(s3, p)) result = 2;
		else result = 0;
	}
	return result;
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



