// Type declarations for @citadel/database mock module
declare module '@citadel/database' {
    export interface QueryResult<T = any> {
        rows: T[];
        rowCount: number;
    }

    export function query<T = any>(
        sql: string,
        params?: any[]
    ): Promise<QueryResult<T>>;

    export function transaction<T = any>(
        callback: (client: any) => Promise<T>
    ): Promise<T>;
}
