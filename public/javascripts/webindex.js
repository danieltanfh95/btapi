$(document).ready(function(){
  preparegenrebuttons();
})

function preparegenrebuttons(){
  $.get( "https://baka-tsuki-api.herokuapp.com/api/category?category=genre", function( data ) {
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
      $(".card.loading").removeClass("hide");

      $.get("https://baka-tsuki-api.herokuapp.com/api/category?genres="+html,function(data){
        var html=data.titles.map(function(ele){
          return '<a href="https://baka-tsuki.org/project/index.php?title='+ele.page+'"><div class="col-md-4 pane"><div class="pane-img"><i class="fa fa-circle-o-notch fa-spin"></i></div>'+ele.title+'</div></a>';
        });
        //data is json data.
        $("#novels").html(html);
        $(".card.loading").addClass("hide");
        $(".card.success").removeClass("hide").click(function(){$(this).addClass("hide");});
        $(".pane .pane-img").each(function(){
          console.log($(this).parent().text());
          $.get("https://baka-tsuki-api.herokuapp.com/api?title="+$(this).parent().text(), function(data){
            console.log(data.cover);
          })
        })
      })
    })
    
  });
}