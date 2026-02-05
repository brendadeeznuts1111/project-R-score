// Consciousness Ledger for tracking vault operations
export interface LedgerEntry {
    type: string;
    timestamp: string;
    data?: Record<string, any>;
    [key: string]: any; // Allow additional properties
}

export class ConsciousLedger {
    private static entries: LedgerEntry[] = [];

    static log(entry: { type: string;[key: string]: any }): void {
        const ledgerEntry: LedgerEntry = {
            ...entry,
            timestamp: new Date().toISOString()
        };

        this.entries.push(ledgerEntry);

        console.log(`📊 Ledger: ${entry.type}`, entry.data || '');
    }

    static getEntries(): LedgerEntry[] {
        return [...this.entries];
    }

    static clear(): void {
        this.entries = [];
    }
}
