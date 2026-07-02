package com.example.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ingredient_batches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(nullable = false)
    private Double quantity; // Initial quantity purchased

    @Column(name = "remaining_quantity", nullable = false)
    @Builder.Default
    private Double remainingQuantity = 0.0; // Current stock of this specific batch

    @Column(name = "unit_price")
    private Double unitPrice; // Cost of this specific batch

    private String unit; // Unit of measurement for this batch

    @Column(name = "expiration_date")
    private LocalDate expirationDate; // When this batch expires

    @Column(name = "received_date")
    @Builder.Default
    private LocalDateTime receivedDate = LocalDateTime.now(); // When it was added to stock
}
