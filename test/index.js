"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var chai_1 = require("chai");
var chaiAsPromised = require("chai-as-promised");
var index_1 = require("../index");
chai.use(chaiAsPromised);
// Verify that the types needed can be imported
var typingImportTest = undefined;
if (typingImportTest) {
    // do nothing
}
/**
 * Milliseconds per tick.
 */
var tick = 100;
/**
 * Milliseconds tolerance for tests above the target.
 */
var tolerance = 60;
/**
 * Returns a promise which waits the specified amount of time before resolving.
 */
function wait(time) {
    if (time <= 0) {
        return Promise.resolve();
    }
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, time);
    });
}
/**
 * Expects an array of result times (ms) to be within the tolerance range of the specified numbers of target ticks.
 */
function expectTimes(resultTimes, targetTicks, message) {
    chai_1.expect(resultTimes).to.have.lengthOf(targetTicks.length, message);
    resultTimes.forEach(function (val, i) {
        chai_1.expect(val).to.be.within(targetTicks[i] * tick, targetTicks[i] * tick + tolerance, message + " (" + i + ")");
    });
}
function unhandledRejectionListener(err) {
    // Fail the test
    throw new Error("UnhandledPromiseRejection: " + err.message);
}
beforeEach(function () {
    process.removeAllListeners("unhandledRejection");
    process.addListener("unhandledRejection", unhandledRejectionListener);
});
describe("Batcher", function () {
    it("Core Functionality", function () {
        var runCount = 0;
        var batcher = new index_1.Batcher({
            batchingFunction: function (input) {
                runCount++;
                return wait(tick).then(function () { return input.map(String); });
            },
        });
        var inputs = [1, 5, 9];
        var start = Date.now();
        return Promise.all(inputs.map(function (input) {
            return batcher.getResult(input).then(function (output) {
                chai_1.expect(output).to.equal(String(input), "Outputs");
                expectTimes([Date.now() - start], [1], "Timing Results");
            });
        })).then(function () {
            chai_1.expect(runCount).to.equal(1, "runCount");
        });
    });
    it("Offset Batches", function () {
        // Runs two batches of requests, offset so the seconds starts while the first is half finished.
        // The second batch should start before the first finishes.
        var start = Date.now();
        var runCount = 0;
        var batcher = new index_1.Batcher({
            batchingFunction: function (input) {
                runCount++;
                return wait(tick * 2).then(function () { return input.map(String); });
            },
        });
        var inputs = [[1, 9], [5, 7]];
        return Promise.all(inputs.map(function (input, index) {
            return wait(index * tick).then(function () {
                return Promise.all(input.map(function (value, index2) {
                    return batcher.getResult(value).then(function (result) {
                        chai_1.expect(result).to.equal(String(value));
                        expectTimes([Date.now() - start], [index + 2], "Timing result (" + index + "," + index2 + ")");
                    });
                }));
            });
        })).then(function () {
            chai_1.expect(runCount).to.equal(2, "runCount");
        });
    });
    it("Delay Function", function () {
        var runCount = 0;
        var batcher = new index_1.Batcher({
            batchingFunction: function (input) {
                runCount++;
                return wait(1).then(function () { return input; });
            },
            delayFunction: function () { return wait(tick); },
            maxBatchSize: 2,
        });
        var inputs = [1, 5, 9];
        var start = Date.now();
        return Promise.all(inputs.map(function () {
            return batcher.getResult(undefined).then(function () { return Date.now() - start; });
        })).then(function (times) {
            expectTimes(times, [1, 1, 2], "Timing Results");
            chai_1.expect(runCount).to.equal(2, "runCount");
        });
    });
    describe("maxBatchSize", function () {
        it("Core Functionality", function () {
            var runCount = 0;
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    runCount++;
                    return wait(tick).then(function () { return input.map(String); });
                },
                maxBatchSize: 2,
            });
            var inputs = [1, 5, 9];
            var start = Date.now();
            return Promise.all(inputs.map(function (input) {
                return batcher.getResult(input).then(function (output) {
                    chai_1.expect(output).to.equal(String(input), "Outputs");
                    expectTimes([Date.now() - start], [1], "Timing Results");
                });
            })).then(function () {
                chai_1.expect(runCount).to.equal(2, "runCount");
            });
        });
        it("Instant Start", function () {
            var runCount = 0;
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    runCount++;
                    return wait(tick).then(function () { return input; });
                },
                maxBatchSize: 2,
            });
            var runCounts = [0, 1, 1];
            return Promise.all(runCounts.map(function (expectedRunCount) {
                // The batching function should be triggered instantly when the max batch size is reached
                var promise = batcher.getResult(undefined);
                chai_1.expect(runCount).to.equal(expectedRunCount);
                return promise;
            }));
        });
    });
    it("queuingDelay", function () {
        var runCount = 0;
        var batcher = new index_1.Batcher({
            batchingFunction: function (input) {
                runCount++;
                return Promise.resolve(new Array(input.length));
            },
            queuingDelay: tick * 2,
        });
        var delays = [0, 1, 3];
        var start = Date.now();
        return Promise.all(delays.map(function (delay) {
            return wait(delay * tick)
                .then(function () { return batcher.getResult(undefined); })
                .then(function () { return Date.now() - start; });
        })).then(function (results) {
            expectTimes(results, [2, 2, 5], "Timing Results");
            chai_1.expect(runCount).to.equal(2, "runCount");
        });
    });
    describe("queueingThresholds", function () {
        it("Core Functionality", function () {
            var runCount = 0;
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    runCount++;
                    return wait(5 * tick).then(function () { return new Array(input.length); });
                },
                queuingThresholds: [1, 2],
            });
            var delays = [0, 1, 2, 3, 4];
            var start = Date.now();
            return Promise.all(delays.map(function (delay) {
                return wait(delay * tick)
                    .then(function () { return batcher.getResult(undefined); })
                    .then(function () { return Date.now() - start; });
            })).then(function (results) {
                expectTimes(results, [5, 7, 7, 9, 9], "Timing Results");
                chai_1.expect(runCount).to.equal(3, "runCount");
            });
        });
        it("Should Trigger On Batch Completion", function () {
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    return wait(2 * tick).then(function () { return new Array(input.length); });
                },
                queuingThresholds: [1, 2],
            });
            var delays = [0, 1];
            var start = Date.now();
            return Promise.all(delays.map(function (delay) {
                return wait(delay * tick)
                    .then(function () { return batcher.getResult(undefined); })
                    .then(function () { return Date.now() - start; });
            })).then(function (results) {
                expectTimes(results, [2, 4], "Timing Results");
            });
        });
        it("Delay After Hitting Queuing Threshold", function () {
            var runCount = 0;
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    runCount++;
                    return wait(3 * tick).then(function () { return new Array(input.length); });
                },
                queuingDelay: tick,
                queuingThresholds: [1, Infinity],
            });
            var start = Date.now();
            return Promise.all([
                batcher.getResult(undefined).then(function () {
                    return batcher.getResult(undefined);
                }),
                wait(2 * tick).then(function () { return batcher.getResult(undefined); }),
            ].map(function (promise) { return promise.then(function () { return Date.now() - start; }); })).then(function (results) {
                expectTimes(results, [8, 8], "Timing Results");
                chai_1.expect(runCount).to.equal(2, "runCount");
            });
        });
        it("Obey Queuing Threshold Even When Hitting maxBatchSize", function () {
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    return wait(tick).then(function () { return new Array(input.length); });
                },
                maxBatchSize: 1,
                queuingThresholds: [1, Infinity],
            });
            var start = Date.now();
            return Promise.all([batcher.getResult(undefined), batcher.getResult(undefined)].map(function (promise) { return promise.then(function () { return Date.now() - start; }); })).then(function (results) {
                expectTimes(results, [1, 2], "Timing Results");
            });
        });
    });
    describe("Retries", function () {
        it("Full", function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var batchNumber, runCount, batcher, start, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        batchNumber = 0;
                        runCount = 0;
                        batcher = new index_1.Batcher({
                            batchingFunction: function (inputs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            runCount++;
                                            return [4 /*yield*/, wait(tick)];
                                        case 1:
                                            _a.sent();
                                            batchNumber++;
                                            if (batchNumber < 2) {
                                                return [2 /*return*/, inputs.map(function () { return index_1.BATCHER_RETRY_TOKEN; })];
                                            }
                                            return [2 /*return*/, inputs.map(function (input) { return input + 1; })];
                                    }
                                });
                            }); },
                        });
                        start = Date.now();
                        return [4 /*yield*/, Promise.all([1, 2].map(function (input) { return __awaiter(_this, void 0, void 0, function () {
                                var output;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, batcher.getResult(input)];
                                        case 1:
                                            output = _a.sent();
                                            chai_1.expect(output).to.equal(input + 1, "getResult output");
                                            return [2 /*return*/, Date.now() - start];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        expectTimes(results, [2, 2], "Timing Results");
                        chai_1.expect(runCount).to.equal(2, "runCount");
                        return [2 /*return*/];
                }
            });
        }); });
        it("Partial", function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var batchNumber, runCount, batcher, start, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        batchNumber = 0;
                        runCount = 0;
                        batcher = new index_1.Batcher({
                            batchingFunction: function (inputs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            runCount++;
                                            return [4 /*yield*/, wait(tick)];
                                        case 1:
                                            _a.sent();
                                            batchNumber++;
                                            return [2 /*return*/, inputs.map(function (input, index) {
                                                    return batchNumber < 2 && index < 1
                                                        ? index_1.BATCHER_RETRY_TOKEN
                                                        : input + 1;
                                                })];
                                    }
                                });
                            }); },
                        });
                        start = Date.now();
                        return [4 /*yield*/, Promise.all([1, 2].map(function (input) { return __awaiter(_this, void 0, void 0, function () {
                                var output;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, batcher.getResult(input)];
                                        case 1:
                                            output = _a.sent();
                                            chai_1.expect(output).to.equal(input + 1, "getResult output");
                                            return [2 /*return*/, Date.now() - start];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        expectTimes(results, [2, 1], "Timing Results");
                        chai_1.expect(runCount).to.equal(2, "runCount");
                        return [2 /*return*/];
                }
            });
        }); });
        it("Ordering", function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var batchInputs, batcher, start, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        batchInputs = [];
                        batcher = new index_1.Batcher({
                            batchingFunction: function (inputs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            batchInputs.push(inputs);
                                            return [4 /*yield*/, wait(tick)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, inputs.map(function (input, index) {
                                                    return batchInputs.length < 2 && index < 2
                                                        ? index_1.BATCHER_RETRY_TOKEN
                                                        : input + 1;
                                                })];
                                    }
                                });
                            }); },
                            maxBatchSize: 3,
                            queuingThresholds: [1, Infinity],
                        });
                        start = Date.now();
                        return [4 /*yield*/, Promise.all([1, 2, 3, 4].map(function (input) { return __awaiter(_this, void 0, void 0, function () {
                                var output;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, batcher.getResult(input)];
                                        case 1:
                                            output = _a.sent();
                                            chai_1.expect(output).to.equal(input + 1, "getResult output");
                                            return [2 /*return*/, Date.now() - start];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        expectTimes(results, [2, 2, 1, 2], "Timing Results");
                        chai_1.expect(batchInputs).to.deep.equal([[1, 2, 3], [1, 2, 4]], "batchInputs");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("Send Method", function () {
        it("Single Use", function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var runCount, batcher, start, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        runCount = 0;
                        batcher = new index_1.Batcher({
                            batchingFunction: function (inputs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            runCount++;
                                            return [4 /*yield*/, wait(tick)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, inputs];
                                    }
                                });
                            }); },
                            queuingDelay: tick,
                            queuingThresholds: [1, Infinity],
                        });
                        start = Date.now();
                        return [4 /*yield*/, Promise.all([1, 2, 3].map(function (_, index) { return __awaiter(_this, void 0, void 0, function () {
                                var promise;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            promise = batcher.getResult(undefined);
                                            if (index === 1) {
                                                chai_1.expect(runCount).to.equal(0, "runCount before");
                                                batcher.send();
                                                chai_1.expect(runCount).to.equal(1, "runCount after");
                                            }
                                            return [4 /*yield*/, promise];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, Date.now() - start];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        expectTimes(results, [1, 1, 3], "Timing Results");
                        return [2 /*return*/];
                }
            });
        }); });
        it("Effect Delayed By queuingThreshold", function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var runCount, batcher, start, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        runCount = 0;
                        batcher = new index_1.Batcher({
                            batchingFunction: function (inputs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            runCount++;
                                            return [4 /*yield*/, wait(tick)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, inputs];
                                    }
                                });
                            }); },
                            queuingDelay: tick,
                            queuingThresholds: [1, Infinity],
                        });
                        start = Date.now();
                        return [4 /*yield*/, Promise.all([1, 2, 3].map(function (_, index) { return __awaiter(_this, void 0, void 0, function () {
                                var promise;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            promise = batcher.getResult(undefined);
                                            if (index === 1) {
                                                chai_1.expect(runCount).to.equal(0, "runCount before");
                                                batcher.send();
                                                chai_1.expect(runCount).to.equal(1, "runCount after");
                                            }
                                            else if (index === 2) {
                                                batcher.send();
                                                chai_1.expect(runCount).to.equal(1, "runCount after second");
                                            }
                                            return [4 /*yield*/, promise];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, Date.now() - start];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        expectTimes(results, [1, 1, 2], "Timing Results");
                        return [2 /*return*/];
                }
            });
        }); });
        it("Effect Delayed By delayFunction", function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var batcher, start, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        batcher = new index_1.Batcher({
                            batchingFunction: function (inputs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, wait(tick)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, inputs];
                                    }
                                });
                            }); },
                            delayFunction: function () { return wait(tick); },
                            maxBatchSize: 2,
                            queuingThresholds: [1, Infinity],
                        });
                        start = Date.now();
                        return [4 /*yield*/, Promise.all([1, 2, 3].map(function (_, index) { return __awaiter(_this, void 0, void 0, function () {
                                var promise;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            promise = batcher.getResult(undefined);
                                            if (index === 2) {
                                                batcher.send();
                                            }
                                            return [4 /*yield*/, promise];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, Date.now() - start];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        expectTimes(results, [2, 2, 4], "Timing Results");
                        return [2 /*return*/];
                }
            });
        }); });
        it("Interaction With Retries", function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var runCount, batcher, start, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        runCount = 0;
                        batcher = new index_1.Batcher({
                            batchingFunction: function (inputs) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            runCount++;
                                            return [4 /*yield*/, wait(tick)];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, runCount === 1
                                                    ? inputs.map(function () { return index_1.BATCHER_RETRY_TOKEN; })
                                                    : inputs];
                                    }
                                });
                            }); },
                            queuingDelay: tick,
                            queuingThresholds: [1, Infinity],
                        });
                        start = Date.now();
                        return [4 /*yield*/, Promise.all([1, 2, 3].map(function (_, index) { return __awaiter(_this, void 0, void 0, function () {
                                var promise;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            promise = batcher.getResult(undefined);
                                            if (index >= 1) {
                                                batcher.send();
                                            }
                                            return [4 /*yield*/, promise];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/, Date.now() - start];
                                    }
                                });
                            }); }))];
                    case 1:
                        results = _a.sent();
                        chai_1.expect(runCount).to.equal(2, "runCount");
                        expectTimes(results, [2, 2, 2], "Timing Results");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("Error Handling", function () {
        it("Single Rejection", function () {
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    return wait(tick).then(function () {
                        return input.map(function (value) {
                            return value === "error" ? new Error("test") : undefined;
                        });
                    });
                },
            });
            var inputs = ["a", "error", "b"];
            return Promise.all(inputs.map(function (input) {
                return batcher
                    .getResult(input)
                    .then(function () { return true; })
                    .catch(function (err) {
                    chai_1.expect(err.message).to.equal("test");
                    return false;
                });
            })).then(function (results) {
                chai_1.expect(results).to.deep.equal([true, false, true]);
            });
        });
        it("Synchronous Batching Function Exception Followed By Success", function () {
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    input.forEach(function (value) {
                        if (value === 0) {
                            throw new Error("test");
                        }
                    });
                    return wait(1).then(function () { return new Array(input.length); });
                },
                maxBatchSize: 2,
            });
            var inputs = [0, 1, 2];
            return Promise.all(inputs.map(function (input) {
                return batcher
                    .getResult(input)
                    .then(function () { return true; })
                    .catch(function (err) {
                    chai_1.expect(err.message).to.equal("test");
                    return false;
                });
            })).then(function (results) {
                chai_1.expect(results).to.deep.equal([false, false, true]);
            });
        });
        it("Asynchronous Batching Function Exception Followed By Success", function () {
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    return wait(1).then(function () {
                        input.forEach(function (value) {
                            if (value === 0) {
                                throw new Error("test");
                            }
                        });
                        return new Array(input.length);
                    });
                },
                maxBatchSize: 2,
            });
            return Promise.all([0, 1].map(function (input) {
                var promise = batcher.getResult(input);
                if (input !== 2) {
                    return chai_1.expect(promise).to.be.rejectedWith(Error, "test");
                }
                return promise;
            }));
        });
        it("Synchronous Delay Exception Followed By Success", function () { return __awaiter(_this, void 0, void 0, function () {
            var runCount, batcher;
            return __generator(this, function (_a) {
                runCount = 0;
                batcher = new index_1.Batcher({
                    batchingFunction: function (input) {
                        return wait(1).then(function () { return input; });
                    },
                    delayFunction: function () {
                        runCount++;
                        if (runCount < 2) {
                            throw new Error("test");
                        }
                    },
                    maxBatchSize: 2,
                });
                return [2 /*return*/, Promise.all([0, 1].map(function () {
                        return chai_1.expect(batcher.getResult(undefined)).to.be.rejectedWith(Error, "test");
                    })).then(function () { return batcher.getResult(undefined); })];
            });
        }); });
        it("Asynchronous Delay Exception Followed By Success", function () {
            var runCount = 0;
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    return wait(1).then(function () { return input; });
                },
                delayFunction: function () {
                    return wait(1).then(function () {
                        runCount++;
                        if (runCount < 2) {
                            throw new Error("test");
                        }
                    });
                },
                maxBatchSize: 2,
            });
            return Promise.all([0, 1].map(function () {
                return chai_1.expect(batcher.getResult(undefined)).to.be.rejectedWith(Error, "test");
            })).then(function () { return batcher.getResult(undefined); });
        });
        it("Invalid Output Length", function () {
            var batcher = new index_1.Batcher({
                batchingFunction: function (input) {
                    // Respond with an array larger than the input
                    return wait(1).then(function () { return new Array(input.length + 1); });
                },
            });
            var inputs = [0, 1, 2];
            return Promise.all(inputs.map(function (input) {
                return batcher
                    .getResult(input)
                    .then(function () { return true; })
                    .catch(function () { return false; });
            })).then(function (results) {
                chai_1.expect(results).to.deep.equal([false, false, false]);
            });
        });
    });
});
