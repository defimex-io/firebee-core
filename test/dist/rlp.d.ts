export interface Encoder {
    getEncoded(): Uint8Array;
}
export declare function toU8Arr(data: Uint8Array | ArrayBuffer): Uint8Array;
export declare function byteArrayToInt(bytes: ArrayBuffer | Uint8Array): number;
export declare function encodeHex(buf: ArrayBuffer | Uint8Array): string;
export declare function bin2str(bin: Uint8Array | ArrayBuffer): string;
export declare function str2bin(str: string): Uint8Array;
export declare function numberToByteArray(u: number): Uint8Array;
export declare function encodeElements(elements: Uint8Array[]): Uint8Array;
export declare function encodeString(s: string): Uint8Array;
export declare function encode(o: string | Array<any> | number | null | Uint8Array | ArrayBuffer | Encoder | boolean): Uint8Array;
export declare function decode(encoded: Uint8Array): Uint8Array | Array<any>;
export declare function decodeElements(enc: Uint8Array | ArrayBuffer): Uint8Array[];
export declare class RLPList {
    readonly elements: Uint8Array[];
    static EMPTY: RLPList;
    constructor(elements: Uint8Array[]);
    static fromEncoded(encoded: Uint8Array | ArrayBuffer): RLPList;
    list(index: number): RLPList;
    length(): number;
    raw(index: number): ArrayBuffer;
    isNull(index: number): boolean;
    number(idx: number): number;
    bool(idx: number): boolean;
    bytes(idx: number): Uint8Array;
}
export declare function decodeHex(s: string): Uint8Array;
