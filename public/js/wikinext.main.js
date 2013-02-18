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

//    $("#create_app").click(function(e){
//        //создаю новое приложение прицепленное к странице
//        var name = $("#create_app_name").val();
//        now.create_app(
//            {
//                page_id:page._id
//                ,   app_name:name
//            });
//
//    });

    $("#create-page-button").click(function () {
        $('#create-page').modal('hide');
        $("#create-page-form").submit();
    });

//    now.app_was_created = function(app){
//        console.log(app);
//        ich.addTemplate(app.templates[0].name,app.templates[0].template);
//        $("#textAreaApplication").html(app.code);
//        $("#textAreaTemplate").html(app.templates[0].template);
//    };

    //macros

    function updateContent() {
        $("body").find('[data-wikinext]').each(function(){

            var dom_element = this;
            //all items for macros replace/content augmentation
            //content (find all headers and construct anchors before them and list with links to it
            var ul = null;
            var lasth1 = null;
            var lasth1ul = null;
            var lasth2 = null;
            var lasth2ul = null;

            $("h1, h2, h3").each(function() {

                switch (this.tagName.toLowerCase()) {
                    case "h1":
                        if (!ul) {
                            ul = $("<ul>");
                        }
                        lasth1 = $("<li>").html($(this).html()).appendTo(ul);
                        break;
                    case "h2":
                        if (!lasth1) {
                            // Deal with invalid condition, h2 with no h1 before it
                        }
                        else {
                            if (!lasth1ul) {
                                lasth1ul = $("<ul>").appendTo(lasth1);
                            }
                            lasth2 = $("<li>").html($(this).html()).appendTo(lasth1ul);
                        }
                        break;
                    case "h3":
                        if (!lasth2) {
                            // Deal with invalid condition, h3 with no h2 before it
                        }
                        else {
                            if (!lasth2ul) {
                                lasth2ul = $("<ul>").appendTo(lasth2);
                            }
                            $("<li>").html($(this).html()).appendTo(lasth2ul);
                        }
                        break;
                }

            });
            if (ul) {
                $(dom_element).append(ul);
            }
        });
    }

    // start wiki
    var data = launch_wiki_script.construct();
    var article = ich.article_template(data);
    $("#article_show").append(article);
    launch_wiki_script.afterConstruct();
    updateContent();
});
now.ready(function () {
//    console.log("now is ready");
});