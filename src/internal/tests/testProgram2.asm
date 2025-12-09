.data
        .word 0
        .word 10
        .word 20
        .word 30

.text
        LOAD R1, 4(R0)
        LOAD R2, 8(R0)
        LOAD R3, 12(R0)
        ADD R4, R3, R2
        STORE R4, 0(R0)
        NAND R5, R4, R3
        MUL R5, R5, R2
        SUB R6, R5, R3
        BEQ R0, R0, Exit
        CALL L
        STORE R6, 4(R0)
L:      ADD R1, R1, R1
        SUB R1, R1, R1
        RET
Exit:
