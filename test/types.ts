import rlp = require('./rlp')
import tool = require('keystore_wdc/contract')

type Address = string

export const MAX_LEVEL = 12;
const ZERO_ADDRESS = ''

class RLPList extends rlp.RLPList{
    constructor(elements: Uint8Array[]) {
        super(elements);
    }

    address(idx: number): Address{
        return tool.publicKeyHash2Address(this.bytes(idx))
    }

    static fromEncoded(encoded: Uint8Array | ArrayBuffer): RLPList {
        const els = rlp.decodeElements(encoded)
        return new RLPList(els)
    }
}

function getNull(): ArrayBuffer {
    const ret = new Uint8Array(1);
    ret[0] = 0x80;
    return ret.buffer;
}


function decodeBools(buf: ArrayBuffer): boolean[] {
    const ret = new Array<boolean>();
    const li = RLPList.fromEncoded(buf);
    for (let i = 0; i < li.length(); i++) {
        ret.push(li.bool(i));
    }
    return ret;
}


function decodeX6s(buf: ArrayBuffer): Array<X6> {
    const ret = new Array<X6>();
    const li = RLPList.fromEncoded(buf);
    for (let i = 0; i < li.length(); i++) {
        ret.push(X6.fromEncoded(li.raw(i)));
    }
    return ret;
}


function decodeX3s(buf: ArrayBuffer): Array<X3> {
    const ret = new Array<X3>();
    const li = rlp.RLPList.fromEncoded(buf);
    for (let i = 0; i < li.length(); i++) {
        ret.push(X3.fromEncoded(li.raw(i)));
    }
    return ret;
}


function decodeAddrs(buf: ArrayBuffer): Address[] {
    const ret = new Array<Address>();
    const li = RLPList.fromEncoded(buf);
    for (let i = 0; i < li.length(); i++) {
        ret.push(li.address(i));
    }
    return ret;
}

export class User {
    id: number
    referrer: Address
    partnersCount: number

    activeX3Levels: boolean[]
    activeX6Levels: boolean[]

    x3Matrix: Array<X3>
    x6Matrix: Array<X6>

    constructor(id: number, referrer: Address, patnersCount: number) {
        this.id = id;
        this.referrer = referrer;
        this.partnersCount = patnersCount;
        this.activeX3Levels = new Array<boolean>(MAX_LEVEL + 1);
        this.activeX6Levels = new Array<boolean>(MAX_LEVEL + 1);
        this.x3Matrix = new Array<X3>(MAX_LEVEL + 1);
        this.x6Matrix = new Array<X6>(MAX_LEVEL + 1);

        for (let i = 0; i < MAX_LEVEL + 1; i++) {
            this.activeX3Levels[i] = false;
            this.activeX6Levels[i] = false;
            this.x3Matrix[i] = new X3();
            this.x6Matrix[i] = new X6();
        }
    }


    static fromEncoded(buf: Uint8Array): User {
        const u = new User(0, ZERO_ADDRESS, 0);
        const li = RLPList.fromEncoded(buf);
        u.id = li.number(0)
        u.referrer = tool.publicKeyHash2Address(li.bytes(1));
        u.partnersCount = li.number(2)
        u.activeX3Levels = decodeBools(li.raw(3));
        u.activeX6Levels = decodeBools(li.raw(4));
        u.x3Matrix = decodeX3s(li.raw(5));
        u.x6Matrix = decodeX6s(li.raw(6));
        return u;
    }
}

export class X3 {
    currentReferrer: Address
    referrals: Address[]
    blocked: boolean
    reinvestCount: number

    constructor() {
        this.currentReferrer = ZERO_ADDRESS;
        this.referrals = []
    }

    static fromEncoded(buf: ArrayBuffer): X3 {
        const li = RLPList.fromEncoded(buf);
        const x3 = new X3();
        x3.currentReferrer = li.address(0)
        x3.referrals = decodeAddrs(li.raw(1));
        x3.blocked = li.bool(2)
        x3.reinvestCount = li.number(3)
        return x3;
    }


}

export class X6 {
    currentReferrer: Address
    firstLevelReferrals: Address[]
    secondLevelReferrals: Address[]
    blocked: boolean
    reinvestCount: number
    closedPart: Address

    constructor() {
        this.currentReferrer = ZERO_ADDRESS;
        this.firstLevelReferrals = []
        this.secondLevelReferrals = []
        this.closedPart = ZERO_ADDRESS;
    }

    static fromEncoded(buf: ArrayBuffer): X6 {
        const li = RLPList.fromEncoded(buf);
        const x6 = new X6();
        x6.currentReferrer = li.address(0)
        x6.firstLevelReferrals = decodeAddrs(li.raw(1))
        x6.secondLevelReferrals = decodeAddrs(li.raw(2))
        x6.blocked = li.bool(3)
        x6.reinvestCount = li.number(4);
        x6.closedPart = li.address(5)
        return x6;
    }

}


