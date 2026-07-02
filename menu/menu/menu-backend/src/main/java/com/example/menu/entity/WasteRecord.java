package com.example.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "waste_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WasteRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(nullable = false)
    private Double quantity;

    @Column(nullable = false)
    private String unit;

    @Column(nullable = false)
    private String reason; // e.g., "Expired", "Spoiled", "Spilled", "Other"

    @Column(name = "waste_date", nullable = false)
    @Builder.Default
    private LocalDateTime wasteDate = LocalDateTime.now();

    @Column(name = "financial_loss", nullable = false)
    private Double financialLoss;
}
