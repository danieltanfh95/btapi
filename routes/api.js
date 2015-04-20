var express = require('express');
var cheerio= require('cheerio');
var http=require('http');
var router = express.Router();

/* New parsing method */
router.get('/',function(req,res){
  var postdata=req.query;
  if(postdata.title){
    download("http://baka-tsuki.org/project/api.php?action=parse&format=json&prop=text&page="+postdata.title, function(resd){
      var data={};
      var jsondata=JSON.parse(resd);

      if(jsondata.parse && jsondata.parse.text){
        var $=cheerio.load(jsondata.parse.text["*"]);

        data.title=jsondata.parse.title;
        data.volume={};
        //Push volumes first
        var pushing="";
        $(".toc ul li").each(function(){          
          if($(this).text().match(/\sby\s/g) && $(this).hasClass("toclevel-1")){            
            var volumelist=$(this).text().split(/\n/g).filter(function(n){ return n != "" });
            var volumesnames=volumelist.slice(1,volumelist.length);
            var seriesname=stripNumbering(volumelist[0]);
            data.volume[seriesname]={};
            for(var key in volumesnames){
              data.volume[seriesname][stripNumbering(volumesnames[key])]={};
            };
          }          
        })
        //Now we search for available chapters
        for(var serieskey in data.volume){
          //var header=$("h3:contains")
          //console.log(serieskey);
          for(var volumekey in data.volume[serieskey]){
            //console.log(volumekey);
            //Headings denote the end of the section.
            var walker=$("h3:contains('"+volumekey+"')").nextUntil($(":header"));
            var chapterlinks=walker.find("a");
            //console.log(chapterlinks);
            chapterlinks.each(function(){
              data.volume[serieskey][volumekey][$(this).attr('title')]=$(this).attr('href');
            });
            
          }
        }
        //Data now contains links to chapters within available volumes.
        //Now add a filter into the data
        //filter by series
        if(postdata.series){
          for(var serieskey in data.volume){
            //Case insensitive search
            //No sanitisation means users can use regex search
            var re = new RegExp(postdata.series, 'i');
            //console.log(serieskey);
            //console.log(postdata.series);
            if(!serieskey.match(re)){
              delete data.volume[serieskey];
            }
          }
        }
        //filter by volume
        if(postdata.volume){
          for(var serieskey in data.volume){
            for(var volumekey in data.volume[serieskey]){
              //Same method is used so users can search by numbers and names
              var re = new RegExp(postdata.volume, 'i');
              if(!volumekey.match(re)){
                delete data.volume[serieskey][volumekey];
              }
            }
          }
        }

        //convenience filter: By volume number
        if(postdata.volumeno){
          for(var serieskey in data.volume){
            for(var volumekey in data.volume[serieskey]){
              //Same method is used so users can search by numbers and names
              var re = new RegExp("volume ?"+postdata.volumeno.match(/\d+/g)+" ", 'i');
              if(!volumekey.match(re)){
                delete data.volume[serieskey][volumekey];
              }
            }
          }
        }
        res.send(data);        
      }      
    });
  }else{
    res.send("Please show which volume you want.")
  }
})


function stripNumbering(line){
  line=line.replace(/^\s+|\s+$/g, '').split(/ /g);
  return line.slice(1,line.length).join(" ");
}

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
