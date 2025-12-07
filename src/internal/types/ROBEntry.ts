import type { Register } from "./Register";

export interface ROBEntry {
    _id: number;        // unique id matching instruction.id
    _instrId: number;
    dest?: Register;    // which register will be written
    ready: boolean;
    value?: number;
    // state tracking
    issuedCycle?: number;
    execStart?: number;
    execComplete?: number;
    writeResult?: number;
    commitCycle?: number;
}
