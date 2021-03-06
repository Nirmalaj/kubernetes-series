const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const config = require('./config');
const healthCheck = require('express-healthcheck');
const pkg = require('./package');

//-------------------------------------
//
// setup the app
//
//-------------------------------------
const app = express();
app.use(logger('dev'));
app.set('json spaces', 2);
app.set('trust proxy', true);
app.set('case sensitive routing', true);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let healthy = true;
let ready = true;

//-------------------------------------
//
// setup some routes for us to hit and
// other helpful routes when working with kubernetes
//
//-------------------------------------
app.use('/', require('./routes'));
app.use('/unhealthy', function(req, res, next){
    healthy = false;
    res.status(200).json({ healthy });
});
app.use('/healthcheck', healthyIntercept, healthCheck());
app.use('/readiness', function (req, res, next) {
    res.status(200).json({ ready });
});
app.get('/version', function (req, res, next) {
    const version = pkg.version;
    res.status(200).json({ version });
});
process.on('SIGTERM', function () {
    // cleanup environment, this is about to be shut down
    process.exit(0);
});

//-------------------------------------
//
// catch 404 and forward to error handler
//
//-------------------------------------
app.use(function (req, res, next) {
    next(createError(404));
});

function healthyIntercept(req, res, next){
    if(healthy){
        next();
    } else {
        const err = new Error('unhealthy');
        err.code = 500;
        err.status = 500;
        next(err);
    }
}

//-------------------------------------
//
// error handler
//
//-------------------------------------
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    err.response = {
        message: err.message,
        internalCode: err.code
    };
    // render the error page
    res.status(err.status || 500).json(err.response);
});

//-------------------------------------
//
// create server if this is main
//
//-------------------------------------
if (module === require.main) {
    // Start the server
    const server = app.listen(config.get('PORT'), () => {
        const port = server.address().port;
        console.log(`App listening on port ${port}`);
    });
}

module.exports = app;
