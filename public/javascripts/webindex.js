$(document).ready(function(){
  preparegenrebuttons();
})

function preparegenrebuttons(){
  $.get( "/api/category?category=genre", function( data ) {
    $("#genre-buttons").html(data.map(function(ele){
      return '<div class="btn btn-danger genrebutton">'+ele+'</div';
    }));
    $("#genre-buttons").on('click',function(e){    
      var ele = $(e.target);  

      if(ele.hasClass("genrebutton") && ele.hasClass("btn-danger")){
        ele.removeClass("btn-danger");
        ele.addClass("btn-success");
      }else if(ele.hasClass("genrebutton") && ele.hasClass("btn-success")){
        ele.removeClass("btn-success");
        ele.addClass("btn-danger");
      }

      var html=[];
      $(".genrebutton.btn-success").each(function(){
        html.push($(this).text());
      })
      html=html.join("|");
      $(".card.success").addClass("hide");
      $(".card.loading").addClass("hide");
      console.log(html);
      if(html!=""){
        $(".card.loading").removeClass("hide");
        $.get("/api/category?genres="+html,function(data){
          var html="";
          html=data.titles.map(function(ele){
            return '<a href="https://baka-tsuki.org/project/index.php?title='+ele.page+'"><div class="col-md-6 pane">'+ele.title+'</div></a>';
          });
          //data is json data.
          if(html==""){
            html="No novel found that matches that criteria."
          }
          $("#novels").html(html);
          $(".card.loading").addClass("hide");
          $(".card.success").removeClass("hide").click(function(){$(this).addClass("hide");});
          function getCoverImages(titlelist,tempdata){
            if(tempdata==undefined) tempdata={};
            if(titlelist.length>0){             
              $.get("/api?title="+titlelist[0],function(json){
                console.log(json.cover);
                tempdata[titlelist[0]]=titlelist[0];
                getCoverImages(rest(titlelist),tempdata);
              })              
            }else{
              console.log(tempdata);
            }
          }
          getCoverImages(data.titles.map(function(ele){return ele.page;}));
        })
      }else{
        $("#novels").html("");
      }
    })
    
  });
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