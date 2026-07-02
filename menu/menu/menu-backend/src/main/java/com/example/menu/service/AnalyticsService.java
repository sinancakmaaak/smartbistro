package com.example.menu.service;

import com.example.menu.entity.*;
import com.example.menu.repository.*;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final IngredientRepository ingredientRepository;
    private final IngredientBatchRepository batchRepository;

    @Data
    @Builder
    public static class SpoilageRiskReport {
        private String ingredientName;
        private Double currentStock;
        private Double dailyBurnRate;
        private Double predictedWaste;
        private LocalDate earliestExpiry;
        private String recommendation;
        private Double financialRisk;
    }

    public List<SpoilageRiskReport> getSpoilageRiskAnalysis() {
        List<Ingredient> ingredients = ingredientRepository.findAllByIsActiveTrue();
        List<SpoilageRiskReport> reports = new ArrayList<>();

        // Son 30 günlük tüketimi hesapla (Burn Rate)
        Map<Long, Double> burnRates = calculateDailyBurnRates(30);

        for (Ingredient ing : ingredients) {
            Double burnRate = burnRates.getOrDefault(ing.getId(), 0.0);
            List<IngredientBatch> batches = batchRepository.findByIngredientIdAndRemainingQuantityGreaterThanOrderByExpirationDateAsc(ing.getId(), 0.0);

            if (batches.isEmpty()) continue;

            Double totalPredictedWaste = 0.0;
            Double totalFinancialRisk = 0.0;
            LocalDate earliestExpiry = batches.get(0).getExpirationDate();
            
            // Analiz: Her parti için tüketim hızıyla karşılaştırma
            long daysToEarliestExpiry = ChronoUnit.DAYS.between(LocalDate.now(), earliestExpiry);
            if (daysToEarliestExpiry < 0) daysToEarliestExpiry = 0;

            Double totalStock = batches.stream().mapToDouble(IngredientBatch::getRemainingQuantity).sum();
            
            // Basit Tahmin: (Mevcut Stok) - (Günlük Tüketim * Kalan Gün)
            Double expectedConsumptionUntilExpiry = burnRate * daysToEarliestExpiry;
            
            // Eğer elimizdeki stok, o tarihe kadar tüketeceğimizden fazlaysa RİSK VARDIR
            if (totalStock > expectedConsumptionUntilExpiry && burnRate > 0) {
                totalPredictedWaste = totalStock - expectedConsumptionUntilExpiry;
                totalFinancialRisk = totalPredictedWaste * batches.get(0).getUnitPrice(); // İlk partinin fiyatından hesapla
            }

            if (totalPredictedWaste > 0.1) { // Anlamlı bir israf varsa raporla
                reports.add(SpoilageRiskReport.builder()
                        .ingredientName(ing.getName())
                        .currentStock(totalStock)
                        .dailyBurnRate(burnRate)
                        .predictedWaste(totalPredictedWaste)
                        .earliestExpiry(earliestExpiry)
                        .financialRisk(totalFinancialRisk)
                        .recommendation(generateRecommendation(ing.getName(), totalPredictedWaste, ing.getUnit()))
                        .build());
            }
        }

        return reports.stream()
                .sorted(Comparator.comparing(SpoilageRiskReport::getFinancialRisk).reversed())
                .collect(Collectors.toList());
    }

    private Map<Long, Double> calculateDailyBurnRates(int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days);
        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> o.getOrderDate().isAfter(start))
                .collect(Collectors.toList());

        Map<Long, Double> totalUsage = new HashMap<>();

        for (Order order : orders) {
            for (OrderItem item : order.getItems()) {
                Product p = item.getProduct();
                if (p.getIngredients() == null) continue;
                for (ProductIngredient pi : p.getIngredients()) {
                    Long ingId = pi.getIngredient().getId();
                    Double amount = pi.getAmountUsed() * item.getQuantity();
                    totalUsage.put(ingId, totalUsage.getOrDefault(ingId, 0.0) + amount);
                }
            }
        }

        Map<Long, Double> burnRates = new HashMap<>();
        totalUsage.forEach((id, total) -> burnRates.put(id, total / days));
        return burnRates;
    }

    private String generateRecommendation(String name, Double waste, String unit) {
        if (waste > 10) {
            return String.format("ACİL: %s stoğunuzda %.1f %s israf riski var. Bu malzemeyi içeren ürünlerde '1 Alana 1 Bedava' kampanyası başlatın.", name, waste, unit);
        } else {
            return String.format("ÖNERİ: %s tüketimi yavaş. Günün menüsünde bu malzemeye ağırlık verin.", name);
        }
    }
}
