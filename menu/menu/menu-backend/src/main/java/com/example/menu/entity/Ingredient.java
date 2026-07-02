package com.example.menu.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ingredients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String unit;

    @Builder.Default
    @Column(name = "minimum_stock_level")
    private Double minimumStockLevel = 0.0;

    @Builder.Default
    @Column(name = "is_active")
    private boolean isActive = true;
}