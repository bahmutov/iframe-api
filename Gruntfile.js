/*global module:false*/
module.exports = function (grunt) {
  var sourceFiles = ['src/*.js', '!src/md5.js', 'utils/log-to.js', '!src/*-spec.js'];
  var testFiles = ['src/*-spec.js'];

  var globalName = 'iframeApi';

  grunt.initConfig({

    jshint: {
      all: sourceFiles,
      test: testFiles,
      options: {
        jshintrc: 'utils/.jshintrc',
        reporter: require('jshint-summary')
      }
    },

    eslint: {
      target: sourceFiles,
      options: {
        config: 'utils/eslint.json',
        rulesdir: ['./node_modules/eslint-rules']
      }
    },

    jscs: {
      src: sourceFiles,
      options: {
        config: 'utils/jscs.json'
      }
    },

    'clean-console': {
      test: {
        options: {
          url: 'index.html',
          timeout: 5 // seconds to wait for any errors
        }
      }
    },

    'gh-pages': {
      options: {
        base: '.'
      },
      src: [
        'README.md',
        'dist/*.js',
        'index.html',
        'bower_components/es5-shim/es5-shim.js',
        'test/page.html',
        'test/*.js',
        'utils/log-to.js'
      ]
    },

    browserify: {
      iframe: {
        options: {
          browserifyOptions: {
            standalone: globalName
          }
        },
        src: ['src/iframe-api.js'],
        dest: 'dist/iframe-api.js'
      },
      external: {
        options: {
          browserifyOptions: {
            standalone: globalName
          }
        },
        src: ['src/external-api.js'],
        dest: 'dist/external-api.js'
      }
    },

    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: testFiles
      }
    }
  });

  var plugins = module.require('matchdep').filterDev('grunt-*');
  plugins.forEach(grunt.loadNpmTasks);

  grunt.registerTask('lint', ['jshint', 'eslint', 'jscs']);
  grunt.registerTask('test', ['mochaTest', 'clean-console']);
  grunt.registerTask('default', ['deps-ok', 'nice-package', 'lint', 'sync', 'browserify', 'test']);
};
