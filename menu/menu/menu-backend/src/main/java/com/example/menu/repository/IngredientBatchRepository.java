package com.example.menu.repository;

import com.example.menu.entity.IngredientBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IngredientBatchRepository extends JpaRepository<IngredientBatch, Long> {
    List<IngredientBatch> findByIngredientIdAndRemainingQuantityGreaterThanOrderByExpirationDateAsc(Long ingredientId, Double remainingQuantity);
    List<IngredientBatch> findByIngredientId(Long ingredientId);
    List<IngredientBatch> findByRemainingQuantityGreaterThanAndExpirationDateBefore(Double remainingQuantity, java.time.LocalDate expirationDate);
}
