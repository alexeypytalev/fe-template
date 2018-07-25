const gulp = require('gulp');
const watch = require('gulp-watch');
const plumber = require('gulp-plumber');
const connect = require('gulp-connect');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const spritesmith = require('gulp.spritesmith');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const del = require('del');
const runSequence = require('run-sequence');
const notify = require("gulp-notify");
const gulpIf = require('gulp-if');
const newer = require('gulp-newer');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const named = require('vinyl-named');
const gcmq = require('gulp-group-css-media-queries');

const path = {
    dist: {
        root: 'public/',
        js: {
            app: 'public/js/',
            external: 'public/js/external/'
        },
        style: 'public/style/',
        sprite: 'public/img/css/sprite/',
        img: {
            html: 'public/img/html/',
            css: 'public/img/css/'
        },
        font: 'public/font/'
    },
    src: {
        html: 'src/html/',
        js: {
            app: 'src/js/',
            external: 'src/js/external/'
        },
        style: 'src/style/',
        sprite: 'src/img/css/sprite/',
        img: {
            html: 'src/img/html/',
            css: 'src/img/css/'
        },
        font: 'src/font/'
    }
};

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

gulp.task('server', () => {
    connect.server({
        root: [path.dist.root],
        livereload: true
    });
});

gulp.task('html', () => {
    gulp.src(path.src.html + '*.pug')
        .pipe(plumber({
            errorHandler: notify.onError((err) => {
                return {
                    title: 'PUG',
                    message: err.message
                }
            })
        }))
        .pipe(pug({
            pretty: true
        }))
        .pipe(gulp.dest(path.dist.root))
        .pipe(connect.reload());
});

gulp.task('css', () => {
    gulp.src(path.src.style + '**/*.scss')
        .pipe(plumber({
            errorHandler: notify.onError((err) => {
                return {
                    title: 'SCSS',
                    message: err.message
                }
            })
        }))
        .pipe(gulpIf(isDev, sourcemaps.init()))
        .pipe(sass({
            outputStyle: 'expanded'
        }))
        .pipe(autoprefixer({
            browsers: ['last 4 versions'],
            cascade: false
        }))
        .pipe(gcmq())
        .pipe(gulpIf(isDev, sourcemaps.write()))
        .pipe(gulp.dest(path.dist.style))
        .pipe(connect.reload());
});

gulp.task('js:app', () => {
    gulp.src(path.src.js.app + '*.js')
        .pipe(plumber({
            errorHandler: notify.onError((err) => {
                return {
                    title: 'JS',
                    message: err.message
                }
            })
        }))
        .pipe(named())
        .pipe(webpackStream({
            devtool: isDev ? 'inline-source-map' : false,
            output: {
                path: __dirname + path.dist.js.app,
                publicPath: '/js/',
                filename: '[name].js'
            },
            module: {
                rules: [{
                    test: /\.(js)$/,
                    exclude: /(node_modules)/,
                    loader: 'babel-loader',
                    query: {
                        presets: ['env']
                    }
                }]
            }
        }))
        .pipe(gulp.dest(path.dist.js.app))
        .pipe(connect.reload());
});

gulp.task('js:external', () => {
    gulp.src(path.src.js.external + '*.js')
        .pipe(newer(path.dist.js.external))
        .pipe(gulp.dest(path.dist.js.external))
        .pipe(connect.reload());
});

gulp.task('js', ['js:app', 'js:external']);

gulp.task('sprite', () => {
    var spriteData = gulp.src(path.src.sprite + '*.png')
        .pipe(plumber())
        .pipe(spritesmith({
            retinaSrcFilter: [path.src.sprite + '*@2x.png'],
            retinaImgPath: '../img/css/spritesheet@2x.png',
            retinaImgName: 'spritesheet@2x.png',
            imgName: 'spritesheet.png',
            imgPath: '../img/css/spritesheet.png',
            cssName: '_spritesmith.scss',
            padding: 3,
            cssVarMap: function (sprite) {
                sprite.name = 's-' + sprite.name;
            }
    }));

    spriteData.img.pipe(gulp.dest(path.dist.img.css)).pipe(connect.reload());
    spriteData.css.pipe(gulp.dest(path.src.style + 'vendors/gulp-spritesmith/')).pipe(connect.reload());
});

gulp.task('img:html', () => {
    gulp.src(path.src.img.html + '**')
        .pipe(newer(path.dist.img.html))
        .pipe(gulp.dest(path.dist.img.html))
        .pipe(connect.reload());
});

gulp.task('img:css', () => {
    gulp.src(path.src.img.css + '*.*')
        .pipe(newer(path.dist.img.css))
        .pipe(gulp.dest(path.dist.img.css))
        .pipe(connect.reload());
});

gulp.task('img', ['img:html', 'img:css']);

gulp.task('font', () => {
    gulp.src(path.src.font + '**/*.*')
        .pipe(gulp.dest(path.dist.font))
        .pipe(newer(path.dist.font))
        .pipe(connect.reload());
});

gulp.task('build', (cb) => {
    runSequence(['html', 'font', 'js', 'img'], 'sprite', 'css', cb);
});

gulp.task('watch', () => {
    watch([path.src.html + '**/*.pug'], () => {
        gulp.start(['html']);
    });

    watch([path.src.style + '**/*.scss'], () => {
        gulp.start(['css']);
    });

    watch([path.src.js.app + '**/*.js', path.src.js.external + '**/*.js'], () => {
        gulp.start(['js']);
    });

    watch([path.src.img.html + '**', path.src.img.css + '*.*'], () => {
        gulp.start(['img']);
    });

    watch([path.src.font + '**/*.*'], () => {
        gulp.start(['font']);
    });

    watch([path.src.sprite + '*.png'], () => {
        gulp.start(['sprite']);
    });
});

gulp.task('clean', (cb) => {
    del(path.dist.root, cb);
});

gulp.task('default', ['build', 'watch', 'server']);