package com.example.menu.service;

import com.example.menu.dto.IngredientBatchDTO;
import com.example.menu.dto.IngredientDTO;
import com.example.menu.entity.Ingredient;
import com.example.menu.entity.IngredientBatch;
import com.example.menu.repository.IngredientBatchRepository;
import com.example.menu.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor 
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final IngredientBatchRepository batchRepository;

    public List<IngredientDTO> getAllActiveIngredients() {
        return ingredientRepository.findAllByIsActiveTrue()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public IngredientDTO getIngredientById(Long id) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found with id: " + id));
        return convertToDTO(ingredient);
    }

    public IngredientDTO createIngredient(IngredientDTO dto) {
        Ingredient ingredient = Ingredient.builder()
                .name(dto.getName())
                .unit(dto.getUnit())
                .minimumStockLevel(dto.getMinimumStockLevel())
                .isActive(true)
                .build();
        Ingredient savedIngredient = ingredientRepository.save(ingredient);
        return convertToDTO(savedIngredient);
    }

    public IngredientDTO updateIngredient(Long id, IngredientDTO dto) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found with id: " + id));

        ingredient.setName(dto.getName());
        ingredient.setUnit(dto.getUnit());
        ingredient.setMinimumStockLevel(dto.getMinimumStockLevel());
        
        Ingredient updatedIngredient = ingredientRepository.save(ingredient);
        return convertToDTO(updatedIngredient);
    }

    public void deleteIngredient(Long id) {
        Ingredient ingredient = ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingredient not found with id: " + id));
        ingredient.setActive(false); 
        ingredientRepository.save(ingredient);
    }

    public List<IngredientBatchDTO> getBatchesByIngredientId(Long id) {
        return batchRepository.findByIngredientIdAndRemainingQuantityGreaterThanOrderByExpirationDateAsc(id, 0.0)
                .stream()
                .map(b -> IngredientBatchDTO.builder()
                        .id(b.getId())
                        .ingredientId(b.getIngredient().getId())
                        .ingredientName(b.getIngredient().getName())
                        .quantity(b.getRemainingQuantity()) // Show remaining quantity to user
                        .unitPrice(b.getUnitPrice())
                        .expirationDate(b.getExpirationDate())
                        .receivedDate(b.getReceivedDate())
                        .build())
                .collect(Collectors.toList());
    }

    public List<IngredientBatchDTO> getExpiredBatches() {
        return batchRepository.findByRemainingQuantityGreaterThanAndExpirationDateBefore(0.0, java.time.LocalDate.now())
                .stream()
                .map(b -> IngredientBatchDTO.builder()
                        .id(b.getId())
                        .ingredientId(b.getIngredient().getId())
                        .ingredientName(b.getIngredient().getName())
                        .quantity(b.getRemainingQuantity())
                        .unitPrice(b.getUnitPrice())
                        .expirationDate(b.getExpirationDate())
                        .receivedDate(b.getReceivedDate())
                        .build())
                .collect(Collectors.toList());
    }

    public void deleteBatch(Long batchId) {
        batchRepository.deleteById(batchId);
    }

    private IngredientDTO convertToDTO(Ingredient ingredient) {
        // Calculate total quantity from all active batches
        List<IngredientBatch> batches = batchRepository.findByIngredientIdAndRemainingQuantityGreaterThanOrderByExpirationDateAsc(ingredient.getId(), 0.0);
        Double totalQty = batches.stream().mapToDouble(IngredientBatch::getRemainingQuantity).sum();

        return IngredientDTO.builder()
                .id(ingredient.getId())
                .name(ingredient.getName())
                .unit(ingredient.getUnit())
                .minimumStockLevel(ingredient.getMinimumStockLevel())
                .totalQuantity(totalQty)
                .isActive(ingredient.isActive())
                .build();
    }
}