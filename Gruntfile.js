module.exports = function (grunt) {
  var dev  = true;
  var port = process.env.PORT || 3000;

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    // Clean the build directory before each build
    clean: ['build/'],

    // Copy the files from public into the build directory
    copy: {
      build: {
        files: [
          { expand: true, cwd: 'public', src: ['**/*.html'], dest: 'build/' }
        ]
      }
    },

    // Running browserify as the build/dependency management system
    browserify: {
      application: {
        src: ['public/scripts/index.js'],
        dest: 'build/scripts/bundle.js',
        options: {
          shim: {
            'backbone.native': {
              path: __dirname + '/vendor/backbone.native.js',
              exports: 'Backbone',
              depends: {
                'backbone': 'Backbone'
              }
            }
          },
          debug: dev,
          transform: dev ? ['brfs'] : ['brfs', 'uglifyify']
        }
      },
      embed: {
        src: ['public/scripts/embed.js'],
        dest: 'build/scripts/embed.js',
        options: {
          // debug: dev, // Currently broken when used with `standalone`
          transform: dev ? [] : ['uglifyify'],
          standalone: 'Notebook'
        }
      }
    },

    // Using less to compile the CSS output
    stylus: {
      compile: {
        files: {
          'build/styles/main.css': 'public/styles/index.styl'
        },
        options: {
          'include css': true,
          import: [
            'includes/colors.styl'
          ]
        }
      }
    },

    // Watch files and directories and compile on changes
    watch: {
      scripts: {
        files: ['public/**/*.{js,hbs}'],
        tasks: ['browserify'],
        options: {
          livereload: true
        }
      },
      styles: {
        files: ['public/**/*.styl'],
        tasks: ['stylus'],
        options: {
          livereload: true
        }
      }
    }
  });


  grunt.registerTask('production', function () { dev = false; });

  grunt.registerTask('compile', ['clean', 'copy', 'browserify', 'stylus'])
  grunt.registerTask('build',   ['production', 'compile']);
  grunt.registerTask('default', ['compile', 'watch']);
};
