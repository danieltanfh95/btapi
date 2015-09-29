var express = require('express');
var cheerio= require('cheerio');
var https=require('https');
var router = express.Router();

/* New parsing method */
router.get('/',function(req,res){
  var postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect('/series');
  }else{
    seriesTitleFilterByDownload(req,res);
  }  
})

router.get('/category',function(req,res){
  var postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect('/category');
  }else{
    seriesLanguageFilterByDownload(req,res);
  }  
})

router.get('/genre',function(req,res){
  var postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect('/genre');
  }else{
    seriesGenreFilterByDownload(req,res);
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

function seriesGenreFilterByDownload(req,res){
  var postdata=req.query;
  if(postdata.list){
    var tempdata={};
    var data={};
    var genreList=postdata.list.split("|");
    data.genres=postdata.list.split("|");
    data.titles=[];
    function mergeObjects(obj1, obj2){
      var finalobj={};
      if(Object.keys(obj1).length>0 && Object.keys(obj2).length>0){
        for(var key in obj1){
          if(obj2[key]){
            finalobj[key]=obj2[key];
          }
        }
      }else if(Object.keys(obj1).length<=0 || Object.keys(obj2).length<=0){
        finalobj = Object.keys(obj1).length>0 ? obj1 : obj2 ;
      }
      return finalobj;
    }
    function getAllGenres(){
      var url = "action=query&prop=info|revisions&generator=categorymembers&gcmlimit=500&gcmtype=page&gcmtitle=Category:Genre_-_";
      if(genreList.length>0){
        url+=capitalizeFirstLetter(genreList.pop());
        downloadJSONfromBakaTsukiMediaWiki(url,function(jsondata){
          if(jsondata.query && jsondata.query.pages){
            tempdata=mergeObjects(tempdata,jsondata.query.pages);
          }
          getAllGenres();
        })
      }else{
        //Reorganise the data
        for(var val in tempdata){
          var obj ={};
          var title=tempdata[val];
          obj.page=title.title.replace(/ /g,"_");
          obj.title=title.title;
          obj.lastreviseddate=title.revisions[0].timestamp;
          obj.lastrevisedid=title.lastrevid;
          obj.pageid=title.pageid;
          data.titles.push(obj);
        }
        res.send(data);
      }      
    }
    getAllGenres();
  }
}

function lastUpdatesTimeByDownload(req,res){
  var postdata=req.query; 
  if(postdata.titles||postdata.pageids){
    downloadJSONfromBakaTsukiMediaWiki("action=query&prop=info|revisions&titles="+postdata.titles, function(titledata){
      downloadJSONfromBakaTsukiMediaWiki("action=query&prop=info|revisions&pageids="+postdata.pageids, function(pagedata){
        res.send([titledata.query.normalized[0].from!="undefined" ?
                  titledata.query.pages.map(function(ele){ return {
                    "title": ele.title,
                    "pageid": ele.pageid,
                    "lastrevisedid": ele.lastrevid,
                    "lastreviseddate": ele.revisions[0].timestamp
                  };}) : null,
                  !pagedata.query.pages[0] ?
                  pagedata.query.pages.map(function(ele){ return {
                    "title": ele.title,
                    "pageid": ele.pageid,
                    "lastrevisedid": ele.lastrevid,
                    "lastreviseddate": ele.revisions[0].timestamp
                  };}) : null ]
                  .filter(function(ele){return ele!=null;}));
      });
    });
  }else if(postdata.updates){
    postdata.updates=postdata.updates.match(/\d/g).join("");
    //returns the latest newest pages up to a certain number
    //Mediawiki limits the output to 500 so there might a few calls before you get all the data you need.
    var continuekey="";
    var data=[];
    var maxmatches=200;
    function getLatestRevision() {
      var url="action=query&list=recentchanges&rclimit="+maxmatches;
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
      downloadJSONfromBakaTsukiMediaWiki(url, function(jsondata){
        var edits=jsondata.query.recentchanges;
        if(jsondata["query-continue"] && jsondata["query-continue"].recentchanges){
          continuekey= jsondata["query-continue"].recentchanges.rccontinue;
        }
        for(var key in edits){
          if (edits[key].type=="new" && data.length<postdata.updates ){
            if(!edits[key].title.match(/^User|^Talk|Registration/i)){
              var obj={};
              obj.title=edits[key].title;
              obj.pageid=edits[key].pageid;
              obj.timestamp=edits[key].timestamp;
              obj.revid=edits[key].revid;
              data.push(obj);           
            }
          }
        }
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

//Use transducers instead of for loops
function seriesLanguageFilterByDownload(req,res){
  var postdata=req.query;
  if(postdata.language && postdata.type && !postdata.type.match(/Original_?novel/i)){
    var titletype=capitalizeFirstLetter(postdata.type.toLowerCase());
    var language =capitalizeFirstLetter(postdata.language.toLowerCase());
    var category =titletype+"_("+language+")";
    downloadJSONfromBakaTsukiMediaWiki("action=query&prop=info|revisions&generator=categorymembers&gcmlimit=500&gcmtype=page&gcmtitle=Category:"+category, function(jsondata){
      res.send({
        "type": titletype,
        "language": language,
        "titles": jsondata.query.pages.map(function(ele){return {
                      "page":ele.title.replace(/ /g,"_"),
                      "title":ele.title,
                      "lastreviseddate": ele.revisions[0].timestamp,
                      "lastrevisedid": ele.lastrevid,
                      "pageid": ele.pageid
                    };
                  })
      });
    })    
  }else if(postdata.language && !postdata.type){
    //Only provide a list of title types for the language
    var language =capitalizeFirstLetter(postdata.language.toLowerCase());
    downloadJSONfromBakaTsukiMediaWiki("action=query&cmlimit=400&list=categorymembers&cmtitle=Category:"+language, 
      function(jsondata){
        res.send({
          "language":language,
          "types": jsondata.query.categorymembers
                    .filter(function(ele){return ele.title.match(/Category/g);})
                    .map(function(ele){return popb(ele.title.replace(/Category:/g,"").split(/ /g)).join("_");})
        });
      })
  }else if(postdata.type && !postdata.type.match(/Original_?novel/i) && !postdata.language){
    //Provide languages available for that type.
    var titletype =capitalizeFirstLetter(postdata.type.toLowerCase());
    downloadJSONfromBakaTsukiMediaWiki("action=query&cmlimit=400&list=categorymembers&cmtitle=Category:"+titletype, function(jsondata){
      res.send({
        "types": titletype,
        "language": jsondata.query.categorymembers
                      .filter(function(ele){return ele.title.match(/Category/g);})
                      .map(function(ele){return ele.title.match(/\((.+)\)/g,"")[0].replace(/[\(\)]/g, "");})
      });
    })
  }else if(postdata.type && postdata.type.match(/Original_?novel/i)){
    //Directly provide all Original Novels available as they are not divided by language.
    downloadJSONfromBakaTsukiMediaWiki("action=query&cmlimit=400&list=categorymembers&cmtitle=Category:Original_novel", function(jsondata){
      res.send({
        "type":"Original novel",
        "titles": jsondata.query.categorymembers.map(function(ele){return {
                    "page":ele.title.replace(/ /g,"_"),
                    "title": ele.title
                  };})
      });
    })
  }
}

function seriesTitleFilterByDownload(req,res){
  var postdata=req.query;

  // Continue only if series title is available.
  if(postdata.title){
    downloadJSONfromBakaTsukiMediaWiki("action=parse&prop=text&page="+postdata.title, function(jsondata){
      var data={};   
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
          data.cover="https://www.baka-tsuki.org"+data.cover;
        }
        
        var synopsiswalk = $(":header").filter(function(){
          return $(this).text().match(/synopsis/i)!=null;
        }).nextUntil($(":header")); 
        var synopsisstring="";
        synopsiswalk.each(function(){  
          if($(this).text()){
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
        $("#toc ul li").each(function(){          
          //Notes that each page format has its own quirks and the program attempts to match all of them
          //console.log($(this).text());
          if($(this).text().match(/[\'\"]+ series|by| story$| stories|miscellaneous|full| Story Arc /i) && $(this).hasClass("toclevel-1")){       
            //Note: This matches any title that remotely looks like a link to the volumes, e.g. Shakugan no Shana
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
            if(seriesdata.books.length>0){
              data.sections.push(seriesdata);
            }
          }          
        })
        //Sometimes the data for authors is hidden in the first paragraph instead
        if(!data.author && $("p").text().match(/\sby\s(.+)\./i)){
          //Search for author name between "by" and a non-character or the word "and"
          var works=$("p").text().match(/\sby\s(.+)\./i)[1].split(/and|with/);
          var authorname=works[0].replace(/^\s+|\s+$/g, '');
          data.author=authorname;
        }
        if(!data.illustrator && $("p").text().match(/\sby\s(.+\.)/i)){
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
                    chapterdata.link="https://www.baka-tsuki.org"+$(this).attr('href');
                  }else{
                    chapterdata.link=$(this).attr('href');
                  }
                  data.sections[serieskey].books[volumekey].chapters.push(chapterdata);
                } 
              });
              //Walk through the following sections for links until the next heading.
              var walker=heading.nextUntil($(":header"));
              var chapterlinks=walker.find("a");
              chapterlinks.each(function(){
                //Remove red links to pages that does not exist too.  
                //Include external links          
                if(!$(this).attr('href').match(/edit|Template/g)){
                  var titletext=$(this).attr('title') ? $(this).attr('title') : $(this).parent().first().text();
                  var chapterdata={};
                  chapterdata.title=titletext;
                  chapterdata.page=$(this).attr('href').replace(/\/project\/index.php\?title\=/g, "");
                  var linktype = $(this).attr('href').match(/^\/project/g)? "internal" : "external";
                  chapterdata.linktype=linktype;
                  if(linktype=="internal"){
                    chapterdata.link="https://www.baka-tsuki.org"+$(this).attr('href');
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
                    coverimgsrc="https://www.baka-tsuki.org"+coverimgsrc;
                  }
                  data.sections[serieskey].books[volumekey].cover=coverimgsrc;
                }
              }else if(imageplacing==2){
                var coverimg=heading.parentsUntil($(":header")).find("img");
                if(coverimg){
                  coverimgsrc=coverimg.attr('src');
                  if (coverimg.attr('src') && coverimg.attr('src').match(/^\/project/g)){
                    coverimgsrc="https://www.baka-tsuki.org"+coverimgsrc;
                  }
                  data.sections[serieskey].books[volumekey].cover=coverimgsrc;
                }
              }else if(imageplacing==1){
                var coverimg=heading.prevUntil($(":header")).find("img");
                if(coverimg){
                  coverimgsrc=coverimg.attr('src');
                  if (coverimg.attr('src') && coverimg.attr('src').match(/^\/project/g)){
                    coverimgsrc="https://www.baka-tsuki.org"+coverimgsrc;
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
                    chapterdata.link="https://www.baka-tsuki.org"+$(this).attr('href');
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
              var re1 = new RegExp("volume.?"+postdata.volumeno.match(/\d+/g)+"$", 'i');
              if(data.sections[serieskey].books[volumekey].title.match(/\w+ ?\d+/gi)[0].match(re1) != null){
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

function rest(arr){
  return arr.slice(1, arr.length);
}
function popb(arr){
  return arr.slice(0, arr.length-1);
}

function stripNumbering(line){
  line=line.replace(/^\s+|\s+$/g, '').split(/ /g);
  return line.slice(1,line.length).join(" ");
}

function downloadJSONfromBakaTsukiMediaWiki(url_params, callback) {
  https.get(encodeURI("https://www.baka-tsuki.org/project/api.php?format=json&"+url_params), function(res) {
    var data = "";
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(JSON.parse(data));
    });
  }).on("error", function() {
    callback(null);
  });
}

Object.defineProperty(Object.prototype, 'map', {
    value: function(f, ctx) {
        ctx = ctx || this;
        var self = this, result = {};
        Object.keys(self).forEach(function(k) {
            result[k] = f.call(ctx, self[k], k, self); 
        });
        return result;
    }
});

module.exports = router;
