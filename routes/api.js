var express = require('express');
var cheerio= require('cheerio');
var https=require('https');
var router = express.Router();

/* New parsing method */
function routeHandler(req,res,route_name,callback){
  var postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect(route_name);
  }else{
    callback(postdata,res);
  }  
}
router.get('/',function(req,res){
  routeHandler(req,res,"/series.html",seriesTitleFilterByDownload);
})

router.get('/category',function(req,res){
  routeHandler(req,res,"/category.html",seriesCategoryFilterByDownload);
})

router.get('/genre',function(req,res){
  routeHandler(req,res,"/genre.html",seriesGenreFilterByDownload);
})

router.get('/time',function(req,res){
  routeHandler(req,res,"/time.html",lastUpdatesTimeByDownload)
})

router.get('/page',function(req,res){
  routeHandler(req,res,"/page.html",pageDownload)
})

function pageDownload(postdata,res){
  if(postdata.title){
    downloadJSONfromBakaTsukiMediaWiki("action=parse&prop=text&page="+postdata.title,function(jsondata){
      if(jsondata.parse && jsondata.parse.text){ 
        var $=cheerio.load(jsondata.parse.text["*"]);
        $("a").each(function(){
          var ele=$(this).attr('href');
          if(ele.match(/^\/project/)){
            $(this).attr('href',"https://www.baka-tsuki.org"+ele);
          }
        })
        $("img").each(function(){
          var ele=$(this).attr('src');
          if(ele.match(/^\/project/)){
            $(this).attr('src',"https://www.baka-tsuki.org"+ele);
          }
        })
        res.send($.html());
      }
    });
  }
}

function seriesGenreFilterByDownload(postdata,res){
  //var postdata=req.query;
  if(postdata.list){ 
    var postlist=postdata.list.split("|").map(function(ele){return capitalizeFirstLetter(ele.replace(/Genre[\s_]?-[\s_]?/i,""));});
    function getAllGenres(genreList,tempdata){
      if(!tempdata) tempdata = {};
      var url = "action=query&prop=info|revisions&generator=categorymembers&gcmlimit=500&gcmtype=page&gcmtitle=Category:Genre_-_";
      if(genreList.length>0){
        url+=last(genreList);
        downloadJSONfromBakaTsukiMediaWiki(url,function(jsondata){
          if(jsondata.query && jsondata.query.pages){
            tempdata=mergeObjects(tempdata,jsondata.query.pages);
          }
          getAllGenres(popb(genreList),tempdata);
        })
      }else{
        //Reorganise the data
        var data=[];
        for(var key in tempdata){
          var ele = tempdata[key];
          data.push({
            "page":ele.title.replace(/ /g,"_"),
            "title":ele.title,
            "lastreviseddate":ele.revisions[0].timestamp,
            "lastrevisedid": ele.lastrevisedid,
            "pageid":ele.pageid
          });
        }
        res.send({
              "genres":postlist,
              "titles":data});
      }       
    }
    //javascript requires this to ensure it is copied not changed
    getAllGenres(postlist);
  }
}

function lastUpdatesTimeByDownload(postdata,res){
  if(postdata.titles||postdata.pageids){
    downloadJSONfromBakaTsukiMediaWiki("action=query&prop=info|revisions&titles="+postdata.titles, function(titledata){
      downloadJSONfromBakaTsukiMediaWiki("action=query&prop=info|revisions&pageids="+postdata.pageids, function(pagedata){
        var data=[];
        if(titledata.query.normalized[0].from!="undefined" && !titledata.query.pages["-1"]){
          for(var ind in titledata.query.pages){
            var ele=titledata.query.pages[ind];
            data.push({
              "title": ele.title,
              "pageid": ele.pageid,
              "lastrevisedid": ele.lastrevid,
              "lastreviseddate": ele.revisions[0].timestamp
            })
          }
        }
        if(!pagedata.query.pages[0]){
          for(var ind in pagedata.query.pages){
            var ele=pagedata.query.pages[ind];
            data.push({
              "title": ele.title,
              "pageid": ele.pageid,
              "lastrevisedid": ele.lastrevid,
              "lastreviseddate": ele.revisions[0].timestamp
            })
          }
        }
        res.send(data);
      });
    });
  }else if(postdata.updates){
    postdata.updates=postdata.updates.match(/\d/g).join("");
    //returns the latest newest pages up to a certain number
    //Mediawiki limits the output to 500 so there might a few calls before you get all the data you need.
    function getLatestRevision(continuekey,maxmatches,data) {
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
        //Here we can't use a map and filter because data.push is exponentially slow 
        //as the pushed items gets bigger.
        for(var key in edits){
          var ele=edits[key];
          if (ele.type=="new" && data.length<postdata.updates && !ele.title.match(/^User|^Talk|Registration/i)){
              data.push({
                "title": ele.title,
                "pageid": ele.pageid,
                "timestamp": ele.timestamp,
                "revid":ele.revid
              }); 
          }
        }
        if(edits.length<maxmatches || data.length>=postdata.updates){          
          res.send(data);
        }else{
          getLatestRevision(continuekey,maxmatches,data);
        }
      })
    }
    //Start the recursive function
    getLatestRevision(null,200,[]);
  }
}

//Use transducers instead of for loops
function seriesCategoryFilterByDownload(postdata,res){
  //console.log(postlist.list, postdata.genres);
  if(!postdata.title && !postdata.list && !postdata.genres && postdata.language && postdata.type && !postdata.type.match(/Original_?novel/i)){
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
        };})
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
  }else if(postdata.title){
    //Get all categories in this titles.
    console.log(postdata.title);
    downloadJSONfromBakaTsukiMediaWiki("action=query&generator=categories&titles="+postdata.title,function(jsondata){
      res.send(jsondata.query.pages.map(function(ele){return ele.title.replace(/Category:/g,"");}));
    })
  }else{
    //Main bulk of the category search
    postlist=[];
    if (postdata.list){
        var postlist=postdata.list.split("|");
    }
    if(postdata.language && postdata.type && !postdata.type.match(/Original_?novel/i)){
      var titletype=capitalizeFirstLetter(postdata.type.toLowerCase());
      var language =capitalizeFirstLetter(postdata.language.toLowerCase());
      postlist.push(titletype+"_("+language+")");
    }else if(postdata.type.match(/Original_?novel/i)){
      postlist.push("Original_novel");
    }
    if(postdata.genres){
      var genresList=postdata.genres.split("|");
      for(var ind in genresList){
        var ele=genresList[ind];
        if(!ele.match(/Genre[\s_]?-[\s_]?/i)) ele="Genre_-_"+capitalizeFirstLetter(ele);
        postlist.push(ele);
      }
    }
    function getAllGenres(genreList,tempdata){
      if(!tempdata) tempdata = {};
      var url = "action=query&prop=info|revisions&generator=categorymembers&gcmlimit=500&gcmtype=page&gcmtitle=Category:";
      if(genreList.length>0){
        url+=last(genreList);
        downloadJSONfromBakaTsukiMediaWiki(url,function(jsondata){
          if(jsondata.query && jsondata.query.pages){
            tempdata=mergeObjects(tempdata,jsondata.query.pages);
          }
          getAllGenres(popb(genreList),tempdata);
        })
      }else{
        //Reorganise the data
        res.send({
              "tags":postlist,
              "titles":tempdata.map(function(ele){return{
                "page":ele.title.replace(/ /g,"_"),
                "title":ele.title,
                "lastreviseddate":ele.revisions[0].timestamp,
                "lastrevisedid": ele.lastrevisedid,
                "pageid":ele.pageid
              };})});
      }      
    }
    //javascript requires this to ensure it is copied not changed
    getAllGenres(postlist);
  }
}

function seriesTitleFilterByDownload(postdata,res){
  // Continue only if series title is available.
  if(postdata.title){
    downloadHTMLfromBakaTsuki(postdata.title, function(jsondata){
      var data={};   
      if(jsondata){
        var $=cheerio.load(jsondata)
        $.html($("#content"));
        //Preload the data for the light novel
        data.title=postdata.title;
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
        var one_off=!$("#toc ul li").text().match(/volume/i)? true: false;
        data.one_off=one_off;
        $("#toc ul li").each(function(){   
          //Notes that each page format has its own quirks and the program attempts to match all of them
          if((($(this).text().match(/[\'\"]+ series|by| story$| stories|miscellaneous|full| Story Arc /i) && 
               !$(this).text().match(/miscellaneous notes/i)) || 
              (one_off && $(this).text().match(new RegExp(data.title, 'i')))) && 
              $(this).hasClass("toclevel-1")) {       
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
            if(seriesdata.books.length>0 || one_off){
              //Problem with one-offs, they do not contain any volumes.
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
                  alternatetext = $(this).first().text().split(" ").length>1 ? $(this).first().text() : $(this).parent().first().text(); 
                  var titletext=$(this).attr('title') ? $(this).attr('title') :alternatetext;
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

            //Special Sugar_Dark Edge Case: Chapters in volume is categorised by other sections.
            //This is only for cases where there is no obvioes order in chapters.
            //I.e. multiple chapter 1's
            //This code should be changed in favour of a depth-2 search for li elements, 
            //but most novels isn't format that way.
            if(data.title.match(/Sugar Dark/i)){
              var holeid="";
              var booklist=data.sections[serieskey].books;
              for (var bookind in booklist){
                for(var chapterind in booklist[bookind].chapters){
                  var ele=booklist[bookind].chapters[chapterind].title;
                  if(ele.match(/^hole/i) && holeid!=ele){
                    holeid=ele;
                  }
                  if(ele.match(/chapter/i)){
                    data.sections[serieskey].books[bookind].chapters[chapterind].title=holeid+":"+ele;
                  }                  
                }
              }
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
              volume_match=data.sections[serieskey].books[volumekey].title.match(/\w+ ?\d+/ig);
              if(volume_match && volume_match[0].match(re1)){
                tempvol.push(data.sections[serieskey].books[volumekey]);
              }
            }
            data.sections[serieskey].books=tempvol;
          }
        }
        if(one_off){
          data.sections.map(function(ele){return ele.renameProperty("books","chapters");});
        }        
        res.send(data); 
      }      
    });
  }
}

//Utility functions
function mergeObjects(obj1, obj2){
  var finalobj={};
  if(Object.keys(obj1).length>0 && Object.keys(obj2).length>0){
    //use anyone object can compare if they have the same key.
    for(var key in obj1){
      if(obj2[key]){
        finalobj[key]=obj2[key];
      }
    }
  }else if(Object.keys(obj1).length<=0 || Object.keys(obj2).length<=0){
    console.log("Error");
    finalobj = Object.keys(obj1).length>0 ? obj1 : obj2 ;
  }
  return finalobj;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function last(arr){
  return arr[arr.length-1];
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
function arrayUnique (a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

function downloadJSONfromBakaTsukiMediaWiki(url_params, callback) {
  https.get(encodeURI("https://www.baka-tsuki.org/project/api.php?format=json&"+url_params), function(res) {
    var data = "";
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(JSON.parse(data));
    });
  }).on("error", function(err) {
    console.log(err);
    callback(null);
  });
}

function downloadHTMLfromBakaTsuki(url_params, callback) {
  https.get(encodeURI("https://www.baka-tsuki.org/project/index.php?title="+url_params), function(res) {
    var data = "";
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(data);
    });
  }).on("error", function(err) {
    console.log(err);
    callback(null);
  });
}

Object.defineProperty(Object.prototype, 'map', {
    value: function(f, ctx) {
        ctx = ctx || this;
        var self = this, result = [];
        Object.keys(self).forEach(function(k) {
            result.push(f.call(ctx, self[k], k, self)); 
        });
        return result;
    }
});
Object.defineProperty( Object.prototype, 'renameProperty', {
        writable : false, // Cannot alter this property
        enumerable : false, // Will not show up in a for-in loop.
        configurable : false, // Cannot be deleted via the delete operator
        value : function (oldName, newName) {
            // Do nothing if the names are the same
            if (oldName == newName) {
                return this;
            }
            // Check for the old property name to 
            // avoid a ReferenceError in strict mode.
            if (this.hasOwnProperty(oldName)) {
                this[newName] = this[oldName];
                delete this[oldName];
            }
            return this;
        }   }
);

module.exports = router;
