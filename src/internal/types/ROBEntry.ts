import type { Register } from "./Register";

export interface ROBEntry {
    _id: number;        // unique id matching instruction.id
    _instrId: number;
    dest?: Register | undefined;    // which register will be written
    ready: boolean;
    value?: number;
    // for STORE: address and value to be stored
    address?: number;
    storeValue?: number;
    // state tracking
    issuedCycle?: number;
    execStartCycle?: number;
    execCompleteCycle?: number;
    writeResultCycle?: number;
    commitCycle?: number;
}
