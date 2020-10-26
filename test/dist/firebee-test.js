"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
Object.defineProperty(exports, "__esModule", { value: true });
var tool = require("keystore_wdc/contract");
var fs = require("fs");
var contract_1 = require("keystore_wdc/contract");
var path = require('path');
var entry = path.join(__dirname, '../src/firebee.ts');
var rpc = new tool.RPC(process.env['W_HOST'] || 'localhost', process.env['W_PORT'] || 19585);
var contractAddress = process.env['CONTRACT_ADDRESS'];
var rlp = require("./rlp");
var types_1 = require("./types");
var privateKeys = [
    null,
    '56df79d38cb8146a4a4bde7460715574db087cf867d54768a4bed1d2f0a4baa7',
    'ba661c8c32e398fdae9ea27d9102ce63cee678ad55a0986c33412a48fd373d59',
    'bb4423272bf8fb2250181648d31ea5d64637c1472610ea7a5267056f8a70e4c4',
    'dfca2f6630ceda4b7c72f244cc5429517e11d6b2318e82224ba5377487d99853',
    '3bd9df770d3d94c18f6c9f92e85034e5eec9f8c641aa62b718af7ba451c5f8f5',
    'deaf1afaccefc131379516e9a607f28e59bdfbb40f883ad7325260b41f9c8d3c',
    'f08edbf60ceb34df6c28e60d966e6895b98f148493fc222448eb6920a96819fa',
    '75bfc0e817e702b7ffbcfff64d7d821b22015ccf75dea713f20817fc62968be8',
    '362d3e7ad7f6c5cfcada9022caeb1e6e5d7f32449d323f0b240148cf36d312fa',
    '309761a1c7db26089f03b772dc0453bb7a3145871482306e3b2ffdcfe144dcde',
    'eba062c463c517450d9a3c18f5a533c0f835e399594ed377d9fa8ab5e1edeed7',
    '06a8c312bc4739020844b4072aee21c7e892fe698c51d49d4e38c473fa4341d4',
    '2e5de9674ecacbdd2d04ecb954e9b2d858f815c42aeb0fc9afc75067d37d4955',
    '3fafddf19271e74ac1ab5dde9ae26b54a05ae1b5e5e30c3de04015c8e9932868',
    '907869f34dca0e4144ca890a6940ca84e77d6305d17d9ffe387b09e3ea4f6a78',
    'c417d50cea71b494c7f047af1b1a500484a6b351e25cd093282f6bc7114b6a39',
    '2cf412d3d731db7ad48eead101ae478a30d4cd1e051dab69d39fcfd35abcc39d',
    'a4c7e1b2fe184601d9b5e00e75317a6cfed9b19c332435ff98cf0b1e19f47692',
    '2e4b2ad704762ace8d5f71843bb3052b581d7f17a0ed700ccfb761a283cb0de3',
    '65a289ae8590734e358da0e88b0d4b5c4bb31e612079b6ee1ca04ce3ed0042d4'
];
function sk2Addr(sk) {
    return tool.publicKeyHash2Address(tool.publicKey2Hash(tool.privateKey2PublicKey(sk)));
}
var Command = (function () {
    function Command() {
    }
    Command.prototype.deploy = function (idx) {
        return __awaiter(this, void 0, void 0, function () {
            var sk, buf, c, builder, _a, _b, _c, ownerAddr, tx;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sk = privateKeys[idx];
                        return [4, this.compile()];
                    case 1:
                        buf = _d.sent();
                        c = new tool.Contract('', this.abi(), buf);
                        c.abi = this.abi();
                        _b = (_a = tool.TransactionBuilder).bind;
                        _c = [void 0, 1, sk, 0, 200000];
                        return [4, this.getNonceBySK(sk)];
                    case 2:
                        builder = new (_b.apply(_a, _c.concat([(_d.sent()) + 1])))();
                        ownerAddr = sk2Addr(sk);
                        tx = builder.buildDeploy(c, [ownerAddr, 'WX1111111111111111111115vGLbG']);
                        return [2, rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED)];
                }
            });
        });
    };
    Command.prototype.getNonceBySK = function (sk) {
        return __awaiter(this, void 0, void 0, function () {
            var n;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, rpc.getNonce(sk2Addr(sk))];
                    case 1:
                        n = _a.sent();
                        return [2, typeof n === 'number' ? n : parseInt(n)];
                }
            });
        });
    };
    Command.prototype.compile = function () {
        var ascPath = process.env['ASC_PATH'] || path.join(__dirname, '../node_modules/.bin/asc');
        return tool.compileContract(ascPath, entry);
    };
    Command.prototype.abi = function () {
        if (Command._abi)
            return Command._abi;
        var f = fs.readFileSync(entry);
        Command._abi = tool.compileABI(f);
        return Command._abi;
    };
    Command.prototype.contract = function () {
        return new contract_1.Contract(contractAddress, this.abi());
    };
    Command.prototype.getUser = function (idx) {
        return __awaiter(this, void 0, void 0, function () {
            var c, sk, addr, r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        c = this.contract();
                        sk = privateKeys[idx];
                        addr = sk2Addr(sk);
                        return [4, rpc.viewContract(c, 'getUserFromAddress', [addr])];
                    case 1:
                        r = _a.sent();
                        return [2, types_1.User.fromEncoded(rlp.decodeHex(r))];
                }
            });
        });
    };
    Command.prototype.getOwner = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, rpc.viewContract(this.contract(), 'getOwner')];
            });
        });
    };
    Command.prototype.register = function (u, referrer) {
        return __awaiter(this, void 0, void 0, function () {
            var c, sk, builder, _a, _b, _c, r, tx;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        c = this.contract();
                        sk = privateKeys[u];
                        _b = (_a = tool.TransactionBuilder).bind;
                        _c = [void 0, 1, sk, 0, 200000];
                        return [4, this.getNonceBySK(sk)];
                    case 1:
                        builder = new (_b.apply(_a, _c.concat([(_d.sent()) + 1])))();
                        r = sk2Addr(privateKeys[referrer]);
                        tx = builder.buildContractCall(c, 'registrationExt', [r], '20000000000');
                        return [2, rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED)];
                }
            });
        });
    };
    return Command;
}());
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var m, u, r, cmd, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    m = process.env['METHOD'];
                    u = process.env['USER'];
                    r = process.env['REFERRER'];
                    cmd = new Command();
                    if (!m)
                        return [2];
                    _a = m;
                    switch (_a) {
                        case 'deploy': return [3, 1];
                        case 'wdc': return [3, 3];
                        case 'getOwner': return [3, 5];
                        case 'user': return [3, 7];
                        case 'register': return [3, 9];
                    }
                    return [3, 11];
                case 1:
                    _c = (_b = console).log;
                    return [4, cmd.deploy(parseInt(u))];
                case 2:
                    _c.apply(_b, [_m.sent()]);
                    return [3, 11];
                case 3:
                    _e = (_d = console).log;
                    return [4, rpc.getBalance(sk2Addr(privateKeys[parseInt(u)]))];
                case 4:
                    _e.apply(_d, [_m.sent()]);
                    return [3, 11];
                case 5:
                    _g = (_f = console).log;
                    return [4, cmd.getOwner()];
                case 6:
                    _g.apply(_f, [_m.sent()]);
                    return [3, 11];
                case 7:
                    _j = (_h = console).log;
                    return [4, cmd.getUser(parseInt(u))];
                case 8:
                    _j.apply(_h, [_m.sent()]);
                    return [3, 11];
                case 9:
                    _l = (_k = console).log;
                    return [4, cmd.register(parseInt(u), parseInt(r))];
                case 10:
                    _l.apply(_k, [_m.sent()]);
                    return [3, 11];
                case 11: return [2];
            }
        });
    });
}
main()
    .then(function () { return rpc.close(); })
    .catch(function (e) {
    console.error(e);
    rpc.close();
});
//# sourceMappingURL=firebee-test.js.map