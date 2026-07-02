package com.example.menu.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDTO {
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;
    
    private String name;
    private String description;
    private String imageUrl;
    private Double price;
    private Long categoryId;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String categoryName;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Boolean isActive;
    
    private Integer discountPercentage;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Double discountedPrice;
    
    private List<ProductIngredientDTO> ingredients;
}
