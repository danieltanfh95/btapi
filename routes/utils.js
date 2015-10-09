var https=require('https');
//Utility functions
utils={};

utils.mergeObjects=function(obj1, obj2){
  var finalobj={};
  if(Object.keys(obj1).length>0 && Object.keys(obj2).length>0){
    //use anyone object can compare if they have the same key.
    for(var key in obj1){
      if(obj2[key]){
        finalobj[key]=obj2[key];
      }
    }
  }else if(Object.keys(obj1).length==0 || Object.keys(obj2).length==0){
    console.log("Error");
    finalobj = Object.keys(obj1).length==0 ? obj2 : obj1 ; 
  }
  return finalobj;
}

utils.capitalizeFirstLetter=function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

utils.last=function(arr){
  return arr[arr.length-1];
}

utils.rest=function(arr){
  return arr.slice(1, arr.length);
}
utils.popb=function(arr){
  return arr.slice(0, arr.length-1);
}

utils.stripNumbering=function(line){
  return utils.rest(line.replace(/^\s+|\s+$/g, '').split(/ /g)).join(" ");
}
utils.arrayUnique =function(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

utils.downloadJSONfromBakaTsukiMediaWiki=function(url_params, callback) {
  https.get(encodeURI("https://www.baka-tsuki.org/project/api.php?format=json&"+url_params), function(res) {
    var data = "";
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(JSON.parse(data));
    });
  }).on("error", function(err) {
    callback(null);
  });
}

utils.downloadHTMLfromBakaTsuki=function(url_params, callback) {
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
module.exports=utils;