var express = require('express');
var cheerio= require('cheerio');
var http=require('http');
var router = express.Router();

/* New parsing method */
router.get('/',function(req,res){
  seriesTitleFilter(req,res);
  //console.log(res);
})

function seriesTitleFilter(req,res){
  var postdata=req.query;

  // Continue only if series title is available.
  if(postdata.title){
    download("http://baka-tsuki.org/project/api.php?action=parse&format=json&prop=text&page="+postdata.title, function(resd){
      var data={};
      var jsondata=JSON.parse(resd);

      if(jsondata.parse && jsondata.parse.text){
        var $=cheerio.load(jsondata.parse.text["*"]);

        //Preload the data for the light novel
        data.title=jsondata.parse.title;
        data.volume={};
        var status= $(":contains('Project')").text().match(/HALTED|IDLE|ABANDONED|WARNING/i);
        data.status=status ? status[0].toLowerCase() : "active";
        data.author="";

        //Get data about available volumes from the toc
        $(".toc ul li").each(function(){          
          //Notes that each page format has its own quirks and the program attempts to match all of them
          if($(this).text().match(/[\'\"]+ series|by| story$| stories|miscellaneous/i) && $(this).hasClass("toclevel-1")){         
            var volumelist=$(this).text().split(/\n/g).filter(function(n){ return n != "" });
            var volumesnames=volumelist.slice(1,volumelist.length);
            var seriesname=stripNumbering(volumelist[0]);
            var authorname=seriesname.split(/\sby\s/g);
            if(authorname && authorname[1]){
              data.author=authorname[1];
            }       
            //Prepare nested JSON format for volume list for each series.     
            data.volume[seriesname]={};
            for(var key in volumesnames){
              data.volume[seriesname][stripNumbering(volumesnames[key])]={};
            };
          }          
        })
        //Search for available chapters and their interwikilinks from the page.
        for(var serieskey in data.volume){
          //The special case of Moonlight sculptor will not be covered as it is hosted outside of BT
          for(var volumekey in data.volume[serieskey]){
            //First search for links in the heading.
            //This includes full text page versions.
            var heading=$(":header:contains('"+volumekey+"')");
            var headinglinks=heading.find('a');
            headinglinks.each(function(){
              //Reject links to edit the page or template and resource links.
              if($(this).attr('title') && !$(this).attr('href').match(/edit|\=Template|\.\w+$/g)){
                data.volume[serieskey][volumekey][$(this).attr('title')]=$(this).attr('href');
              } 
            });
            //Walk through the following sections for links until the next heading.
            var walker=heading.nextUntil($(":header"));
            var chapterlinks=walker.find("a");
            chapterlinks.each(function(){
              //Remove red links to pages that does not exist too.
              if($(this).attr('title') && !$(this).attr('href').match(/edit|\=Template|\.\w+$/g)){
                data.volume[serieskey][volumekey][$(this).attr('title')]=$(this).attr('href');
              }             
            });
            
          }
          //This covers the special case where the series contains direct links to stories instead of volumes.
          //Kino no tabi
          if( Object.keys(data.volume[serieskey]).length<1){
            //console.log(serieskey);
            var walker=$(":header:contains('"+serieskey+"')").nextUntil($(":header"));
            var chapterlinks=walker.find("a");
            chapterlinks.each(function(){
              if(!$(this).attr('href').match(/\.\w+$/g)){
                data.volume[serieskey][$(this).attr('title')]=$(this).attr('href');
              }              
            });
          }
        }
        // Filtering mechanism
        // While this may be wasteful since we don't filter while we insert the data,
        // However, this provides future oppurtunity to cache results instead of parsing it everytime.
        // Also the code would be much more maintainable. (The previous version was filter while parsing)

        // filter by series
        if(postdata.series){
          for(var serieskey in data.volume){
            //Case insensitive search
            //No url sanitisation so users can use regex search
            var re = new RegExp(postdata.series, 'i');
            if(!serieskey.match(re)){
              delete data.volume[serieskey];
            }
          }
        }

        //filter by volume
        if(postdata.volume){
          for(var serieskey in data.volume){
            for(var volumekey in data.volume[serieskey]){
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
              //Non number input will be removed
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
    //Future cache here.
    res.send("Please show which volume you want.");
  }
}

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
