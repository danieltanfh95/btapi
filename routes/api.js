var express = require('express');
var cheerio= require('cheerio');
var http=require('http');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  var postdata=req.query;
  //if title information is available
  if(!postdata.volume){
      res.json("Please show which volume you want.");
    }else if(postdata.title){
    //Get all avalaible volumes
    if(postdata.volume=="available"){
      download("http://baka-tsuki.org/project/api.php?action=parse&format=json&prop=sections&page="+postdata.title, function(resd){
        //This shows all the volumes available for the 
        var data=JSON.parse(resd);
        var links={};
        var pushing="";
        if(data.parse){
          data=data.parse.sections;
          for(var i=0;i<data.length;i++){
            if(data[i].line.match(/\sby\s/g) && data[i].toclevel==1){
              links[data[i].line]=[];
              pushing=data[i].line;
            }else if(!data[i].line.match(/\sby\s/g) && data[i].toclevel==1){
              pushing="";
            }else if(data[i].toclevel==2 && pushing){
              links[pushing].push(data[i].line);
            }
          }
        }        
        res.json(links);
      });
    }else if (postdata.volume.match(/\d+\.{0,1}\d?/g)){
      if(!postdata.chapter){
        //If chapter information is not available
        //Some volumes are formatted differently as Volume1 and Volume_1
        download("http://baka-tsuki.org/project/api.php?action=parse&prop=sections&format=json&page="+
              postdata.title+":Volume_"+postdata.volume, function(resd){
                //res.json(JSON.parse(resd));                
                if(!JSON.parse(resd).error){
                  var links=[];
                  if(JSON.parse(resd).parse){
                    var data=JSON.parse(resd).parse.sections;
                    for(var i=0;i<data.length;i++){
                      if(links.indexOf(data[i].fromtitle)<0){
                        links.push(data[i].fromtitle);
                      }
                    }
                    res.json(links);                    
                  }
                }else{
                  //Start fall-catch section here for Volume{number}
                  download("http://baka-tsuki.org/project/api.php?action=parse&prop=sections&format=json&page="+
                    postdata.title+":Volume"+postdata.volume, function(resd){
                      //res.json(JSON.parse(resd));                
                      if(!JSON.parse(resd).error){
                        var links=[];
                        if(JSON.parse(resd).parse){
                          var data=JSON.parse(resd).parse.sections;
                          for(var i=0;i<data.length;i++){
                            if(links.indexOf(data[i].fromtitle)<0){
                              links.push(data[i].fromtitle);
                            }
                          }
                          res.json(links);                    
                        }
                      }else{
                        res.json(JSON.parse(resd).error);
                      }
                    });  
                  //End section
                }
              });   
      }      
    }else{
      //Here is the code for side story volumes
      //Herein lies the magical realm where chaos reigns supreme
    }
  }

});

function download(url, callback) {
  http.get(url, function(res) {
    var data = "";
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(data);
    });
  }).on("error", function() {
    callback(null);
  });
}
module.exports = router;
