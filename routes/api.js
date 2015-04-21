var express = require('express');
var cheerio= require('cheerio');
var http=require('http');
var router = express.Router();

/* New parsing method */
router.get('/',function(req,res){
  seriesTitleFilterByDownload(req,res);
  //console.log(res);
})
router.get('/category',function(req,res){
  seriesLanguageFilterByDownload(req,res);
})

function seriesLanguageFilterByDownload(req,res){
  var postdata=req.query;
  if(postdata.language && postdata.type){
    var titletype=capitalizeFirstLetter(postdata.type.toLowerCase());
    var language =capitalizeFirstLetter(postdata.language.toLowerCase());
    var category =titletype+"_("+language+")";
    download("http://www.baka-tsuki.org/project/api.php?action=query&cmlimit=400&format=json&list=categorymembers&cmtitle=Category:"+category, function(resd){
      var data={};
      var jsondata=JSON.parse(resd);
      var serieslist=jsondata.query.categorymembers;
      data.type=titletype;
      data.language=language;
      data.titles=[];
      for(var key in serieslist){
        var title=serieslist[key].title;
        data.titles[key]={};
        data.titles[key].page=title.replace(/ /g,"_");
        data.titles[key].title=title;
      }
      res.send(data);
    })    
  }else if(postdata.language && !postdata.type){
    //Only provide a list of title types for the language
    var language =capitalizeFirstLetter(postdata.language.toLowerCase());
    download("http://www.baka-tsuki.org/project/api.php?action=query&cmlimit=400&format=json&list=categorymembers&cmtitle=Category:"+language, function(resd){
      var data={};
      var jsondata=JSON.parse(resd);
      var serieslist=jsondata.query.categorymembers;
      data.language=language;
      data.types=[];
      for(var key in serieslist){
        if(serieslist[key].title.match(/Category/g)){
          var typeoftitle=serieslist[key].title.replace(/Category:/g,"").split(/ /g);
          typeoftitle.pop();
          data.types.push(typeoftitle.join("_"));
        }
      }
      res.send(data);
    })
  }else if(postdata.type && !postdata.type.match(/Original_?novel/i) && !postdata.language){
    //Provide languages available for that type.
    var titletype =capitalizeFirstLetter(postdata.type.toLowerCase());
    download("http://www.baka-tsuki.org/project/api.php?action=query&cmlimit=400&format=json&list=categorymembers&cmtitle=Category:"+titletype, function(resd){
      var data={};
      var jsondata=JSON.parse(resd);
      var serieslist=jsondata.query.categorymembers;      
      data.types=titletype;
      data.language=[];
      for(var key in serieslist){
        if(serieslist[key].title.match(/Category/g)){
          var language=serieslist[key].title.match(/\((.+)\)/g,"")[0].replace(/[\(\)]/g, "");
          data.language.push(language);
        }
      }
      res.send(data);
    })
  }else if(postdata.type.match(/Original_?novel/i)){
    //Directly provide all Original Novels available as they are not divided by language.
    download("http://www.baka-tsuki.org/project/api.php?action=query&cmlimit=400&format=json&list=categorymembers&cmtitle=Category:Original_novel", function(resd){
      var data={};
      var jsondata=JSON.parse(resd);
      var serieslist=jsondata.query.categorymembers;
      data.type="Original novel";
      data.titles=[];
      for(var key in serieslist){
        var title=serieslist[key].title;
        data.titles[key]={};
        data.titles[key].page=title.replace(/ /g,"_");
        data.titles[key].title=title;
      }
      res.send(data);
    })
  }
}

function seriesTitleFilterByDownload(req,res){
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
        data.sections=[];
        var status= $(":contains('Project')").text().match(/HALTED|IDLE|ABANDONED|WARNING/i);
        data.status=status ? status[0].toLowerCase() : "active";
        data.author="";
        data.synopsis="";
        data.cover=$(".thumbinner").find("img").attr('src');
        if (data.cover && data.cover.match(/^\/project/g)){
          data.cover="http://www.baka-tsuki.org"+data.cover;
        }
        
        var synopsiswalk = $(":header").filter(function(){
          return $(this).text().match(/synopsis/i)!=null;
        }).nextUntil($(":header")); 
        var synopsisstring="";
        synopsiswalk.each(function(){  
          if($(this).text()){
            //console.log(synopsisstring, $(this).text());
            synopsisstring+=$(this).text();
          }          
        })
        //Placing empty string in JSON will result in undefined.
        data.synopsis=synopsisstring;

        //If synopsis not found, get the paragraphs containing the title instead.
        if(synopsisstring=="") {          
          synopsiswalk=$("p:contains('"+data.title+"')");
          synopsisstring=synopsiswalk.text();
          synopsiswalk=synopsiswalk.nextUntil($(":not(p)"));
          synopsiswalk.each(function(){  
            if($(this).text()){
              synopsisstring+=$(this).text();
            }          
          })
          data.synopsis=synopsisstring;
        }

        //Completed Preloading of Data
        //Get data about available volumes from the toc
        console.log($("ul"));
        $("#toc ul li").each(function(){          
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
            var seriesdata={};
            seriesdata.title= seriesname;
            seriesdata.books=[];            
            for(var key in volumesnames){
              var volumedata={};
              volumedata.title=stripNumbering(volumesnames[key]);
              volumedata.chapters=[];
              seriesdata.books.push(volumedata);
            };
            data.sections.push(seriesdata);
          }          
        })
        
        //Determine the type of overall image placing
        if(data.sections[0]){
          var volheading=$(":header:contains('"+data.sections[0].books[0].title+"')").first();
          var coverimage=volheading.prevUntil($(":header")).find("img");
          var imageplacing=0;
          if(coverimage.attr('src')){
            imageplacing=1;
          }
          else{
            coverimage=volheading.parentsUntil($(":header")).find("img");
              if(coverimage.attr('src')){
                imageplacing=2;
              }else{
                //Others are in the sections after the heading
                imageplacing=3;
              }
          }
        }        

        //Search for available chapters and their interwikilinks from the page.
        for(var serieskey in data.sections){
          //The special case of Moonlight sculptor will not be covered as it is hosted outside of BT
          for(var volumekey in data.sections[serieskey].books){
            //First search for links in the heading.
            //This includes full text page versions.
            var heading=$(":header:contains('"+data.sections[serieskey].books[volumekey].title+"')").first();
            var headinglinks=heading.find('a');
            headinglinks.each(function(){
              //Reject links to edit the page or template and resource links.
              if($(this).attr('title') && !$(this).attr('href').match(/edit|\=Template|\.\w{0,3}$/g)){
                var chapterdata={};
                chapterdata.title=$(this).attr('title');
                chapterdata.page=$(this).attr('href').replace(/\/project\/index.php\?title\=/g, "");
                var linktype = $(this).attr('href').match(/^\/project/g)? "internal" : "external";
                chapterdata.linktype=linktype;
                if(linktype=="internal"){
                  chapterdata.link="http://www.baka-tsuki.org"+$(this).attr('href');
                }else{
                  chapterdata.link=$(this).attr('href');
                }
                data.sections[serieskey].books[volumekey].chapters.push(chapterdata);
                //Actually this extra layer can be removed, but then this means that the client must
                //Understand the type of link baka tsuki uses, which defeats the purpose of abstraction.
              } 
            });
            //Walk through the following sections for links until the next heading.
            var walker=heading.nextUntil($(":header"));
            var chapterlinks=walker.find("a");
            //console.log(heading.text());
            chapterlinks.each(function(){
              //Remove red links to pages that does not exist too.              
              if(!$(this).attr('href').match(/edit|\=Template|\.\w{0,3}$/g)){
                var titletext=$(this).attr('title') ? $(this).attr('title') : $(this).text();
                var chapterdata={};
                chapterdata.title=titletext;
                chapterdata.page=$(this).attr('href').replace(/\/project\/index.php\?title\=/g, "");
                var linktype = $(this).attr('href').match(/^\/project/g)? "internal" : "external";
                chapterdata.linktype=linktype;
                if(linktype=="internal"){
                  chapterdata.link="http://www.baka-tsuki.org"+$(this).attr('href');
                }else{
                  chapterdata.link=$(this).attr('href');
                }
                data.sections[serieskey].books[volumekey].chapters.push(chapterdata);
              }
            });

            //Find the cover image in each volume section
            //Search for images after heading
            if(imageplacing==3){
              var coverimg=walker.find("img");
              if(coverimg){
                coverimgsrc=coverimg.attr('src');
                if (coverimg.attr('src') && coverimg.attr('src').match(/^\/project/g)){
                  coverimgsrc="http://www.baka-tsuki.org"+coverimgsrc;
                }
                data.sections[serieskey].books[volumekey].cover=coverimgsrc;
              }
            }else if(imageplacing==2){
              var coverimg=heading.parentsUntil($(":header")).find("img");
              if(coverimg){
                coverimgsrc=coverimg.attr('src');
                if (coverimg.attr('src') && coverimg.attr('src').match(/^\/project/g)){
                  coverimgsrc="http://www.baka-tsuki.org"+coverimgsrc;
                }
                data.sections[serieskey].books[volumekey].cover=coverimgsrc;
              }
            }else if(imageplacing==1){
              var coverimg=heading.prevUntil($(":header")).find("img");
              if(coverimg){
                coverimgsrc=coverimg.attr('src');
                if (coverimg.attr('src') && coverimg.attr('src').match(/^\/project/g)){
                  coverimgsrc="http://www.baka-tsuki.org"+coverimgsrc;
                }
                data.sections[serieskey].books[volumekey].cover=coverimgsrc;
              }
            }
            
            //Cover special case of images before the heading

            
          }
          //This covers the special case where the series contains direct links to stories instead of volumes.
          //Kino no tabi
          if( Object.keys(data.sections[serieskey]).length<1){
            //console.log(serieskey);
            var walker=$(":header:contains('"+serieskey+"')").nextUntil($(":header"));
            var chapterlinks=walker.find("a");
            chapterlinks.each(function(){
              if(!$(this).attr('href').match(/\.\w+$/g)){
                data.sections[serieskey][$(this).attr('title')]=$(this).attr('href');
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
          var tempseries=[];
          for(var serieskey in data.sections){
            //Case insensitive search
            //No url sanitisation so users can use regex search            
            var re = new RegExp(postdata.series, 'i');
            if(data.sections[serieskey].title.match(re)){
              tempseries.push(data.sections[serieskey]);
            }
          }
          data.sections=tempseries;
        }

        //filter by volume
        if(postdata.volume){
          for(var serieskey in data.sections){
            var tempvol=[];
            for(var volumekey in data.sections[serieskey].books){
              var re = new RegExp(postdata.volume, 'i');
              if(data.sections[serieskey].books[volumekey].title.match(re)){
                tempvol.push(data.sections[serieskey].books[volumekey]);
              }
            }
            data.sections[serieskey].books=tempvol;
          }
        }

        //convenience filter: By volume number
        if(postdata.volumeno){          
          for(var serieskey in data.sections){
            var tempvol=[];
            for(var volumekey in data.sections[serieskey].books){
              //Non number input will be removed
              var re = new RegExp("volume ?"+postdata.volumeno.match(/\d+/g)+" ", 'i');
              if(data.sections[serieskey].books[volumekey].title.match(re)){
                tempvol.push(data.sections[serieskey].books[volumekey]);
              }
            }
            data.sections[serieskey].books=tempvol;
          }
        }
        res.send(data); 
      }      
    });
  }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
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
