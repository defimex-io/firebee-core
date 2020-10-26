"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.X6 = exports.X3 = exports.User = exports.MAX_LEVEL = void 0;
var rlp = require("./rlp");
var tool = require("keystore_wdc/contract");
exports.MAX_LEVEL = 12;
var ZERO_ADDRESS = '';
var RLPList = (function (_super) {
    __extends(RLPList, _super);
    function RLPList(elements) {
        return _super.call(this, elements) || this;
    }
    RLPList.prototype.address = function (idx) {
        return tool.publicKeyHash2Address(this.bytes(idx));
    };
    RLPList.fromEncoded = function (encoded) {
        var els = rlp.decodeElements(encoded);
        return new RLPList(els);
    };
    return RLPList;
}(rlp.RLPList));
function getNull() {
    var ret = new Uint8Array(1);
    ret[0] = 0x80;
    return ret.buffer;
}
function decodeBools(buf) {
    var ret = new Array();
    var li = RLPList.fromEncoded(buf);
    for (var i = 0; i < li.length(); i++) {
        ret.push(li.bool(i));
    }
    return ret;
}
function decodeX6s(buf) {
    var ret = new Array();
    var li = RLPList.fromEncoded(buf);
    for (var i = 0; i < li.length(); i++) {
        ret.push(X6.fromEncoded(li.raw(i)));
    }
    return ret;
}
function decodeX3s(buf) {
    var ret = new Array();
    var li = rlp.RLPList.fromEncoded(buf);
    for (var i = 0; i < li.length(); i++) {
        ret.push(X3.fromEncoded(li.raw(i)));
    }
    return ret;
}
function decodeAddrs(buf) {
    var ret = new Array();
    var li = RLPList.fromEncoded(buf);
    for (var i = 0; i < li.length(); i++) {
        ret.push(li.address(i));
    }
    return ret;
}
var User = (function () {
    function User(id, referrer, patnersCount) {
        this.id = id;
        this.referrer = referrer;
        this.partnersCount = patnersCount;
        this.activeX3Levels = new Array(exports.MAX_LEVEL + 1);
        this.activeX6Levels = new Array(exports.MAX_LEVEL + 1);
        this.x3Matrix = new Array(exports.MAX_LEVEL + 1);
        this.x6Matrix = new Array(exports.MAX_LEVEL + 1);
        for (var i = 0; i < exports.MAX_LEVEL + 1; i++) {
            this.activeX3Levels[i] = false;
            this.activeX6Levels[i] = false;
            this.x3Matrix[i] = new X3();
            this.x6Matrix[i] = new X6();
        }
    }
    User.fromEncoded = function (buf) {
        var u = new User(0, ZERO_ADDRESS, 0);
        var li = RLPList.fromEncoded(buf);
        u.id = li.number(0);
        u.referrer = tool.publicKeyHash2Address(li.bytes(1));
        u.partnersCount = li.number(2);
        u.activeX3Levels = decodeBools(li.raw(3));
        u.activeX6Levels = decodeBools(li.raw(4));
        u.x3Matrix = decodeX3s(li.raw(5));
        u.x6Matrix = decodeX6s(li.raw(6));
        return u;
    };
    return User;
}());
exports.User = User;
var X3 = (function () {
    function X3() {
        this.currentReferrer = ZERO_ADDRESS;
        this.referrals = [];
    }
    X3.fromEncoded = function (buf) {
        var li = RLPList.fromEncoded(buf);
        var x3 = new X3();
        x3.currentReferrer = li.address(0);
        x3.referrals = decodeAddrs(li.raw(1));
        x3.blocked = li.bool(2);
        x3.reinvestCount = li.number(3);
        return x3;
    };
    return X3;
}());
exports.X3 = X3;
var X6 = (function () {
    function X6() {
        this.currentReferrer = ZERO_ADDRESS;
        this.firstLevelReferrals = [];
        this.secondLevelReferrals = [];
        this.closedPart = ZERO_ADDRESS;
    }
    X6.fromEncoded = function (buf) {
        var li = RLPList.fromEncoded(buf);
        var x6 = new X6();
        x6.currentReferrer = li.address(0);
        x6.firstLevelReferrals = decodeAddrs(li.raw(1));
        x6.secondLevelReferrals = decodeAddrs(li.raw(2));
        x6.blocked = li.bool(3);
        x6.reinvestCount = li.number(4);
        x6.closedPart = li.address(5);
        return x6;
    };
    return X6;
}());
exports.X6 = X6;
//# sourceMappingURL=types.js.map