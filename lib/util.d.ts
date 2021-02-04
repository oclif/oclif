export declare function castArray<T>(input?: T | T[]): T[];
export declare function uniqBy<T>(arr: T[], fn: (cur: T) => any): T[];
export declare function compact<T>(a: (T | undefined)[]): T[];
export declare function sortBy<T>(arr: T[], fn: (i: T) => sort.Types | sort.Types[]): T[];
export declare namespace sort {
    type Types = string | number | undefined | boolean;
}
export declare const template: (context: any) => (t: string | undefined) => string;
