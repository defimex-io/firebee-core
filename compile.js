const tool = require('keystore_wdc/contract')
const fs = require('fs')
const entry = './src/firebee.ts'
const sk = process.env['PRIVATE_KEY']
const addr = sk2Addr(sk)
const rpc = new tool.RPC(process.env['W_HOST'] || 'localhost', process.env['W_PORT'] || 19585)

function sk2Addr(sk){
    return tool.publicKeyHash2Address(tool.publicKey2Hash(tool.privateKey2PublicKey(sk)))
}

async function main(){
    const n = await rpc.getNonce(addr)
    const buf = await tool.compileContract(process.env['ASC_PATH'] || './node_modules/.bin/asc', entry)
    const abi = tool.compileABI(fs.readFileSync(entry))
    const c = new tool.Contract('', abi, buf)
    const builder = new tool.TransactionBuilder(1, sk, 0, 200000, n + 1)
    const tx = builder.buildDeploy(c, [addr])
    console.log(await rpc.sendAndObserve(tx))
}

main().catch(console.error)



