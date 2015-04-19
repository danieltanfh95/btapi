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
    }else if(postdata.lntitle){
    //Get all avalaible volumes
    if(postdata.volume=="available"){
      download("http://baka-tsuki.org/project/api.php?action=parse&prop=sections&page="+postdata.lntitle, function(resd){
        //Only match titles with "Volume {number.number}"
        var volumelist=resd.match(/Volume \d+\.{0,1}\d?/g);
        if(volumelist){
          for(var i=0;i<volumelist.length;i++){
            volumelist[i]=volumelist[i].replace(/ /g,"_");
          }
        }        
        res.json(volumelist);
      });
    }else if (postdata.volume.match(/\d+\.{0,1}\d?/g)){
      //First check if volume is available

      if(!postdata.chapter){
        //If chapter information is not available
        download("http://baka-tsuki.org/project/api.php?action=parse&prop=sections&format=json&page="+
              postdata.lntitle+":Volume_"+postdata.volume, function(resd){
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
      }      
    }else{
      //Here is the code for side story volumes
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
