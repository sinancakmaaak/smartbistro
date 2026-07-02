package com.example.menu.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime orderDate;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Double totalAmount;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String status;
    
    private Long tableId;
    
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String tableName;
    
    private String paymentMethod;
    
    private Boolean isPrepared;
    
    private List<OrderItemDTO> items;
}
