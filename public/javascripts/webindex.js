$(document).ready(function(){
  $.get( "https://baka-tsuki-api.herokuapp.com/api/category?category=genre", function( data ) {
    console.log( data );
  });
})