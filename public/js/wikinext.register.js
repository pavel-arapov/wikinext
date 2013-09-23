$(document).ready(function() {

    $("#signUpForm").validate({
        rules: {
            name: {
                minlength: 4,
                required: true
            },
            email: {
                required: true,
                email: true,
                remote: {
                    url: "/check_email",
                    type: "POST"
                }
            },
            password: {
                minlength: 6,
                required: true
            },
            password_verify: {
                minlength: 6,
                required: true,
                equalTo: "#singUpPassword"
            },
            terms: {
                required: true
            }
        },
        messages: {
            name: {
                required: " "
            },
            password: {
                required: " "
            },
            password_verify: {
                required: " ",
                equalTo: "Please enter the same password as above"
            },
            email: {
                required: " ",
                email: "Please enter a valid email address, example: you@yourdomain.com",
                remote: jQuery.validator.format("{0} is already taken, please enter a different address.")
            },
            terms: {
                required: " "
            }
        },
//            debug:true,
        highlight: function(element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function(element) {
            element.addClass('valid').closest('.control-group').removeClass('error').addClass('success');
        },
        submitHandler: function(form) {
            form.submit();
        }
    });

    $("#signInForm").validate({
        rules: {
            email: {
                required: true,
                email: true
            },
            password: {
                minlength: 6,
                required: true
            }
        },
        messages: {
            password: {
                required: " "
            },
            email: {
                required: " ",
                email: "Please enter an email address, example: you@yourdomain.com"
            }
        },
//            debug:true,
        highlight: function(element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function(element) {
            element.addClass('valid').closest('.control-group').removeClass('error').addClass('success');
        },
        submitHandler: function(form) {
            form.submit();
        }
    });
});