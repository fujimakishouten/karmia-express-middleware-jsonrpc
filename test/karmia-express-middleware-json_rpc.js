/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const http = require('http'),
    body_parser = require('body-parser'),
    expect = require('expect.js'),
    karmia_context = require('karmia-context'),
    express = require('express'),
    karmia_express_middleware_jsonrpc = require('../'),
    app = express(),
    jsonrpc = karmia_express_middleware_jsonrpc(),
    request = (parameters) => {
        const body = JSON.stringify(parameters),
            options = {
                hostname: 'localhost',
                port: 30000,
                method: 'POST',
                path: '/',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Content-Length': Buffer.byteLength(body)
                }
        };

        return new Promise(function (resolve) {
            const request = http.request(options, (response) => {
                response.setEncoding('UTF-8');
                response.data = '';

                response.on('data', (chunk) => {
                    response.data = response.data + chunk;
                });

                response.on('end', function () {
                    resolve((response.data) ? JSON.parse(response.data) : response.data);
                });
            });

            request.write(body);
            request.end();
        });
    };


// RPC
jsonrpc.methods.set('success', function () {
    return Promise.resolve({success: true});
});
jsonrpc.methods.set('error', function () {
    const error = new Error('TEST_EXCEPTION');
    error.code = 500;

    return Promise.reject(error);
});

// Middleware
app.use(function (req, res, next) {
    req.context = karmia_context();

    next();
});
app.use(body_parser.json());
app.use(jsonrpc.middleware());
app.use(function (req, res) {
    if (204 === req.code) {
        res.status(req.code).end();
    } else {
        res.header('Content-Type', 'application/json; UTF-8');
        res.status(res.code).end(JSON.stringify(res.body));
    }
});

// Listen
app.listen(30000);



describe('karmia-express-rpc-rpc', function () {
    describe('middleware', function () {
        it('Should get middleware function', function () {
            expect(jsonrpc.middleware).to.be.a(Function);
        });
    });

    describe('RPC', function () {
        describe('RPC request', function () {
            it('success', function (done) {
                const data = {method: 'success', id: 'success'};
                request(data).then(function (result) {
                    expect(result.jsonrpc).to.be('2.0');
                    expect(result.result).to.eql({success: true});
                    expect(result.id).to.eql(data.id);

                    done();
                });
            });

            it('fail', function (done) {
                const data = {method: 'error', id: 'error'};
                request(data).then(function (result) {
                    expect(result.jsonrpc).to.be('2.0');
                    expect(result.error.code).to.be(500);
                    expect(result.error.message).to.be('TEST_EXCEPTION');
                    expect(result.id).to.be(data.id);

                    done();
                });
            });
        });

        describe('Notification request', function () {
            it('success', function (done) {
                const data = {method: 'success'};
                request(data).then(function (result) {
                    expect(result).to.be('');

                    done();
                });
            });

            it('fail', function (done) {
                const data = {method: 'error'};
                request(data).then(function (result) {
                    expect(result).to.be('');

                    done();
                });
            });
        });

        it('Batch request', function (done) {
            const data = [
                {method: 'success', id: 'success'},
                {method: 'error', id: 'error'}
            ];
            request(data).then(function (result) {
                result.forEach(function (value, index) {
                    expect(result[index].jsonrpc).to.be('2.0');
                    expect(result[index].id).to.be(data[index].id);
                });

                expect(result[0].result).to.eql({success: true});
                expect(result[1].error.code).to.be(500);
                expect(result[1].error.message).to.be('TEST_EXCEPTION');

                done();
            });
        });
    });
});


/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */
