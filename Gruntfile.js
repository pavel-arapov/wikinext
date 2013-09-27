module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner: '/* <%= pkg.name %>\n' +
                '* <%= pkg.homepage %> \n' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %>' +
                ' <%= pkg.author.name %>\n' +
                '* Licensed under AGPLv3. */'
        },
        jshint: {
            files: ['Gruntfile.js', 'public/js/*.js'],
            options: {
                // options here to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true
                }
            }
        },
        concat: {
            js: {
                src: ['<banner>',
                    'public/js/jquery.min.js',
                    'public/js/jquery.validate.min.js',
                    'public/js/ICanHaz.min.js',
                    'public/js/jsdeferred.js',
                    'public/js/bootstrap.min.js',
                    'public/js/underscore-min.js',
                    'public/js/wikinext.helper.js',
                    'public/js/wikinext.main.js',
                    'public/js/wikinext.register.js',
                    'public/js/jslint.js'],
                dest: 'public/js/release/<%= pkg.name %>.js'
            },
            css: {
                src: ['<banner>',
                    'public/css/dev/treeview.css',
                    'public/css/dev/docs.css',
                    'public/css/dev/bootstrap.min.css',
                    'public/css/dev/bootstrap-responsive.min.css',
                    'public/css/dev/font-awesome.min.css',
                    'public/css/dev/prettify.css'],
                dest: 'public/css/release/<%= pkg.name %>.css'
            }
        },
        clean: [
            'public/js/release/*',
            'public/css/release/*'
        ],
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'public/js/release/<%= pkg.name %>.js',
                dest: 'public/js/release/<%= pkg.name %>.min.js'
            }
        },
        cssmin: {
            css: {
                src: 'public/css/release/<%= pkg.name %>.css',
                dest: 'public/css/release/<%= pkg.name %>.min.css'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    // Default task(s).
    grunt.registerTask('default', ['clean', 'concat', 'uglify', 'cssmin']);

    grunt.registerTask('test', ['jshint', 'qunit']);

};