import tool = require('keystore_wdc/contract-dist')
import fs = require('fs')
import { ABI, Contract, Readable } from "keystore_wdc/contract-dist";
const path = require('path')
const entry = path.join(__dirname, '../src/firebee.ts')
const rpc = new tool.RPC(process.env['W_HOST'] || 'localhost', process.env['W_PORT'] || 19585)
import rlp = require('./rlp')
import { User } from "./types";
import BN = require("keystore_wdc/bn");
const MAX_LEVEL = 12
const privateKeys = [
    null, // starts with 1
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
]

// convert private key to address
function sk2Addr(sk: string): string {
    return tool.publicKeyHash2Address(tool.publicKey2Hash(tool.privateKey2PublicKey(sk)))
}

class Command {
    levelPrice: BN[]
    // @ts-ignore
    blackPrice: BN[]
    firstPrice = new BN(100000000).mul(new BN(200))
    constructor() {
        this.levelPrice = [null, this.firstPrice.mul(new BN(95)).div(new BN(200))]
        this.blackPrice = [null, this.firstPrice.mul(new BN(5)).div(new BN(200))]

        for (let i = 2; i <= MAX_LEVEL; i++) {
            let nextLeverPrice = this.levelPrice[i - 1].mul(new BN(2))
            let nextBlackPrice = this.blackPrice[i - 1].mul(new BN(2))
            this.levelPrice[i] = nextLeverPrice
            this.blackPrice[i] = nextBlackPrice
        }
    }

    private static _abi: ABI[]

    // 部署
    async deploy(idx: number): Promise<any> {
        const sk = privateKeys[idx]
        const buf = await this.compile()
        const c = new tool.Contract('', this.abi(), buf)
        c.abi = this.abi()
        const builder = new tool.TransactionBuilder(1, sk, 0, 200000, (await this.getNonceBySK(sk)) + 1)
        const ownerAddr = sk2Addr(sk)
        const tx = builder.buildDeploy(c, [ownerAddr])
        const ret = <any>await rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED)
        if (!fs.existsSync(path.join(__dirname, "../local"))) {
            fs.mkdirSync(path.join(__dirname, "../local"))
        }
        fs.writeFileSync(path.join(__dirname, '../local/contractAddress.js'), `module.exports = '${ret.result}'`)
        return ret
    }

    async buy(idx: number, level: number): Promise<any> {
        const sk = privateKeys[idx]
        const c = this.contract()
        const builder = new tool.TransactionBuilder(1, sk, 0, 200000, (await this.getNonceBySK(sk)) + 1)
        const tx = builder.buildContractCall(c, 'buyNewLevel', [1, level], this.price(level))
        return rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED)
    }

    price(level: number): BN {
        return this.levelPrice[level].add(this.blackPrice[level])
    }

    // get nonce by private key
    async getNonceBySK(sk: string): Promise<number> {
        const n = await rpc.getNonce(sk2Addr(sk))
        return typeof n === 'number' ? n : parseInt(n)
    }

    compile(): Promise<Uint8Array> {
        const ascPath = process.env['ASC_PATH'] || path.join(__dirname, '../node_modules/.bin/asc')
        return tool.compileContract(entry, null)
    }

    abi(): ABI[] {
        if (Command._abi)
            return Command._abi
        const f = fs.readFileSync(entry)
        Command._abi = tool.compileABI(f)
        return Command._abi
    }

    contract(): Contract {
        return new Contract(this.contractAddress(), this.abi())
    }

    contractAddress(): string {
        if (process.env['CONTRACT_ADDRESS'])
            return process.env['CONTRACT_ADDRESS']
        return require('../local/contractAddress.js')
    }

    async addr2id(): Promise<Map<string, number>>{
        const ret = new Map<string, number>()
        const c = this.contract()
        for(let i = 1; i < privateKeys.length; i++){
            const r = <number> await rpc.viewContract(c, 'getUserIdFromAddress', sk2Addr(privateKeys[i]))
            ret.set(sk2Addr(privateKeys[i]), r)
        }
        return ret
    }

    async getUser(idx: number): Promise<User> {
        const c = this.contract()
        const sk = privateKeys[idx]
        const addr = sk2Addr(sk)
        const r = await rpc.viewContract(c, 'getUserFromAddress', [addr])
        return User.fromEncoded(rlp.decodeHex(<string>r))
    }

    async getOwner(): Promise<Readable> {
        return rpc.viewContract(this.contract(), 'getOwner', [])
    }

    replaceAddr2Id(u: User, m: Map<string, number>): void{
        u.referrer = (m.get(u.referrer) || 0).toString()
        u.x6Matrix.forEach(el => {
            el.currentReferrer = (m.get(el.currentReferrer) || 0).toString()
            el.firstLevelReferrals = el.firstLevelReferrals.map(ell => (m.get(ell) || 0).toString())
            el.secondLevelReferrals = el.secondLevelReferrals.map(ell => (m.get(ell) || 0).toString())
            el.closedPart = (m.get(el.closedPart) || 0).toString()
        })
    }
    async register(u: number, referrer: number): Promise<any> {
        const c = this.contract()
        const sk = privateKeys[u]
        const builder = new tool.TransactionBuilder(1, sk, 0, 200000, (await this.getNonceBySK(sk)) + 1)
        const r = sk2Addr(privateKeys[referrer])
        const tx = builder.buildContractCall(c, 'registrationExt', [r], '20000000000')
        return rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED)
    }

    async view(maxID: number): Promise<User[]> {
        const ret = []
        for(let i = 1; i <= maxID; i++){
            ret.push(await this.getUser(i))
        }
        return ret
    }
}

async function main() {
    const m = process.env['METHOD']
    const u = process.env['USER']
    const r = process.env['REFERRER']
    const cmd = new Command()

    if (!m)
        return

    switch (m) {
        case 'deploy':
            console.log(await cmd.deploy(parseInt(u)))
            break
        case 'wdc':
            console.log(await rpc.getBalance(sk2Addr(privateKeys[parseInt(u)])))
            break
        case 'getOwner':
            console.log(await cmd.getOwner())
            break
        case 'user':
            console.log(await cmd.getUser(parseInt(u)))
            break
        case 'register':
            console.log(await cmd.register(parseInt(u), parseInt(r)))
            break
        case 'compile':
            console.log('编译文件长度')
            console.log((await cmd.compile()).length)
            break
        case 'race': {
            const ps: Promise<any>[] = []
            for (let i = 2; i < privateKeys.length; i++) {
                const p = cmd.register(i, 1)
                    .then(r => {
                        console.log(r)
                    })
                ps.push(p)
            }
            await Promise.all(ps)
            break
        }
        case 'buy': {
            await cmd.buy(parseInt(u), parseInt(process.env['LEVEL']))
                .then(console.log)
            break
        }
        case 'view':{
            const m = await cmd.addr2id()
            const all = await cmd.view(parseInt(u))
            all.forEach(o => {
                // 观察第一级的 x6 矩阵
                delete o.activeX6Levels
                delete o.activeX3Levels
                delete o.x3Matrix
                o.x6Matrix = o.x6Matrix.slice(1, 2)
            })
            // 把地址替换成 id 便于观察
            all.forEach(u => cmd.replaceAddr2Id(u, m))
            fs.writeFileSync(path.join(__dirname, '../local/all.json'), JSON.stringify(all, null, 2))
            break
        }
    }
}


main()
    .then(() => rpc.close())
    .catch((e) => {
        console.error(e)
        rpc.close()
    })

