var express = require('express');
var novels=require('./novels');
var router = express.Router();

function routeHandler(req,res,route_name,callback){
  postdata=req.query;
  if(Object.keys(postdata).length<1){
    res.redirect(route_name);
  }else{
    //Allow anyone to access the data, can be set to specific domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    try{      
      callback(postdata,res);
    }catch(err){
      res.send({"error":err});
    }
  }  
}

router.get('/',function(req,res){
  routeHandler(req,res,"/series.html",novels.seriesTitleFilterByDownload);
})

router.get('/category',function(req,res){
  routeHandler(req,res,"/category.html",novels.seriesCategoryFilterByDownload);
})

router.get('/genre',function(req,res){
  routeHandler(req,res,"/genre.html",novels.seriesGenreFilterByDownload);
})

router.get('/time',function(req,res){
  routeHandler(req,res,"/time.html",novels.lastUpdatesTimeByDownload)
})

router.get('/page',function(req,res){
  routeHandler(req,res,"/page.html",novels.pageDownload)
})



module.exports = router;
