/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Import modules
import http = require("http");
import BodyParser = require("body-parser");
import Express = require("express");
import KarmiaContext = require("karmia-context");
import KarmiaExpressMiddlewareJSONRPC = require('../');


// Declaration
declare interface Parameters {
    [index: string]: any
}

declare class HTTPResponse extends http.IncomingMessage {
    data?: string;
}

declare class JSONRPCError extends Error {
    code?: number;
    data?: any;
}



// Variables
let server: http.Server;
const expect = require("expect.js");
const app = Express();
const jsonrpc = new KarmiaExpressMiddlewareJSONRPC();
const request = (parameters: Parameters): Promise<any> => {
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
        const request = http.request(options, (response: HTTPResponse) => {
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
    const error = new Error('TEST_EXCEPTION') as JSONRPCError;
    error.code = 500;

    return Promise.reject(error);
});
jsonrpc.methods.set('badRequest', function () {
    return Promise.reject(new Error('Bad Request'));
});
jsonrpc.methods.set('internalServerError', function () {
    return Promise.reject(new Error('Internal Server Error'));
});
jsonrpc.methods.set('400', function () {
    const error = new Error() as JSONRPCError;
    error.code = 400;

    return Promise.reject(error);
});
jsonrpc.methods.set('500', function () {
    const error = new Error() as JSONRPCError;
    error.code = 500;

    return Promise.reject(error);
});


// Middleware
app.use(function (req?: Parameters, res?: Parameters, next?: Function) {
    req.context = new KarmiaContext();

    next();
});
app.use(BodyParser.json());
app.use(jsonrpc.middleware());
app.use(function (req: Parameters, res: Parameters) {
    if (204 === req.code) {
        res.status(req.code).end();
    } else {
        res.header('Content-Type', 'application/json; UTF-8');
        res.status(res.code).end(JSON.stringify(res.body));
    }
});


// Before
before(function () {
    server = app.listen(30000);
});

// After
after(function () {
    server.close();
});


describe('karmia-express-rpc-rpc', function () {
    describe('middleware', function () {
        it('Should get middleware function', function () {
            expect(jsonrpc.middleware).to.be.a(Function);
        });
    });

    describe('RPC', function () {
        describe('RPC request', function () {
            it('success', function (done) {
                const data = {jsonrpc: '2.0', method: 'success', id: 'success'};
                request(data).then(function (result) {
                    expect(result.jsonrpc).to.be('2.0');
                    expect(result.result).to.eql({success: true});
                    expect(result.id).to.eql(data.id);

                    done();
                });
            });

            it('fail', function (done) {
                const data = {jsonrpc: '2.0', method: 'error', id: 'error'};
                request(data).then(function (result) {
                    expect(result.jsonrpc).to.be('2.0');
                    expect(result.error.code).to.be(500);
                    expect(result.error.message).to.be('TEST_EXCEPTION');
                    expect(result.id).to.be(data.id);

                    done();
                });
            });

            it('ID is empty', function (done) {
                const data = {jsonrpc: '2.0', method: 'success', id: ''};
                request(data).then(function (result) {
                    expect(result.jsonrpc).to.be('2.0');
                    expect(result.result).to.eql({success: true});
                    expect(result.id).to.eql(data.id);

                    done();
                });
            });
        });

        describe('Notification request', function () {
            it('success', function (done) {
                const data = {jsonrpc: '2.0', method: 'success'};
                request(data).then(function (result) {
                    expect(result).to.be('');

                    done();
                });
            });

            it('fail', function (done) {
                const data = {jsonrpc: '2.0', method: 'error'};
                request(data).then(function (result) {
                    expect(result).to.be('');

                    done();
                });
            });
        });

        it('Batch request', function (done) {
            const data = [
                {jsonrpc: '2.0', method: 'success', id: 'success'},
                {jsonrpc: '2.0', method: 'error', id: 'error'}
            ];
            request(data).then(function (result) {
                result.forEach(function (value: {[index: string]: any}, index: number) {
                    expect(result[index].jsonrpc).to.be('2.0');
                    expect(result[index].id).to.be(data[index].id);
                });

                expect(result[0].result).to.eql({success: true});
                expect(result[1].error.code).to.be(500);
                expect(result[1].error.message).to.be('TEST_EXCEPTION');

                done();
            });
        });

        describe('Error converter', function () {
            describe('Should convert error', function () {
                it('Version not specified', function (done) {
                    const data = {method: 'error', id: 'error'};
                    request(data).then(function (result) {
                        expect(result.error.code).to.be(-32600);
                        expect(result.error.message).to.be('Invalid request');
                        expect(result.id).to.be(data.id);

                        done();
                    });
                });

                it('Method not specified', function (done) {
                    const data = {jsonrpc: '2.0', id: 'error'};
                    request(data).then(function (result) {
                        expect(result.error.code).to.be(-32600);
                        expect(result.error.message).to.be('Invalid request');
                        expect(result.id).to.be(data.id);

                        done();
                    });
                });

                it('Method not found', function (done) {
                    const data = {jsonrpc: '2.0', method: 'not_found', id: 'error'};
                    request(data).then(function (result) {
                        expect(result.error.code).to.be(-32601);
                        expect(result.error.message).to.be('Method not found');
                        expect(result.id).to.be(data.id);

                        done();
                    });
                });

                it('Invalid params', function (done) {
                    const data = {jsonrpc: '2.0', method: 'badRequest', id: 'error'};
                    request(data).then(function (result) {
                        expect(result.error.code).to.be(-32602);
                        expect(result.error.message).to.be('Invalid params');
                        expect(result.id).to.be(data.id);

                        done();
                    });
                });

                it('Internal error', function (done) {
                    const data = {jsonrpc: '2.0', method: 'internalServerError', id: 'error'};
                    request(data).then(function (result) {
                        expect(result.error.code).to.be(-32603);
                        expect(result.error.message).to.be('Internal error');
                        expect(result.id).to.be(data.id);

                        done();
                    });
                });
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
