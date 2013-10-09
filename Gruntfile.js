module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		coffee: {
			compile: {
				options: {
					bare: true
				},
				files: {
					'build/jquery-bindTo.js': 'src/jquery-bindTo.coffee',
					'build/chip.js': 'src/chip.coffee',
					'build/filters.js': 'src/filters.coffee'
				}
			}
		},
		concat: {
			dist: {
				src: ['lib/observe.js', 'lib/path.js', 'build/filters.js', 'build/jquery-bindTo.js', 'build/chip.js'],
				dest: 'dist/<%= pkg.name %>.js'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 'dist/<%= pkg.name %>.js',
				dest: 'dist/<%= pkg.name %>.min.js'
			}
		},
		clean: [ 'build' ],
		watch: {
			scripts: {
				files: [ 'src/**/*.coffee', 'lib/**/*.js' ],
				tasks: [ 'coffee', 'concat', 'uglify', 'clean' ],
				options: {
					spawn: false
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-coffee');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-watch');

	// Default task(s).
	grunt.registerTask('default', [ 'coffee', 'concat', 'uglify', 'clean' ]);

};
