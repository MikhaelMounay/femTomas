# femTomas

A Tomasulo Algorithm simulator for RiSC-16, built with TypeScript and React-Vite for UI.

> This project is part of the course **CSCE 3301 - Computer Architecture** at AUC, Fall 2025.


---

## Supported ISA (RiSC-16)

>  A simplified RISC ISA inspired by the ISA of the Ridiculously Simple Computer (RiSC-16) proposed by *Bruce Jacob*.

The simulator supports the following 16-bit instructions:

### 1. Load/Store
- `LOAD rA, offset(rB)`

  Loads a word from memory into `rA`. Address = `rB` + 5-bit signed `offset` (−16 to 15).
- `STORE rA, offset(rB)`

  Stores value from `rA` into memory. Address = `rB` + 5-bit signed `offset`.

### 2. Conditional Branch
- `BEQ rA, rB, offset`

  Branches to `PC+1+offset` if `rA == rB`. Otherwise, PC increments by one.

### 3. Call/Return
- `CALL label`

  Stores `PC+1` in `R1` and jumps unconditionally to the address specified by the label (7-bit signed constant).
- `RET`

  Jumps unconditionally to the address stored in `R1`.

### 4. Arithmetic and Logic
- `ADD rA, rB, rC`

  Adds `rB` and `rC`, stores result in `rA`.
- `SUB rA, rB, rC`

  Subtracts `rC` from `rB`, stores result in `rA`.
- `NAND rA, rB, rC`

  Bitwise NAND of `rB` and `rC`, stores result in `rA`.
- `MUL rA, rB, rC`

  Multiplies `rB` by `rC`, stores least significant 16 bits of the result in `rA`.

---

## Assumptions
- If `R1` waiting to be written from an instruction in ROB, a `RET` instruction will be issued and wait for `R1` to be ready then return with the address as the new value written to `R1`.

