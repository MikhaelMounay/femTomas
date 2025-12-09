import type { Register } from "./Register";
import type { InstructionType } from "./InstructionType";

export interface ROBEntry {
    _id: number;
    _instrId: number;
    type: InstructionType; // instruction type (needed for commit logic)
    dest?: Register; // destination register (if any)
    ready: boolean; // is result ready?
    value?: number; // computed result value

    // State tracking (for statistics/visualization)
    issuedCycle?: number;
    execStartCycle?: number;
    execCompleteCycle?: number;
    writeResultCycle?: number;
    commitCycle?: number;
    flushed?: boolean; // was this instruction squashed?

    // Instruction-specific data (saved from RS before freeing)
    // Branch-specific
    branchTarget?: number;
    mispredicted?: boolean;

    // CALL-specific
    callTarget?: number;

    // RET-specific
    returnAddress?: number;

    // STORE-specific
    storeAddress?: number;
    storeValue?: number;
}
