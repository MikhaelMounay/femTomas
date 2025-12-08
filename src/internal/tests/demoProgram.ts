import type { Instruction } from "../types/Instruction";
import { InstructionType } from "../types/InstructionType";

// export const demoProgram: Instruction[] = [
//     { _id: 1, type: InstructionType.LOAD, dest: 2, src1: 1, offset: 0, _text: "LOAD R2, 0(R1)" },
//     { _id: 2, type: InstructionType.ADD, dest: 3, src1: 2, src2: 4, _text: "Start: ADD R3, R2, R4" },
//     { _id: 3, type: InstructionType.MUL, dest: 5, src1: 3, src2: 2, _text: "MUL R5, R3, R2" },
//     { _id: 4, type: InstructionType.STORE, src1: 1, src2: 5, offset: 4, _text: "STORE R5, 4(R1)" },
//     { _id: 5, type: InstructionType.BEQ, src1: 2, src2: 3, offset: 2, _text: "BEQ R2, R3, 2" },
//     // { _id: 5, type: InstructionType.CALL, label: 1, _text: "CALL Start" },
//     { _id: 6, type: InstructionType.ADD, dest: 6, src1: 2, src2: 4, _text: "ADD R6, R2, R4" },
//     { _id: 7, type: InstructionType.MUL, dest: 7, src1: 3, src2: 2, _text: "MUL R7, R3, R2" },
// ];

export const demoProgram: Instruction[] = [
    { _id: 0, type: InstructionType.LOAD, dest: 1, src1: 0, offset: 4, _text: "LOAD R1, 4(R0)" },
    { _id: 1, type: InstructionType.LOAD, dest: 2, src1: 0, offset: 8, _text: "LOAD R2, 8(R0)" },
    { _id: 2, type: InstructionType.LOAD, dest: 3, src1: 0, offset: 12, _text: "LOAD R3, 12(R0)" },
    { _id: 3, type: InstructionType.ADD, dest: 4, src1: 3, src2: 2, _text: "ADD R4, R3, R2" },
    { _id: 4, type: InstructionType.NAND, dest: 5, src1: 4, src2: 3, _text: "NAND R5, R4, R3" },
    { _id: 5, type: InstructionType.MUL, dest: 5, src1: 5, src2: 2, _text: "MUL R5, R5, R2" },
    { _id: 6, type: InstructionType.SUB, dest: 6, src1: 5, src2: 3, _text: "SUB R6, R5, R3" },
    { _id: 7, type: InstructionType.CALL, label: 9, _text: "CALL L" },
    { _id: 8, type: InstructionType.STORE, src1: 0, src2: 6, offset: 4, _text: "STORE R6, 4(R0)" },
    { _id: 9, type: InstructionType.ADD, dest: 1, src1: 1, src2: 1, _text: "L: ADD R1, R1, R1" },
    { _id: 10, type: InstructionType.SUB, dest: 1, src1: 1, src2: 1, _text: "SUB R1, R1, R1" },
    { _id: 11, type: InstructionType.RET, _text: "RET" },
];
