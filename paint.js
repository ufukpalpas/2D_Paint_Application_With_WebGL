var canvas;
var gl;

var maxTri = 2000000;
var maxVer = 3 * maxTri;
var drawnow = false;
var index = 0;
var preferredColor; //black is default
var lineColors = [];
var ptrLocs = [];
var points = [];
var eraserPoints = [];
var eraserLocs = [];
var redoStack = [];
var undoStack = [];
var redoCStack = [];
var redoToUndo = [];
var index_start = 0;
var index_end = 0;
//var eraserClick = 0;
var numOfRecSkip = 10;
var numOfRecSkip2 = 10;
var brushRad = 0.02;
var squareRad = brushRad * 2 / 10;
var redoPossible = false;
var eraserModeOn = false;
var erasenow = false;
var crtLayer = 1;
var layers = [1,2,3,4];
var moveOn = false;
var first = true;
var t1, t2, t3, t4;
var copyArr = [];
var copyCArr = [];
var lastPoint;
var keepOn = false;
var moveClick = 0;
var moveStart2;
var moveStart3;

var quad_index = 0;
var ellipse_index = 0;
var tri_index = 0;
var draw = false;

var quad_points = [];
var ellipse_points = [];
var tri_points = [];
var allpoints = [];
var points_info = [];
var shape_colors = [];
var modes = [
    "quad",
    "triangle",
    "ellipse",
    "pencil",
    "move",
    "lquad",
    "ltriangle",
    "lellipse"
];
var currentmode = "pencil";


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl){ alert("WebGL isn't available");}

    const fileBtn = document.getElementById("up-file");
    const uploadTxt = document.getElementById("txt");

    var colorPicker = new iro.ColorPicker("#picker", {
        // Set the size of the color picker
        borderWidth: 2,
        width: 512,
        boxHeight: 650,
        // Set the initial color to pure red
        color: "#000",
        layout: [
            { 
              component: iro.ui.Box,
              options: {}
            },
            { 
                component: iro.ui.Slider,
                options: {
                  sliderType: 'hue',
                }
            },
            { 
                component: iro.ui.Slider,
                options: {
                  sliderType: 'saturation'
                }
            },
            { 
                component: iro.ui.Slider,
                options: {
                  sliderType: 'value'
                }
            },
            { 
                component: iro.ui.Slider,
                options: {
                  sliderType: 'alpha'
                }
            },
          ]
    });

    changeColor(vec4( 0.0, 0.0, 0.0, 1.0 )); //init black

    colorPicker.on('color:change', function(color) {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(color.rgba.r/255.0, color.rgba.g/255.0, color.rgba.b/255.0, color.rgba.a));
      });

    canvas.addEventListener("mousedown", function(event){
        if(currentmode == "quad" || currentmode == "lquad"){
            draw = true;
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            var t = vec3(2*event.clientX/canvas.width-1, 
               2*(canvas.height-event.clientY)/canvas.height-1, z);
            quad_points.push(t);
            shape_colors.push(preferredColor[0], preferredColor[1], preferredColor[2], preferredColor[3]);
           
        } else if(currentmode == "ellipse" || currentmode == "lellipse"){
            draw = true;
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            var t = vec3(2*event.clientX/canvas.width-1, 
               2*(canvas.height-event.clientY)/canvas.height-1, z);
            ellipse_points.push(t);
            for(var i = 0; i < 30; i++){
                shape_colors.push(preferredColor[0], preferredColor[1], preferredColor[2], preferredColor[3]);
            } 
        } else if(currentmode == "triangle" || currentmode == "ltriangle"){
            draw = true;
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            var t = vec3(2*event.clientX/canvas.width-1, 
               2*(canvas.height-event.clientY)/canvas.height-1, z);
            tri_points.push(t);
            shape_colors.push(preferredColor[0], preferredColor[1], preferredColor[2]);

        }else if(!eraserModeOn && !moveOn && currentmode == "pencil"){
            drawnow = true;
            index_start = index;
            undoPossible = false;
        } else if(!moveOn) {
            erasenow = true;
        } else {
    
            if(first) {
                first = false;
                t1 = vec2(2*event.clientX/canvas.width-1, 
                2*(canvas.height-event.clientY)/canvas.height-1);
                draw = true;
                var crtLoc = findLayerLoc(crtLayer);
                var z = ((crtLoc)*0.25) - 0.99;
                var t = vec3(2*event.clientX/canvas.width-1, 
                    2*(canvas.height-event.clientY)/canvas.height-1, z);
                moveStart2 = t1; 
                moveStart3 = t;
            } else if(keepOn){
                first = true;
                var loc = vec2(2*event.clientX/canvas.width-1, 
                    2*(canvas.height-event.clientY)/canvas.height-1);
                var xdif = lastPoint[0] - loc[0];
                var ydif = lastPoint[1] - loc[1];
                for(var a = 0; a < copyArr.length; a++){
                    copyArr[a][0] -= xdif;
                    copyArr[a][1] -= ydif;
                    points.push(copyArr[a]);
                    lineColors.push(copyCArr[a]);
                }
                var temparr = allpoints.concat(points);
                gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
            
                temparr = shape_colors.concat(lineColors);
                gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
                copyArr = [];
                copyCArr = [];
                keepOn = false;
                render();
                stopMoveOn();
            }
          } 
    });

    canvas.addEventListener("mouseup", function(event){
        if(currentmode == "quad" || currentmode == "lquad" ){
            popCheck();
            if(currentmode == "quad"){
   
                points_info.push("quad");
            }else{
                points_info.push("lquad_line");      
            }
            
            draw = false;
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var t1= quad_points[quad_index*4];
            var t3 = vec3(2*event.clientX/canvas.width-1, 
                   2*(canvas.height-event.clientY)/canvas.height-1, z);
            var t2 =  vec3(t3[0], t1[1], z); 
            var t4 =  vec3(t1[0], t3[1], z); 
            quad_points.push(t2);
            quad_points.push(t3);
            quad_points.push(t4);
            allpoints.push(t1);
            allpoints.push(t2);
            allpoints.push(t3);
            allpoints.push(t4);

            var temparr = allpoints.concat(points);
            console.log(points.length);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            var tempcol = shape_colors.concat(lineColors);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(tempcol));

            render();
            quad_index++;
        } else if(currentmode == "ellipse" || currentmode == "lellipse"){ 
            popCheck();
            if(currentmode == "ellipse"){
                
                points_info.push("ellipse");
            }  
            else{
                points_info.push("lellipse_line");
            }
            draw = false;
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var t1= ellipse_points[ellipse_index*120];
            ellipse_points.pop();
              
            var t2 = vec3(2*event.clientX/canvas.width-1, 
               2*(canvas.height-event.clientY)/canvas.height-1, z); 
            var center = vec3((t1[0]+t2[0])/2, (t1[1]+t2[1])/2, z);
            var rad_h = Math.abs(t1[1] - t2[1]) / 2;
            var rad_w = Math.abs(t1[0] - t2[0]) / 2; 

            for(var i = 0; i < 360; i+=3){
                var x = rad_w * Math.cos(i/(2*Math.PI));
                var y = rad_h * Math.sin(i/(2*Math.PI));
                var point = vec3(x+center[0], y+center[1], z);
                ellipse_points.push(point);
                allpoints.push(point);
            }
            var temparr = allpoints.concat(points);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            temparr = shape_colors.concat(lineColors);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
            
            render();
            ellipse_index++;
        }  else if(currentmode == "triangle" || currentmode == "ltriangle"){ 
            popCheck();
            if(currentmode == "triangle"){
                
                points_info.push("triangle");
            }else{
                points_info.push("ltriangle_line");
            }
            draw = false;
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var t1= tri_points[tri_index*3];
            tri_points.pop(); 
            var t2 = vec3(2*event.clientX/canvas.width-1, 
               2*(canvas.height-event.clientY)/canvas.height-1, z); 

            var bottom_center = vec3( (3*t1[0]-t2[0])/2, (3*t1[1]-t2[1])/2, z);  
            var x1 = (Math.sqrt(3)*bottom_center[0] + bottom_center[1] - t2[1]) / Math.sqrt(3); 
            var y1 = (t2[0] - bottom_center[0] + (Math.sqrt(3)* bottom_center[1])) / Math.sqrt(3);
            var corner1 = vec3(x1,y1,z);
            var x2 = 2*bottom_center[0] - x1;
            var y2 = 2*bottom_center[1] - y1;
            var corner2 = vec3(x2,y2,z);

            tri_points.push(t2);
            tri_points.push(corner1);
            tri_points.push(corner2);
            allpoints.push(t2);
            allpoints.push(corner1);
            allpoints.push(corner2);
           
            var temparr = allpoints.concat(points);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            temparr = shape_colors.concat(lineColors);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
            
            render();
            tri_index++;
        } else if(currentmode == "move"){
            popCheck();
            if(!keepOn){
                t2 = vec2(2*event.clientX/canvas.width-1, 
                    2*(canvas.height-event.clientY)/canvas.height-1);
                t3 = vec2(moveStart2[0], t2[1]);
                t4 = vec2(t2[0], moveStart2[1]);
                var copy = [];
                var copyC = [];
                for(var i = 0; i < points.length; i+=4){
                    if(points[i][0] >= moveStart2[0] && points[i][0] <= t4[0] && points[i][1] <= moveStart2[1] && points[i][1] >= t2[1]){
                        copy.push(points[i], points[i + 1], points[i + 2], points[i + 3]);
                        copyC.push(lineColors[i], lineColors[i+1], lineColors[i+2], lineColors[i+3]);
                    }
                }
                copyArr = JSON.parse(JSON.stringify(copy));
                copyCArr = JSON.parse(JSON.stringify(copyC));
                keepOn = true;
                lastPoint = moveStart2;
            } 
           
            draw = false;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var temparr = allpoints.concat(points);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
            console.log(points_info.length);
  
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            temparr = shape_colors.concat(lineColors);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            render();

        } else if(!eraserModeOn && !moveOn && currentmode == "pencil"){
            drawnow = false;
            index_end = index;
            ptrLocs = [];
            if(undoStack.length < 30){
                undoStack.push([index_start, index_end]);
            }else{
                undoStack.shift();
                undoStack.push([index_start, index_end]);
            }
        } else if(eraserModeOn && !moveOn){
            erasenow = false;
            eraserLocs = [];
        }
    });

    canvas.addEventListener("mousemove", function(event){
        if((currentmode == "quad" || currentmode == "lquad") && draw){
            popCheck();
            points_info.push("quad_line");
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var t1= quad_points[quad_index*4];
            var t3 = vec3(2*event.clientX/canvas.width-1, 
            2*(canvas.height-event.clientY)/canvas.height-1, z); 
            var t2 =  vec3(t3[0], t1[1], z); 
            var t4 =  vec3(t1[0], t3[1], z); 
    
            allpoints.push(t1);
            allpoints.push(t2);
            allpoints.push(t3);
            allpoints.push(t4);

            var temparr = allpoints.concat(points);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            
            var line_color = shape_colors.concat(lineColors);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(line_color));
 
            render();       
        } else
        if((currentmode == "ellipse" || currentmode == "lellipse") && draw){
            popCheck();
            points_info.push("ellipse_line");
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var t1= ellipse_points[ellipse_index*120];
            var t2 = vec3(2*event.clientX/canvas.width-1, 
            2*(canvas.height-event.clientY)/canvas.height-1, z); 
            var center = vec3((t1[0]+t2[0])/2, (t1[1]+t2[1])/2, z);
            var rad_h = Math.abs(t1[1] - t2[1]) / 2;
            var rad_w = Math.abs(t1[0] - t2[0]) / 2; 

            for(var i = 0; i < 360; i+=3){
                var x = rad_w * Math.cos(i/(2*Math.PI));
                var y = rad_h * Math.sin(i/(2*Math.PI));
                var point = vec3(x+center[0], y+center[1], z);
                allpoints.push(point);
            }

            var temparr = allpoints.concat(points);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0 , flatten(temparr));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            var line_color = []
            for(var i = 0; i < 120; i++){
                line_color.push(shape_colors[shape_colors.length-1]);
            } 
            line_color = shape_colors.concat(lineColors, line_color);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(line_color));
            render();     
        }  else
        if((currentmode == "triangle" || currentmode == "ltriangle") && draw){
            popCheck();
            points_info.push("triangle_line");
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var t1= tri_points[tri_index*3];
            var t2 = vec3(2*event.clientX/canvas.width-1, 
            2*(canvas.height-event.clientY)/canvas.height-1, z); 

            var bottom_center = vec3( (3*t1[0]-t2[0])/2, (3*t1[1]-t2[1])/2, z);  
            var x1 = (Math.sqrt(3)*bottom_center[0] + bottom_center[1] - t2[1]) / Math.sqrt(3); 
            var y1 = (t2[0] - bottom_center[0] + (Math.sqrt(3)* bottom_center[1])) / Math.sqrt(3);
            var corner1 = vec3(x1,y1,z);
            var x2 = 2*bottom_center[0] - x1;
            var y2 = 2*bottom_center[1] - y1;
            var corner2 = vec3(x2,y2,z);

            allpoints.push(t2);
            allpoints.push(corner1);
            allpoints.push(corner2);

            var temparr = allpoints.concat(points);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            var line_color = []
            for(var i = 0; i < 3; i++){
                line_color.push(shape_colors[shape_colors.length-1]);
            } 
            line_color = shape_colors.concat(lineColors, line_color);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(line_color));
            render();     
        }  else
        if(currentmode == "move" && draw){
            popCheck();
            points_info.push("quad_line");
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            var t1= moveStart3;
            var t3 = vec3(2*event.clientX/canvas.width-1, 
            2*(canvas.height-event.clientY)/canvas.height-1, z); 
            var t2 =  vec3(t3[0], t1[1], z); 
            var t4 =  vec3(t1[0], t3[1], z); 
    
            allpoints.push(t1);
            allpoints.push(t2);
            allpoints.push(t3);
            allpoints.push(t4);

            var temparr = allpoints.concat(points);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
            var line_color = []
            for(var i = 0; i < 4; i++){
                line_color.push(vec4( 0.0, 0.0, 0.0, 1.0 ));
            } 
            line_color = shape_colors.concat(line_color,lineColors);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(line_color));
 
            render();
        }else 
        if(drawnow && currentmode == "pencil") {
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            var loc = vec3(2*event.clientX/canvas.width-1,
                2*(canvas.height-event.clientY)/canvas.height-1, z);
            ptrLocs.push(loc);
            var arr = [];
            drawCircle(ptrLocs[0][0], ptrLocs[0][1], brushRad, arr, numOfRecSkip);
            drawCircle(ptrLocs[0][0], ptrLocs[0][1], brushRad * 72 / 100, arr, numOfRecSkip2);
            drawCircle(ptrLocs[0][0], ptrLocs[0][1], brushRad * 45 / 100, arr, numOfRecSkip2);
            drawCircle(ptrLocs[0][0], ptrLocs[0][1], brushRad * 18 / 100, arr, numOfRecSkip2);
            for(var i = 0; i < arr.length; i++){
                var temp = calcQuad(arr[i], squareRad, z);
                points.push(temp[0], temp[1], temp[2], temp[3]);
                lineColors.push(preferredColor[0], preferredColor[1], preferredColor[2], preferredColor[3]);
            }
            ptrLocs.shift();
            var temparr = allpoints.concat(points);
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
        
            temparr = shape_colors.concat(lineColors);
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
            render();
            index++;
      } else if(eraserModeOn && erasenow){
            var crtLoc = findLayerLoc(crtLayer);
            var z = ((crtLoc)*0.25) - 0.99;
            var eloc = vec3(2*event.clientX/canvas.width-1,
            2*(canvas.height-event.clientY)/canvas.height-1, z);
            eraserLocs.push(eloc);            
            for(var j = 0; j < points.length; j=j+4){
                if(inCircle(points[j][0], points[j][1], eraserLocs[0][0], eraserLocs[0][1], brushRad*2, z, points[j][2])){
                    points.splice(j,4);
                    lineColors.splice(j,4);
                }
            }
            eraserLocs.shift();
            var temparr = allpoints.concat(points);
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));

            temparr = shape_colors.concat(lineColors);
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(temparr));
            render();
      }  
    });

    window.addEventListener("keydown", function(event){
        if((event.keyCode == 90) && event.ctrlKey){ //undo CTRL + Z
            if(undoStack.length > 0){
                console.log("undo.length: " + undoStack.length);
                var start= undoStack[undoStack.length-1][0];
                var end = undoStack[undoStack.length-1][1];
                console.log("s: " + start + " e: "+ end);
                var arr = [];
                var arrc = [];
                for(var i = end; i > start; i--){
                    console.log(i);
                    for(var j = 0; j < (4*(360/numOfRecSkip + 360/numOfRecSkip2 + 360/numOfRecSkip2 + 360/numOfRecSkip2)); j++){
                        //console.log("j: " + j);
                        arr.push(points.pop());
                        //console.log(arr.length);
                        arrc.push(lineColors.pop());
                    }
                }
                //if(redoStack.length < 30){
                    redoStack.push(arr);
                    redoCStack.push(arrc);
                    redoToUndo.push([start, end]);
                /*} else {
                    redoStack.shift();
                    redoCStack.shift();
                    redoToUndo.shift();
                    redoStack.push(arr);
                    redoCStack.push(arrc);
                    redoToUndo.push([start, end]);
                }*/
                undoStack.pop();
                redoPossible = true;
                render();
            }
        }

        if((event.keyCode == 89) && event.ctrlKey){ //redo CTRL + Y
            if((redoStack.length > 0) && redoPossible){
                console.log("length: " + redoStack[0].length);
                //console.log(points);
                points.push.apply(points, redoStack[redoStack.length-1]);
                lineColors.push.apply(lineColors, redoCStack[redoCStack.length-1]);
                redoStack.pop();
                redoCStack.pop();
                console.log("1: " + undoStack);
                if(undoStack.length < 30){
                    undoStack.push(redoToUndo[redoToUndo.length -1]);
                }else{
                    undoStack.shift();
                    undoStack.push(redoToUndo[redoToUndo.length -1]);
                }
                console.log("2: " + undoStack);
                redoToUndo.pop();
                render();
            }
        }
    });


    document.getElementById("cBtn0").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(0.0, 1.0, 0.0, 1.0));
        colorPicker.color.rgba = {r: 0,g: 255,b: 0,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("cBtn1").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(1.0, 0.0, 0.0, 1.0));
        colorPicker.color.rgba = {r: 255,g: 0,b: 0,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("cBtn2").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(1.0, 1.0, 0.0, 1.0));
        colorPicker.color.rgba = {r: 255,g: 255,b: 0,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("cBtn3").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(0.0, 0.0, 0.0, 1.0));
        colorPicker.color.rgba = {r: 0,g: 0,b: 0,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("cBtn4").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(1.0, 140.0/255.0, 0.0, 1.0));
        colorPicker.color.rgba = {r: 255,g: 140,b: 0,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("cBtn5").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(1.0, 105.0/255.0, 180.0/255.0, 1.0));
        colorPicker.color.rgba = {r: 255,g: 105,b: 180,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("cBtn6").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(64.0/255.0, 224.0/255.0, 208.0/255.0, 1.0));
        colorPicker.color.rgba = {r: 64,g: 224,b: 208,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("cBtn7").onclick = function () {
        stopEraser();
        stopMoveOn();
        changeColor(vec4(1.0, 99.0/255.0, 71.0/255.0, 1.0));
        colorPicker.color.rgba = {r: 255,g: 99,b: 71,a: 1};
        /*if(currentmode == modes[3]){
            click("brush-btn");
            unclick("eraser");
        }*/
    };

    document.getElementById("saveBtn").onclick = function () {
        var saveObj = [points, lineColors, index, quad_index, ellipse_index, tri_index, quad_points, ellipse_points, tri_points, allpoints, shape_colors, points_info];
        var data = JSON.stringify(saveObj);
        data = window.btoa(data);
        var blob = new Blob([data], {type: "text/plain"});
        var url = window.URL.createObjectURL(blob);
        var anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "save.txt";
        anchor.click("brush-btn");
        window.URL.revokeObjectURL(url);
        //document.removeChild(anchor);
    };
    
    document.getElementById("selectBtn").onclick = function () {
        fileBtn.click("brush-btn");
    }

    fileBtn.addEventListener("change",  function () {
        if(fileBtn.value){
            uploadTxt.innerHTML = fileBtn.value.match(/[\/\\]([\w\d\s\.\-\(\)]+)$/)[1];
        } else {
            uploadTxt.innerHTML = "No file chosen, yet!";
        }
    });

    document.getElementById("uplBtn").onclick = function () {
        var uploadedFile = document.getElementById('up-file').files[0];
        var reader = new FileReader();
        reader.onload = function() {
            var result = reader.result;
            result = window.atob(result);
            var arr = JSON.parse(result);

            points = arr[0];
            lineColors = arr[1];
            index = arr[2];
            quad_index = arr[3];
            ellipse_index = arr[4];
            tri_index = arr[5];
            quad_points = arr[6];
            ellipse_points = arr[7];
            tri_points = arr[8];
            allpoints = arr[9];
            shape_colors = arr[10];
            points_info = arr[11];
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(allpoints.concat(points)));
            
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(shape_colors.concat(lineColors)));
            render();
        }
        reader.readAsText(uploadedFile);
    };

    document.getElementById("eraser").onclick = function(event) {
        stopMoveOn();
        //if((eraserClick%2) == 0){
            eraserModeOn = true;
        /*} else{
            eraserModeOn = false;
        }*/
        //eraserClick++;
        currentmode = modes[3];
        unclick("brush-btn");
        unclick("rectangle-btn");
        unclick("ellipse-btn");
        unclick("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("lellipse-btn");
        unclick("triangle-btn");
        click("eraser");
    }

    document.getElementById("lay1").onchange = function() {
        var rds = document.querySelectorAll('input[name="rad"]');
        for(var i = 0; i < 4; i++){
            if(rds[i].checked == true){
                crtLayer = rds[i].value;
                break;
            }
        }
        console.log("crtlayer select: " + crtLayer);
    }

    document.getElementById("lay2").onchange = function() {
        var rds = document.querySelectorAll('input[name="rad"]');
        for(var i = 0; i < 4; i++){
            if(rds[i].checked == true){
                crtLayer = rds[i].value;
                break;
            }
        }
        console.log("crtlayer select: " + crtLayer);
    }

    document.getElementById("lay3").onchange = function() {
        var rds = document.querySelectorAll('input[name="rad"]');
        for(var i = 0; i < 4; i++){
            if(rds[i].checked == true){
                crtLayer = rds[i].value;
                break;
            }
        }
        console.log("crtlayer select: " + crtLayer);
    }

    document.getElementById("lay4").onchange = function() {
        var rds = document.querySelectorAll('input[name="rad"]');
        for(var i = 0; i < 4; i++){
            if(rds[i].checked == true){
                crtLayer = rds[i].value;
                break;
            }
        }
        console.log("crtlayer select: " + crtLayer);
    }

    document.getElementById("aboveBtn").onclick = function() {
        var crtLoc = findLayerLoc(crtLayer);
        if(crtLoc!=0){
            var rbs = document.querySelectorAll('input[name="rad"]');
            rbs[crtLoc].checked = false;
            rbs[crtLoc - 1].checked = true;
            var tempval = rbs[crtLoc].value;
            rbs[crtLoc].value = rbs[crtLoc - 1].value;
            rbs[crtLoc - 1].value = tempval;
            var first = (layers[crtLoc]).toString();
            var second = (layers[crtLoc - 1]).toString();
            document.getElementById(crtLoc + 1).innerHTML="Layer " + second;
            document.getElementById(crtLoc).innerHTML="Layer " + first;
            var loc = layers[crtLoc - 1];
            layers[crtLoc - 1] = layers[crtLoc];
            layers[crtLoc] = loc;

            var crtz = ((crtLoc)*0.25) - 0.99;
            var nextz = ((crtLoc - 1)*0.25) - 0.99;
            console.log("crt: " + crtz + "next: " + nextz);
            for(var i = 0; i < points.length; i++){
                if(points[i][2] == crtz){
                    points[i][2] = nextz;
                } else if(points[i][2] == nextz){
                    points[i][2] = crtz;
                }
            }
            for(var i = 0; i < allpoints.length; i++){
                if(allpoints[i][2] == crtz){
                    allpoints[i][2] = nextz;
                } else if(allpoints[i][2] == nextz){
                    allpoints[i][2] = crtz;
                }
            }
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(allpoints.concat(points)));
            render();
        }
    }

    document.getElementById("belowBtn").onclick = function() {
        var crtLoc = findLayerLoc(crtLayer);
        if(crtLoc!=3){
            var rbs = document.querySelectorAll('input[name="rad"]');
            rbs[crtLoc].checked = false;
            rbs[crtLoc + 1].checked = true;
            var tempval = rbs[crtLoc].value;
            rbs[crtLoc].value = rbs[crtLoc + 1].value;
            rbs[crtLoc + 1].value = tempval;
            var first = (layers[crtLoc]).toString();
            var second = (layers[crtLoc + 1]).toString();
            document.getElementById(crtLoc + 1).innerHTML="Layer " + second;
            document.getElementById(crtLoc + 2).innerHTML="Layer " + first;
            var loc = layers[crtLoc + 1];
            layers[crtLoc + 1] = layers[crtLoc];
            layers[crtLoc] = loc;

            var crtz = ((crtLoc)*0.25) - 0.99;
            var nextz = ((crtLoc + 1)*0.25) - 0.99;
            console.log("crt: " + crtz + "next: " + nextz);
            for(var i = 0; i < points.length; i++){
                if(points[i][2] == crtz){
                    points[i][2] = nextz;
                } else if(points[i][2] == nextz){
                    points[i][2] = crtz;
                }
            }
            for(var i = 0; i < allpoints.length; i++){
                if(allpoints[i][2] == crtz){
                    allpoints[i][2] = nextz;
                } else if(allpoints[i][2] == nextz){
                    allpoints[i][2] = crtz;
                }
            }
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(allpoints.concat(points)));
            render();
        }
    }

    document.getElementById("slider").oninput = function(event) {
        var value = event.srcElement.value;
        console.log(value);
        document.getElementById("size").innerHTML = value + ".0";
        brushRad = 0.004 * value;
        squareRad = brushRad * 2 / 10;
        render();
    }

    document.getElementById("moveBtn").onclick = function(event) {
        currentmode = "move";
        stopEraser();
        console.log("moveClick baş: " + moveClick);
        var prop = document.getElementById("moveBtn");
        if((moveClick%2) == 0){
            moveOn = true;
            prop.style.borderColor = '#7FFF00';
            moveClick++;
        } else{
            stopMoveOn();
        }
        unclick("rectangle-btn");
        unclick("ellipse-btn");
        unclick("triangle-btn");
        unclick("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("lellipse-btn");
        unclick("brush-btn");
        unclick("eraser");
        //moveClick++;
        console.log("moveClick son: " + moveClick);
    }

    document.getElementById("rectangle-btn").onclick = function(){
        stopMoveOn();
        stopEraser();
        currentmode = modes[0];
        click("rectangle-btn");
        unclick("ellipse-btn");
        unclick("triangle-btn");
        unclick("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("lellipse-btn");
        unclick("brush-btn");
        unclick("eraser");
    }
    document.getElementById("ellipse-btn").onclick = function(){
        stopMoveOn();
        stopEraser();
        currentmode = modes[2];  
        click("ellipse-btn");
        unclick("rectangle-btn");
        unclick("triangle-btn");
        unclick("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("lellipse-btn");
        unclick("brush-btn");
        unclick("eraser");
    }
    document.getElementById("triangle-btn").onclick = function(){
        stopMoveOn();
        stopEraser();
        currentmode = modes[1];
        click("triangle-btn");
        unclick("rectangle-btn");
        unclick("ellipse-btn");
        unclick("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("lellipse-btn");
        unclick("brush-btn");
        unclick("eraser");
    }
    document.getElementById("lrectangle-btn").onclick = function(){
        stopMoveOn();
        stopEraser();
        currentmode = modes[5];
        click("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("lellipse-btn");
        unclick("triangle-btn");
        unclick("rectangle-btn");
        unclick("ellipse-btn");
        unclick("brush-btn");
        unclick("eraser");
    }
    document.getElementById("lellipse-btn").onclick = function(){
        stopMoveOn();
        stopEraser();
        currentmode = modes[7];
        click("lellipse-btn");
        unclick("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("triangle-btn");
        unclick("rectangle-btn");
        unclick("ellipse-btn");
        unclick("brush-btn");
        unclick("eraser");
    }
    document.getElementById("ltriangle-btn").onclick = function(){
        stopMoveOn();
        stopEraser();
        currentmode = modes[6];
        click("ltriangle-btn");
        unclick("lrectangle-btn");
        unclick("lellipse-btn");
        unclick("triangle-btn");
        unclick("rectangle-btn");
        unclick("ellipse-btn");
        unclick("brush-btn");
        unclick("eraser");
    }
    document.getElementById("brush-btn").onclick = function(){
        stopMoveOn();
        stopEraser();
        currentmode = modes[3];
        click("brush-btn");
        unclick("eraser");
        unclick("rectangle-btn");
        unclick("ellipse-btn");
        unclick("triangle-btn");
        unclick("lrectangle-btn");
        unclick("ltriangle-btn");
        unclick("lellipse-btn");
    }

    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    //if (gl.clearDepth) gl.clearDepth(0.5); else gl.clearDepthf(0.5);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 12*maxVer, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxVer, gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
    ptrLocs = [];
    render(); 
}

function calcQuad(center, radius, z) {
    var a = radius/(Math.sqrt(2));
    return [vec3(center[0] - a, center[1] + a, z),
            vec3(center[0] - a, center[1] - a, z),
            vec3(center[0] + a, center[1] + a, z),
            vec3(center[0] + a, center[1] - a, z)];
}

function mpCircle(centerX, centerY, radius, arr){
    var d = (5 - radius * 4)/4
    var x = 0;
    var y = radius;

    do{
        arr.push([centerX + x, centerY + y]);
        arr.push([centerX + x, centerY - y]);
        arr.push([centerX - x, centerY + y]);
        arr.push([centerX - x, centerY - y]);
        arr.push([centerX + y, centerY + x]);
        arr.push([centerX + y, centerY - x]);
        arr.push([centerX - y, centerY + x]);
        arr.push([centerX - y, centerY - x]);

        if (d < 0) {
            d += 2 * x + 1;
        } else {
            d += 2 * (x - y) + 1;
            y--;
        }
        x++;
    }while(x <= y);
}

function drawCircle(x, y, r, arr, add)
{
      var i, angle, x1, y1;
      for(i = 0; i < 360; i += add)
      {
            angle = i;
            x1 = r * Math.cos(angle * Math.PI / 180);
            y1 = r * Math.sin(angle * Math.PI / 180);
            arr.push([x + x1, y + y1]);
      }
}

function inCircle(x,y,xc,yc,radius, cz, z){
    if((((x - xc)*(x -xc) + (y - yc)*(y -yc)) <= (radius*radius)) && (cz == z))
        return true;
    else
        return false;
}

function findLayerLoc(crt){
    for(var i = 0; i < 4; i++){
        if(layers[i] == crt)
            return i;
    }
    return -1;
}

function stopMoveOn(){
    moveOn = false;
    keepOn = false;
    first = true;
    copyArr = [];
    copyCArr = [];
    if((moveClick%2) != 0)
        moveClick++;
    var prop = document.getElementById("moveBtn");
    prop.style.borderColor = '#FF0000';
    //console.log("moveClick stop: " + moveClick);
}

function stopEraser(){
    //if((eraserClick%2) != 0)
        //eraserClick++;
    eraserModeOn = false;
    if(currentmode == modes[3]){
        click("brush-btn");
        unclick("eraser");
    }
}

function unclick(id){
    var element = document.getElementById(id);
    element.classList.remove("clicked");
    element.classList.add("button");
}
function click(id){
    var element = document.getElementById(id);
    element.classList.remove("button");
    element.classList.add("clicked");
}

/*function createFQuads(center, radius){
    var dif = radius/((3.5)*Math.sqrt(2));
    var temp0 = vec2(center[0] + dif, center[1]);
    var temp1 = vec2(center[0] - dif, center[1]);
    var temp2 = vec2(center[0], center[1] + dif);
    var temp3 = vec2(center[0], center[1] - dif);
    return [temp0, temp1, temp2, temp3];
}*/

/*function approximateLine(startLoc, endLoc){
    var size = brushSize * 0.001;
    var difY = endLoc[1] - startLoc[1];
    var difX = endLoc[0] - startLoc[1];
    var angle = (Math.PI/2.0) - Math.atan2(difY,difX);
    var dx = Math.cos(angle)*size;
    var dy = Math.sin(angle)*size;
    return [vec2(startLoc[0] - dx, startLoc[1] + dy),
            vec2(startLoc[0] + dx, startLoc[1] - dy),
            vec2(endLoc[0] + dx, endLoc[1] - dy),
            vec2(endLoc[0] - dx, endLoc[1] + dy)];
}*/

function changeColor(color){
    preferredColor = [color, color, color, color];
}

function popCheck() {
    if(points_info[points_info.length - 1] == "quad_line"){
            points_info.pop();         
            allpoints.pop();
            allpoints.pop();
            allpoints.pop(); 
            allpoints.pop();
        
                
    }else if(points_info[points_info.length - 1] == "ellipse_line"){
        points_info.pop();
        for(var i = 0; i < 360; i+=3){
            allpoints.pop();
        } 
    }else if(points_info[points_info.length - 1] == "triangle_line"){
        points_info.pop();
        allpoints.pop();
        allpoints.pop();
        allpoints.pop();
    }
}

/*function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    for (var i = 0; i < points.length / 4; i++) {
        gl.drawArrays(gl.TRIANGLE_STRIP, 4 * i  , 4);
    }
    //points = []; 
    window.requestAnimFrame(render);
}*/

function render() { 
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    var ind = 0;
    for(var i = 0; i < points_info.length; i++) {   
        
        if(points_info[i] == "quad"){ 
           gl.drawArrays( gl.TRIANGLE_FAN, ind , 4);
           ind += 4;
        }else if(points_info[i] == "ellipse"){
           gl.drawArrays( gl.TRIANGLE_FAN, ind , 120);
           ind += 120;
        }else if(points_info[i] == "triangle"){     
           gl.drawArrays( gl.TRIANGLES, ind , 3);
           ind += 3;
       }else if(points_info[i] == "quad_line" || points_info[i] == "lquad_line" ){   
           gl.drawArrays( gl.LINE_LOOP, ind , 4);
           ind += 4;
           
       }else if(points_info[i] == "ellipse_line" || points_info[i] == "lellipse_line"){     
           gl.drawArrays( gl.LINE_LOOP, ind , 120);
           ind+=120;
        }else if(points_info[i] == "triangle_line" || points_info[i] == "ltriangle_line" ){     
           gl.drawArrays( gl.LINE_LOOP, ind , 3);
           ind+=3;
        }    
    }
   //console.log(allpoints.length);
    for (var i = 0; i < points.length / 4; i++) {
        gl.drawArrays(gl.TRIANGLE_STRIP,ind + (4 * i)  , 4);
    }
    
    window.requestAnimFrame(render);
}
