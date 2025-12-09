.data
        .word 100
        .word 10
        .word 20
        .word 30

.text
        LOAD R2, 0(R0)
        ADD  R3, R0, R0
LOOP:   LOAD R4, 0(R2)
        BEQ  R4, R0, END
        ADD  R3, R3, R4
        ADD  R2, R2, R1
        BEQ  R0, R0, LOOP
END:    STORE R3, 1(R0)
        NAND R5, R3, R3
