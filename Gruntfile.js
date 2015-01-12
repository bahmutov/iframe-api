/*global module:false*/
module.exports = function (grunt) {
  var sourceFiles = ['src/*.js', '!src/md5.js'];

  grunt.initConfig({

    jshint: {
      all: sourceFiles,
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-summary')
      }
    },

    eslint: {
      target: sourceFiles,
      options: {
        config: 'eslint.json',
        rulesdir: ['./node_modules/eslint-rules']
      }
    },

    jscs: {
      src: sourceFiles,
      options: {
        config: 'jscs.json'
      }
    },

    'gh-pages': {
      options: {
        base: '.'
      },
      src: [
        'README.md',
        'src/*.js',
        'index.html',
        'test/page.html',
        'test/*.js'
      ]
    }
  });

  var plugins = module.require('matchdep').filterDev('grunt-*');
  plugins.forEach(grunt.loadNpmTasks);

  grunt.registerTask('lint', ['jshint', 'eslint', 'jscs']);
  grunt.registerTask('default', ['deps-ok', 'nice-package', 'lint']);
};
