var express = require('express');
var cheerio= require('cheerio');
var http=require('http');
var router = express.Router();

/* New parsing method */
router.get('/',function(req,res){
  var postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect('/series');
  }else{
    seriesTitleFilterByDownload(req,res);
  }  
  //console.log(res);
})
router.get('/category',function(req,res){
  var postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect('/category');
  }else{
    seriesLanguageFilterByDownload(req,res);
  }  
  
})

router.get('/time',function(req,res){
  var postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect('/time');
  }else{
    lastUpdatesTimeByDownload(req,res);
  }  
  
})

function lastUpdatesTimeByDownload(req,res){
  var postdata=req.query; 
  if(postdata.titles||postdata.pageids){
    download("http://www.baka-tsuki.org/project/api.php?action=query&prop=info%7Crevisions&format=json&titles="+postdata.titles, function(resd){
      var titledata=JSON.parse(resd);
      download("http://www.baka-tsuki.org/project/api.php?action=query&prop=info%7Crevisions&format=json&pageids="+postdata.pageids, function(resd){
        var pagedata=JSON.parse(resd);
        var data=[];
        if(titledata.query.normalized[0].from!="undefined"){
          console.log(titledata.query);
          var pages=titledata.query.pages;
          for(var title in pages){
            var obj={};
            obj.title=pages[title].title;
            obj.pageid=pages[title].pageid;
            obj.lastrevisedid=pages[title].lastrevid;
            obj.lastreviseddate=pages[title].revisions[0].timestamp
            data.push(obj);
          }
        }
        if(!pagedata.query.pages[0]){
          var pages=pagedata.query.pages;
          for(var title in pages){
            var obj={};
            obj.title=pages[title].title;
            obj.pageid=pages[title].pageid;
            obj.lastrevisedid=pages[title].lastrevid;
            obj.lastreviseddate=pages[title].revisions[0].timestamp;
            data.push(obj);
          }
        }
        res.send(data);
      });
    });
  }else if(postdata.updates){
    //returns the latest newest pages up to a certain number
    //Mediawiki limits the output to 500 so there might a few calls before you get all the data you need.
    var continuekey="";
    var data=[];
    var maxmatches=100;
    function getLatestRevision() {
      var url="http://www.baka-tsuki.org/project/api.php?action=query&list=recentchanges&format=json&rclimit="+maxmatches;
      if(continuekey){
        url+="&rccontinue="+continuekey;
      }
      if(postdata.from){
        //The date and time to start listing changes
        //Note that this must be in YYYY-MM-DDTHH:MM:SSZ format
        url+="&rcend="+postdata.from;
      }
      if(postdata.until && postdata.from){
        //The date and time to end listing changes
        //Note that this must be in YYYY-MM-DDTHH:MM:SSZ format
        url+="&rcstart="+postdata.until;
      }
      download(url, function(resd){
        var jsondata=JSON.parse(resd);
        var edits=jsondata.query.recentchanges;
        if(jsondata["query-continue"] && jsondata["query-continue"].recentchanges){
          continuekey= jsondata["query-continue"].recentchanges.rccontinue;
        }
        for(var key in edits){
          if (edits[key].type=="new" && data.length<postdata.updates ){
            if(!edits[key].title.match(/^User|^Talk/g)){
              var obj={};
              obj.title=edits[key].title;
              obj.pageid=edits[key].pageid;
              obj.timestamp=edits[key].timestamp;
              obj.revid=edits[key].revid;
              data.push(obj);           
            }
          }
        }
        console.log("download end", data.length, edits.length);
        if(edits.length<maxmatches || data.length>=postdata.updates){          
          res.send(data);
        }else{
          getLatestRevision();
        }
      })
    }
    //Start the recursive function
    getLatestRevision();
  }
}

function seriesLanguageFilterByDownload(req,res){
  var postdata=req.query;
  if(postdata.language && postdata.type){
    var titletype=capitalizeFirstLetter(postdata.type.toLowerCase());
    var language =capitalizeFirstLetter(postdata.language.toLowerCase());
    var category =titletype+"_("+language+")";
    download("http://www.baka-tsuki.org/project/api.php?action=query&prop=info%7Crevisions&generator=categorymembers&gcmlimit=500&gcmtype=page&format=json&gcmtitle=Category:"+category, function(resd){
      var data={};
      var jsondata=JSON.parse(resd);
      var serieslist=jsondata.query.pages;
      data.type=titletype;
      data.language=language;
      data.titles=[];
      console.log(serieslist.length);
      for(var key in serieslist){
        var title=serieslist[key].title;
        var titledata={}
        titledata.page=title.replace(/ /g,"_");
        titledata.title=title;
        titledata.lastreviseddate=serieslist[key].revisions[0].timestamp;
        titledata.lastrevisedid=serieslist[key].lastrevid;
        titledata.pageid=serieslist[key].pageid;
        data.titles.push(titledata);
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
        //console.log($(".toc").text());
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
        //console.log($("ul"));
        $("#toc ul li").each(function(){          
          //Notes that each page format has its own quirks and the program attempts to match all of them
          if($(this).text().match(/[\'\"]+ series|by| story$| stories|miscellaneous|full/i) && $(this).hasClass("toclevel-1")){         
            //Note: This matches any title that remotely looks like a link to the volumes, e.g. Shakugan no Shana
            //console.log($(this).text())
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

        //Sometimes the data for authors is hidden in the first paragraph instead
        if(!data.author){
          //Search for author name between "by" and a non-character or the word "and"
          var works=$("p").text().match(/\sby\s(.+)\./i)[1].split(/and|with/);
          var authorname=works[0].replace(/^\s+|\s+$/g, '');
          data.author=authorname;
        }
        if(!data.illustrator){
          var works=$("p").text().match(/\sby\s(.+\.)/i)[1].split(/and|with/);
          if(works[1]){
            var illustrator=works[1].match(/\sby\s(.+)\./i);  
            if(illustrator && illustrator[1]){
              data.illustrator=illustrator[1];
            }else{
              data.illustrator="";
            }
          }
        }
                 

        
        if(data.sections){
          //Determine the type of overall image placing
          //console.log(data.sections[0].books);
          if(data.sections[0].books[0]){
            var volheading=$(":header:contains('"+data.sections[0].books[0].title+"')").first();
            var coverimage=volheading.prevUntil($(":header")).find("img");
            var imageplacing=0;
            if(coverimage.attr('src')){
              //Image before the heading
              imageplacing=1;
            }
            else{
              coverimage=volheading.parentsUntil($(":header")).find("img");
                if(coverimage.attr('src')){
                  //Image in tables before the heading
                  imageplacing=2;
                }else{
                  //Image in the sections after the heading
                  imageplacing=3;
                }
            }
          } 
          //Search for available chapters and their interwikilinks from the page.
          for(var serieskey in data.sections){
            for(var volumekey in data.sections[serieskey].books){
              //First search for links in the heading.
              //This includes full text page versions.
              var heading=$(":header:contains('"+data.sections[serieskey].books[volumekey].title+"')").first();
              var headinglinks=heading.find('a');
              headinglinks.each(function(){
                //Reject links to edit the page or template and resource links.
                if($(this).attr('title') && !$(this).attr('href').match(/edit|\=Template|\.\w{0,4}$/g)){
                  var chapterdata={};
                  chapterdata.title=$(this).text();
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
              //Walk through the following sections for links until the next heading.
              var walker=heading.nextUntil($(":header"));
              var chapterlinks=walker.find("a");
              //console.log(heading.text());
              chapterlinks.each(function(){
                //Remove red links to pages that does not exist too.              
                if(!$(this).attr('href').match(/edit|\=Template|\.\w{0,4}$/g)){
                  var titletext=$(this).attr('title') ? $(this).attr('title') : $(this).parent().first().text();
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
            }
            //This covers the special case where the series contains direct links to stories instead of volumes.
            //Kino no tabi
            if( data.sections[serieskey].books.length<1){
              var walker=$(":header:contains('"+data.sections[serieskey].title+"')").nextUntil($(":header"));
              var chapterlinks=walker.find("a");
              chapterlinks.each(function(){
                if(!$(this).attr('href').match(/edit|\=Template|\.\w{0,4}$/g)){
                  //
                  var titletext=$(this).attr('title') ? $(this).attr('title') : $(this).parents().first().text();
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
                  data.sections[serieskey].books.push(chapterdata);
                }              
              });
            }
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
              var re = new RegExp("volume.?"+postdata.volumeno.match(/\d+/g), 'i');
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
