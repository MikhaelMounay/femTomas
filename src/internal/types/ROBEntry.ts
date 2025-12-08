import type { Register } from "./Register";

export interface ROBEntry {
    _id: number; // unique id matching instruction.id
    _instrId: number;
    dest?: Register | undefined; // which register will be written
    ready: boolean;
    value?: number;
    // for STORE: address and value to be stored
    address?: number;
    storeValue?: number;
    // for BEQ: branch prediction info
    predictedPC?: number; // predicted next PC
    branchTarget?: number; // actual branch target
    branchTaken?: boolean; // was branch actually taken?
    mispredicted?: boolean; // was prediction wrong?
    flushed?: boolean; // was this instruction flushed?
    // for CALL: target address and return address
    callTarget?: number; // address to jump to
    returnAddress?: number; // PC+1 to save in R1
    // for RET: return target
    returnTarget?: number; // address from R1 to jump to
    isControlFlow?: boolean; // marks CALL/RET instructions for unconditional jumping
    // state tracking
    issuedCycle?: number;
    execStartCycle?: number;
    execCompleteCycle?: number;
    writeResultCycle?: number;
    commitCycle?: number;
}
