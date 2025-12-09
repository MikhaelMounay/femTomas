.data
    .word 10
    .word -1
    .word 30
    
.text
    LOAD R2, 0(R1)
    LOAD R4, 4(R1)
    Start: ADD R3, R2, R4
    MUL R5, R3, R2
    STORE R5, 8(R1)
    BEQ R2, R3, Start
    ADD R6, R2, R4
    MUL R7, R3, R2
