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
        this.cycle = 0;
        this.pc = 0;
        this.rob = [];
        this.instrTiming.clear();
        this.registers.fill(0);
        this.memory.clear();
        this.reservationStationsMap.clear();

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
    issue() {
        if (this.pc >= this.program.length) return; // program ended: nothing to issue

        // check ROB capacity
        if (this.rob.length >= this.robSize) return; // stall

        const instr = this.program[this.pc]!;

        // pick RS type
        const fuName = this.getFuForInstr(instr.type);
        const stations = this.reservationStationsMap.get(fuName);
        if (!stations) return;

        // find free RS
        const freeStation = stations.find((s) => !s.busy);
        if (!freeStation) return; // no free RS: stall

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
        } else {
            // operand handling for non-memory instructions
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
        this.pc += 1; // advance PC as if fetched
    }

    // execute: decrement remaining for RS whose operands are ready
    execute() {
        for (const [fuName, stations] of this.reservationStationsMap.entries()) {
            for (const rs of stations) {
                if (!rs.busy) continue;

                // check if operands are ready
                let ready = false;
                if (rs.op === InstructionType.LOAD) {
                    // LOAD needs only base register (Vj)
                    ready = rs.Qj === null || rs.Qj === undefined;
                } else if (rs.op === InstructionType.STORE) {
                    // STORE needs both base register (Vj) and value to store (Vk)
                    ready = (rs.Qj === null || rs.Qj === undefined) && (rs.Qk === null || rs.Qk === undefined);
                } else {
                    // Other instructions
                    const needsTwo = rs.op && this.needsTwoOperands(rs.op);
                    ready = (rs.Qj === null || rs.Qj === undefined) && (!needsTwo || rs.Qk === null || rs.Qk === undefined);
                }

                if (ready) {
                    if (rs.remaining === undefined) {
                        // start execution: set remaining from FU specs
                        const fu = this.functionalUnits.find((f) => f.name === fuName)!;
                        rs.remaining = fu.latency - 1; // -1 because the execution starts this cycle
                        // record start cycle
                        const rob = this.rob.find((r) => r._id === rs._destROBId)!;
                        if (rob.execStartCycle === undefined) rob.execStartCycle = this.cycle;
                        this.instrTiming.get(rs._instrId!)!.execStartCycle = rob.execStartCycle;
                    } else if (rs.remaining > 0) {
                        rs.remaining -= 1;
                        if (rs.remaining === 0) {
                            // execution finished
                            const rob = this.rob.find((r) => r._id === rs._destROBId)!;
                            rob.execCompleteCycle = this.cycle;
                            this.instrTiming.get(rs._instrId!)!.execCompleteCycle = this.cycle;
                            // compute actual result
                            rob.value = this.computeResult(rs);
                            // For STORE, store the computed address for commit stage
                            if (rs.op === InstructionType.STORE) {
                                rob.address = rob.value; // address to write to
                                rob.storeValue = rs.Vk ?? 0; // value to store
                            }
                            // ready to be written in the next stage
                            rob.ready = true;
                        }
                    }
                }
            }
        }
    }

    write() {
        // TODO: for simplicity: write results of at most one ROB entry per cycle (common Tomasulo restriction)
        const readyRob = this.rob.find((r) => r.ready && r.writeResultCycle === undefined);
        if (!readyRob) return;
        // write to waiting RS & clear Qj/Qk (actual writing to the RegFile or Mem is in the Commit stage)
        for (const stations of this.reservationStationsMap.values()) {
            for (const rs of stations) {
                if (!rs.busy) continue;
                if (rs.Qj === readyRob._id) {
                    rs.Qj = null;
                    rs.Vj = readyRob.value ?? null;
                }
                if (rs.Qk === readyRob._id) {
                    rs.Qk = null;
                    rs.Vk = readyRob.value ?? null;
                }
            }
        }
        // mark write result
        readyRob.writeResultCycle = this.cycle;
        this.instrTiming.get(readyRob._instrId)!.writeResultCycle = this.cycle;
    }

    commit() {
        // commit in program order: head of ROB
        if (this.rob.length === 0) return;
        const head = this.rob[0]!;
        if (!head.writeResultCycle) return; // cannot commit

        // commit to register file or memory depending on instruction
        const instr = this.program.find((i) => i._id === head._instrId);
        if (instr) {
            if (instr.type === InstructionType.STORE) {
                // Write to memory
                if (head.address !== undefined && head.storeValue !== undefined) {
                    this.memory.set(head.address, head.storeValue);
                }
            } else if (head.dest !== undefined) {
                // Write to register (LOAD and other instructions)
                this.registers[head.dest] = head.value ?? 0;
            }
        }

        head.commitCycle = this.cycle;
        this.instrTiming.get(head._instrId)!.commitCycle = this.cycle;

        // free corresponding RS
        for (const stations of this.reservationStationsMap.values()) {
            for (const rs of stations) {
                if (rs._destROBId === head._id || rs._instrId === head._instrId) {
                    // TODO: note: this is simplistic; real logic should match rob id
                    rs.busy = false;
                    rs.op = InstructionType.ADD;    // let it be the default; it will be overridden anyway
                    rs.Vj = null;
                    rs.Vk = null;
                    rs.Qj = null;
                    rs.Qk = null;
                    rs._destROBId = null;
                    rs._instrId = null;
                    rs.remaining = 0;               // let it be the default; it will be overridden anyway
                }
            }
        }

        // remove head from ROB
        this.rob.shift();
    }

    step() {
        // perform pipeline: commit, write, execute, issue in this simple schedule
        // reversed order is to commit first to allow commit and free RS
        this.commit();
        this.write();
        this.execute();
        this.issue();
        
        // Debug logging per cycle (optional)
        console.log(`Cycle ${this.cycle}:`);
        console.log(`  PC=${this.pc}`);
        console.log(`  Registers=`);
        console.log(this.registers)
        console.log(`  Memory=`);
        console.log(this.memory);
        // console.log(`  ROB=`);
        // console.log(this.rob);
        // console.log(`  RS=`);
        // console.log(this.reservationStationsMap)
        
        this.cycle += 1;
    }

    run(maxCycles = 1000) {
        while ((this.pc < this.program.length || this.rob.length > 0) && this.cycle < maxCycles) {
            this.step();
        }
        return {
            cycles: this.cycle - 1,
            instrTiming: this.instrTiming,
        };
    }

    // helpers
    private allocateROB(instr: Instruction): number {
        const _id = this.rob.length === 0 ? 1 : this.rob[this.rob.length - 1]!._id + 1;
        const entry: ROBEntry = {
            _id,
            _instrId: instr._id,
            dest: instr.dest ?? undefined, // default to undefined if no dest
            ready: false,
        };
        this.rob.push(entry);
        return _id;
    }

    private findROBWritingReg(reg: number): ROBEntry | undefined {
        // find ROB entry that will write to this register
        // search from the end for latest instructions that write to reg
        for (let i = this.rob.length - 1; i >= 0; i--) {
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
        return (
            op !== InstructionType.LOAD &&
            op !== InstructionType.STORE &&
            op !== InstructionType.CALL &&
            op !== InstructionType.RET &&
            op !== InstructionType.BEQ
        );
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
            default:
                return 0;
        }
    }
}
