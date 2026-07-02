package com.example.menu.controller;

import com.example.menu.dto.IngredientDTO;
import com.example.menu.dto.IngredientBatchDTO;
import com.example.menu.service.IngredientService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;

    @GetMapping("/active")
    public List<IngredientDTO> getActiveIngredients() {
        return ingredientService.getAllActiveIngredients();
    }

    @GetMapping("/expired")
    public List<IngredientBatchDTO> getExpiredIngredients() {
        return ingredientService.getExpiredBatches();
    }

    @GetMapping("/{id}/batches")
    public List<IngredientBatchDTO> getIngredientBatches(@PathVariable Long id) {
        return ingredientService.getBatchesByIngredientId(id);
    }

    @GetMapping("/{id}")
    public IngredientDTO getIngredientById(@PathVariable Long id) {
        return ingredientService.getIngredientById(id);
    }

    @PostMapping
    public IngredientDTO createIngredient(@RequestBody IngredientDTO dto) {
        return ingredientService.createIngredient(dto);
    }

    @PutMapping("/{id}")
    public IngredientDTO updateIngredient(@PathVariable Long id, @RequestBody IngredientDTO dto) {
        return ingredientService.updateIngredient(id, dto);
    }

    @DeleteMapping("/{id}")
    public void deleteIngredient(@PathVariable Long id) {
        ingredientService.deleteIngredient(id);
    }

    @DeleteMapping("/batches/{batchId}")
    public void deleteBatch(@PathVariable Long batchId) {
        ingredientService.deleteBatch(batchId);
    }
}