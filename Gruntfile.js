module.exports = function(grunt) {
	
	var srcFiles = [
		'src/chip.coffee',
		'src/utils.coffee',
		'src/routing.coffee',
		'src/observer.coffee',
		'src/controller.coffee',
		'src/app.coffee',
		'src/binding.coffee',
		'src/filter.coffee',
		'src/bindings.coffee',
		'src/filters.coffee',
		'src/equality.coffee'
	];
	
	var libFiles = [
		'lib/es5.js'
	];
	
	
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		coffee: {
			compile: {
				files: {
					'build/chip.js': 'build/chip.coffee'
				}
			}
		},
		concat: {
			src: {
				src: srcFiles,
				dest: 'build/chip.coffee'
			},
			dist: {
				src: libFiles.concat('build/chip.js'),
				dest: 'dist/chip.js'
			}
		},
		uglify: {
			build: {
				src: 'dist/chip.js',
				dest: 'dist/chip.min.js'
			}
		},
		clean: [ 'build' ],
		docco: {
			src: {
				src: srcFiles,
				options: {
					output: 'docs'
				}
			}
		},
		watch: {
			dist: {
				files: [ 'src/*.coffee', 'lib/*.js' ],
				tasks: [ 'dist' ],
				options: {
					atBegin: true,
					spawn: false
				}
			},
			docs: {
				files: [ 'src/*.coffee' ],
				tasks: [ 'docs' ],
				options: {
					atBegin: true,
					spawn: false
				}
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-coffee');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-docco2');
	grunt.loadNpmTasks('grunt-contrib-watch');
	
	// Default task(s).
	grunt.registerTask('default', [ 'dist' ]);
	grunt.registerTask('dist', [ 'concat:src', 'coffee', 'concat:dist', 'uglify', 'clean', 'docs' ]);
	grunt.registerTask('docs', [ 'docco', 'clean' ]);

};
