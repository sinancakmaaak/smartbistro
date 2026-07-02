package com.example.menu.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WasteRecordDTO {
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;
    
    private Long ingredientId;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String ingredientName;
    
    private Double quantity;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String unit;
    
    private String reason;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime wasteDate;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Double financialLoss;
}
