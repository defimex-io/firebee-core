import { Address, RLP, RLPList } from "../node_modules/keystore_wdc/lib";

export const MAX_LEVEL = 16;

function getNull(): ArrayBuffer {
    const ret = new Uint8Array(1);
    ret[0] = 0x80;
    return ret.buffer;
}

const NULL = getNull();

export const ZERO_ADDRESS = new Address((new Uint8Array(20)).buffer);

function encodeBools(arr: bool[]): ArrayBuffer {
    const ret = new Array<ArrayBuffer>();
    for (let i = 0; i < arr.length; i++) {
        RLP.encodeU64(arr[i] ? 1 : 0);
    }
    return RLP.encodeElements(ret);
}

function decodeBools(buf: ArrayBuffer): bool[] {
    const ret = new Array<bool>();
    const li = RLPList.fromEncoded(buf);
    for (let i = 0; i < i32(li.length()); i++) {
        ret.push(li.getItem(i).u8() != 0);
    }
    return ret;
}

function encodeX6s(x3: Array<X6 | null>): ArrayBuffer {
    const ret = new Array<ArrayBuffer>();
    for (let i = 0; i < x3.length; i++) {
        if (x3[i] === null) {
            ret.push(NULL);
            continue;
        }
        ret.push((<X6>x3[i]).getEncoded());
    }
    return RLP.encodeElements(ret);
}


function decodeX6s(buf: ArrayBuffer): Array<X6> {
    const ret = new Array<X6>();
    const li = RLPList.fromEncoded(buf);
    for (let i = 0; i < i32(li.length()); i++) {
        ret.push(X6.fromEncoded(li.getRaw(i)));
    }
    return ret;
}


function encodeX3s(x3: Array<X3 | null>): ArrayBuffer {
    const ret = new Array<ArrayBuffer>();
    for (let i = 0; i < x3.length; i++) {
        if (x3[i] === null) {
            ret.push(NULL);
            continue;
        }
        ret.push((<X3>x3[i]).getEncoded());
    }
    return RLP.encodeElements(ret);
}


function decodeX3s(buf: ArrayBuffer): Array<X3> {
    const ret = new Array<X3>();
    const li = RLPList.fromEncoded(buf);
    for (let i = 0; i < i32(li.length()); i++) {
        ret.push(X3.fromEncoded(li.getRaw(i)));
    }
    return ret;
}


function encodeAddrs(addrs: Address[]): ArrayBuffer {
    const els = new Array<ArrayBuffer>();
    for (let i = 0; i < addrs.length; i++) {
        els.push(RLP.encode<Address>(addrs[i]));
    }
    return RLP.encodeElements(els);
}

function decodedAddrs(buf: ArrayBuffer): Address[] {
    const ret = new Array<Address>();
    const li = RLPList.fromEncoded(buf);
    for (let i = 0; i < i32(li.length()); i++) {
        ret.push(new Address(li.getItem(i).bytes()));
    }
    return ret;
}

export class User {
    id: u64
    referrer: Address
    partnersCount: u64

    activeX3Levels: bool[]
    activeX6Levels: bool[]

    x3Matrix: Array<X3>
    x6Matrix: Array<X6>

    constructor(id: u64, referrer: Address, patnersCount: u64) {
        this.id = id;
        this.referrer = referrer;
        this.partnersCount = patnersCount;
        this.activeX3Levels = new Array<bool>(MAX_LEVEL + 1);
        this.activeX6Levels = new Array<bool>(MAX_LEVEL + 1);
        this.x3Matrix = new Array<X3>(MAX_LEVEL + 1);
        this.x6Matrix = new Array<X6>(MAX_LEVEL + 1);

        for (let i = 0; i < MAX_LEVEL + 1; i++) {
            this.activeX3Levels[i] = false;
            this.activeX6Levels[i] = false;
            this.x3Matrix[i] = new X3();
            this.x6Matrix[i] = new X6();
        }
    }

    getEncoded(): ArrayBuffer {
        const els = new Array<ArrayBuffer>();
        els.push(RLP.encodeU64(this.id));
        els.push(RLP.encode<Address>(this.referrer));
        els.push(RLP.encodeU64(this.partnersCount));

        els.push(encodeBools(this.activeX3Levels));
        els.push(encodeBools(this.activeX6Levels));

        els.push(encodeX3s(this.x3Matrix));
        els.push(encodeX6s(this.x6Matrix));

        return RLP.encodeElements(els);
    }

    static fromEncoded(buf: ArrayBuffer): User {
        const u = new User(0, ZERO_ADDRESS, 0);
        const li = RLPList.fromEncoded(buf);
        u.id = li.getItem(0).u64();
        u.referrer = new Address(li.getItem(1).bytes());
        u.partnersCount = li.getItem(2).u64();
        u.activeX3Levels = decodeBools(li.getRaw(3));
        u.activeX6Levels = decodeBools(li.getRaw(4));
        u.x3Matrix = decodeX3s(li.getRaw(5));
        u.x6Matrix = decodeX6s(li.getRaw(5));
        return u;
    }
}

export class X3 {
    currentReferrer: Address
    referrals: Address[]
    blocked: bool
    reinvestCount: u64

    constructor() {
        this.currentReferrer = ZERO_ADDRESS;
        this.referrals = []
    }

    static fromEncoded(buf: ArrayBuffer): X3 {
        const li = RLPList.fromEncoded(buf);
        const x3 = new X3();
        x3.currentReferrer = new Address(li.getItem(0).bytes());
        x3.referrals = decodedAddrs(li.getRaw(1));
        x3.blocked = li.getItem(2).u8() != 0;
        x3.reinvestCount = li.getItem(3).u64();
        return x3;
    }

    getEncoded(): ArrayBuffer {
        const els = new Array<ArrayBuffer>();
        els.push(RLP.encode<Address>(this.currentReferrer));
        els.push(encodeAddrs(this.referrals));
        els.push(RLP.encode<bool>(this.blocked));
        els.push(RLP.encodeU64(this.reinvestCount));
        return RLP.encodeElements(els);
    }
}

export class X6 {
    currentReferrer: Address
    firstLevelReferrals: Address[]
    secondLevelReferrals: Address[]
    blocked: bool
    reinvestCount: u64
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
        x6.currentReferrer = new Address(li.getItem(0).bytes());
        x6.firstLevelReferrals = decodedAddrs(li.getRaw(1));
        x6.secondLevelReferrals = decodedAddrs(li.getRaw(2));
        x6.blocked = li.getItem(3).u8() != 0;
        x6.reinvestCount = li.getItem(4).u64();
        x6.closedPart = new Address(li.getItem(5).bytes());
        return x6;
    }

    getEncoded(): ArrayBuffer {
        const els = new Array<ArrayBuffer>();
        els.push(RLP.encode<Address>(this.currentReferrer));
        els.push(encodeAddrs(this.firstLevelReferrals));
        els.push(encodeAddrs(this.secondLevelReferrals));
        els.push(RLP.encode<bool>(this.blocked));
        els.push(RLP.encodeU64(this.reinvestCount));
        els.push(RLP.encode<Address>(this.closedPart));
        return RLP.encodeElements(els);
    }
}


