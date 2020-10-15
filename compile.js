const tool = require('keystore_wdc/contract')
const fs = require('fs')
const entry = './src/firebee.ts'
const sk = process.env['PRIVATE_KEY']

const keys = [
    'ca2df2091c47d9b13e8b2ac9d9877af35b13d008abaa6e3d204d25dcfd5760cc',
    'dba900aae6b7cbef4623e704db5e145f92832cf4217ca50a173af318b895a586',
    'fe61c314b09570f2662322fd4c12dcc5c1673682953df1ad4d821ede0e8f06c4',
    '97ed7d0e3da437df9b3fd5a592fce903c1227a22b6d707f8d4d902e941126189'
]

const addr = sk2Addr(sk)
const rpc = new tool.RPC(process.env['W_HOST'] || 'localhost', process.env['W_PORT'] || 19585)

// convert private key to address
function sk2Addr(sk){
    return tool.publicKeyHash2Address(tool.publicKey2Hash(tool.privateKey2PublicKey(sk)))
}

// get nonce by private key
async function getNonceBySK(sk){
    return rpc.getNonce(sk2Addr(sk))
}

async function main(){
    const buf = await tool.compileContract(process.env['ASC_PATH'] || './node_modules/.bin/asc', entry)
    const abi = tool.compileABI(fs.readFileSync(entry))
    const c = new tool.Contract('', abi, buf)
    const builder = new tool.TransactionBuilder(1, sk, 0, 200000, (await getNonceBySK(sk)) + 1)

    // deploy contract
    let tx = builder.buildDeploy(c, [addr])
    c.address = tool.getContractAddress(tx.getHash())
    console.log(await rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED))

    // registration at keys 0
    builder.sk = keys[0]
    builder.nonce = (await getNonceBySK(builder.sk)) + 1
    tx = builder.buildContractCall(c, 'registrationExt', [sk2Addr(sk)], '1000000000')
    console.log(await rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED))
}

main().catch(console.error)



