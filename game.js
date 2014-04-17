// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Units = new Meteor.Collection("units");


//ADMIN TOOL: quickly add units to db to test limits
/*
  for (var i = 0; i < 100; i++) {
    Units.insert({name: "Bob" + i, x: Math.floor(Random.fraction()*10)*10 -100, y: Math.floor(Random.fraction()*10)*5 -100, z: 0, orientation: 0, gun: "Rifle"});
  }
*/


if (Meteor.isClient) {


Template.game.rendered = function() {
  
  //do this only on template load
  if(!this._rendered) {
    this._rendered = true;

    console.log('Template Loaded');
  } //everything outside if is done every time the template is re-drawn (meteor sends an update)


  // initialize the sheetengine
  var canvasElement = document.getElementById('mainCanvas');
  sheetengine.scene.init(canvasElement, {w:1000,h:800});
  sheetengine.drawing.dimmedAlpha = .5; //level of transparency for canvas (must be between 0 and 1)

  //Global Game Variables
  var target = null;
  var hover = false;
  var scenechanged = false;
  var jumpspeed = 0;
  var activeunit = null;
  var hoverunit = null;
  var units = [];

  //IDEA: custom view transformation for opposing team? No transparency for opposing team? 

  /*
  //FEATURE: zoom in (useful for building new characters)
  var zoom = 2;
  sheetengine.context.scale(zoom,zoom);
  sheetengine.context.translate(
    -sheetengine.canvas.width/(2*zoom)*(zoom-1),
    -sheetengine.canvas.height/(2*zoom)*(zoom-1));
  */

  //only 1 large basesheet needed for now
  var basesheet = new sheetengine.BaseSheet({x:800,y:800,z:600}, {alphaD:90,betaD:0,gammaD:0}, {w:800,h:800});
      basesheet.color = '#5D7E36';

      // generate a density map
      var densityMap = new sheetengine.DensityMap(5); 
            
      // define some sheets to test collision detection
      //ramp side 1
      var sheet = new sheetengine.Sheet({x:-29,y:0,z:11}, {alphaD:90,betaD:00,gammaD:20}, {w:60,h:60});
      sheet.context.fillStyle = '#FFF';
      sheet.context.fillRect(0,0,60,60);

      //ramp side 2
      sheet = new sheetengine.Sheet({x:28,y:0,z:11}, {alphaD:90,betaD:00,gammaD:-20}, {w:60,h:60});
      sheet.context.fillStyle = '#FFF';
      sheet.context.fillRect(0,0,60,60);
      
        
      //load cube image
      var img = new Image();
      img.src = 'rockwall.png';
      
      img.onload = function() {
        //cube front
        sheet = new sheetengine.Sheet({x:0,y:-130,z:20}, {alphaD:0,betaD:0,gammaD:0}, {w:40,h:40});
        sheet.context.drawImage(img, 0,0);
        densityMap.addSheet(sheet);

        //cube side 1
        sheet = new sheetengine.Sheet({x:20,y:-150,z:20}, {alphaD:0,betaD:0,gammaD:90}, {w:40,h:40});
        sheet.context.drawImage(img, 0,0);
        densityMap.addSheet(sheet);

        //cube side 2
        sheet = new sheetengine.Sheet({x:-20,y:-150,z:20}, {alphaD:0,betaD:0,gammaD:90}, {w:40,h:40});
        sheet.context.drawImage(img, 0,0);
        densityMap.addSheet(sheet);

        //cube back
        sheet = new sheetengine.Sheet({x:0,y:-170,z:20}, {alphaD:0,betaD:0,gammaD:0}, {w:40,h:40});
        sheet.context.drawImage(img, 0,0);
        densityMap.addSheet(sheet);

        //cube top
        sheet = new sheetengine.Sheet({x:0,y:-150,z:40}, {alphaD:90,betaD:0,gammaD:0}, {w:40,h:40});
        sheet.context.drawImage(img, 0,0);
        densityMap.addSheet(sheet);

        scenechanged = true;
        sheetengine.calc.calculateChangedSheets();
        sheetengine.drawing.drawScene(true);
      };
      img.onerror = function() {console.log("Image failed!");};
      

      //wall front
      sheet = new sheetengine.Sheet({x:-150,y:20,z:20}, {alphaD:0,betaD:0,gammaD:0}, {w:40,h:40});
      sheet.context.fillStyle = '#FFF';
      sheet.context.fillRect(0,0,40,40);

      //wall side
      sheet = new sheetengine.Sheet({x:-130,y:0,z:20}, {alphaD:0,betaD:0,gammaD:90}, {w:40,h:40});
      sheet.context.fillStyle = '#FFF';
      sheet.context.fillRect(0,0,40,40);

      //assign all sheets to density map
      densityMap.addSheets(sheetengine.sheets);
    




        // function for creating a character with a body and 2 legs
        function defineCharacter(centerp, guntype) {
          // character definition for animation with sheet motion
          var body = new sheetengine.Sheet({x:0,y:0,z:15}, {alphaD:0,betaD:0,gammaD:0}, {w:11,h:14});
          var backhead = new sheetengine.Sheet({x:0,y:-1,z:19}, {alphaD:0,betaD:0,gammaD:0}, {w:8,h:6});
          backhead.context.fillStyle = '#9E7700';
          backhead.context.fillRect(0,0,8,4);

          //guntype chosen by unit weapon type from database
          var gun = new sheetengine.Sheet({x:-6,y:3,z:12}, {alphaD:90,betaD:20,gammaD:90}, {w:3,h:8});
          if (guntype == 'Lazer') {
            gun.context.fillStyle = 'orange';
            gun.context.fillRect(0,0,3,8);
          }
          if (guntype == 'Rifle') {
            gun.context.fillStyle = '#5C5C5C';
            gun.context.fillRect(0,0,3,8);
          }

          // legs
          var leg1 = new sheetengine.Sheet({x:-3,y:0,z:4}, {alphaD:0,betaD:0,gammaD:0}, {w:5,h:8});
          leg1.context.fillStyle = '#000';
          leg1.context.fillRect(0,0,5,10);
          var leg2 = new sheetengine.Sheet({x:3,y:0,z:4}, {alphaD:0,betaD:0,gammaD:0}, {w:5,h:8});
          leg2.context.fillStyle = '#000';
          leg2.context.fillRect(0,0,5,10);

          // define character object
          var character = new sheetengine.SheetObject(centerp, {alphaD:0,betaD:0,gammaD:90}, [body,backhead,gun,leg1,leg2], {w:70, h:110, relu:10, relv:25});
            
          character.leg1 = leg1;
          character.leg2 = leg2;
          
          var ctx = body.context;
          
          // head
          ctx.fillStyle = '#FFE699';
          ctx.fillRect(2,2,7,4);
          ctx.fillStyle = '#550';
          ctx.fillRect(2,0,7,2);
          ctx.fillRect(2,2,1,1);
          ctx.fillRect(8,2,1,1);

          //left eye
          ctx.beginPath();
          ctx.arc(4, 3.5, 1, 0, 2 * Math.PI, false);
          ctx.fillStyle = 'black';
          ctx.fill();

          //right eye
          ctx.beginPath();
          ctx.arc(7, 3.5, 1, 0, 2 * Math.PI, false);
          ctx.fillStyle = 'black';
          ctx.fill();

          // body
          ctx.fillStyle = '#5C85FF';
          ctx.fillRect(0,6,11,7);
          
          //offhand
          ctx.fillStyle = '#FFE699';
          ctx.fillRect(10,11,1,2);

          character.animationState = 0;

          character.setDimming(true, true);

          //should probably take these out of this character constructor at some point
          units.push(character); //add to unit array
          
          if(activeunit === null) {
            activeunit = units[0]; 
          }

          return character;
        };
        
        // function for animating character's sheets
        function animateCharacter(character) {
          var state = Math.floor( (character.animationState % 8) / 2);
          var dir = (state == 0 || state == 3) ? 1 : -1;
          
          character.rotateSheet(character.leg1, {x:0,y:0,z:8}, {x:1,y:0,z:0}, dir * Math.PI/8);
          character.rotateSheet(character.leg2, {x:0,y:0,z:8}, {x:1,y:0,z:0}, -dir * Math.PI/8);
        }      
        


  //build all units needed for game (unit types and stats would be populated from database) - uses call back function
  /*
  function createUnits(fetchUnits) {
    var units_db = fetchUnits();
    units_db.forEach(function(u) {
      var character = defineCharacter({x:u.x,y:u.y,z:0}, u.gun);
      character.name = u.name;
      character.id = u._id;
    });
    console.log("units displayed");
  }
  */
  //createUnits(fetchUnits);

//HELPER: creates an asyncronous loop
var asyncLoop = function(o){
  var i=-1;
  var loop = function(){
        i++;
        if(i==o.length){
          o.callback(); 
          return;
        }
        o.functionToLoop(loop, i);
  } 
  loop();//init
}


function fetchUnits(callback) {
  var mongo_units = Units.find().fetch();
  callback(mongo_units);
}

/* Fetches units from database and passes them as an array
 * to callback function. Callback function runs an asynchronous
 * loop to load each unit individually. Async loop has a separate
 * callback function to log once all units have been displayed.
 */
fetchUnits(function(unit_array) {
    console.log("Units fetched");

    asyncLoop({
      length : unit_array.length,
      functionToLoop : function(loop, i){
        setTimeout(function(){
          var u = unit_array[i]; 
          var character = defineCharacter({x:u.x,y:u.y,z:u.z}, u.gun);
          character.setOrientation({alpha: 0, beta: 0, gamma: u.orientation});
          character.name = u.name;
          character.id = u._id;
          scenechanged = true;
          console.log('Unit # ' + i + ' loaded');
          loop();
        },1);
      },
      callback : function(){
          console.log('All Units displayed');
        }    
    });

});




/*
  function fetchUnits(createUnits) {
    var units_db = Units.find();
    console.log("units fetched");
    createUnits(units_db);
  } 

  fetchUnits(function(units_db) {
    units_db.forEach(function(u) {
      var character = defineCharacter({x:u.x,y:u.y,z:u.z}, u.gun);
      character.setOrientation({alpha: 0, beta: 0, gamma: u.orientation});
      character.name = u.name;
      character.id = u._id;
    });
    console.log("units displayed");
  });
*/
  /*
  Deps.autorun(function () {
    if(Session.equals("scenechanged", true)){
      Session.set("scenechanged", false);
      console.log("scene updated");
      sheetengine.calc.calculateChangedSheets();
      sheetengine.drawing.drawScene();
      sheetengine.context.restore();
    }
  });

  */

  /*
  for (var i=0; i< units_db.count(); i++) {
    var gun = 'Rifle';
    var character = defineCharacter({x:110,y:i,z:0}, gun);
    character.name = 'John boy ' + i ; 
  }
   */
/*
  var length = units.length;
  var unit = null;
  for (var i = 0; i < length; i++) {
    unit = units[i];
    //Tranparent objects (1st param = allows sheets to dim, 2nd param = this object never dims)
    unit.setDimming(true, true);
    sheetengine.drawing.dimmedAlpha = .5; //level of transparency for canvas (must be between 0 and 1)
  }
*/



  // draw initial scene
  sheetengine.calc.calculateAllSheets();
  sheetengine.drawing.drawScene(true);





        


  // mouse events
  canvasElement.onclick = function(event) {
    // get the click coordinates
    var puv = {
      u:event.clientX - sheetengine.canvas.offsetLeft + window.pageXOffset, 
      v:event.clientY - sheetengine.canvas.offsetTop + window.pageYOffset
    };

    //check if another unit is clicked, and if there is not one currently moving to target, then set new active unit 
    var length = units.length, unit = null;
    for (var i = 0; i < length; i++) {
      unit = units[i];

      var unithovered = isUnitHovered(puv, unit);

      if(unithovered == true && !target) { 
        activeunit = unit;
        scenechanged = true;
        Session.set("selected_player", activeunit.id);
        return;
      }

    }
    
    // transform coordinates to world coordinate system
    var pxy = sheetengine.transforms.inverseTransformPoint({
      u:puv.u + sheetengine.scene.center.u, 
      v:puv.v + sheetengine.scene.center.v
    });
    
      // calculate rotation angle
      var angle = -Math.atan2(pxy.y - activeunit.centerp.y, pxy.x - activeunit.centerp.x) + Math.PI/2;

      // set target position for character
      target = pxy;
      scenechanged = true;

      // sets absolute orientation with respect to initial pos object from initial pos
      activeunit.setOrientation({alpha: 0, beta: 0, gamma: angle});
  }



  canvasElement.onmousemove = function(event) {
    // get the hover coordinates
    var puv = {
      u:event.clientX - sheetengine.canvas.offsetLeft + window.pageXOffset, 
      v:event.clientY - sheetengine.canvas.offsetTop + window.pageYOffset
    };
    
    // check if any unit is currently being hovered (true/false -> if true, scene has changed)
    var length = units.length, unit = null;
    for (var i = 0; i < length; i++) {
      unit = units[i];
      var objhovered = isUnitHovered(puv, unit); //change to all units
      if (objhovered != hover) {
        scenechanged = true;
      }
      if (objhovered) {
        hoverunit = unit;
        hover = objhovered;
        return;
      }
    }
    hover = objhovered;
  }


  function isUnitHovered(puv, unit) {
    var ouv = sheetengine.drawing.getPointuv(unit.centerp); 
    //need to develop formula to establish width and height for all unit types
    if (puv.u > ouv.u - 20 &&  
      puv.u < ouv.u + 20 &&
      puv.v > ouv.v - 30 &&
      puv.v < ouv.v + 10 )
      return true;
    
    return false;
  }
        

  // main loop
  function mainloop() {

    var timer = Date.now();
    
    //Needed because activeunit is not set until the first unit loads
    if(units.length === 0) {
      return;
    }


    var move = 0;
    if (target) {
      if (Math.abs(target.x-activeunit.centerp.x) > 5 || Math.abs(target.y-activeunit.centerp.y) > 5)
        move = 3;
    }
    
    if (move) {
      // calculate resulting displacement from orientation of user
      var angle = activeunit.rot.gamma;
      var dx = Math.sin(angle) * move;
      var dy = Math.cos(angle) * move;

      // character constantly falls (gravity)
      jumpspeed -= 2;
      
      // get allowed target point. character's height is 20, and character can climb up to 10 pixels
      var targetInfo = densityMap.getTargetPoint(activeunit.centerp, {x:dx, y:dy, z:jumpspeed}, 20, 10);
      var allowMove = targetInfo.allowMove;
      var targetp = targetInfo.targetp;
      var stopFall = targetInfo.stopFall;
      var movex = targetInfo.movex;
      var movey = targetInfo.movey;
      
      // if character stops falling, reset jump info
      if (stopFall) {
        jumpspeed = 0;
      }

    var moved = targetp.x != activeunit.centerp.x || targetp.y != activeunit.centerp.y || targetp.z != activeunit.centerp.z;
      if (moved && allowMove) {
          
        // move character to target point
        //character.move({x:dx,y:dy,z:0});
        activeunit.setPosition(targetp);

        animateCharacter(activeunit);
        activeunit.animationState++;

        scenechanged = true;
      }
    }

    
    // remove target and update db if character got there
    if (target && !move) {
      target = null;
      scenechanged = true;

      //set coordinates in db
      Units.update(
        {_id: activeunit.id},
        {$set: 
          {x: Math.floor(activeunit.centerp.x), 
            y: Math.floor(activeunit.centerp.y), 
            z: Math.floor(activeunit.centerp.z), 
            orientation: activeunit.rot.gamma } 
        }
      );

    }

    // remove target if character got stuck
    if (target && (movex == 0 ) && (movey == 0)) {
      target = null;
      scenechanged = true;
    }

    
    if (scenechanged) {
      scenechanged = false;
      
      // calculate sheets and draw scene
      sheetengine.calc.calculateChangedSheets();
      sheetengine.drawing.drawScene();

         // draw a circle around active unit
          var ctx = sheetengine.context;
          ctx.save();
          ctx.scale(1, 0.5);
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#AAF';
          var characterp = sheetengine.drawing.getPointuv(activeunit.centerp);
          ctx.beginPath();
          ctx.arc(characterp.u, characterp.v*2, 15, 0, Math.PI*2);
          ctx.stroke();
          ctx.restore();

      
      if (target) {
        // draw an X to target location
        var ctx = sheetengine.context;
        ctx.save();
        ctx.scale(1, 0.5);
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#FFF';
        var puv = sheetengine.drawing.getPointuv(target);
        ctx.beginPath();
        ctx.moveTo(puv.u-5, puv.v*2-5);
        ctx.lineTo(puv.u+5, puv.v*2+5);
        ctx.moveTo(puv.u+5, puv.v*2-5);
        ctx.lineTo(puv.u-5, puv.v*2+5);
        ctx.stroke();
        ctx.restore();
      }
      
      if (hover) {
        //draw box border to indicate unit is hovered
        var ctx = sheetengine.context;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#FFF';
        var ouv = sheetengine.drawing.getPointuv(hoverunit.centerp);
        ctx.strokeRect(Math.round(ouv.u) - 20, Math.round(ouv.v) - 30, 40, 40);

        //display unit name
        ctx.font = '12px calibri';
        ctx.textAlign = 'center'; 
        ctx.strokeStyle = '#FFF';
        var text = hoverunit.name;
        ctx.strokeText(text, ouv.u, ouv.v - 40);

        ctx.restore();
      }
      
      var time_completed = Date.now()-timer;
      console.log("main loop completed: " + time_completed);

    }



  };

  var FPS = 30;
  setInterval(mainloop, 1000/FPS);


  /* 
  STUFF TO ADD

  shooting, one bullet object used repeatedly

  texture images on characters or ground or objects

  simple database with 2 teams of units to practice with
    for now just: unit type, unit name, health, attack, weapon type, x,y,z coordinates

  deployment mode

  max movement range

  attack button

  design vehicle object

  inverse custom view transformation

  death animation (all sheets drop individually to floor dramatically?)

  */
    

  Units.find().observeChanges({
    changed: function(id, field_obj){
      //console.log("db has changed. id - " + id + "fields changed - " + JSON.stringify(field_obj, null, 4));
      for(var i=0; i < units.length; i++) {
        if(units[i].id == id) {
          if(field_obj.x == undefined) { //x didn't change in db, so leave as is
            field_obj.x = units[i].centerp.x;
          }
          if(field_obj.y == undefined) { //y didn't change in db, so leave as is
            field_obj.y = units[i].centerp.y;
          }
          if(field_obj.z == undefined) { //z didn't change in db, so leave as is
            field_obj.z = units[i].centerp.z;
          }
          if(field_obj.orientation == undefined) { //orientation didn't change in db, so leave as is
            field_obj.orientation = units[i].rot.gamma;
          }

          units[i].setPosition({x: field_obj.x, y: field_obj.y, z:field_obj.z});
          units[i].setOrientation({alpha: 0, beta: 0, gamma: field_obj.orientation});
          scenechanged = true;

          console.log(units[i].name + " has moved to x:" + field_obj.x +", y:" + field_obj.y +", z:" + field_obj.z);
        }
      }
    },
  });



} //end template

/*
  // Function that redraws the entire canvas from shapes in Meteor.Collection
  function drawShapes() {
    var shapes = Units.find();
    shapes.forEach(function() {
      console.log("draw");
      // draw each on canvas
    });
  }

  var startUpdateListener = function() {
    // Function called each time 'Units' is updated.
    var redrawCanvas = function() {
      var context = Meteor.Deps.Context();
      context.on_invalidate(redrawCanvas); // Ensures this is recalled for each update
      context.run(function() {
        drawShapes();
      });
    }
    redrawCanvas();
  }
*/



  // etc
/*
  Meteor.startup(function() {
    startUpdateListener();
    console.log("startup listener began");
  });
*/
  Template.leaderboard.units = function () {
    return Units.find({}, {sort: {x: -1, name:1}});; //mongoDB .sort() method not available in meteor at this time (v0.6.4)
  };

  Template.leaderboard.selected_name = function () {
    var unit = Units.findOne(FEN: Session.get("selected_player"));
    return unit && unit.name;
  };

  Template.leaderboard.events({
    'click input.inc': function () {
      Units.update(Session.get("selected_player"), {$inc: {x: 5}});
    }
  });

  Template.unit.selected = function () {
    return Session.equals("selected_player", this._id) ? "selected" : '';
  };

  Template.unit.events({
    'click': function () {
      Session.set("selected_player", this._id);
    }
  });

  Template.hello.greeting = function () {
  return "Welcome to test.";
  };

  Template.hello.events({
    'click input' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Units.find().count() == 0) {
      var names = ["Ada Lovelace",
                   "Grace Hopper",
                   "Marie Curie",
                   "Carl Friedrich Gauss",
                   "Nikola Tesla",
                   "Claude Shannon"];
      for (var i = 0; i < names.length; i++)
        Units.insert({name: names[i], x: Math.floor(Random.fraction()*10)*10 -100, y: Math.floor(Random.fraction()*10)*5 -100, z: 0, orientation: 0, gun: "Rifle"});
    }



      /*
      function fetchUnits() {
        var units_db = Units.find();
        console.log("units fetched");
        return units_db;
      }

      fetchUnits();
      */
  });
}