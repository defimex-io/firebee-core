declare type Address = string;
export declare const MAX_LEVEL = 12;
export declare class User {
    id: number;
    referrer: Address;
    partnersCount: number;
    activeX3Levels: boolean[];
    activeX6Levels: boolean[];
    x3Matrix: Array<X3>;
    x6Matrix: Array<X6>;
    constructor(id: number, referrer: Address, patnersCount: number);
    static fromEncoded(buf: Uint8Array): User;
}
export declare class X3 {
    currentReferrer: Address;
    referrals: Address[];
    blocked: boolean;
    reinvestCount: number;
    constructor();
    static fromEncoded(buf: ArrayBuffer): X3;
}
export declare class X6 {
    currentReferrer: Address;
    firstLevelReferrals: Address[];
    secondLevelReferrals: Address[];
    blocked: boolean;
    reinvestCount: number;
    closedPart: Address;
    constructor();
    static fromEncoded(buf: ArrayBuffer): X6;
}
export {};
