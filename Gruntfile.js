var dev  = process.env.NODE_ENV !== 'production';
var port = process.env.PORT || 3000;

module.exports = function (grunt) {
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

    shell: {
      'mocha-phantomjs': {
        command: './node_modules/.bin/mocha-phantomjs ./test/index.html',
        options: {
          stdout: true,
          stderr: true,
          failOnError: true
        }
      },
      'jshint': {
        command: './node_modules/.bin/jshint public/scripts routes app.js',
        options: {
          stdout: true,
          stderr: true,
          failOnError: true
        }
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
          transform: dev ? ['envify', 'brfs'] : ['envify', 'brfs', 'uglifyify']
        }
      },
      embed: {
        src: ['public/scripts/embed.js'],
        dest: 'build/scripts/embed.js',
        options: {
          // debug: dev, // Currently broken when used with `standalone`
          transform: dev ? ['envify'] : ['envify', 'uglifyify'],
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

  grunt.registerTask('build',   ['clean', 'copy', 'browserify', 'stylus']);
  grunt.registerTask('check',   ['shell:jshint', 'shell:mocha-phantomjs']);
  grunt.registerTask('default', ['build', 'watch']);
};
