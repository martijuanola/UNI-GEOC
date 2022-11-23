## Important files

- `triangulation.js` - The best version of the program.
  - Uses a tree-like structure, independent to the DCEL to enable the localization of the containing triangles of the added points.
  - It take into account the cases whit colinear points and deals with them so no traingles with ara 0 are created. 
  - Takes about 100ms to triangulate the `Lanzarote.json.js` input set
- `triangulationFP.js` - The original and not completed version of the code.
  - Uses a Fixed Point to walk through the different triangles and find the containing triangles of the added points.
  - It doesn't account degenerate cases.
  - Takes about 1500ms to triangulate the `Lanzarote.json.js` input set



## Change INPUT

To change input data you can change the commented line in the following lines of the program:

```js
<!---<script type="text/javascript" src="toy_example.json.js"></script>--->
<!---<script type="text/javascript" src="toy_example_degen.json.js"></script>--->
<script type="text/javascript" src="Lanzarote.json.js"></script>
<!---<script type="text/javascript" src="Lanzarote-degen.json.js"></script>--->
```



## Change triangulation program

Switch the comments of these two lines that use the programs mentioned above.

```js
<!--<script type="text/javascript" src="triangulationFP.js"></script>-->
<script type="text/javascript" src="triangulation.js"></script>
```

