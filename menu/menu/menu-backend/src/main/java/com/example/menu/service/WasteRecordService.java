package com.example.menu.service;

import com.example.menu.dto.WasteRecordDTO;
import com.example.menu.entity.Ingredient;
import com.example.menu.entity.IngredientBatch;
import com.example.menu.entity.WasteRecord;
import com.example.menu.repository.IngredientBatchRepository;
import com.example.menu.repository.IngredientRepository;
import com.example.menu.repository.WasteRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WasteRecordService {

    private final WasteRecordRepository wasteRecordRepository;
    private final IngredientRepository ingredientRepository;
    private final IngredientBatchRepository batchRepository;

    @Transactional
    public WasteRecordDTO recordWaste(WasteRecordDTO dto) {
        Ingredient ingredient = ingredientRepository.findById(dto.getIngredientId())
                .orElseThrow(() -> new RuntimeException("Zayiat kaydı için hammadde bulunamadı. ID: " + dto.getIngredientId()));

        if (!ingredient.isActive()) {
            throw new RuntimeException("Aktif olmayan hammadde için zayiat kaydı girilemez: " + ingredient.getName());
        }

        if (dto.getQuantity() <= 0) {
            throw new RuntimeException("Zayiat miktarı sıfırdan büyük olmalıdır.");
        }

        // Find all active batches of this ingredient, ordered by expiration date (ASC) for FEFO
        List<IngredientBatch> batches = batchRepository.findByIngredientIdAndRemainingQuantityGreaterThanOrderByExpirationDateAsc(ingredient.getId(), 0.0);

        double totalAvailable = batches.stream().mapToDouble(IngredientBatch::getRemainingQuantity).sum();

        if (totalAvailable < dto.getQuantity()) {
            throw new RuntimeException("Yetersiz Stok! İmha edilmek istenen: " + dto.getQuantity() + " " + ingredient.getUnit() +
                    ", Depoda Mevcut: " + totalAvailable + " " + ingredient.getUnit());
        }

        double remainingToDeduct = dto.getQuantity();
        double financialLoss = 0.0;

        for (IngredientBatch batch : batches) {
            if (remainingToDeduct <= 0) break;

            double deductedQty;
            if (batch.getRemainingQuantity() >= remainingToDeduct) {
                deductedQty = remainingToDeduct;
                batch.setRemainingQuantity(batch.getRemainingQuantity() - remainingToDeduct);
                remainingToDeduct = 0.0;
            } else {
                deductedQty = batch.getRemainingQuantity();
                remainingToDeduct -= batch.getRemainingQuantity();
                batch.setRemainingQuantity(0.0);
            }

            // Calculate cost for this portion of the waste
            // Cost = quantity * batch unit price. If unit price is null, default to 0.0
            double unitPrice = batch.getUnitPrice() != null ? batch.getUnitPrice() : 0.0;
            financialLoss += deductedQty * unitPrice;

            batchRepository.save(batch);
        }

        WasteRecord wasteRecord = WasteRecord.builder()
                .ingredient(ingredient)
                .quantity(dto.getQuantity())
                .unit(ingredient.getUnit())
                .reason(dto.getReason())
                .wasteDate(LocalDateTime.now())
                .financialLoss(financialLoss)
                .build();

        WasteRecord savedRecord = wasteRecordRepository.save(wasteRecord);
        return convertToDTO(savedRecord);
    }

    public List<WasteRecordDTO> getAllWasteRecords() {
        return wasteRecordRepository.findAllByOrderByWasteDateDesc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getWasteSummary() {
        List<WasteRecord> records = wasteRecordRepository.findAll();
        double totalLoss = records.stream().mapToDouble(WasteRecord::getFinancialLoss).sum();
        long recordCount = records.size();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalFinancialLoss", totalLoss);
        summary.put("totalRecords", recordCount);
        return summary;
    }

    private WasteRecordDTO convertToDTO(WasteRecord record) {
        return WasteRecordDTO.builder()
                .id(record.getId())
                .ingredientId(record.getIngredient().getId())
                .ingredientName(record.getIngredient().getName())
                .quantity(record.getQuantity())
                .unit(record.getUnit())
                .reason(record.getReason())
                .wasteDate(record.getWasteDate())
                .financialLoss(record.getFinancialLoss())
                .build();
    }
}
