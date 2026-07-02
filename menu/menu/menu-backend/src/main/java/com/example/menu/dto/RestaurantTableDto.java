package com.example.menu.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantTableDto {
    private Long id;
    private String tableNumber;
    private Integer capacity;
    private String status;
    private Long zoneId;
    private String zoneName;
    private boolean isActive;
    private Double activeOrderAmount;
}
