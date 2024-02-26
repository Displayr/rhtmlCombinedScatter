const gulp = require('gulp')
const rhtmlBuildUtils = require('rhtmlBuildUtils')

// Temporarily skipping makeDocs because circle CI does not install R
gulp.task('makeDocs', gulp.series(function (done) {
  console.log('skipping makeDocs')
  done()
}))

const dontRegisterTheseTasks = [ 'makeDocs' ]
rhtmlBuildUtils.registerGulpTasks({ gulp, exclusions: dontRegisterTheseTasks })
