package com.example.menu.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientBatchDTO {
    private Long id;
    private Long ingredientId;
    private String ingredientName;
    private Double quantity;
    private Double unitPrice;
    private LocalDate expirationDate;
    private LocalDateTime receivedDate;
}
