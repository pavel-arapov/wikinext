$(document).ready(function(){

    wikinextHelper.init().next(function(){
        if (typeof document.wikinextReady == 'function'){
            document.wikinextReady();
        }
    });

    $("#create-page-button").click(function () {
        $('#create-page').modal('hide');
//        $("#create-page-form").submit();
        wikinextHelper.createPage($('#page_name').val(),$('#parent').val()).next(function(data){
            window.location = "/wiki/"+data['pageid'];
        });
    });

    $("#delete-page-button").click(function (){
        $.get("/wiki/"+page['_id']+"/remove",function(status){
           document.location = "/home";
        });
    });

    $("#goto").click(function () {
        // invoking select page dialog
        wikinextHelper.selectPageDialog(function (data) {
            // go to another page
            location.href = '/wiki/'+data['id'];
        });
        return false;
    });
});