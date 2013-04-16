$(document).ready(function(){
    $("#create-page-button").click(function () {
        $('#create-page').modal('hide');
        $("#create-page-form").submit();
    });

    $("#delete-page-button").click(function (){
        $.get("/wiki/"+page['_id']+"/remove",function(status){
           document.location = "/home";
        });
    });
});