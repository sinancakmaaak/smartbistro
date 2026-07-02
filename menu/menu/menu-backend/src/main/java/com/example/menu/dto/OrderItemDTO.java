package com.example.menu.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemDTO {
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;
    
    private Long productId; 
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String productName;
    
    private int quantity; 
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Double subTotal;
    
    private Double priceOverride;
}
