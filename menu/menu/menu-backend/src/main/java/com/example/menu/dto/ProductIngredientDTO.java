package com.example.menu.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductIngredientDTO {
    private Long ingredientId;
    private String ingredientName;
    private Double amountUsed;
    private String unit;
}
