$(document).ready(function(){
//    $("#save_button").click(function(e){
//        var page_to_send = {
//            '_id':page['_id'],
//            'article':editorHTML.getValue()
//        };
//        now.save_page(page_to_send);
//    });
//
//    $("#update_title").click(function(e){
//        var page_to_send = {
//            '_id':page['_id'],
//            'title':$("#page_title").val()
//        };
//        now.save_page(page_to_send);
//    });

    $("#create_app").click(function(e){
        //создаю новое приложение прицепленное к странице
        var name = $("#create_app_name").val();
        now.create_app(
            {
                page_id:page._id
                ,   app_name:name
            });

    });

    now.app_was_created = function(app){
        console.log(app);
        ich.addTemplate(app.templates[0].name,app.templates[0].template);
        $("#textAreaApplication").html(app.code);
        $("#textAreaTemplate").html(app.templates[0].template);
    };
});
now.ready(function () {
    console.log("now is ready");
});