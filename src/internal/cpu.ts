import type { FunctionalUnit } from "./types/FunctionalUnit";
import type { Instruction } from "./types/Instruction";
import { InstructionType } from "./types/InstructionType";
import type { Memory } from "./types/Memory";
import type { RegisterFile } from "./types/RegisterFile";
import type { ReservationStation } from "./types/ReservationStation";
import type { ROBEntry } from "./types/ROBEntry";

export class CPU {
    cycle: number = 1;
    program: Instruction[] = [];
    pc: number = 0;

    registers: RegisterFile = new Array(8).fill(0);
    memory: Memory = new Map();

    // ReOrder Buffer (ROB)
    rob: ROBEntry[] = [];
    robSize: number;

    // Reservation Stations (RS)
    reservationStationsMap: Map<string, ReservationStation[]> = new Map();

    // Functional Units (FU)
    functionalUnits: FunctionalUnit[] = [];

    // bookkeeping for output
    instrTiming: Map<number, Partial<ROBEntry>> = new Map();

    // Branch prediction state
    branchMispredictions: number = 0;
    totalBranches: number = 0;

    constructor() {
        this.robSize = 8;

        // initialize functional units from project spec (simplified)
        this.functionalUnits = [
            { name: "LOAD", count: 2, latency: 6 },
            { name: "STORE", count: 1, latency: 6 },
            { name: "BEQ", count: 2, latency: 1 },
            { name: "CALL", count: 1, latency: 1 },
            { name: "ADD", count: 4, latency: 2 },
            { name: "NAND", count: 2, latency: 1 },
            { name: "MUL", count: 1, latency: 12 },
        ];

        // create reservation stations for each FU with their specified count
        for (const fu of this.functionalUnits) {
            const arr: ReservationStation[] = [];
            for (let i = 0; i < fu.count; i++) {
                arr.push({ name: `${fu.name}_${i}`, busy: false, Vj: null, Vk: null, Qj: null, Qk: null, _destROBId: null });
            }
            this.reservationStationsMap.set(fu.name, arr);
        }
    }

    loadProgram(program: Instruction[]) {
        this.program = program.slice(); // create an internal copy of the passed program
        this.pc = 0;
    }

    // Initialize or update memory with data
    loadMemory(memoryData: Map<number, number> | Record<number, number>) {
        if (memoryData instanceof Map) {
            this.memory = new Map(memoryData);
        } else {
            // Convert object to Map
            this.memory = new Map(Object.entries(memoryData).map(([addr, val]) => [Number(addr), val]));
        }
    }

    reset() {
        this.cycle = 1;
        this.pc = 0;
        this.rob = [];
        this.instrTiming.clear();
        this.registers.fill(0);
        this.memory.clear();
        this.reservationStationsMap.clear();
        this.branchMispredictions = 0;
        this.totalBranches = 0;

        // re-create reservation stations for each FU with their specified count
        for (const fu of this.functionalUnits) {
            const arr: ReservationStation[] = [];
            for (let i = 0; i < fu.count; i++) {
                arr.push({ name: `${fu.name}_${i}`, busy: false, Vj: null, Vk: null, Qj: null, Qk: null, _destROBId: null });
            }
            this.reservationStationsMap.set(fu.name, arr);
        }
    }

    // simplified issue stage: try to issue one instruction per cycle
    // return value: issue successful (true) or stalled (false)
    issue(): boolean {
        if (this.pc >= this.program.length) return false; // program ended: nothing to issue

        // check ROB capacity
        if (this.rob.length >= this.robSize) return false; // stall

        const instr = this.program[this.pc]!;

        // pick RS type
        const fuName = this.getFuForInstr(instr.type);
        const stations = this.reservationStationsMap.get(fuName);
        if (!stations) return false;

        // find free RS
        const freeStation = stations.find((s) => !s.busy);
        if (!freeStation) return false; // no free RS: stall

        // allocate ROB entry
        const robId = this.allocateROB(instr);

        // fill RS
        freeStation.busy = true;
        freeStation.op = instr.type;
        freeStation._destROBId = robId;
        freeStation._instrId = instr._id;

        // For LOAD/STORE: store offset and handle base register
        if (instr.type === InstructionType.LOAD || instr.type === InstructionType.STORE) {
            freeStation.offset = instr.offset ?? 0;

            // src1 is the base register for address calculation
            if (instr.src1 !== undefined) {
                const pending = this.findROBWritingReg(instr.src1);
                if (pending) {
                    freeStation.Qj = pending._id;
                    freeStation.Vj = null;
                } else {
                    freeStation.Vj = this.registers[instr.src1]!;
                    freeStation.Qj = null;
                }
            }

            // For STORE: src2 is the value to store
            if (instr.type === InstructionType.STORE && instr.src2 !== undefined) {
                const pending = this.findROBWritingReg(instr.src2);
                if (pending) {
                    freeStation.Qk = pending._id;
                    freeStation.Vk = null;
                } else {
                    freeStation.Vk = this.registers[instr.src2]!;
                    freeStation.Qk = null;
                }
            }
        } else if (instr.type === InstructionType.BEQ) {
            // For BEQ: src1 and src2 are the registers to compare
            freeStation.offset = instr.offset ?? 0; // branch target offset

            if (instr.src1 !== undefined) {
                const pending = this.findROBWritingReg(instr.src1);
                if (pending) {
                    freeStation.Qj = pending._id;
                    freeStation.Vj = null;
                } else {
                    freeStation.Vj = this.registers[instr.src1]!;
                    freeStation.Qj = null;
                }
            }

            if (instr.src2 !== undefined) {
                const pending = this.findROBWritingReg(instr.src2);
                if (pending) {
                    freeStation.Qk = pending._id;
                    freeStation.Vk = null;
                } else {
                    freeStation.Vk = this.registers[instr.src2]!;
                    freeStation.Qk = null;
                }
            }

            freeStation.branchTarget = this.pc + (instr.offset ?? 0); // actual target if taken
        } else if (instr.type === InstructionType.CALL) {
            // CALL: Store PC+1 in R1 and jump to label
            const robEntry = this.rob.find((r) => r._id === robId)!;
            robEntry.dest = 1; // CALL writes return address to R1

            freeStation.callTarget = instr.label ?? 0;
            freeStation.returnAddress = this.pc + 1;
        } else if (instr.type === InstructionType.RET) {
            // RET: Jump to address in R1
            const pending = this.findROBWritingReg(1); // Check if R1 is being written
            if (pending) {
                freeStation.Qj = pending._id;
                freeStation.Vj = null;
            } else {
                freeStation.Vj = this.registers[1]!; // return address
                freeStation.Qj = null;
            }
        } else {
            // operand handling for non-memory, non-branch instructions
            if (instr.src1 !== undefined) {
                const pending = this.findROBWritingReg(instr.src1);
                if (pending) {
                    freeStation.Qj = pending._id;
                    freeStation.Vj = null;
                } else {
                    freeStation.Vj = this.registers[instr.src1]!;
                    freeStation.Qj = null;
                }
            }
            if (instr.src2 !== undefined) {
                const pending = this.findROBWritingReg(instr.src2);
                if (pending) {
                    freeStation.Qk = pending._id;
                    freeStation.Vk = null;
                } else {
                    freeStation.Vk = this.registers[instr.src2]!;
                    freeStation.Qk = null;
                }
            }
        }

        // store timing
        const robEntry = this.rob.find((r) => r._id === robId)!;
        robEntry.issuedCycle = this.cycle;
        this.instrTiming.set(instr._id, { _instrId: instr._id, issuedCycle: this.cycle });

        return true;
    }

    // execute: decrement (remaining) for RS whose operands are ready
    execute() {
        for (const [fuName, stations] of this.reservationStationsMap.entries()) {
            for (const rs of stations) {
                if (!rs.busy) continue;

                // check if operands are ready
                let ready = false;
                if (rs.op === InstructionType.LOAD) {
                    // LOAD needs only base register (Vj) to start address computation
                    ready = rs.Qj === null || rs.Qj === undefined;
                } else if (rs.op === InstructionType.STORE) {
                    // STORE can start address computation with just base register (Vj)
                    // But needs both Vj and Vk to be ready before starting memory write phase
                    // We check this in two phases below
                    ready = rs.Qj === null || rs.Qj === undefined;
                } else if (rs.op === InstructionType.CALL) {
                    // CALL doesn't need operands, always ready
                    ready = true;
                } else if (rs.op === InstructionType.RET) {
                    // RET needs R1 value (in Vj)
                    ready = rs.Qj === null || rs.Qj === undefined;
                } else {
                    // Other instructions
                    const needsTwo = rs.op && this.needsTwoOperands(rs.op);
                    ready = (rs.Qj === null || rs.Qj === undefined) && (!needsTwo || rs.Qk === null || rs.Qk === undefined);
                }

                if (ready) {
                    if (rs.remaining === undefined) {
                        // Start execution: set remaining from FU specs
                        const fu = this.functionalUnits.find((f) => f.name === fuName)!;

                        // For LOAD/STORE, only start address computation phase (2 cycles)
                        if (rs.op === InstructionType.LOAD || rs.op === InstructionType.STORE) {
                            rs.remaining = 2; // Address computation: 2 cycles
                        } else {
                            rs.remaining = fu.latency; // Full latency for other instructions
                        }

                        // Record start cycle
                        const rob = this.rob.find((r) => r._id === rs._destROBId)!;
                        if (rob.execStartCycle === undefined) rob.execStartCycle = this.cycle;
                        this.instrTiming.get(rs._instrId!)!.execStartCycle = rob.execStartCycle;
                    }

                    // Decrement remaining cycles
                    if (rs.remaining !== undefined && rs.remaining > 0) {
                        rs.remaining -= 1;
                    }

                    if (rs.remaining === 0) {
                        // Check if this is end of address computation phase for LOAD/STORE
                        if (
                            (rs.op === InstructionType.LOAD || rs.op === InstructionType.STORE) &&
                            rs.storeAddress === undefined &&
                            rs.computedValue === undefined
                        ) {
                            // Address computation complete, compute the address
                            const a = rs.Vj ?? 0;
                            const address = (a + (rs.offset ?? 0)) & 0xffff;

                            if (rs.op === InstructionType.LOAD) {
                                // For LOAD: save computed address and start memory access phase
                                rs.computedValue = address; // Save the computed address
                                rs.remaining = 4; // Memory access: 4 cycles
                            } else if (rs.op === InstructionType.STORE) {
                                // For STORE: save computed address
                                rs.storeAddress = address;

                                // Check if store value (Vk) is ready
                                if (rs.Qk === null || rs.Qk === undefined) {
                                    // Value is ready, start memory write phase
                                    rs.storeValue = rs.Vk ?? 0;
                                    rs.remaining = 4; // Memory write: 4 cycles
                                } else {
                                    // Value not ready yet, wait
                                    rs.waitingForData = true;
                                    rs.remaining = undefined; // Clear remaining since we're waiting
                                }
                            }
                            continue; // Don't mark as complete yet
                        }

                        // Special handling for STORE waiting for data
                        if (rs.op === InstructionType.STORE && rs.waitingForData) {
                            // Check if store value is now ready
                            if (rs.Qk === null || rs.Qk === undefined) {
                                rs.storeValue = rs.Vk ?? 0;
                                rs.remaining = 4; // Start memory write phase
                                rs.waitingForData = false;
                            }
                            continue; // Don't mark as complete yet
                        }

                        // Execution finished
                        const rob = this.rob.find((r) => r._id === rs._destROBId)!;
                        if (rob.ready) continue; // already marked ready

                        rob.execCompleteCycle = this.cycle;
                        this.instrTiming.get(rs._instrId!)!.execCompleteCycle = this.cycle;

                        // Compute actual result
                        if (rs.op === InstructionType.CALL) {
                            // CALL: value to write to R1 is the return address
                            rs.computedValue = rs.returnAddress; // Store in RS
                            rob.value = rs.computedValue; // Copy to ROB
                        } else if (rs.op === InstructionType.RET) {
                            rs.computedValue = rs.Vj ?? 0; // Return address from R1
                        } else if (rs.op === InstructionType.BEQ) {
                            // For BEQ, determine if branch should be taken
                            const a = rs.Vj ?? 0;
                            const b = rs.Vk ?? 0;
                            const branchTaken = a === b;
                            rs.branchTaken = branchTaken;

                            // Check for misprediction (we predicted not-taken)
                            rs.mispredicted = branchTaken;
                            rob.value = rs.branchTaken ? 1 : 0;
                        } else if (rs.op === InstructionType.STORE) {
                            // For STORE, address and value are already computed
                            rob.value = rs.storeAddress;
                        } else if (rs.op === InstructionType.LOAD) {
                            // For LOAD, read from memory using computed address
                            const value = this.memory.get(rs.computedValue ?? 0) ?? 0;
                            rob.value = value;
                        } else {
                            // Regular ALU operations
                            const _computedResult = this.computeResult(rs);
                            rob.value = _computedResult;
                        }

                        // Ready to be written in the next stage
                        rob.ready = true;
                    }
                }
            }
        }
    }

    write() {
        // write results of a single ROB entry per cycle (single issue is assumed to have a single Common Data Bus)
        // STORE instructions skip the write stage since they don't write to registers
        const readyRob = this.rob.find(
            (r) => r.ready && r.writeResultCycle === undefined && r.type !== InstructionType.STORE
        );
        if (!readyRob) return;

        // Find corresponding RS to get instruction-specific data before freeing it
        let rs: ReservationStation | undefined;
        for (const stations of this.reservationStationsMap.values()) {
            rs = stations.find((s) => s._destROBId === readyRob._id);
            if (rs) break;
        }

        // Save control flow data to ROB before freeing RS
        if (rs) {
            if (rs.op === InstructionType.BEQ) {
                // Save branch-specific data to ROB for commit stage
                readyRob.branchTarget = rs.branchTarget;
                readyRob.mispredicted = rs.mispredicted;
            } else if (rs.op === InstructionType.CALL) {
                // Save call target to ROB for commit stage
                readyRob.callTarget = rs.callTarget;
            } else if (rs.op === InstructionType.RET) {
                // Save return address to ROB for commit stage
                readyRob.returnAddress = rs.computedValue;
            }
        }

        // For branches and calls, don't broadcast values, just mark as written
        let isControlFlowNoValue = false;
        if (rs) {
            // Don't broadcast for RET or mispredicted branches
            if (rs.mispredicted || readyRob.type === InstructionType.RET) {
                isControlFlowNoValue = true;
            }
        }

        if (!isControlFlowNoValue) {
            // Normal writing: write to waiting RS & clear Qj/Qk
            // (actual writing to the RegFile or Mem is in the Commit stage)
            for (const stations of this.reservationStationsMap.values()) {
                for (const rsEntry of stations) {
                    if (!rsEntry.busy) continue;
                    if (rsEntry.Qj === readyRob._id) {
                        rsEntry.Qj = null;
                        rsEntry.Vj = readyRob.value ?? null;
                    }
                    if (rsEntry.Qk === readyRob._id) {
                        rsEntry.Qk = null;
                        rsEntry.Vk = readyRob.value ?? null;
                    }
                }
            }
        }

        // mark write result
        readyRob.writeResultCycle = this.cycle;
        this.instrTiming.get(readyRob._instrId)!.writeResultCycle = this.cycle;

        // FREE RESERVATION STATION after writing (not in commit)
        this.freeReservationStation(readyRob._id, readyRob._instrId);
    }

    commit() {
        // commit in program order: head of ROB
        if (this.rob.length === 0) return;
        const head = this.rob[0]!;

        // STORE instructions skip write stage and commit directly after execution
        if (head.type === InstructionType.STORE) {
            if (!head.ready) return; // execution not complete yet

            // Find corresponding RS to get store data before freeing
            let rs: ReservationStation | undefined;
            for (const stations of this.reservationStationsMap.values()) {
                rs = stations.find((s) => s._destROBId === head._id);
                if (rs) break;
            }

            // Save store data to ROB if not already saved
            if (rs) {
                head.storeAddress = rs.storeAddress;
                head.storeValue = rs.storeValue;
            }

            // Write to memory
            if (head.storeAddress !== undefined && head.storeValue !== undefined) {
                this.memory.set(head.storeAddress, head.storeValue);
            }

            // Mark as committed (skip write stage)
            head.commitCycle = this.cycle;
            this.instrTiming.get(head._instrId)!.commitCycle = this.cycle;

            // FREE RESERVATION STATION at commit for STORE
            this.freeReservationStation(head._id, head._instrId);

            this.rob.shift();
            return;
        }

        if (!head.writeResultCycle) return; // still not written: cannot commit

        // Handle CALL instruction
        if (head.type === InstructionType.CALL) {
            // Write return address (PC+1) to R1 according to CALL instruction specifications
            if (head.dest === 1) {
                this.registers[1] = head.value ?? 0; // return address
            }

            // Flush pipeline: remove all instructions after CALL (they were speculatively fetched)
            this.flushPipeline(head._instrId);

            // Update PC to jump to target
            this.pc = head.callTarget ?? this.pc;

            head.commitCycle = this.cycle;
            this.instrTiming.get(head._instrId)!.commitCycle = this.cycle;
            this.rob.shift();
            return;
        }

        // Handle RET instruction
        if (head.type === InstructionType.RET) {
            // Flush pipeline: remove all instructions after RET (they were speculatively fetched)
            this.flushPipeline(head._instrId);

            // Update PC to return address from R1
            this.pc = head.returnAddress ?? this.pc;

            head.commitCycle = this.cycle;
            this.instrTiming.get(head._instrId)!.commitCycle = this.cycle;
            this.rob.shift();
            return;
        }

        // Handle branch misprediction
        if (head.type === InstructionType.BEQ) {
            this.totalBranches++;

            if (head.mispredicted) {
                this.branchMispredictions++;
                // Flush pipeline: remove all instructions after this branch
                this.flushPipeline(head._instrId);
                // Update PC to branch target
                this.pc = head.branchTarget ?? this.pc;
            }

            head.commitCycle = this.cycle;
            this.instrTiming.get(head._instrId)!.commitCycle = this.cycle;
            this.rob.shift();
            return;
        }

        // Normal commit (non-branch) to register file
        if (head.dest !== undefined && head.dest !== 0) {
            // R0 is a read-only zero register
            this.registers[head.dest] = head.value ?? 0;
        }

        head.commitCycle = this.cycle;
        this.instrTiming.get(head._instrId)!.commitCycle = this.cycle;
        this.rob.shift();
    }

    step() {
        // perform pipeline: commit, write, execute, issue in this simple schedule
        // reversed order is to commit first to allow commit and free RS
        this.commit();
        this.write();
        this.execute();
        const issueSuccessful = this.issue();

        if (this.pc <= this.program.length && issueSuccessful) {
            this.pc += 1; // speculatively advance PC (always-not-taken prediction)
        }

        this.cycle += 1;
    }

    run(maxCycles = 1000) {
        while ((this.pc < this.program.length || this.rob.length > 0) && this.cycle < maxCycles) {
            this.step();
        }
        return {
            cycles: this.cycle - 1,
            instrTiming: this.instrTiming,
            branchStats: {
                total: this.totalBranches,
                mispredictions: this.branchMispredictions,
                accuracy:
                    this.totalBranches > 0
                        ? (((this.totalBranches - this.branchMispredictions) / this.totalBranches) * 100).toFixed(2) + "%"
                        : "N/A",
            },
        };
    }

    // helpers
    private allocateROB(instr: Instruction): number {
        const _id = this.rob.length === 0 ? 1 : this.rob[this.rob.length - 1]!._id + 1;
        const entry: ROBEntry = {
            _id,
            _instrId: instr._id,
            type: instr.type, // Store instruction type
            dest: instr.dest,
            ready: false,
        };
        this.rob.push(entry);
        return _id;
    }

    private findROBWritingReg(reg: number): ROBEntry | undefined {
        // find ROB entry that will write to this register
        // search from the end for latest instructions that write to reg
        // exclude the current instruction (i=length-2) to avoid false dependencies
        for (let i = this.rob.length - 2; i >= 0; i--) {
            const r = this.rob[i]!;
            if (r.dest === reg && !r.ready) return r;
        }
        return undefined;
    }

    private getFuForInstr(kind: InstructionType): string {
        switch (kind) {
            case InstructionType.LOAD:
                return "LOAD";
            case InstructionType.STORE:
                return "STORE";
            case InstructionType.BEQ:
                return "BEQ";
            case InstructionType.CALL:
            case InstructionType.RET:
                return "CALL";
            case InstructionType.ADD:
            case InstructionType.SUB:
                return "ADD";
            case InstructionType.NAND:
                return "NAND";
            case InstructionType.MUL:
                return "MUL";
            default:
                return "ADD";
        }
    }

    private needsTwoOperands(op?: InstructionType) {
        if (!op) return true;
        return op !== InstructionType.LOAD && op !== InstructionType.CALL && op !== InstructionType.RET;
    }

    private computeResult(rs: ReservationStation): number {
        // very simplistic compute based on Vj/Vk
        const op = rs.op;
        const a = rs.Vj ?? 0;
        const b = rs.Vk ?? 0;
        // results are masked to 16 bits
        switch (op) {
            case InstructionType.ADD:
                return (a + b) & 0xffff;
            case InstructionType.SUB:
                return (a - b) & 0xffff;
            case InstructionType.NAND:
                return ~(a & b) & 0xffff;
            case InstructionType.MUL:
                return (a * b) & 0xffff;
            case InstructionType.LOAD:
                // Compute address: base register (Vj) + offset
                const loadAddr = (a + (rs.offset ?? 0)) & 0xffff;
                // Read from memory
                return this.memory.get(loadAddr) ?? 0;
            case InstructionType.STORE:
                const storeAddr = (a + (rs.offset ?? 0)) & 0xffff;
                // Return the address (actual memory write happens in commit)
                return storeAddr;
            case InstructionType.BEQ:
                // For BEQ, compute whether branch is taken (1) or not (0)
                return a === b ? 1 : 0;
            default:
                return 0;
        }
    }

    // Helper to flush pipeline on misprediction
    private flushPipeline(branchInstrId: number) {
        // Remove all ROB entries after the branch
        const branchIdx = this.rob.findIndex((r) => r._instrId === branchInstrId);
        if (branchIdx === -1) return;

        const toRemove = this.rob.slice(branchIdx + 1);

        // Free reservation stations for flushed instructions
        for (const entry of toRemove) {
            this.freeReservationStation(entry._id, entry._instrId);
            // Mark instruction as squashed in timing
            const timing = this.instrTiming.get(entry._instrId);
            if (timing) {
                timing.flushed = true;
            }
        }

        // Remove from ROB
        this.rob = this.rob.slice(0, branchIdx + 1);
    }

    // Helper to free reservation station
    private freeReservationStation(robId: number, instrId: number) {
        for (const stations of this.reservationStationsMap.values()) {
            for (const rs of stations) {
                if (rs._destROBId === robId || rs._instrId === instrId) {
                    rs.busy = false;
                    rs.op = undefined;
                    rs.Vj = null;
                    rs.Vk = null;
                    rs.Qj = null;
                    rs.Qk = null;
                    rs._destROBId = null;
                    rs._instrId = null;
                    rs.remaining = undefined;
                    rs.offset = undefined;
                    rs.branchTarget = undefined;
                    rs.callTarget = undefined;
                    rs.returnAddress = undefined;
                    rs.computedValue = undefined;
                    rs.storeAddress = undefined;
                    rs.storeValue = undefined;
                    rs.branchTaken = undefined;
                    rs.mispredicted = undefined;
                    rs.waitingForData = undefined;
                }
            }
        }
    }
}
