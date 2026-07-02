package com.example.menu.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientDTO {
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;
    
    private String name;
    private String unit;
    private Double minimumStockLevel;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Double totalQuantity; // Computed from batches
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Boolean isActive;
}